export const ATTENTION_STATUSES = ["open", "in_progress", "resolved", "dismissed"] as const;
export const ATTENTION_SEVERITIES = ["info", "warning", "critical"] as const;
export const ATTENTION_MODULES = [
  "kpi",
  "import",
  "storefront",
  "order",
  "field_service",
  "invoice",
  "edi",
  "automation",
  "property",
] as const;

export type AttentionStatus = (typeof ATTENTION_STATUSES)[number];
export type AttentionSeverity = (typeof ATTENTION_SEVERITIES)[number];
export type AttentionModule = (typeof ATTENTION_MODULES)[number];

export type AttentionRecommendedAction = {
  id: string;
  label: string;
  requiresApproval: boolean;
};

export type AttentionItemInput = {
  tenantId: string;
  sourceModule: AttentionModule;
  sourceRecordType: string;
  sourceRecordId: string;
  reason: string;
  severity: AttentionSeverity;
  evidence?: string[];
  recommendedActions?: AttentionRecommendedAction[];
  assigneeUserId?: string | null;
  correlationId?: string | null;
};

export type AttentionItemContract = AttentionItemInput & {
  stableKey: string;
  status: AttentionStatus;
};

const MAX_TEXT = 500;
const MAX_EVIDENCE_ITEMS = 20;
const MAX_ACTIONS = 10;

function requireBoundedText(value: unknown, field: string, max = MAX_TEXT): string {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} is required`);
  if (trimmed.length > max) throw new Error(`${field} is too long`);
  return trimmed;
}

function optionalBoundedText(value: unknown, field: string, max = MAX_TEXT): string | null | undefined {
  if (value === undefined || value === null) return value;
  return requireBoundedText(value, field, max);
}

function assertEnumValue<T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`${field} is invalid`);
  }
  return value as T[number];
}

function normalizeEvidence(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("evidence must be an array");
  if (value.length > MAX_EVIDENCE_ITEMS) throw new Error("evidence has too many items");
  return value.map((item, index) => requireBoundedText(item, `evidence[${index}]`, 1000));
}

function normalizeActions(value: unknown): AttentionRecommendedAction[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("recommendedActions must be an array");
  if (value.length > MAX_ACTIONS) throw new Error("recommendedActions has too many items");

  const seen = new Set<string>();
  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`recommendedActions[${index}] must be an object`);
    const candidate = item as Record<string, unknown>;
    const id = requireBoundedText(candidate.id, `recommendedActions[${index}].id`, 100);
    if (seen.has(id)) throw new Error(`recommendedActions contains duplicate id ${id}`);
    seen.add(id);
    if (typeof candidate.requiresApproval !== "boolean") {
      throw new Error(`recommendedActions[${index}].requiresApproval must be a boolean`);
    }
    return {
      id,
      label: requireBoundedText(candidate.label, `recommendedActions[${index}].label`, 200),
      requiresApproval: candidate.requiresApproval,
    };
  });
}

export function buildAttentionStableKey(input: Pick<AttentionItemInput, "tenantId" | "sourceModule" | "sourceRecordType" | "sourceRecordId" | "reason">): string {
  return [input.tenantId, input.sourceModule, input.sourceRecordType, input.sourceRecordId, input.reason]
    .map((part) => requireBoundedText(part, "stableKey part", 500))
    .join("::");
}

export function validateAttentionItemInput(value: unknown): AttentionItemInput {
  if (!value || typeof value !== "object") throw new Error("attention item must be an object");
  const input = value as Record<string, unknown>;

  const normalized: AttentionItemInput = {
    tenantId: requireBoundedText(input.tenantId, "tenantId", 200),
    sourceModule: assertEnumValue(input.sourceModule, ATTENTION_MODULES, "sourceModule"),
    sourceRecordType: requireBoundedText(input.sourceRecordType, "sourceRecordType", 100),
    sourceRecordId: requireBoundedText(input.sourceRecordId, "sourceRecordId", 200),
    reason: requireBoundedText(input.reason, "reason", 500),
    severity: assertEnumValue(input.severity, ATTENTION_SEVERITIES, "severity"),
    evidence: normalizeEvidence(input.evidence),
    recommendedActions: normalizeActions(input.recommendedActions),
    assigneeUserId: optionalBoundedText(input.assigneeUserId, "assigneeUserId", 200),
    correlationId: optionalBoundedText(input.correlationId, "correlationId", 200),
  };

  return normalized;
}

export function createAttentionItemContract(value: unknown): AttentionItemContract {
  const input = validateAttentionItemInput(value);
  return {
    ...input,
    stableKey: buildAttentionStableKey(input),
    status: "open",
  };
}

export function assertAttentionTransitionAllowed(current: AttentionStatus, next: AttentionStatus): AttentionStatus {
  assertEnumValue(current, ATTENTION_STATUSES, "current status");
  assertEnumValue(next, ATTENTION_STATUSES, "next status");

  const allowed: Readonly<Record<AttentionStatus, readonly AttentionStatus[]>> = {
    open: ["open", "in_progress", "resolved", "dismissed"],
    in_progress: ["in_progress", "open", "resolved", "dismissed"],
    resolved: ["resolved"],
    dismissed: ["dismissed"],
  };

  if (!allowed[current].includes(next)) {
    throw new Error(`attention transition ${current} -> ${next} is not allowed`);
  }
  return next;
}
