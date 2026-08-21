import assert from "node:assert/strict";
import test from "node:test";
import { validateAttentionItemContract } from "@/lib/business/attention-item";

function validItem() {
  return {
    id: "attention-1",
    tenantId: "tenant-1",
    sourceModule: "field_service",
    sourceRecordId: "work-order-1",
    reason: "Completed work is missing an approved labor rate",
    severity: "high" as const,
    recommendedActions: [
      { id: "review-rate", label: "Review labor rate", approvalRequired: true },
    ],
    evidenceRecordIds: ["time-entry-1", "work-order-1"],
    createdAt: "2026-08-21T11:00:00.000Z",
    status: "open" as const,
    auditCorrelationId: "corr-1",
  };
}

test("accepts a tenant-scoped attention item and canonicalizes record ids", () => {
  const item = validItem();
  item.evidenceRecordIds = [" time-entry-1 ", "work-order-1"];

  assert.equal(validateAttentionItemContract(item), item);
  assert.deepEqual(item.evidenceRecordIds, ["time-entry-1", "work-order-1"]);
});

test("rejects missing tenant/source identity and unsupported severity", () => {
  assert.throws(() => validateAttentionItemContract({ ...validItem(), tenantId: " " }), /tenant id is required/);
  assert.throws(() => validateAttentionItemContract({ ...validItem(), sourceRecordId: " " }), /source record id is required/);
  assert.throws(
    () => validateAttentionItemContract({ ...validItem(), severity: "urgent" as never }),
    /Unsupported attention item severity/,
  );
});

test("rejects duplicate or malformed recommended actions", () => {
  assert.throws(
    () =>
      validateAttentionItemContract({
        ...validItem(),
        recommendedActions: [
          { id: "review", label: "Review", approvalRequired: true },
          { id: "review", label: "Review again", approvalRequired: false },
        ],
      }),
    /Duplicate attention action id/,
  );

  assert.throws(
    () =>
      validateAttentionItemContract({
        ...validItem(),
        recommendedActions: [{ id: "review", label: "Review", approvalRequired: "yes" as never }],
      }),
    /approval flag must be boolean/,
  );
});

test("keeps evidence bounded to canonical record ids", () => {
  assert.throws(
    () => validateAttentionItemContract({ ...validItem(), evidenceRecordIds: ["record-1", " record-1 "] }),
    /Duplicate attention evidence record id/,
  );
  assert.throws(
    () => validateAttentionItemContract({ ...validItem(), evidenceRecordIds: [" "] }),
    /evidence record id is required/,
  );
});

test("requires complete resolution metadata only for resolved items", () => {
  assert.throws(
    () => validateAttentionItemContract({ ...validItem(), status: "resolved" as const }),
    /requires a resolution actor/,
  );

  const resolved = {
    ...validItem(),
    status: "resolved" as const,
    resolvedByUserId: "owner-1",
    resolvedAt: "2026-08-21T11:30:00.000Z",
  };
  assert.equal(validateAttentionItemContract(resolved), resolved);

  assert.throws(
    () => validateAttentionItemContract({ ...validItem(), resolvedByUserId: "owner-1" }),
    /cannot contain resolution metadata/,
  );
});
