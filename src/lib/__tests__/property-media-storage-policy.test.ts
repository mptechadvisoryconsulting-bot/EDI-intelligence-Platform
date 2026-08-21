import assert from "node:assert/strict";
import test from "node:test";
import {
  validatePrivatePropertyMediaObject,
  validatePropertyMediaAccessRequest,
} from "@/lib/business/property-media-storage-policy";

const HASH = "A".repeat(64);

test("validates a tenant-bound private property media object", () => {
  const media = validatePrivatePropertyMediaObject({
    tenantId: "tenant-1",
    evidenceId: "evidence-1",
    storageKey: "tenants/tenant-1/property-evidence/evidence-1/original.jpg",
    declaredMimeType: "image/jpeg",
    sniffedMimeType: "image/jpeg",
    byteSize: 1024,
    sha256: HASH,
    metadataSanitized: true,
  });

  assert.equal(media.tenantId, "tenant-1");
  assert.equal(media.sha256, HASH.toLowerCase());
  assert.equal(media.metadataSanitized, true);
});

test("rejects cross-tenant and public property media storage keys", () => {
  assert.throws(
    () => validatePrivatePropertyMediaObject({
      tenantId: "tenant-1",
      evidenceId: "evidence-1",
      storageKey: "tenants/tenant-2/property-evidence/evidence-1/original.jpg",
      declaredMimeType: "image/jpeg",
      sniffedMimeType: "image/jpeg",
      byteSize: 1024,
      sha256: HASH,
      metadataSanitized: true,
    }),
    /must be tenant-bound/,
  );

  assert.throws(
    () => validatePrivatePropertyMediaObject({
      tenantId: "tenant-1",
      evidenceId: "evidence-1",
      storageKey: "https://cdn.example.test/property.jpg",
      declaredMimeType: "image/jpeg",
      sniffedMimeType: "image/jpeg",
      byteSize: 1024,
      sha256: HASH,
      metadataSanitized: true,
    }),
    /must not be a public or remote URL/,
  );
});

test("rejects declared and sniffed image type mismatches", () => {
  assert.throws(
    () => validatePrivatePropertyMediaObject({
      tenantId: "tenant-1",
      evidenceId: "evidence-1",
      storageKey: "tenants/tenant-1/property-evidence/evidence-1/original.jpg",
      declaredMimeType: "image/jpeg",
      sniffedMimeType: "image/png",
      byteSize: 1024,
      sha256: HASH,
      metadataSanitized: true,
    }),
    /does not match sniffed content type/,
  );
});

test("fails closed until privacy metadata handling completes", () => {
  assert.throws(
    () => validatePrivatePropertyMediaObject({
      tenantId: "tenant-1",
      evidenceId: "evidence-1",
      storageKey: "tenants/tenant-1/property-evidence/evidence-1/original.jpg",
      declaredMimeType: "image/jpeg",
      sniffedMimeType: "image/jpeg",
      byteSize: 1024,
      sha256: HASH,
      metadataSanitized: false,
    }),
    /privacy metadata handling must complete/,
  );
});

test("validates short-lived same-tenant signed access requests", () => {
  const request = validatePropertyMediaAccessRequest({
    tenantId: "tenant-1",
    authenticatedTenantId: "tenant-1",
    storageKey: "tenants/tenant-1/property-evidence/evidence-1/original.jpg",
    purpose: "view",
    expiresInSeconds: 300,
  });

  assert.equal(request.expiresInSeconds, 300);
  assert.equal(request.purpose, "view");
});

test("rejects cross-tenant and overly long signed access", () => {
  assert.throws(
    () => validatePropertyMediaAccessRequest({
      tenantId: "tenant-1",
      authenticatedTenantId: "tenant-2",
      storageKey: "tenants/tenant-1/property-evidence/evidence-1/original.jpg",
      purpose: "view",
      expiresInSeconds: 300,
    }),
    /not authorized for another tenant/,
  );

  assert.throws(
    () => validatePropertyMediaAccessRequest({
      tenantId: "tenant-1",
      authenticatedTenantId: "tenant-1",
      storageKey: "tenants/tenant-1/property-evidence/evidence-1/original.jpg",
      purpose: "download",
      expiresInSeconds: 3600,
    }),
    /signed access lifetime is invalid/,
  );
});

test("rejects traversal-like storage keys", () => {
  assert.throws(
    () => validatePropertyMediaAccessRequest({
      tenantId: "tenant-1",
      authenticatedTenantId: "tenant-1",
      storageKey: "tenants/tenant-1/property-evidence/../tenant-2/evidence.jpg",
      purpose: "view",
      expiresInSeconds: 300,
    }),
    /storage key is unsafe/,
  );
});
