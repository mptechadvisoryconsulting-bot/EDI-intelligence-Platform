export const ATTENTION_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type AttentionSeverity = (typeof ATTENTION_SEVERITIES)[number];

export const ATTENTION_STATUSES = ["open", "in_review", "resolved", "dismissed"] as const;
export type AttentionStatus = (typeof ATTENTION_STATUSES)[number];

export type AttentionAction = {
  id: string;
  label: string;
  approvalRequired: boolean;
};

export type AttentionItemContract = {
  id: string;
  tenantId: string;
  sourceModule: string;
  sourceRecordId: string;
  reason: string;
  severity: AttentionSeverity;
  recommendedActions: AttentionAction[];
  evidenceRecordIds?: string[];
  createdAt: string;
  status: AttentionStatus;
  assigneeUserId?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  auditCorrelationId: string;
};

const MAX_ID_LENGTH = 120;
const MAX_MODULE_LENGTH = 80;
const MAX_REASON_LENGTH = 500;
const MAX_ACTIONS = 12;
const MAX_EVIDENCE_IDS = 50;

/** Normalize required bounded identifiers without coercing non-text values. */
function requiredText(value: string, label: string, maxLength: number) {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > maxLength) throw new Error(`${label} is too long`);
  return normalized;
}

/** Validate a timestamp string without inferring a replacement value. */
function validateTimestamp(value: string, label: string) {
  const normalized = requiredText(value, label, 80);
  if (Number.isNaN(Date.parse(normalized))) throw new Error(`${label} must be a valid timestamp`);
  return normalized;
}

/**
 * Validate and canonicalize the schema-free contract used by Needs Your Attention.
 * Evidence is represented only by canonical record IDs so arbitrary imported text,
 * secrets, or large payloads cannot become automation instructions by accident.
 */
export function validateAttentionItemContract(item: AttentionItemContract) {
  if (!item || typeof item !== "object") throw new Error("Attention item is required");

  item.id = requiredText(item.id, "Attention item id", MAX_ID_LENGTH);
  item.tenantId = requiredText(item.tenantId, "Attention item tenant id", MAX_ID_LENGTH);
  item.sourceModule = requiredText(item.sourceModule, "Attention item source module", MAX_MODULE_LENGTH);
  item.sourceRecordId = requiredText(item.sourceRecordId, "Attention item source record id", MAX_ID_LENGTH);
  item.reason = requiredText(item.reason, "Attention item reason", MAX_REASON_LENGTH);
  item.auditCorrelationId = requiredText(item.auditCorrelationId, "Attention item audit correlation id", MAX_ID_LENGTH);
  item.createdAt = validateTimestamp(item.createdAt, "Attention item created timestamp");

  if (!ATTENTION_SEVERITIES.includes(item.severity)) throw new Error("Unsupported attention item severity");
  if (!ATTENTION_STATUSES.includes(item.status)) throw new Error("Unsupported attention item status");

  if (!Array.isArray(item.recommendedActions)) throw new Error("Attention item recommended actions must be a list");
  if (item.recommendedActions.length === 0) throw new Error("Attention item requires at least one recommended action");
  if (item.recommendedActions.length > MAX_ACTIONS) throw new Error("Attention item has too many recommended actions");

  const actionIds = new Set<string>();
  for (const action of item.recommendedActions) {
    if (!action || typeof action !== "object") throw new Error("Attention item action is invalid");
    action.id = requiredText(action.id, "Attention action id", MAX_ID_LENGTH);
    action.label = requiredText(action.label, "Attention action label", 160);
    if (typeof action.approvalRequired !== "boolean") throw new Error("Attention action approval flag must be boolean");
    if (actionIds.has(action.id)) throw new Error(`Duplicate attention action id: ${action.id}`);
    actionIds.add(action.id);
  }

  if (item.evidenceRecordIds != null) {
    if (!Array.isArray(item.evidenceRecordIds)) throw new Error("Attention item evidence record ids must be a list");
    if (item.evidenceRecordIds.length > MAX_EVIDENCE_IDS) throw new Error("Attention item has too many evidence records");
    const evidenceIds = new Set<string>();
    item.evidenceRecordIds = item.evidenceRecordIds.map((id) => {
      const normalized = requiredText(id, "Attention evidence record id", MAX_ID_LENGTH);
      if (evidenceIds.has(normalized)) throw new Error(`Duplicate attention evidence record id: ${normalized}`);
      evidenceIds.add(normalized);
      return normalized;
    });
  }

  for (const [value, label] of [
    [item.assigneeUserId, "Attention item assignee user id"],
    [item.resolvedByUserId, "Attention item resolved by user id"],
  ] as const) {
    if (value != null) requiredText(value, label, MAX_ID_LENGTH);
  }

  if (item.status === "resolved") {
    if (!item.resolvedByUserId) throw new Error("Resolved attention item requires a resolution actor");
    if (!item.resolvedAt) throw new Error("Resolved attention item requires a resolution timestamp");
    item.resolvedAt = validateTimestamp(item.resolvedAt, "Attention item resolved timestamp");
  } else if (item.resolvedByUserId != null || item.resolvedAt != null) {
    throw new Error("Unresolved attention item cannot contain resolution metadata");
  }

  return item;
}
