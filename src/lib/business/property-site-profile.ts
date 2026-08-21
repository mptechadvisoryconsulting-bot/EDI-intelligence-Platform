import { validatePropertyType, validatePropertyZones, type PropertyType, type PropertyZone } from "./property-intelligence";

export type PropertySiteProfileInput = {
  id: string;
  accountId: string;
  customerId: string;
  serviceLocationId: string;
  propertyType: PropertyType;
  verifiedAddress?: string | null;
  siteNotes?: string | null;
  accessInstructions?: string | null;
  zones?: PropertyZone[];
  representativeEvidenceIds?: string[];
};

export type PropertySiteProfile = {
  id: string;
  accountId: string;
  customerId: string;
  serviceLocationId: string;
  propertyType: PropertyType;
  verifiedAddress: string | null;
  siteNotes: string | null;
  accessInstructions: string | null;
  zones: PropertyZone[];
  representativeEvidenceIds: string[];
};

const MAX_ID_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 500;
const MAX_NOTES_LENGTH = 4_000;
const MAX_REPRESENTATIVE_EVIDENCE = 20;

/** Normalize required bounded identifiers without inventing tenant or source identity. */
function requireId(value: string, label: string) {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > MAX_ID_LENGTH) throw new Error(`${label} is too long`);
  return normalized;
}

/** Normalize optional bounded property text while preserving null when no value exists. */
function optionalText(value: string | null | undefined, label: string, maxLength: number) {
  if (value == null) return null;
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error(`${label} is too long`);
  return normalized;
}

/** Normalize and deduplicate evidence references used only as profile presentation pointers. */
function validateRepresentativeEvidenceIds(values: string[] | undefined) {
  if (values == null) return [];
  if (!Array.isArray(values)) throw new Error("Representative evidence ids must be a list");
  if (values.length > MAX_REPRESENTATIVE_EVIDENCE) {
    throw new Error("Representative evidence count exceeds the supported limit");
  }

  const normalized = values.map((value) => requireId(value, "Representative evidence id"));
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("Representative evidence ids cannot contain duplicates");
  }
  return normalized;
}

/**
 * Validate the additive Property/Site Profile contract linked to an existing service location.
 * The contract never creates or copies customer/service-location records; callers must verify
 * referenced records belong to the authenticated account before persistence.
 */
export function validatePropertySiteProfile(input: PropertySiteProfileInput): PropertySiteProfile {
  if (!input || typeof input !== "object") throw new Error("Property site profile is required");

  const zones = input.zones == null ? [] : input.zones.map((zone) => ({ ...zone }));
  validatePropertyZones(zones);

  return {
    id: requireId(input.id, "Property profile id"),
    accountId: requireId(input.accountId, "Property profile account id"),
    customerId: requireId(input.customerId, "Property profile customer id"),
    serviceLocationId: requireId(input.serviceLocationId, "Property profile service location id"),
    propertyType: validatePropertyType(input.propertyType),
    verifiedAddress: optionalText(input.verifiedAddress, "Verified property address", MAX_ADDRESS_LENGTH),
    siteNotes: optionalText(input.siteNotes, "Property site notes", MAX_NOTES_LENGTH),
    accessInstructions: optionalText(input.accessInstructions, "Property access instructions", MAX_NOTES_LENGTH),
    zones,
    representativeEvidenceIds: validateRepresentativeEvidenceIds(input.representativeEvidenceIds),
  };
}

/**
 * Enforce tenant linkage before a validated profile may be used by an authenticated account.
 * This is an application-layer fail-closed guard and does not replace database RLS/constraints.
 */
export function assertPropertySiteProfileAccount(profile: PropertySiteProfile, authenticatedAccountId: string) {
  const accountId = requireId(authenticatedAccountId, "Authenticated account id");
  if (profile.accountId !== accountId) {
    throw new Error("Property site profile does not belong to the authenticated account");
  }
  return profile;
}
