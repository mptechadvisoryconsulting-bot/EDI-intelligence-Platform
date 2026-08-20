import { db } from "@/lib/db";

const RECURRING_SCHEDULER_ROLES = new Set(["owner", "admin", "manager", "operations", "dispatcher"]);

type Recurrence =
  | { unit: "weeks"; interval: number }
  | { unit: "months"; interval: number }
  | { unit: "years"; interval: number };

export function parseSupportedRecurrenceRule(value: string): Recurrence {
  const normalized = value.trim().toLowerCase();
  if (normalized === "weekly") return { unit: "weeks", interval: 1 };
  if (normalized === "monthly") return { unit: "months", interval: 1 };
  if (normalized === "quarterly") return { unit: "months", interval: 3 };
  if (normalized === "annual" || normalized === "annually" || normalized === "yearly") {
    return { unit: "years", interval: 1 };
  }

  const parts = Object.fromEntries(
    normalized
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index > 0 ? [part.slice(0, index).toUpperCase(), part.slice(index + 1).toUpperCase()] : ["", ""];
      })
      .filter(([key]) => Boolean(key)),
  );

  const interval = parts.INTERVAL ? Number(parts.INTERVAL) : 1;
  if (!Number.isSafeInteger(interval) || interval < 1 || interval > 12) {
    throw new Error("Recurring interval must be between 1 and 12");
  }

  if (parts.FREQ === "WEEKLY") return { unit: "weeks", interval };
  if (parts.FREQ === "MONTHLY") return { unit: "months", interval };
  if (parts.FREQ === "YEARLY") return { unit: "years", interval };
  throw new Error("Unsupported recurrence rule");
}

function daysInUtcMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addUtcMonthsClamped(date: Date, months: number) {
  const sourceDay = date.getUTCDate();
  const targetMonthIndex = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const targetDay = Math.min(sourceDay, daysInUtcMonth(targetYear, targetMonth));
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export function advanceRecurringOccurrence(current: Date, rule: string) {
  if (Number.isNaN(current.valueOf())) throw new Error("Invalid recurring occurrence date");
  const recurrence = parseSupportedRecurrenceRule(rule);
  if (recurrence.unit === "weeks") {
    return new Date(current.getTime() + recurrence.interval * 7 * 24 * 60 * 60 * 1000);
  }
  if (recurrence.unit === "months") return addUtcMonthsClamped(current, recurrence.interval);
  return addUtcMonthsClamped(current, recurrence.interval * 12);
}

export function recurringWorkOrderIdempotencyKey(input: {
  serviceAgreementId: string;
  scheduleVersion: number;
  occurrence: Date;
}) {
  if (!input.serviceAgreementId.trim()) throw new Error("Service agreement ID is required");
  if (!Number.isSafeInteger(input.scheduleVersion) || input.scheduleVersion < 1) {
    throw new Error("Schedule version must be a positive integer");
  }
  if (Number.isNaN(input.occurrence.valueOf())) throw new Error("Invalid recurring occurrence date");
  return `recurring:${input.serviceAgreementId}:v${input.scheduleVersion}:${input.occurrence.toISOString()}`;
}

function recurringWorkOrderNumber(serviceAgreementId: string, occurrence: Date) {
  const stamp = occurrence.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `REC-${serviceAgreementId}-${stamp}`.slice(0, 120);
}

export async function generateNextRecurringWorkOrder(input: {
  accountId: string;
  actorUserId: string;
  membershipRole: string;
  serviceAgreementId: string;
  throughDate?: Date;
}) {
  if (!RECURRING_SCHEDULER_ROLES.has(input.membershipRole.trim().toLowerCase())) throw new Error("Forbidden");
  const throughDate = input.throughDate ?? new Date();
  if (Number.isNaN(throughDate.valueOf())) throw new Error("Invalid generation cutoff");

  const agreement = await db.serviceAgreement.findFirst({
    where: { id: input.serviceAgreementId, accountId: input.accountId },
    include: {
      customer: {
        select: {
          id: true,
          serviceAddress: true,
        },
      },
    },
  });
  if (!agreement) throw new Error("Service agreement not found");
  if (agreement.status !== "active") throw new Error("Service agreement is not active");
  if (!agreement.nextRunAt) throw new Error("Service agreement does not have a next run date");
  if (agreement.nextRunAt > throughDate) {
    return { generated: false as const, reason: "not_due" as const, nextRunAt: agreement.nextRunAt };
  }

  const occurrence = agreement.nextRunAt;
  const nextRunAt = advanceRecurringOccurrence(occurrence, agreement.recurrenceRule);
  const idempotencyKey = recurringWorkOrderIdempotencyKey({
    serviceAgreementId: agreement.id,
    scheduleVersion: agreement.version,
    occurrence,
  });
  const workOrderNumber = recurringWorkOrderNumber(agreement.id, occurrence);

  return db.$transaction(async (tx) => {
    const advanced = await tx.serviceAgreement.updateMany({
      where: {
        id: agreement.id,
        accountId: input.accountId,
        status: "active",
        version: agreement.version,
        nextRunAt: occurrence,
      },
      data: {
        lastGeneratedAt: occurrence,
        nextRunAt,
      },
    });
    if (advanced.count !== 1) throw new Error("Recurring schedule changed concurrently; retry from the latest schedule");

    const existing = await tx.workOrder.findFirst({
      where: { accountId: input.accountId, idempotencyKey },
    });
    if (existing) {
      return { generated: false as const, reason: "already_generated" as const, workOrder: existing, nextRunAt };
    }

    const workOrder = await tx.workOrder.create({
      data: {
        accountId: input.accountId,
        customerId: agreement.customerId,
        workOrderNumber,
        idempotencyKey,
        serviceType: agreement.name,
        serviceAddress: agreement.customer.serviceAddress,
        scheduledStart: occurrence,
        serviceAgreementId: agreement.id,
      },
    });

    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "work_order",
        entityId: workOrder.id,
        action: "recurring_work_order_generated",
        actorUserId: input.actorUserId,
        source: "recurring_service",
        metadata: JSON.stringify({
          serviceAgreementId: agreement.id,
          scheduleVersion: agreement.version,
          occurrence: occurrence.toISOString(),
          nextRunAt: nextRunAt.toISOString(),
          idempotencyKey,
        }),
      },
    });

    return { generated: true as const, workOrder, nextRunAt };
  });
}
