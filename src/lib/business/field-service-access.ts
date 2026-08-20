import { assertRoleCapability } from "@/lib/business/canonical-validation";

const FIELD_TECHNICIAN_ROLE = "field_technician";

export function normalizeFieldServiceRole(role: string) {
  return role.trim().toLowerCase();
}

export function canViewWorkOrder(role: string, userId: string, assignedUserId: string | null) {
  assertRoleCapability(role, "field_service");
  const normalizedRole = normalizeFieldServiceRole(role);
  if (normalizedRole !== FIELD_TECHNICIAN_ROLE) return true;
  return Boolean(assignedUserId && assignedUserId === userId);
}

export function assertCanViewWorkOrder(role: string, userId: string, assignedUserId: string | null) {
  if (!canViewWorkOrder(role, userId, assignedUserId)) throw new Error("Forbidden");
}

export function technicianAllowedNextStatuses(currentStatus: string): readonly string[] {
  switch (currentStatus) {
    case "scheduled":
    case "dispatched":
      return ["in_progress"];
    case "in_progress":
      return ["completion_review", "on_hold"];
    case "on_hold":
      return ["in_progress"];
    default:
      return [];
  }
}

export function assertTechnicianStatusChangeAllowed(role: string, currentStatus: string, nextStatus: string) {
  if (normalizeFieldServiceRole(role) !== FIELD_TECHNICIAN_ROLE) return;
  if (!technicianAllowedNextStatuses(currentStatus).includes(nextStatus)) {
    throw new Error("Field technicians cannot perform this status change");
  }
}
