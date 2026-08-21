import assert from "node:assert/strict";
import test from "node:test";
import { validatePropertyMediaEvidenceInput } from "@/lib/business/property-media-evidence";

const valid = {
  tenantId: "tenant-1",
  serviceLocationId: "location-1",
  workOrderId: "wo-1",
  zoneId: "front-yard",
  uploadedByUserId: "user-1",
  kind: "before",
  mimeType: "image/jpeg",
  byteSize: 1024,
  sha256: "a".repeat(64),
  storageKey: "tenants/tenant-1/property-evidence/evidence-1.jpg",
  capturedAt: "2026-08-21T12:00:00.000Z",
} as const;

test("accepts bounded tenant-scoped real property evidence metadata", () => {
  const result = validatePropertyMediaEvidenceInput(valid);
  assert.equal(result.tenantId, "tenant-1");
  assert.equal(result.storageKey, valid.storageKey);
  assert.equal(result.sha256, valid.sha256);
});

test("rejects cross-tenant or public-style storage keys", () => {
  assert.throws(
    () => validatePropertyMediaEvidenceInput({ ...valid, storageKey: "tenants/tenant-2/property-evidence/evidence-1.jpg" }),
    /tenant-bound/,
  );
  assert.throws(
    () => validatePropertyMediaEvidenceInput({ ...valid, storageKey: "public/property/evidence-1.jpg" }),
    /tenant-bound/,
  );
});

test("rejects unsupported image types and oversized uploads", () => {
  assert.throws(
    () => validatePropertyMediaEvidenceInput({ ...valid, mimeType: "image/svg+xml" }),
    /Unsupported property evidence image type/,
  );
  assert.throws(
    () => validatePropertyMediaEvidenceInput({ ...valid, byteSize: 15 * 1024 * 1024 + 1 }),
    /image size is invalid/,
  );
});

test("rejects malformed hashes and timestamps", () => {
  assert.throws(
    () => validatePropertyMediaEvidenceInput({ ...valid, sha256: "abc" }),
    /64-character hex digest/,
  );
  assert.throws(
    () => validatePropertyMediaEvidenceInput({ ...valid, capturedAt: "not-a-date" }),
    /captured timestamp must be valid/,
  );
});

test("does not require a work order or zone so existing service-location flows remain additive", () => {
  const result = validatePropertyMediaEvidenceInput({ ...valid, workOrderId: null, zoneId: null });
  assert.equal(result.workOrderId, null);
  assert.equal(result.zoneId, null);
});
