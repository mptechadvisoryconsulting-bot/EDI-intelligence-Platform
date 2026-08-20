import { db } from "@/lib/db";
import {
  assertRoleCapability,
  requireNonEmpty,
  validateMoneyMinor,
  validateQuantity,
} from "@/lib/business/canonical-validation";
import { assertCanViewWorkOrder, normalizeFieldServiceRole } from "@/lib/business/field-service-access";

export type ChecklistItem = {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  note?: string;
};

export type WorkOrderSignoff = {
  signerName: string;
  attestation: string;
  acceptedAt: string;
  capturedByUserId: string;
};

const LOCKED_WORK_ORDER_STATUSES = new Set(["completed", "invoiced", "cancelled"]);

export function normalizeWorkOrderChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) throw new Error("Checklist must be an array");
  if (value.length > 100) throw new Error("Checklist cannot exceed 100 items");

  const seen = new Set<string>();
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(`Checklist item ${index + 1} is invalid`);
    }
    const input = raw as Record<string, unknown>;
    const id = requireNonEmpty(typeof input.id === "string" ? input.id : "", "Checklist item id", 80);
    if (seen.has(id)) throw new Error("Checklist item ids must be unique");
    seen.add(id);

    const label = requireNonEmpty(typeof input.label === "string" ? input.label : "", "Checklist item label", 240);
    const note = typeof input.note === "string" && input.note.trim() ? input.note.trim().slice(0, 1000) : undefined;
    return {
      id,
      label,
      required: input.required !== false,
      completed: input.completed === true,
      ...(note ? { note } : {}),
    };
  });
}

export function parseStoredChecklist(content: string | null): ChecklistItem[] {
  if (!content) return [];
  try {
    return normalizeWorkOrderChecklist(JSON.parse(content));
  } catch {
    return [];
  }
}

export function normalizeSignoffInput(value: unknown, capturedByUserId: string): WorkOrderSignoff {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Sign-off is required");
  const input = value as Record<string, unknown>;
  const signerName = requireNonEmpty(typeof input.signerName === "string" ? input.signerName : "", "Signer name", 120);
  const attestation = requireNonEmpty(
    typeof input.attestation === "string" ? input.attestation : "",
    "Sign-off attestation",
    500,
  );
  return {
    signerName,
    attestation,
    acceptedAt: new Date().toISOString(),
    capturedByUserId,
  };
}

export function completionReadiness(checklist: ChecklistItem[], signatureContent: string | null) {
  const blockers: string[] = [];
  if (checklist.some((item) => item.required && !item.completed)) blockers.push("Required checklist items are incomplete");
  if (!signatureContent) blockers.push("Customer sign-off is required");
  return { ready: blockers.length === 0, blockers };
}

async function requireEditableWorkOrder(input: {
  accountId: string;
  workOrderId: string;
  actorUserId: string;
  membershipRole: string;
}) {
  assertRoleCapability(input.membershipRole, "field_service");
  const workOrder = await db.workOrder.findFirst({
    where: { id: input.workOrderId, accountId: input.accountId },
    select: {
      id: true,
      status: true,
      assignedUserId: true,
      checklistContent: true,
      signatureContent: true,
    },
  });
  if (!workOrder) throw new Error("Work order not found");
  assertCanViewWorkOrder(input.membershipRole, input.actorUserId, workOrder.assignedUserId);
  if (LOCKED_WORK_ORDER_STATUSES.has(workOrder.status)) throw new Error("Work order execution is locked");
  return workOrder;
}

