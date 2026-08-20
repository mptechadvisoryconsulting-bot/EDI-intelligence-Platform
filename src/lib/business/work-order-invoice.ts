import { assertAccountAccess } from "@/lib/account-context";
import { prepareInvoiceIdempotent } from "@/lib/business/canonical-service";
import {
  assertRoleCapability,
  lineAmountMinor,
  requireNonEmpty,
  validateMoneyMinor,
} from "@/lib/business/canonical-validation";
import { db } from "@/lib/db";

export type DerivedWorkOrderInvoiceLine = {
  description: string;
  quantity: number;
  unitPriceMinor: number;
};

export function deriveWorkOrderInvoiceLines(input: {
  parts: Array<{ description: string; quantity: number; unitPriceMinor: number }>;
  timeEntries: Array<{ minutes: number | null }>;
  laborRateMinorPerHour?: number | null;
  laborDescription?: string | null;
}): DerivedWorkOrderInvoiceLine[] {
  const lines: DerivedWorkOrderInvoiceLine[] = input.parts.map((part) => {
    const description = requireNonEmpty(part.description, "Part description", 500);
    lineAmountMinor(part.quantity, part.unitPriceMinor);
    return { description, quantity: part.quantity, unitPriceMinor: part.unitPriceMinor };
  });

  const completedMinutes = input.timeEntries.reduce((sum, entry) => {
    if (entry.minutes == null) return sum;
    if (!Number.isSafeInteger(entry.minutes) || entry.minutes <= 0) {
      throw new Error("Work-order time contains an invalid completed duration");
    }
    return sum + entry.minutes;
  }, 0);

  if (completedMinutes > 0) {
    if (input.laborRateMinorPerHour == null) {
      throw new Error("Labor rate is required when completed labor time exists");
    }
    const laborRateMinorPerHour = validateMoneyMinor(input.laborRateMinorPerHour, "Labor hourly rate");
    const quantity = completedMinutes / 60;
    lineAmountMinor(quantity, laborRateMinorPerHour);
    lines.push({
      description: input.laborDescription?.trim()
        ? requireNonEmpty(input.laborDescription, "Labor description", 500)
        : `Labor (${completedMinutes} minutes)`,
      quantity,
      unitPriceMinor: laborRateMinorPerHour,
    });
  }

  if (lines.length === 0) throw new Error("Completed work order has no billable parts or labor");
  return lines;
}

async function requireInvoiceWrite(accountId: string, actorUserId: string) {
  const membership = await assertAccountAccess(accountId, actorUserId);
  assertRoleCapability(membership.role, "invoice_write");
}

async function ensureDerivedAuditEvent(input: {
  accountId: string;
  actorUserId: string;
  invoiceId: string;
  workOrderId: string;
  partLineCount: number;
  completedLaborMinutes: number;
  laborRateMinorPerHour?: number | null;
}) {
  const existing = await db.accountAuditEvent.findFirst({
    where: {
      accountId: input.accountId,
      entityType: "invoice",
      entityId: input.invoiceId,
      action: "derived_from_completed_work_order",
    },
    select: { id: true },
  });
  if (existing) return;

  await db.accountAuditEvent.create({
    data: {
      accountId: input.accountId,
      entityType: "invoice",
      entityId: input.invoiceId,
      action: "derived_from_completed_work_order",
      actorUserId: input.actorUserId,
      metadata: JSON.stringify({
        workOrderId: input.workOrderId,
        partLineCount: input.partLineCount,
        completedLaborMinutes: input.completedLaborMinutes,
        laborRateMinorPerHour: input.laborRateMinorPerHour ?? null,
      }),
    },
  });
}

export async function prepareInvoiceFromCompletedWorkOrder(input: {
  accountId: string;
  actorUserId: string;
  workOrderId: string;
  invoiceNumber: string;
  dueAt?: Date | null;
  currency?: string;
  notes?: string | null;
  taxTotalMinor?: number;
  laborRateMinorPerHour?: number | null;
  laborDescription?: string | null;
}) {
  // Guard before any idempotent existing-invoice return so an unauthorized caller
  // cannot use this path to read invoice data.
  await requireInvoiceWrite(input.accountId, input.actorUserId);
  const invoiceNumber = requireNonEmpty(input.invoiceNumber, "Invoice number", 120);

  const workOrder = await db.workOrder.findFirst({
    where: { id: input.workOrderId, accountId: input.accountId },
    include: {
      parts: { orderBy: { createdAt: "asc" } },
      timeEntries: { orderBy: { startedAt: "asc" } },
      invoices: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  if (!workOrder) throw new Error("Work order not found");
  if (workOrder.status !== "completed") throw new Error("Work order must be completed before invoicing");

  const completedLaborMinutes = workOrder.timeEntries.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0);
  const auditInput = {
    accountId: input.accountId,
    actorUserId: input.actorUserId,
    workOrderId: workOrder.id,
    partLineCount: workOrder.parts.length,
    completedLaborMinutes,
    laborRateMinorPerHour: input.laborRateMinorPerHour,
  };

  const existing = workOrder.invoices[0];
  if (existing) {
    if (existing.invoiceNumber !== invoiceNumber) {
      throw new Error(`Work order is already linked to invoice ${existing.invoiceNumber}`);
    }
    const invoice = await db.invoice.findFirstOrThrow({
      where: { id: existing.id, accountId: input.accountId },
      include: { lines: true },
    });
    // Repairs an audit write that may have failed after invoice persistence on an
    // earlier attempt, while avoiding a duplicate on normal retries.
    await ensureDerivedAuditEvent({ ...auditInput, invoiceId: invoice.id });
    return invoice;
  }

  const lines = deriveWorkOrderInvoiceLines({
    parts: workOrder.parts.map((part) => ({
      description: part.description,
      quantity: part.quantity,
      unitPriceMinor: part.unitPriceMinor,
    })),
    timeEntries: workOrder.timeEntries.map((entry) => ({ minutes: entry.minutes })),
    laborRateMinorPerHour: input.laborRateMinorPerHour,
    laborDescription: input.laborDescription,
  });

  let invoice;
  try {
    invoice = await prepareInvoiceIdempotent({
      accountId: input.accountId,
      actorUserId: input.actorUserId,
      customerId: workOrder.customerId,
      invoiceNumber,
      workOrderId: workOrder.id,
      dueAt: input.dueAt,
      currency: input.currency,
      notes: input.notes,
      lines,
      taxTotalMinor: input.taxTotalMinor,
    });
  } catch (error) {
    // A concurrent request can win the unique workOrderId guard with a different
    // invoice number. Resolve by canonical source, never by the submitted number alone.
    const raced = await db.invoice.findFirst({
      where: { accountId: input.accountId, workOrderId: workOrder.id },
      include: { lines: true },
    });
    if (!raced) throw error;
    if (raced.invoiceNumber !== invoiceNumber) {
      throw new Error(`Work order is already linked to invoice ${raced.invoiceNumber}`);
    }
    invoice = raced;
  }

  await ensureDerivedAuditEvent({ ...auditInput, invoiceId: invoice.id });
  return invoice;
}
