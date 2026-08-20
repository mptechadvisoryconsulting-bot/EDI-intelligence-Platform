import { db } from "@/lib/db";
import {
  STOREFRONT_SCHEMA_VERSION,
  type StorefrontSection,
  type StorefrontTheme,
} from "@/lib/business/storefront-defaults";
import { validateStorefrontDraft } from "@/lib/business/storefront-service";

export type PublishedStorefront = {
  account: { id: string; name: string; slug: string; businessType: string };
  theme: StorefrontTheme;
  sections: StorefrontSection[];
  versionNumber: number;
  catalog: Array<{
    id: string;
    kind: string;
    name: string;
    description: string | null;
    sku: string | null;
    unitPriceMinor: number;
    unitLabel: string | null;
  }>;
};

export async function loadPublishedStorefront(slug: string): Promise<PublishedStorefront | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const account = await db.account.findUnique({
    where: { slug: normalizedSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      storefront: {
        select: {
          id: true,
          status: true,
          publishedVersionNumber: true,
        },
      },
      catalogItems: {
        where: { active: true },
        orderBy: [{ kind: "asc" }, { name: "asc" }],
        select: {
          id: true,
          kind: true,
          name: true,
          description: true,
          sku: true,
          unitPriceMinor: true,
          unitLabel: true,
        },
      },
    },
  });

  if (!account?.storefront || account.storefront.status !== "published" || !account.storefront.publishedVersionNumber) {
    return null;
  }

  const version = await db.storefrontVersion.findFirst({
    where: {
      storefrontId: account.storefront.id,
      versionNumber: account.storefront.publishedVersionNumber,
      state: "published",
    },
    select: { versionNumber: true, snapshotContent: true },
  });
  if (!version) return null;

  let snapshot: { schemaVersion: number; theme: StorefrontTheme; sections: StorefrontSection[] };
  try {
    snapshot = JSON.parse(version.snapshotContent) as typeof snapshot;
  } catch {
    return null;
  }
  if (snapshot.schemaVersion !== STOREFRONT_SCHEMA_VERSION) return null;

  try {
    validateStorefrontDraft(JSON.stringify(snapshot.theme), JSON.stringify(snapshot.sections));
  } catch {
    return null;
  }

  return {
    account: { id: account.id, name: account.name, slug: account.slug, businessType: account.businessType },
    theme: snapshot.theme,
    sections: snapshot.sections.filter((section) => section.enabled),
    versionNumber: version.versionNumber,
    catalog: account.catalogItems,
  };
}
