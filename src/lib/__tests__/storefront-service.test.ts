import assert from "node:assert/strict";
import test from "node:test";
import { buildDefaultStorefrontContent } from "@/lib/business/storefront-defaults";
import { validateStorefrontDraft } from "@/lib/business/storefront-service";

test("default governed storefront validates", () => {
  const defaults = buildDefaultStorefrontContent();
  assert.doesNotThrow(() => validateStorefrontDraft(defaults.themeContent, defaults.sectionContent));
});

test("storefront rejects unsafe or unsupported configuration", () => {
  const defaults = buildDefaultStorefrontContent();
  const theme = JSON.parse(defaults.themeContent);
  theme.accent = "javascript:alert(1)";
  assert.throws(() => validateStorefrontDraft(JSON.stringify(theme), defaults.sectionContent), /accent/);

  const sections = JSON.parse(defaults.sectionContent);
  sections.push({ id: "custom", type: "script", enabled: true, variant: "raw-html" });
  assert.throws(() => validateStorefrontDraft(defaults.themeContent, JSON.stringify(sections)), /Unsupported storefront section type/);
});

test("required storefront structural sections cannot be disabled", () => {
  const defaults = buildDefaultStorefrontContent();
  const sections = JSON.parse(defaults.sectionContent);
  const policies = sections.find((section: { type: string }) => section.type === "policies");
  policies.enabled = false;
  assert.throws(() => validateStorefrontDraft(defaults.themeContent, JSON.stringify(sections)), /policies/);
});
