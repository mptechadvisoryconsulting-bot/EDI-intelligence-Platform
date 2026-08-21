export const PROPERTY_TYPES = ["residential", "commercial"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_IMAGE_SOURCES = ["uploaded", "licensed_provider", "generated_representation"] as const;
export type PropertyImageSource = (typeof PROPERTY_IMAGE_SOURCES)[number];

export type PropertyZone = {
  id: string;
  name: string;
  parentId?: string | null;
};

export type PropertyImageDescriptor = {
  source: PropertyImageSource;
  sourceReference?: string | null;
  providerName?: string | null;
  attribution?: string | null;
  capturedAt?: string | null;
  sourceDate?: string | null;
};

const MAX_ZONE_COUNT = 250;
const MAX_ZONE_ID_LENGTH = 80;
const MAX_ZONE_NAME_LENGTH = 120;
const MAX_METADATA_LENGTH = 500;

/** Normalize and validate required bounded text used by property contracts. */
function requireText(value: string, label: string, maxLength: number) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > maxLength) throw new Error(`${label} is too long`);
  return normalized;
}

/** Validate optional property metadata without inventing or coercing values. */
function validateOptionalMetadata(value: string | null | undefined, label: string) {
  if (value == null) return;
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  if (value.length > MAX_METADATA_LENGTH) throw new Error(`${label} is too long`);
}

/** Accept only platform-governed residential or commercial property types. */
export function validatePropertyType(value: string): PropertyType {
  if (!PROPERTY_TYPES.includes(value as PropertyType)) {
    throw new Error("Property type must be residential or commercial");
  }
  return value as PropertyType;
}

/**
 * Validate and canonicalize a bounded property zone hierarchy.
 * Parent identifiers are normalized before relationship and cycle checks so
 * whitespace cannot create a second, non-canonical relationship graph.
 */
export function validatePropertyZones(zones: PropertyZone[]) {
  if (!Array.isArray(zones)) throw new Error("Property zones must be a list");
  if (zones.length > MAX_ZONE_COUNT) throw new Error("Property zone count exceeds the supported limit");

  const ids = new Set<string>();
  for (const zone of zones) {
    if (!zone || typeof zone !== "object") throw new Error("Property zone is invalid");
    zone.id = requireText(zone.id, "Property zone id", MAX_ZONE_ID_LENGTH);
    zone.name = requireText(zone.name, "Property zone name", MAX_ZONE_NAME_LENGTH);
    if (ids.has(zone.id)) throw new Error(`Duplicate property zone id: ${zone.id}`);
    ids.add(zone.id);
  }

  for (const zone of zones) {
    if (zone.parentId == null) continue;
    if (typeof zone.parentId !== "string") throw new Error("Property zone parent id must be text");
    zone.parentId = zone.parentId.trim();
    if (!zone.parentId) throw new Error("Property zone parent id cannot be blank");
  }

  for (const zone of zones) {
    if (zone.parentId == null) continue;
    const parentId = zone.parentId;
    if (parentId === zone.id) throw new Error("Property zone cannot be its own parent");
    if (!ids.has(parentId)) throw new Error(`Unknown property zone parent: ${parentId}`);

    const seen = new Set<string>([zone.id]);
    let currentId: string | null | undefined = parentId;
    while (currentId) {
      if (seen.has(currentId)) throw new Error("Property zone hierarchy cannot contain cycles");
      seen.add(currentId);
      currentId = zones.find((candidate) => candidate.id === currentId)?.parentId;
    }
  }

  return zones;
}

/** Validate source classification and provenance metadata for property imagery. */
export function validatePropertyImageDescriptor(image: PropertyImageDescriptor) {
  if (!image || typeof image !== "object") throw new Error("Property image descriptor is required");
  if (!PROPERTY_IMAGE_SOURCES.includes(image.source)) {
    throw new Error("Unsupported property image source");
  }

  validateOptionalMetadata(image.sourceReference, "Property image source reference");
  validateOptionalMetadata(image.providerName, "Property image provider name");
  validateOptionalMetadata(image.attribution, "Property image attribution");
  validateOptionalMetadata(image.capturedAt, "Property image captured timestamp");
  validateOptionalMetadata(image.sourceDate, "Property image source date");

  if (image.source === "licensed_provider") {
    if (!image.providerName?.trim()) throw new Error("Licensed property imagery requires provider metadata");
    if (!image.sourceReference?.trim()) throw new Error("Licensed property imagery requires a source reference");
  }

  return image;
}

/** Return whether validated imagery may be used as authoritative property evidence. */
export function mayUseAsAuthoritativePropertyEvidence(image: PropertyImageDescriptor): boolean {
  validatePropertyImageDescriptor(image);
  return image.source !== "generated_representation";
}

/** Fail closed when generated imagery is presented as authoritative inspection evidence. */
export function assertAuthoritativePropertyEvidence(image: PropertyImageDescriptor) {
  if (!mayUseAsAuthoritativePropertyEvidence(image)) {
    throw new Error("Generated property representations cannot be used as authoritative inspection evidence");
  }
  return image;
}
