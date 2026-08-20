import { db } from "@/lib/db";
import { assertAccountAccess } from "@/lib/account-context";
import { buildCatalogPriceAuditMetadata } from "@/lib/business/catalog-pricing";
import {
  assertRoleCapability,
  lineAmountMinor,
  normalizeCurrency,
  normalizeIdempotencyKey,
  requireNonEmpty,
  validateCanonicalLines,
  validateMoneyMinor,
  type CanonicalLineInput,
} from "@/lib/business/canonical-validation";

async function requireCapability(accountId: string, actorUserId: string, capability: "business_write" | "field_service" | "invoice_write") {
  const membership = await assertAccountAccess(accountId, actorUserId);
  assertRoleCapability(membership.role, capability);
  return membership;
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002");
}

export async function createCustomer(input: {
  accountId: string;
  actorUserId: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  billingAddress?: string | null;
  serviceAddress?: string | null;
  externalRef?: string | null;
}) {
  await requireCapability(input.accountId, input.actorUserId, "business_write");
  const displayName = requireNonEmpty(input.displayName, "Customer name", 200);

  return db.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        accountId: input.accountId,
        displayName,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        companyName: input.companyName?.trim() || null,
        billingAddress: input.billingAddress?.trim() || null,
        serviceAddress: input.serviceAddress?.trim() || null,
        externalRef: input.externalRef?.trim() || null,
      },
    });

    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "customer",
        entityId: customer.id,
        action: "created",
        actorUserId: input.actorUserId,
      },
    });

    return customer;
  });
}

export async function upsertCatalogItemBySku(input: {
  accountId: string;
  actorUserId: string;
  sku: string;
  name: string;
  kind?: "product" | "service";
  description?: string | null;
  unitPriceMinor?: number;
  unitLabel?: string | null;
  active?: boolean;
}) {
  await requireCapability(input.accountId, input.actorUserId, "business_write");
  const sku = requireNonEmpty(input.sku, "SKU", 120);
  const name = requireNonEmpty(input.name, "Catalog item name", 200);
  const unitPriceMinor = validateMoneyMinor(input.unitPriceMinor ?? 0, "Unit price");

  return db.$transaction(async (tx) => {
    const existing = await tx.catalogItem.findFirst({ where: { accountId: input.accountId, sku } });
    const item = existing
      ? await tx.catalogItem.update({
          where: { id: existing.id },
          data: {
            name,
            kind: input.kind ?? existing.kind,
            description: input.description?.trim() || null,
            unitPriceMinor,
            unitLabel: input.unitLabel?.trim() || null,
            active: input.active ?? existing.active,
          },
        })
      : await tx.catalogItem.create({
          data: {
            accountId: input.accountId,
            sku,
            name,
            kind: input.kind ?? "product",
            description: input.description?.trim() || null,
            unitPriceMinor,
            unitLabel: input.unitLabel?.trim() || null,
            active: input.active ?? true,
          },
        });

    const pricingAudit = buildCatalogPriceAuditMetadata({
      sku,
      oldUnitPriceMinor: existing?.unitPriceMinor ?? null,
      newUnitPriceMinor: item.unitPriceMinor,
      oldActive: existing?.active ?? null,
      newActive: item.active,
    });

    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "catalog_item",
        entityId: item.id,
        action: existing ? "updated" : "created",
        actorUserId: input.actorUserId,
        metadata: JSON.stringify(pricingAudit),
      },
    });

    return item;
  });
}

