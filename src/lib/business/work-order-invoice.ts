import { prepareInvoiceIdempotent } from "@/lib/business/canonical-service";
import {
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
    return {
      description,
      quantity: part.quantity,
      unitPriceMinor: part.unitPriceMinor,
    };
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

  const existing = workOrder.invoices[0];
  if (existing) {
    if (existing.invoiceNumber !== input.invoiceNumber.trim()) {
      throw new Error(`Work order is already linked to invoice ${existing.invoiceNumber}`);
    }
    return db.invoice.findFirstOrThrow({
      where: { id: existing.id, accountId: input.accountId },
      include: { lines: true },
    });
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

  const invoice = await prepareInvoiceIdempotent({
    accountId: input.accountId,
    actorUserId: input.actorUserId,
    customerId: workOrder.customerId,
    invoiceNumber: input.invoiceNumber,
    workOrderId: workOrder.id,
    dueAt: input.dueAt,
    currency: input.currency,
    notes: input.notes,
    lines,
    taxTotalMinor: input.taxTotalMinor,
  });

  await db.accountAuditEvent.create({
    data: {
      accountId: input.accountId,
      entityType: "invoice",
      entityId: invoice.id,
      action: "derived_from_completed_work_order",
      actorUserId: input.actorUserId,
      metadata: JSON.stringify({
        workOrderId: workOrder.id,
        partLineCount: workOrder.parts.length,
        completedLaborMinutes: workOrder.timeEntries.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0),
        laborRateMinorPerHour: input.laborRateMinorPerHour ?? null,
      }),
    },
  });

  return invoice;
}
