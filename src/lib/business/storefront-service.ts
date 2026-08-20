import { db } from "@/lib/db";
import { assertAccountAccess } from "@/lib/account-context";
import {
  DEFAULT_STOREFRONT_SECTIONS,
  DEFAULT_STOREFRONT_THEME,
  STOREFRONT_SCHEMA_VERSION,
  type StorefrontSection,
  type StorefrontTheme,
} from "@/lib/business/storefront-defaults";

const ALLOWED_TYPES = new Set(DEFAULT_STOREFRONT_SECTIONS.map((section) => section.type));
const ALLOWED_ACCENTS = new Set(["indigo", "blue", "green", "orange", "rose", "slate"]);

function parseJson<T>(value: string, field: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${field} is invalid JSON`);
  }
}

export function validateStorefrontDraft(themeContent: string, sectionContent: string) {
  const theme = parseJson<StorefrontTheme>(themeContent, "Theme");
  const sections = parseJson<StorefrontSection[]>(sectionContent, "Sections");

  if (theme.schemaVersion !== STOREFRONT_SCHEMA_VERSION) throw new Error("Unsupported storefront schema version");
  if (!(["comfortable", "compact"] as const).includes(theme.density)) throw new Error("Invalid storefront density");
  if (!(["modern", "classic"] as const).includes(theme.typography)) throw new Error("Invalid storefront typography");
  if (!(["light", "dark"] as const).includes(theme.surface)) throw new Error("Invalid storefront surface");
  if (!ALLOWED_ACCENTS.has(theme.accent)) throw new Error("Invalid storefront accent");

  if (!Array.isArray(sections) || sections.length === 0 || sections.length > 20) throw new Error("Invalid storefront sections");
  const ids = new Set<string>();
  for (const section of sections) {
    if (!section.id?.trim() || ids.has(section.id)) throw new Error("Storefront section IDs must be unique");
    ids.add(section.id);
    if (!ALLOWED_TYPES.has(section.type)) throw new Error(`Unsupported storefront section type: ${section.type}`);
    if (typeof section.enabled !== "boolean") throw new Error("Storefront section enabled flag is invalid");
    if (!section.variant?.trim() || section.variant.length > 80) throw new Error("Storefront section variant is invalid");
  }

  const required = new Set(["hero", "contact", "policies"]);
  for (const type of required) {
    if (!sections.some((section) => section.type === type && section.enabled)) {
      throw new Error(`Required storefront section must remain enabled: ${type}`);
    }
  }

  return { theme, sections };
}

async function requireStorefrontEditor(accountId: string, userId: string) {
  const membership = await assertAccountAccess(accountId, userId);
  if (!["owner", "admin", "manager"].includes(membership.role.toLowerCase())) throw new Error("Forbidden");
  return membership;
}

export async function saveStorefrontDraft(input: {
  accountId: string;
  actorUserId: string;
  themeContent: string;
  sectionContent: string;
}) {
  await requireStorefrontEditor(input.accountId, input.actorUserId);
  validateStorefrontDraft(input.themeContent, input.sectionContent);

  return db.$transaction(async (tx) => {
    const storefront = await tx.storefrontConfig.findFirst({ where: { accountId: input.accountId } });
    if (!storefront) throw new Error("Storefront not found");
    const updated = await tx.storefrontConfig.update({
      where: { id: storefront.id },
      data: { themeContent: input.themeContent, sectionContent: input.sectionContent, status: "draft" },
    });
    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "storefront",
        entityId: storefront.id,
        action: "draft_saved",
        actorUserId: input.actorUserId,
      },
    });
    return updated;
  });
}

export async function publishStorefront(input: { accountId: string; actorUserId: string }) {
  await requireStorefrontEditor(input.accountId, input.actorUserId);

  return db.$transaction(async (tx) => {
    const storefront = await tx.storefrontConfig.findFirst({ where: { accountId: input.accountId } });
    if (!storefront) throw new Error("Storefront not found");
    validateStorefrontDraft(storefront.themeContent, storefront.sectionContent);

    const latest = await tx.storefrontVersion.findFirst({
      where: { storefrontId: storefront.id },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;
    const snapshotContent = JSON.stringify({
      schemaVersion: STOREFRONT_SCHEMA_VERSION,
      theme: parseJson<StorefrontTheme>(storefront.themeContent, "Theme"),
      sections: parseJson<StorefrontSection[]>(storefront.sectionContent, "Sections"),
    });

    const version = await tx.storefrontVersion.create({
      data: {
        storefrontId: storefront.id,
        versionNumber,
        state: "published",
        snapshotContent,
        publishedAt: new Date(),
      },
    });

    await tx.storefrontConfig.update({
      where: { id: storefront.id },
      data: { status: "published", publishedVersionNumber: versionNumber },
    });
    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "storefront",
        entityId: storefront.id,
        action: "published",
        actorUserId: input.actorUserId,
        metadata: JSON.stringify({ versionNumber }),
      },
    });
    return version;
  });
}

export async function rollbackStorefront(input: {
  accountId: string;
  actorUserId: string;
  versionNumber: number;
}) {
  await requireStorefrontEditor(input.accountId, input.actorUserId);
  if (!Number.isSafeInteger(input.versionNumber) || input.versionNumber < 1) throw new Error("Invalid storefront version");

  return db.$transaction(async (tx) => {
    const storefront = await tx.storefrontConfig.findFirst({ where: { accountId: input.accountId } });
    if (!storefront) throw new Error("Storefront not found");
    const target = await tx.storefrontVersion.findFirst({
      where: { storefrontId: storefront.id, versionNumber: input.versionNumber },
    });
    if (!target) throw new Error("Storefront version not found");

    const snapshot = parseJson<{ theme: StorefrontTheme; sections: StorefrontSection[] }>(target.snapshotContent, "Snapshot");
    const themeContent = JSON.stringify(snapshot.theme ?? DEFAULT_STOREFRONT_THEME);
    const sectionContent = JSON.stringify(snapshot.sections ?? DEFAULT_STOREFRONT_SECTIONS);
    validateStorefrontDraft(themeContent, sectionContent);

    await tx.storefrontConfig.update({
      where: { id: storefront.id },
      data: {
        themeContent,
        sectionContent,
        status: "published",
        publishedVersionNumber: target.versionNumber,
      },
    });
    await tx.accountAuditEvent.create({
      data: {
        accountId: input.accountId,
        entityType: "storefront",
        entityId: storefront.id,
        action: "rolled_back",
        actorUserId: input.actorUserId,
        metadata: JSON.stringify({ versionNumber: target.versionNumber }),
      },
    });
    return target;
  });
}
