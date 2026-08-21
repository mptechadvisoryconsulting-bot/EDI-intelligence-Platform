export const PROPERTY_EVIDENCE_KINDS = ["before", "during", "after", "inspection"] as const;
export type PropertyEvidenceKind = (typeof PROPERTY_EVIDENCE_KINDS)[number];

export const PROPERTY_EVIDENCE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PropertyEvidenceMimeType = (typeof PROPERTY_EVIDENCE_MIME_TYPES)[number];

export type PropertyMediaEvidenceInput = {
  tenantId: string;
  serviceLocationId: string;
  workOrderId?: string | null;
  zoneId?: string | null;
  uploadedByUserId: string;
  kind: PropertyEvidenceKind;
  mimeType: PropertyEvidenceMimeType;
  byteSize: number;
  sha256: string;
  storageKey: string;
  capturedAt?: string | null;
};

const MAX_ID_LENGTH = 160;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const SHA256_HEX = /^[a-f0-9]{64}$/i;

function requireText(value: unknown, label: string, maxLength = MAX_ID_LENGTH): string {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > maxLength) throw new Error(`${label} is too long`);
  return normalized;
}

function optionalText(value: unknown, label: string): string | null | undefined {
  if (value == null) return value as null | undefined;
  return requireText(value, label);
}

function validateCapturedAt(value: unknown): string | null | undefined {
  if (value == null) return value as null | undefined;
  const normalized = requireText(value, "Property evidence captured timestamp", 80);
  if (Number.isNaN(Date.parse(normalized))) throw new Error("Property evidence captured timestamp must be valid");
  return normalized;
}

/**
 * Validate immutable metadata for real property evidence before a storage adapter
 * persists or exposes the object. This function never uploads, signs, or publishes
 * the image and never accepts generated representations as field evidence.
 */
export function validatePropertyMediaEvidenceInput(value: unknown): PropertyMediaEvidenceInput {
  if (!value || typeof value !== "object") throw new Error("Property media evidence is required");
  const input = value as Record<string, unknown>;

  const tenantId = requireText(input.tenantId, "Property evidence tenant id");
  const storageKey = requireText(input.storageKey, "Property evidence storage key", 500);
  const requiredPrefix = `tenants/${tenantId}/property-evidence/`;
  if (!storageKey.startsWith(requiredPrefix)) {
    throw new Error("Property evidence storage key must be tenant-bound");
  }

  const kind = input.kind;
  if (typeof kind !== "string" || !PROPERTY_EVIDENCE_KINDS.includes(kind as PropertyEvidenceKind)) {
    throw new Error("Unsupported property evidence kind");
  }

  const mimeType = input.mimeType;
  if (typeof mimeType !== "string" || !PROPERTY_EVIDENCE_MIME_TYPES.includes(mimeType as PropertyEvidenceMimeType)) {
    throw new Error("Unsupported property evidence image type");
  }

  if (!Number.isInteger(input.byteSize) || (input.byteSize as number) <= 0 || (input.byteSize as number) > MAX_IMAGE_BYTES) {
    throw new Error("Property evidence image size is invalid");
  }

  const sha256 = requireText(input.sha256, "Property evidence sha256", 64);
  if (!SHA256_HEX.test(sha256)) throw new Error("Property evidence sha256 must be a 64-character hex digest");

  return {
    tenantId,
    serviceLocationId: requireText(input.serviceLocationId, "Property evidence service location id"),
    workOrderId: optionalText(input.workOrderId, "Property evidence work order id"),
    zoneId: optionalText(input.zoneId, "Property evidence zone id"),
    uploadedByUserId: requireText(input.uploadedByUserId, "Property evidence uploader user id"),
    kind: kind as PropertyEvidenceKind,
    mimeType: mimeType as PropertyEvidenceMimeType,
    byteSize: input.byteSize as number,
    sha256: sha256.toLowerCase(),
    storageKey,
    capturedAt: validateCapturedAt(input.capturedAt),
  };
}
