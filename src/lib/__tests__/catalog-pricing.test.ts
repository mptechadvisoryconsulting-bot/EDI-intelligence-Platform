import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalogPriceAuditMetadata } from "@/lib/business/catalog-pricing";

test("captures price and active-state changes without mutating historical values", () => {
  assert.deepEqual(
    buildCatalogPriceAuditMetadata({
      sku: "PART-100",
      oldUnitPriceMinor: 1299,
      newUnitPriceMinor: 1499,
      oldActive: true,
      newActive: true,
    }),
    {
      sku: "PART-100",
      oldUnitPriceMinor: 1299,
      newUnitPriceMinor: 1499,
      priceChanged: true,
      oldActive: true,
      newActive: true,
      activeChanged: false,
    },
  );
});

test("new catalog items are distinguished from price changes", () => {
  assert.deepEqual(
    buildCatalogPriceAuditMetadata({
      sku: "SERVICE-1",
      oldUnitPriceMinor: null,
      newUnitPriceMinor: 5000,
      oldActive: null,
      newActive: true,
    }),
    {
      sku: "SERVICE-1",
      oldUnitPriceMinor: null,
      newUnitPriceMinor: 5000,
      priceChanged: false,
      oldActive: null,
      newActive: true,
      activeChanged: false,
    },
  );
});

test("captures catalog activation changes independently from price changes", () => {
  const metadata = buildCatalogPriceAuditMetadata({
    sku: "PART-200",
    oldUnitPriceMinor: 2500,
    newUnitPriceMinor: 2500,
    oldActive: true,
    newActive: false,
  });

  assert.equal(metadata.priceChanged, false);
  assert.equal(metadata.activeChanged, true);
});
