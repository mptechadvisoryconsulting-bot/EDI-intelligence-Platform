import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAttentionTransitionAllowed,
  buildAttentionStableKey,
  createAttentionItemContract,
  validateAttentionItemInput,
} from "@/lib/business/attention-contract";

const validInput = {
  tenantId: "tenant-1",
  sourceModule: "field_service",
  sourceRecordType: "work_order",
  sourceRecordId: "wo-100",
  reason: "completed work is missing a billing rate",
  severity: "warning",
  evidence: ["time-entry:te-1"],
  recommendedActions: [
    { id: "set-rate", label: "Set approved labor rate", requiresApproval: true },
  ],
  assigneeUserId: "user-1",
  correlationId: "corr-1",
} as const;

test("normalizes a tenant-scoped attention item and creates a stable dedupe key", () => {
  const item = createAttentionItemContract(validInput);
  assert.equal(item.status, "open");
  assert.equal(
    item.stableKey,
    "tenant-1::field_service::work_order::wo-100::completed work is missing a billing rate",
  );
  assert.equal(item.recommendedActions?.[0]?.requiresApproval, true);
});

test("stable key includes tenant and source identity so equivalent exceptions do not cross tenants", () => {
  const a = buildAttentionStableKey(validInput);
  const b = buildAttentionStableKey({ ...validInput, tenantId: "tenant-2" });
  assert.notEqual(a, b);
});

test("fails closed on invalid module, severity, malformed actions, and duplicate action ids", () => {
  assert.throws(
    () => validateAttentionItemInput({ ...validInput, sourceModule: "unknown" }),
    /sourceModule is invalid/,
  );
  assert.throws(
    () => validateAttentionItemInput({ ...validInput, severity: "urgent" }),
    /severity is invalid/,
  );
  assert.throws(
    () =>
      validateAttentionItemInput({
        ...validInput,
        recommendedActions: [{ id: "bad", label: "Bad", requiresApproval: "yes" }],
      }),
    /requiresApproval must be a boolean/,
  );
  assert.throws(
    () =>
      validateAttentionItemInput({
        ...validInput,
        recommendedActions: [
          { id: "same", label: "One", requiresApproval: true },
          { id: "same", label: "Two", requiresApproval: false },
        ],
      }),
    /duplicate id same/,
  );
});

test("rejects blank source identifiers and unbounded evidence", () => {
  assert.throws(
    () => validateAttentionItemInput({ ...validInput, sourceRecordId: "   " }),
    /sourceRecordId is required/,
  );
  assert.throws(
    () => validateAttentionItemInput({ ...validInput, evidence: Array.from({ length: 21 }, (_, i) => `e-${i}`) }),
    /too many items/,
  );
});

test("attention lifecycle is monotonic after resolution or dismissal", () => {
  assert.equal(assertAttentionTransitionAllowed("open", "in_progress"), "in_progress");
  assert.equal(assertAttentionTransitionAllowed("in_progress", "resolved"), "resolved");
  assert.equal(assertAttentionTransitionAllowed("resolved", "resolved"), "resolved");
  assert.throws(() => assertAttentionTransitionAllowed("resolved", "open"), /not allowed/);
  assert.throws(() => assertAttentionTransitionAllowed("dismissed", "in_progress"), /not allowed/);
});