async function audit(accountId: string, workOrderId: string, actorUserId: string, action: string, metadata?: object) {
  await db.accountAuditEvent.create({
    data: {
      accountId,
      entityType: "work_order",
      entityId: workOrderId,
      action,
      actorUserId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function saveWorkOrderChecklist(input: {
  accountId: string;
  workOrderId: string;
  actorUserId: string;
  membershipRole: string;
  checklist: unknown;
}) {
  await requireEditableWorkOrder(input);
  const checklist = normalizeWorkOrderChecklist(input.checklist);
  const updated = await db.workOrder.updateMany({
    where: { id: input.workOrderId, accountId: input.accountId },
    data: { checklistContent: JSON.stringify(checklist) },
  });
  if (updated.count !== 1) throw new Error("Work order changed concurrently");
  await audit(input.accountId, input.workOrderId, input.actorUserId, "checklist_saved", { itemCount: checklist.length });
  return checklist;
}

export async function addWorkOrderPart(input: {
  accountId: string;
  workOrderId: string;
  actorUserId: string;
  membershipRole: string;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  catalogItemId?: string | null;
}) {
  await requireEditableWorkOrder(input);
  const description = requireNonEmpty(input.description, "Part description", 500);
  const quantity = validateQuantity(input.quantity);
  const unitPriceMinor = validateMoneyMinor(input.unitPriceMinor, "Part unit price");
  const catalogItemId = input.catalogItemId?.trim() || null;
  if (catalogItemId) {
    const catalogItem = await db.catalogItem.findFirst({ where: { id: catalogItemId, accountId: input.accountId }, select: { id: true } });
    if (!catalogItem) throw new Error("Catalog item not found in this account");
  }
  const part = await db.workOrderPart.create({
    data: { accountId: input.accountId, workOrderId: input.workOrderId, description, quantity, unitPriceMinor, catalogItemId },
  });
  await audit(input.accountId, input.workOrderId, input.actorUserId, "part_added", { partId: part.id, quantity });
  return part;
}

export async function addWorkTimeEntry(input: {
  accountId: string;
  workOrderId: string;
  actorUserId: string;
  membershipRole: string;
  startedAt: Date;
  endedAt?: Date | null;
  notes?: string | null;
}) {
  await requireEditableWorkOrder(input);
  if (!(input.startedAt instanceof Date) || Number.isNaN(input.startedAt.valueOf())) throw new Error("Valid start time is required");
  const endedAt = input.endedAt ?? null;
  if (endedAt && (!(endedAt instanceof Date) || Number.isNaN(endedAt.valueOf()) || endedAt <= input.startedAt)) {
    throw new Error("End time must be after start time");
  }
  const minutes = endedAt ? Math.max(1, Math.round((endedAt.getTime() - input.startedAt.getTime()) / 60000)) : null;
  if (minutes && minutes > 24 * 60) throw new Error("A single time entry cannot exceed 24 hours");
  const notes = input.notes?.trim() ? input.notes.trim().slice(0, 1000) : null;
  const entry = await db.workTimeEntry.create({
    data: {
      accountId: input.accountId,
      workOrderId: input.workOrderId,
      userId: input.actorUserId,
      startedAt: input.startedAt,
      endedAt,
      minutes,
      notes,
    },
  });
  await audit(input.accountId, input.workOrderId, input.actorUserId, "time_entry_added", { timeEntryId: entry.id, minutes });
  return entry;
}

export async function captureWorkOrderSignoff(input: {
  accountId: string;
  workOrderId: string;
  actorUserId: string;
  membershipRole: string;
  signoff: unknown;
}) {
  const workOrder = await requireEditableWorkOrder(input);
  if (!["in_progress", "completion_review"].includes(workOrder.status)) {
    throw new Error("Customer sign-off can only be captured during active completion work");
  }
  const signoff = normalizeSignoffInput(input.signoff, input.actorUserId);
  const serialized = JSON.stringify(signoff);
  const updated = await db.workOrder.updateMany({
    where: { id: input.workOrderId, accountId: input.accountId, signatureContent: workOrder.signatureContent },
    data: { signatureContent: serialized },
  });
  if (updated.count !== 1) throw new Error("Work order sign-off changed concurrently");
  await audit(input.accountId, input.workOrderId, input.actorUserId, "customer_signoff_captured", { signerName: signoff.signerName });
  return signoff;
}

export async function assertWorkOrderCompletionReady(accountId: string, workOrderId: string) {
  const workOrder = await db.workOrder.findFirst({
    where: { id: workOrderId, accountId },
    select: { checklistContent: true, signatureContent: true },
  });
  if (!workOrder) throw new Error("Work order not found");
  const readiness = completionReadiness(parseStoredChecklist(workOrder.checklistContent), workOrder.signatureContent);
  if (!readiness.ready) throw new Error(`Work order is not ready for completion: ${readiness.blockers.join("; ")}`);
  return readiness;
}

export function canTechnicianWriteExecution(role: string) {
  return normalizeFieldServiceRole(role) === "field_technician";
}
