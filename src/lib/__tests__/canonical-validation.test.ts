import assert from "node:assert/strict";
import test from "node:test";
import {
  assertRoleCapability,
  lineAmountMinor,
  normalizeCurrency,
  normalizeIdempotencyKey,
  validateCanonicalLines,
} from "@/lib/business/canonical-validation";

test("normalizes bounded idempotency keys and currency", () => {
  assert.equal(normalizeIdempotencyKey("  storefront:abc-123  "), "storefront:abc-123");
  assert.equal(normalizeCurrency("usd"), "USD");
  assert.throws(() => normalizeIdempotencyKey("   "), /required/);
  assert.throws(() => normalizeCurrency("US"), /3-letter/);
});

test("validates canonical lines and minor-unit math", () => {
  const lines = validateCanonicalLines([
    { description: "Service call", quantity: 1.5, unitPriceMinor: 1000 },
  ]);
  assert.equal(lines[0].description, "Service call");
  assert.equal(lineAmountMinor(1.5, 1000), 1500);
  assert.throws(() => validateCanonicalLines([]), /At least one line/);
  assert.throws(
    () => validateCanonicalLines([{ description: "Bad", quantity: 0, unitPriceMinor: 100 }]),
    /greater than zero/,
  );
  assert.throws(
    () => validateCanonicalLines([{ description: "Bad", quantity: 1, unitPriceMinor: -1 }]),
    /non-negative integer/,
  );
});

test("governed role capabilities reject unauthorized writes", () => {
  assert.doesNotThrow(() => assertRoleCapability("owner", "business_write"));
  assert.doesNotThrow(() => assertRoleCapability("dispatcher", "field_service"));
  assert.doesNotThrow(() => assertRoleCapability("accounting", "invoice_write"));
  assert.throws(() => assertRoleCapability("field_technician", "invoice_write"), /Forbidden/);
  assert.throws(() => assertRoleCapability("read_only", "business_write"), /Forbidden/);
});
