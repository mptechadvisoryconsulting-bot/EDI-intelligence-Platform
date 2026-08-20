export const STOREFRONT_SCHEMA_VERSION = 1;

export type StorefrontSection = {
  id: string;
  type: "hero" | "featured" | "catalog" | "process" | "faq" | "contact" | "policies";
  enabled: boolean;
  variant: string;
};

export type StorefrontTheme = {
  schemaVersion: number;
  density: "comfortable" | "compact";
  typography: "modern" | "classic";
  surface: "light" | "dark";
  accent: string;
};

export const DEFAULT_STOREFRONT_THEME: StorefrontTheme = {
  schemaVersion: STOREFRONT_SCHEMA_VERSION,
  density: "comfortable",
  typography: "modern",
  surface: "light",
  accent: "indigo",
};

export const DEFAULT_STOREFRONT_SECTIONS: StorefrontSection[] = [
  { id: "hero", type: "hero", enabled: true, variant: "business" },
  { id: "featured", type: "featured", enabled: true, variant: "cards" },
  { id: "catalog", type: "catalog", enabled: true, variant: "grid" },
  { id: "process", type: "process", enabled: false, variant: "steps" },
  { id: "faq", type: "faq", enabled: false, variant: "accordion" },
  { id: "contact", type: "contact", enabled: true, variant: "split" },
  { id: "policies", type: "policies", enabled: true, variant: "links" },
];

/** Build the governed unpublished storefront configuration provisioned for an account. */
export function buildDefaultStorefrontContent() {
  return {
    themeContent: JSON.stringify(DEFAULT_STOREFRONT_THEME),
    sectionContent: JSON.stringify(DEFAULT_STOREFRONT_SECTIONS),
  };
}
