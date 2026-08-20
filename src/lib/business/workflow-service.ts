import { db } from "@/lib/db";
import { assertWorkflowTransition, type WorkflowKind } from "@/lib/business/workflow";

function auditMetadata(currentStatus: string, nextStatus: string) {
  return JSON.stringify({ currentStatus, nextStatus });
}

/**
 * Persist an order transition only after validating the current state inside the
 * same database transaction. updateMany includes the observed current status so
 * a concurrent writer cannot silently overwrite a newer state.
 */
export async function transitionBusinessOrderStatus(input: {
  accountId: string;
  orderId: string;
  nextStatus: string;
  actorUserId?: string | null;
}) {
  return db.$transaction(async (tx) => {
    const order = await tx.businessOrder.findFirst({
      where: { id: input.orderId, accountId: input.accountId },
      select: { status: true, orderType: true },
    });
    if (!order) throw new Error("Order not found");

    const kind: WorkflowKind = order.orderType === "service" ? "service_order" : "product_order";
    assertWorkflowTransition(kind, order.status, input.nextStatus);

    const changed = await tx.businessOrder.updateMany({
      where: { id: input.orderId, accountId: input.accountId, status: order.status },
      data: {
        status: input.nextStatus,
        ...(input.nextStatus === "confirmed" ? { acceptedAt: new Date() } : {}),
        ...(["delivered", "completed", "closed"].includes(input.nextStatus)
          ? { completedAt: new Date() }
          : {}),
      },
    });
    if (changed.count !== 1) throw new Error("Order changed concurrently; retry from the latest state");

    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "business_order",
        entityId: input.orderId,
        action: "status_changed",
        actorUserId: input.actorUserId ?? null,
        source: "app",
        metadata: auditMetadata(order.status, input.nextStatus),
      },
    });

    return tx.businessOrder.findFirstOrThrow({
      where: { id: input.orderId, accountId: input.accountId },
    });
  });
}

/** Persist a field-service work-order transition with the same concurrency guard. */
export async function transitionWorkOrderStatus(input: {
  accountId: string;
  workOrderId: string;
  nextStatus: string;
  actorUserId?: string | null;
}) {
  return db.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.findFirst({
      where: { id: input.workOrderId, accountId: input.accountId },
      select: { status: true },
    });
    if (!workOrder) throw new Error("Work order not found");

    assertWorkflowTransition("work_order", workOrder.status, input.nextStatus);

    const changed = await tx.workOrder.updateMany({
      where: { id: input.workOrderId, accountId: input.accountId, status: workOrder.status },
      data: {
        status: input.nextStatus,
        ...(input.nextStatus === "completed" ? { completedAt: new Date() } : {}),
      },
    });
    if (changed.count !== 1) throw new Error("Work order changed concurrently; retry from the latest state");

    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "work_order",
        entityId: input.workOrderId,
        action: "status_changed",
        actorUserId: input.actorUserId ?? null,
        source: "app",
        metadata: auditMetadata(workOrder.status, input.nextStatus),
      },
    });

    return tx.workOrder.findFirstOrThrow({
      where: { id: input.workOrderId, accountId: input.accountId },
    });
  });
}

/** Persist invoice document lifecycle separately from payment state. */
export async function transitionInvoiceStatus(input: {
  accountId: string;
  invoiceId: string;
  nextStatus: string;
  actorUserId?: string | null;
}) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, accountId: input.accountId },
      select: { status: true },
    });
    if (!invoice) throw new Error("Invoice not found");

    assertWorkflowTransition("invoice", invoice.status, input.nextStatus);

    const changed = await tx.invoice.updateMany({
      where: { id: input.invoiceId, accountId: input.accountId, status: invoice.status },
      data: {
        status: input.nextStatus,
        ...(input.nextStatus === "finalized" ? { finalizedAt: new Date() } : {}),
        ...(input.nextStatus === "sent" ? { issuedAt: new Date() } : {}),
      },
    });
    if (changed.count !== 1) throw new Error("Invoice changed concurrently; retry from the latest state");

    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "invoice",
        entityId: input.invoiceId,
        action: "status_changed",
        actorUserId: input.actorUserId ?? null,
        source: "app",
        metadata: auditMetadata(invoice.status, input.nextStatus),
      },
    });

    return tx.invoice.findFirstOrThrow({
      where: { id: input.invoiceId, accountId: input.accountId },
    });
  });
}

/** Persist manual/offline payment-state changes without implying processor collection. */
export async function transitionInvoicePaymentStatus(input: {
  accountId: string;
  invoiceId: string;
  nextPaymentStatus: string;
  actorUserId?: string | null;
}) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, accountId: input.accountId },
      select: { paymentStatus: true },
    });
    if (!invoice) throw new Error("Invoice not found");

    assertWorkflowTransition("payment_status", invoice.paymentStatus, input.nextPaymentStatus);

    const changed = await tx.invoice.updateMany({
      where: {
        id: input.invoiceId,
        accountId: input.accountId,
        paymentStatus: invoice.paymentStatus,
      },
      data: { paymentStatus: input.nextPaymentStatus },
    });
    if (changed.count !== 1) throw new Error("Invoice payment state changed concurrently; retry");

    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "invoice",
        entityId: input.invoiceId,
        action: "payment_status_changed",
        actorUserId: input.actorUserId ?? null,
        source: "app",
        metadata: auditMetadata(invoice.paymentStatus, input.nextPaymentStatus),
      },
    });

    return tx.invoice.findFirstOrThrow({
      where: { id: input.invoiceId, accountId: input.accountId },
    });
  });
}