export async function createBusinessOrderIdempotent(input: {
  accountId: string;
  actorUserId: string;
  customerId: string;
  orderNumber: string;
  idempotencyKey: string;
  orderType?: "product" | "service";
  source?: string;
  sourceRef?: string | null;
  currency?: string;
  notes?: string | null;
  lines: CanonicalLineInput[];
}) {
  await requireCapability(input.accountId, input.actorUserId, "business_write");
  const orderNumber = requireNonEmpty(input.orderNumber, "Order number", 120);
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const currency = normalizeCurrency(input.currency);
  const lines = validateCanonicalLines(input.lines);

  const existing = await db.businessOrder.findFirst({
    where: { accountId: input.accountId, idempotencyKey },
    include: { lines: true },
  });
  if (existing) return existing;

  const customer = await db.customer.findFirst({ where: { id: input.customerId, accountId: input.accountId }, select: { id: true } });
  if (!customer) throw new Error("Customer not found");

  const catalogIds = [...new Set(lines.map((line) => line.catalogItemId).filter((value): value is string => Boolean(value)))];
  if (catalogIds.length) {
    const count = await db.catalogItem.count({ where: { accountId: input.accountId, id: { in: catalogIds }, active: true } });
    if (count !== catalogIds.length) throw new Error("One or more catalog items are invalid for this account");
  }

  try {
    return await db.$transaction(async (tx) => {
      const order = await tx.businessOrder.create({
        data: {
          accountId: input.accountId,
          customerId: input.customerId,
          orderNumber,
          idempotencyKey,
          orderType: input.orderType ?? "product",
          source: input.source?.trim() || "manual",
          sourceRef: input.sourceRef?.trim() || null,
          currency,
          notes: input.notes?.trim() || null,
          lines: {
            create: lines.map((line) => ({
              accountId: input.accountId,
              description: line.description,
              quantity: line.quantity,
              unitPriceMinor: line.unitPriceMinor,
              catalogItemId: line.catalogItemId,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.accountAuditEvent.create({
        data: {
          accountId: input.accountId,
          entityType: "business_order",
          entityId: order.id,
          action: "created",
          actorUserId: input.actorUserId,
          source: input.source?.trim() || "app",
          metadata: JSON.stringify({ idempotencyKey, orderNumber }),
        },
      });
      return order;
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await db.businessOrder.findFirst({
      where: { accountId: input.accountId, idempotencyKey },
      include: { lines: true },
    });
    if (raced) return raced;
    throw error;
  }
}

export async function createWorkOrderIdempotent(input: {
  accountId: string;
  actorUserId: string;
  customerId: string;
  workOrderNumber: string;
  idempotencyKey: string;
  serviceType: string;
  orderId?: string | null;
  serviceAgreementId?: string | null;
  serviceAddress?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  arrivalWindow?: string | null;
  assignedUserId?: string | null;
  customerNotes?: string | null;
  internalNotes?: string | null;
}) {
  await requireCapability(input.accountId, input.actorUserId, "field_service");
  const workOrderNumber = requireNonEmpty(input.workOrderNumber, "Work order number", 120);
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const serviceType = requireNonEmpty(input.serviceType, "Service type", 160);

  const existing = await db.workOrder.findFirst({ where: { accountId: input.accountId, idempotencyKey } });
  if (existing) return existing;

  const customer = await db.customer.findFirst({ where: { accountId: input.accountId, id: input.customerId }, select: { id: true } });
  if (!customer) throw new Error("Customer not found");

  if (input.orderId) {
    const order = await db.businessOrder.findFirst({ where: { accountId: input.accountId, id: input.orderId }, select: { customerId: true } });
    if (!order || order.customerId !== input.customerId) throw new Error("Order is invalid for this customer/account");
  }

  if (input.serviceAgreementId) {
    const agreement = await db.serviceAgreement.findFirst({ where: { accountId: input.accountId, id: input.serviceAgreementId }, select: { customerId: true } });
    if (!agreement || agreement.customerId !== input.customerId) throw new Error("Service agreement is invalid for this customer/account");
  }

  if (input.assignedUserId) {
    const membership = await db.accountMembership.findFirst({
      where: { accountId: input.accountId, userId: input.assignedUserId, status: "active" },
      select: { id: true },
    });
    if (!membership) throw new Error("Assigned user is not an active member of this account");
  }

  if (input.scheduledStart && input.scheduledEnd && input.scheduledEnd <= input.scheduledStart) {
    throw new Error("Scheduled end must be after scheduled start");
  }

  try {
    return await db.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          accountId: input.accountId,
          customerId: input.customerId,
          workOrderNumber,
          idempotencyKey,
          serviceType,
          orderId: input.orderId ?? null,
          serviceAgreementId: input.serviceAgreementId ?? null,
          serviceAddress: input.serviceAddress?.trim() || null,
          scheduledStart: input.scheduledStart ?? null,
          scheduledEnd: input.scheduledEnd ?? null,
          arrivalWindow: input.arrivalWindow?.trim() || null,
          assignedUserId: input.assignedUserId ?? null,
          customerNotes: input.customerNotes?.trim() || null,
          internalNotes: input.internalNotes?.trim() || null,
        },
      });
      await tx.accountAuditEvent.create({
        data: {
          accountId: input.accountId,
          entityType: "work_order",
          entityId: workOrder.id,
          action: "created",
          actorUserId: input.actorUserId,
          metadata: JSON.stringify({ idempotencyKey, workOrderNumber }),
        },
      });
      return workOrder;
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await db.workOrder.findFirst({ where: { accountId: input.accountId, idempotencyKey } });
    if (raced) return raced;
    throw error;
  }
}

export async function prepareInvoiceIdempotent(input: {
  accountId: string;
  actorUserId: string;
  customerId: string;
  invoiceNumber: string;
  orderId?: string | null;
  workOrderId?: string | null;
  dueAt?: Date | null;
  currency?: string;
  notes?: string | null;
  lines: CanonicalLineInput[];
  taxTotalMinor?: number;
}) {
  await requireCapability(input.accountId, input.actorUserId, "invoice_write");
  const invoiceNumber = requireNonEmpty(input.invoiceNumber, "Invoice number", 120);
  const currency = normalizeCurrency(input.currency);
  const lines = validateCanonicalLines(input.lines);
  const taxTotalMinor = validateMoneyMinor(input.taxTotalMinor ?? 0, "Tax total");

  const existing = await db.invoice.findFirst({
    where: { accountId: input.accountId, invoiceNumber },
    include: { lines: true },
  });
  if (existing) {
    const sameSource = (existing.orderId ?? null) === (input.orderId ?? null) && (existing.workOrderId ?? null) === (input.workOrderId ?? null);
    if (!sameSource || existing.customerId !== input.customerId) throw new Error("Invoice number is already used by a different source");
    return existing;
  }

  const customer = await db.customer.findFirst({ where: { accountId: input.accountId, id: input.customerId }, select: { id: true } });
  if (!customer) throw new Error("Customer not found");

  if (input.orderId) {
    const order = await db.businessOrder.findFirst({ where: { accountId: input.accountId, id: input.orderId }, select: { customerId: true, status: true } });
    if (!order || order.customerId !== input.customerId) throw new Error("Order is invalid for this customer/account");
    if (!["delivered", "completed", "closed"].includes(order.status)) throw new Error("Order is not complete enough to invoice");
  }

  if (input.workOrderId) {
    const workOrder = await db.workOrder.findFirst({ where: { accountId: input.accountId, id: input.workOrderId }, select: { customerId: true, status: true } });
    if (!workOrder || workOrder.customerId !== input.customerId) throw new Error("Work order is invalid for this customer/account");
    if (workOrder.status !== "completed") throw new Error("Work order must be completed before invoicing");
  }

  if (!input.orderId && !input.workOrderId) throw new Error("Invoice must reference an order or completed work order");

  const subtotalMinor = lines.reduce((sum, line) => sum + lineAmountMinor(line.quantity, line.unitPriceMinor), 0);
  const totalMinor = subtotalMinor + taxTotalMinor;
  if (!Number.isSafeInteger(totalMinor)) throw new Error("Invoice total is outside the supported range");

  try {
    return await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          accountId: input.accountId,
          customerId: input.customerId,
          invoiceNumber,
          orderId: input.orderId ?? null,
          workOrderId: input.workOrderId ?? null,
          dueAt: input.dueAt ?? null,
          currency,
          notes: input.notes?.trim() || null,
          subtotalMinor,
          taxTotalMinor,
          totalMinor,
          lines: {
            create: lines.map((line) => ({
              accountId: input.accountId,
              description: line.description,
              quantity: line.quantity,
              unitPriceMinor: line.unitPriceMinor,
              amountMinor: lineAmountMinor(line.quantity, line.unitPriceMinor),
            })),
          },
        },
        include: { lines: true },
      });
      await tx.accountAuditEvent.create({
        data: {
          accountId: input.accountId,
          entityType: "invoice",
          entityId: invoice.id,
          action: "draft_prepared",
          actorUserId: input.actorUserId,
          metadata: JSON.stringify({ invoiceNumber, orderId: input.orderId ?? null, workOrderId: input.workOrderId ?? null }),
        },
      });
      return invoice;
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await db.invoice.findFirst({ where: { accountId: input.accountId, invoiceNumber }, include: { lines: true } });
    if (raced) return raced;
    throw error;
  }
}
