import {
  PROPERTY_EVIDENCE_MIME_TYPES,
  type PropertyEvidenceMimeType,
} from "./property-media-evidence";

export const PROPERTY_MEDIA_ACCESS_PURPOSES = ["view", "download"] as const;
export type PropertyMediaAccessPurpose = (typeof PROPERTY_MEDIA_ACCESS_PURPOSES)[number];

export type PrivatePropertyMediaObjectInput = {
  tenantId: string;
  evidenceId: string;
  storageKey: string;
  declaredMimeType: PropertyEvidenceMimeType;
  sniffedMimeType: PropertyEvidenceMimeType;
  byteSize: number;
  sha256: string;
  metadataSanitized: boolean;
};

export type PrivatePropertyMediaObject = PrivatePropertyMediaObjectInput;

export type PropertyMediaAccessRequestInput = {
  tenantId: string;
  authenticatedTenantId: string;
  storageKey: string;
  purpose: PropertyMediaAccessPurpose;
  expiresInSeconds: number;
};

export type PropertyMediaAccessRequest = PropertyMediaAccessRequestInput;

const MAX_ID_LENGTH = 160;
const MAX_STORAGE_KEY_LENGTH = 500;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MIN_SIGNED_ACCESS_SECONDS = 30;
const MAX_SIGNED_ACCESS_SECONDS = 15 * 60;
const SHA256_HEX = /^[a-f0-9]{64}$/i;

function requireText(value: unknown, label: string, maxLength = MAX_ID_LENGTH): string {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > maxLength) throw new Error(`${label} is too long`);
  return normalized;
}

function validateTenantBoundStorageKey(value: unknown, tenantId: string): string {
  const storageKey = requireText(value, "Property media storage key", MAX_STORAGE_KEY_LENGTH);
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(storageKey)) {
    throw new Error("Property media storage key must not be a public or remote URL");
  }
  if (storageKey.includes("\\") || storageKey.includes("//") || storageKey.split("/").includes("..")) {
    throw new Error("Property media storage key is unsafe");
  }
  const prefix = `tenants/${tenantId}/property-evidence/`;
  if (!storageKey.startsWith(prefix) || storageKey.length <= prefix.length) {
    throw new Error("Property media storage key must be tenant-bound");
  }
  return storageKey;
}

function validateMimeType(value: unknown, label: string): PropertyEvidenceMimeType {
  if (typeof value !== "string" || !PROPERTY_EVIDENCE_MIME_TYPES.includes(value as PropertyEvidenceMimeType)) {
    throw new Error(`${label} is unsupported`);
  }
  return value as PropertyEvidenceMimeType;
}

/**
 * Validate metadata that a private object-storage adapter must establish before
 * accepting property evidence for persistence. The adapter must content-sniff
 * the uploaded bytes and complete privacy metadata handling before calling this.
 * This contract does not upload, expose, sign, or delete any object.
 */
export function validatePrivatePropertyMediaObject(value: unknown): PrivatePropertyMediaObject {
  if (!value || typeof value !== "object") throw new Error("Private property media object is required");
  const input = value as Record<string, unknown>;

  const tenantId = requireText(input.tenantId, "Property media tenant id");
  const declaredMimeType = validateMimeType(input.declaredMimeType, "Declared property media type");
  const sniffedMimeType = validateMimeType(input.sniffedMimeType, "Sniffed property media type");
  if (declaredMimeType !== sniffedMimeType) {
    throw new Error("Property media declared type does not match sniffed content type");
  }

  if (!Number.isInteger(input.byteSize) || (input.byteSize as number) <= 0 || (input.byteSize as number) > MAX_IMAGE_BYTES) {
    throw new Error("Property media image size is invalid");
  }

  const sha256 = requireText(input.sha256, "Property media sha256", 64);
  if (!SHA256_HEX.test(sha256)) throw new Error("Property media sha256 must be a 64-character hex digest");
  if (input.metadataSanitized !== true) {
    throw new Error("Property media privacy metadata handling must complete before persistence");
  }

  return {
    tenantId,
    evidenceId: requireText(input.evidenceId, "Property media evidence id"),
    storageKey: validateTenantBoundStorageKey(input.storageKey, tenantId),
    declaredMimeType,
    sniffedMimeType,
    byteSize: input.byteSize as number,
    sha256: sha256.toLowerCase(),
    metadataSanitized: true,
  };
}

/**
 * Validate a tenant-authorized short-lived access request before a storage
 * provider is asked to mint a signed URL. Permanent/public URLs are outside
 * this contract by design.
 */
export function validatePropertyMediaAccessRequest(value: unknown): PropertyMediaAccessRequest {
  if (!value || typeof value !== "object") throw new Error("Property media access request is required");
  const input = value as Record<string, unknown>;

  const tenantId = requireText(input.tenantId, "Property media tenant id");
  const authenticatedTenantId = requireText(input.authenticatedTenantId, "Authenticated tenant id");
  if (tenantId !== authenticatedTenantId) {
    throw new Error("Property media access is not authorized for another tenant");
  }

  const purpose = input.purpose;
  if (typeof purpose !== "string" || !PROPERTY_MEDIA_ACCESS_PURPOSES.includes(purpose as PropertyMediaAccessPurpose)) {
    throw new Error("Property media access purpose is unsupported");
  }

  if (!Number.isInteger(input.expiresInSeconds)
    || (input.expiresInSeconds as number) < MIN_SIGNED_ACCESS_SECONDS
    || (input.expiresInSeconds as number) > MAX_SIGNED_ACCESS_SECONDS) {
    throw new Error("Property media signed access lifetime is invalid");
  }

  return {
    tenantId,
    authenticatedTenantId,
    storageKey: validateTenantBoundStorageKey(input.storageKey, tenantId),
    purpose: purpose as PropertyMediaAccessPurpose,
    expiresInSeconds: input.expiresInSeconds as number,
  };
}
