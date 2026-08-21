import assert from "node:assert/strict";
import test from "node:test";
import { calculateManualTax, validateTaxRateBasisPoints } from "@/lib/business/manual-tax";

test("calculates tax only on taxable lines using integer minor units", () => {
  assert.deepEqual(
    calculateManualTax(
      [
        { quantity: 2, unitPriceMinor: 2500, taxable: true },
        { quantity: 1, unitPriceMinor: 1000, taxable: false },
      ],
      700,
    ),
    {
      taxableSubtotalMinor: 5000,
      nonTaxableSubtotalMinor: 1000,
      taxRateBasisPoints: 700,
      taxTotalMinor: 350,
      totalMinor: 6350,
    },
  );
});

test("rounds the transaction tax deterministically to the nearest minor unit", () => {
  const result = calculateManualTax([{ quantity: 1, unitPriceMinor: 1999, taxable: true }], 825);
  assert.equal(result.taxTotalMinor, 165);
  assert.equal(result.totalMinor, 2164);
});

test("keeps non-taxable sales out of the taxable subtotal", () => {
  const result = calculateManualTax([{ quantity: 3, unitPriceMinor: 1200, taxable: false }], 975);
  assert.equal(result.taxableSubtotalMinor, 0);
  assert.equal(result.nonTaxableSubtotalMinor, 3600);
  assert.equal(result.taxTotalMinor, 0);
  assert.equal(result.totalMinor, 3600);
});

test("keeps tax rounding exact when subtotal times rate exceeds safe integer multiplication", () => {
  const result = calculateManualTax([{ quantity: 1, unitPriceMinor: 1_000_000_000_000, taxable: true }], 10_000);
  assert.equal(result.taxTotalMinor, 1_000_000_000_000);
  assert.equal(result.totalMinor, 2_000_000_000_000);
});

test("preserves the prior large-value rounding boundary exactly", () => {
  const result = calculateManualTax([{ quantity: 1, unitPriceMinor: 9_004_497_905_368_333, taxable: true }], 3);
  assert.equal(result.taxTotalMinor, 2_701_349_371_610);
  assert.equal(result.totalMinor, 9_007_199_254_739_943);
});

test("rejects fractional quantities before floating-point line rounding can alter minor units", () => {
  assert.throws(
    () => calculateManualTax([{ quantity: 1.005, unitPriceMinor: 100, taxable: true }], 700),
    /quantity must be a positive integer/,
  );
});

test("rejects unsupported configured rates instead of guessing", () => {
  assert.throws(() => validateTaxRateBasisPoints(-1), /Tax rate/);
  assert.throws(() => validateTaxRateBasisPoints(10_001), /Tax rate/);
  assert.throws(() => validateTaxRateBasisPoints(700.5), /Tax rate/);
});

test("rejects empty calculations", () => {
  assert.throws(() => calculateManualTax([], 700), /At least one tax line/);
});
