import { assertAccountAccess } from "@/lib/account-context";
import { assertRoleCapability } from "@/lib/business/canonical-validation";
import { db } from "@/lib/db";

export type InvoiceSnapshot = {
  version: 1;
  account: { id: string; name: string };
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    currency: string;
    issuedAt: string;
    dueAt: string | null;
    subtotalMinor: number;
    taxTotalMinor: number;
    totalMinor: number;
    paymentStatus: string;
    notes: string | null;
  };
  customer: {
    id: string;
    displayName: string;
    companyName: string | null;
    email: string | null;
    billingAddress: string | null;
  };
  source: {
    orderId: string | null;
    orderNumber: string | null;
    workOrderId: string | null;
    workOrderNumber: string | null;
  };
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPriceMinor: number;
    amountMinor: number;
  }>;
};

async function requireInvoiceCapability(accountId: string, actorUserId: string) {
  const membership = await assertAccountAccess(accountId, actorUserId);
  assertRoleCapability(membership.role, "invoice_write");
}

export function buildInvoiceSnapshot(input: {
  account: { id: string; name: string };
  invoice: {
    id: string;
    invoiceNumber: string;
    currency: string;
    dueAt: Date | null;
    subtotalMinor: number;
    taxTotalMinor: number;
    totalMinor: number;
    paymentStatus: string;
    notes: string | null;
  };
  customer: {
    id: string;
    displayName: string;
    companyName: string | null;
    email: string | null;
    billingAddress: string | null;
  };
  order: { id: string; orderNumber: string } | null;
  workOrder: { id: string; workOrderNumber: string } | null;
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPriceMinor: number;
    amountMinor: number;
  }>;
  issuedAt: Date;
}): InvoiceSnapshot {
  return {
    version: 1,
    account: { id: input.account.id, name: input.account.name },
    invoice: {
      id: input.invoice.id,
      invoiceNumber: input.invoice.invoiceNumber,
      status: "finalized",
      currency: input.invoice.currency,
      issuedAt: input.issuedAt.toISOString(),
      dueAt: input.invoice.dueAt?.toISOString() ?? null,
      subtotalMinor: input.invoice.subtotalMinor,
      taxTotalMinor: input.invoice.taxTotalMinor,
      totalMinor: input.invoice.totalMinor,
      paymentStatus: input.invoice.paymentStatus,
      notes: input.invoice.notes,
    },
    customer: { ...input.customer },
    source: {
      orderId: input.order?.id ?? null,
      orderNumber: input.order?.orderNumber ?? null,
      workOrderId: input.workOrder?.id ?? null,
      workOrderNumber: input.workOrder?.workOrderNumber ?? null,
    },
    lines: input.lines.map((line) => ({ ...line })),
  };
}

export async function finalizeInvoiceImmutable(input: {
  accountId: string;
  actorUserId: string;
  invoiceId: string;
}) {
  await requireInvoiceCapability(input.accountId, input.actorUserId);

  const invoice = await db.invoice.findFirst({
    where: { accountId: input.accountId, id: input.invoiceId },
    include: {
      account: { select: { id: true, name: true } },
      customer: {
        select: {
          id: true,
          displayName: true,
          companyName: true,
          email: true,
          billingAddress: true,
        },
      },
      order: { select: { id: true, orderNumber: true } },
      workOrder: { select: { id: true, workOrderNumber: true } },
      lines: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          description: true,
          quantity: true,
          unitPriceMinor: true,
          amountMinor: true,
        },
      },
    },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "finalized" && invoice.finalizedSnapshotContent) return invoice;
  if (invoice.status !== "draft") throw new Error("Only draft invoices can be finalized");
  if (invoice.lines.length === 0) throw new Error("Invoice requires at least one line");

  const issuedAt = new Date();
  const snapshot = buildInvoiceSnapshot({
    account: invoice.account,
    invoice,
    customer: invoice.customer,
    order: invoice.order,
    workOrder: invoice.workOrder,
    lines: invoice.lines,
    issuedAt,
  });
  const snapshotContent = JSON.stringify(snapshot);

  return db.$transaction(async (tx) => {
    const updated = await tx.invoice.updateMany({
      where: {
        id: input.invoiceId,
        accountId: input.accountId,
        status: "draft",
        finalizedAt: null,
      },
      data: {
        status: "finalized",
        issuedAt,
        finalizedAt: issuedAt,
        finalizedSnapshotContent: snapshotContent,
      },
    });

    if (updated.count !== 1) {
      const raced = await tx.invoice.findFirst({
        where: { id: input.invoiceId, accountId: input.accountId },
      });
      if (raced?.status === "finalized" && raced.finalizedSnapshotContent) return raced;
      throw new Error("Invoice changed while it was being finalized");
    }

    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "invoice",
        entityId: input.invoiceId,
        action: "finalized",
        actorUserId: input.actorUserId,
        metadata: JSON.stringify({ snapshotVersion: 1 }),
      },
    });

    const finalized = await tx.invoice.findFirst({
      where: { id: input.invoiceId, accountId: input.accountId },
    });
    if (!finalized) throw new Error("Invoice not found after finalization");
    return finalized;
  });
}

const MANUAL_PAYMENT_STATES = new Set([
  "awaiting_payment",
  "partially_paid",
  "paid_offline",
  "past_due",
]);

export async function recordManualInvoicePaymentStatus(input: {
  accountId: string;
  actorUserId: string;
  invoiceId: string;
  paymentStatus: string;
  note?: string | null;
}) {
  await requireInvoiceCapability(input.accountId, input.actorUserId);
  const paymentStatus = input.paymentStatus.trim().toLowerCase();
  if (!MANUAL_PAYMENT_STATES.has(paymentStatus)) throw new Error("Unsupported manual payment status");

  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, accountId: input.accountId },
      select: { id: true, status: true, paymentStatus: true },
    });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "draft") throw new Error("Draft invoices cannot receive payment status updates");
    if (invoice.status === "void") throw new Error("Void invoices cannot receive payment status updates");

    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: { paymentStatus },
    });

    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "invoice",
        entityId: invoice.id,
        action: "manual_payment_status_recorded",
        actorUserId: input.actorUserId,
        source: "manual",
        metadata: JSON.stringify({
          from: invoice.paymentStatus,
          to: paymentStatus,
          note: input.note?.trim() || null,
          electronicFundsCollectedByPlatform: false,
        }),
      },
    });

    return updated;
  });
}
