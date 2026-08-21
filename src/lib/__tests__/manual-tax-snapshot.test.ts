import assert from "node:assert/strict";
import test from "node:test";
import { assertTaxSnapshotReconciles, buildManualTaxSnapshot } from "@/lib/business/manual-tax-snapshot";

const calculatedAt = "2026-08-21T05:50:00.000Z";

test("builds a versioned manual tax snapshot with explicit provenance", () => {
  const snapshot = buildManualTaxSnapshot({
    lines: [
      { quantity: 2, unitPriceMinor: 2500, taxable: true },
      { quantity: 1, unitPriceMinor: 1000, taxable: false },
    ],
    taxRateBasisPoints: 700,
    jurisdictionState: "tn",
    jurisdictionLabel: "Account configured Tennessee profile",
    addressBasis: "service_location",
    configuredRevision: 3,
    calculatedAt,
  });

  assert.deepEqual(snapshot, {
    version: 1,
    calculationMode: "manual_configured_rate",
    taxableSubtotalMinor: 5000,
    nonTaxableSubtotalMinor: 1000,
    taxRateBasisPoints: 700,
    taxTotalMinor: 350,
    totalMinor: 6350,
    jurisdictionState: "TN",
    jurisdictionLabel: "Account configured Tennessee profile",
    addressBasis: "service_location",
    configuredRevision: 3,
    calculatedAt,
    roundingMethod: "nearest_minor_unit_half_up",
  });
  assert.equal(assertTaxSnapshotReconciles(snapshot), true);
});

test("rejects ambiguous or malformed jurisdiction provenance instead of guessing", () => {
  assert.throws(
    () =>
      buildManualTaxSnapshot({
        lines: [{ quantity: 1, unitPriceMinor: 1000, taxable: true }],
        taxRateBasisPoints: 700,
        jurisdictionState: "Tennessee",
        addressBasis: "service_location",
        configuredRevision: 1,
        calculatedAt,
      }),
    /two-letter code/,
  );
});

test("requires an explicit positive configuration revision", () => {
  assert.throws(
    () =>
      buildManualTaxSnapshot({
        lines: [{ quantity: 1, unitPriceMinor: 1000, taxable: true }],
        taxRateBasisPoints: 700,
        jurisdictionState: "TN",
        addressBasis: "ship_to",
        configuredRevision: 0,
        calculatedAt,
      }),
    /positive integer/,
  );
});

test("requires canonical ISO calculation timestamps for stable historical evidence", () => {
  assert.throws(
    () =>
      buildManualTaxSnapshot({
        lines: [{ quantity: 1, unitPriceMinor: 1000, taxable: true }],
        taxRateBasisPoints: 700,
        jurisdictionState: "TN",
        addressBasis: "delivery_address",
        configuredRevision: 1,
        calculatedAt: "2026-08-21",
      }),
    /canonical ISO timestamp/,
  );
});

test("detects a non-reconciling snapshot", () => {
  const snapshot = buildManualTaxSnapshot({
    lines: [{ quantity: 1, unitPriceMinor: 1000, taxable: true }],
    taxRateBasisPoints: 700,
    jurisdictionState: "TN",
    addressBasis: "service_location",
    configuredRevision: 1,
    calculatedAt,
  });

  assert.throws(() => assertTaxSnapshotReconciles({ ...snapshot, totalMinor: snapshot.totalMinor + 1 }), /does not reconcile/);
});
