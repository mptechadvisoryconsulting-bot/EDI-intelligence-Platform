import { lineAmountMinor, validateMoneyMinor } from "@/lib/business/canonical-validation";

export type ManualTaxLine = {
  quantity: number;
  unitPriceMinor: number;
  taxable: boolean;
};

export type ManualTaxCalculation = {
  taxableSubtotalMinor: number;
  nonTaxableSubtotalMinor: number;
  taxRateBasisPoints: number;
  taxTotalMinor: number;
  totalMinor: number;
};

/**
 * Validates an account-configured tax rate expressed in integer basis points.
 * For example, 700 basis points represents a 7.00% configured rate.
 */
export function validateTaxRateBasisPoints(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
    throw new Error("Tax rate must be an integer from 0 to 10000 basis points");
  }
  return value;
}

/**
 * Calculates a deterministic manual tax snapshot from canonical minor-unit lines.
 * This helper does not infer nexus, jurisdiction, sourcing, exemptions, or legal taxability.
 */
export function calculateManualTax(lines: ManualTaxLine[], taxRateBasisPoints: number): ManualTaxCalculation {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("At least one tax line is required");
  if (lines.length > 500) throw new Error("Too many tax lines in one calculation");

  const rate = validateTaxRateBasisPoints(taxRateBasisPoints);
  let taxableSubtotalMinor = 0;
  let nonTaxableSubtotalMinor = 0;

  for (const line of lines) {
    validateMoneyMinor(line.unitPriceMinor, "Unit price");
    const amountMinor = lineAmountMinor(line.quantity, line.unitPriceMinor);
    if (line.taxable) taxableSubtotalMinor += amountMinor;
    else nonTaxableSubtotalMinor += amountMinor;

    if (!Number.isSafeInteger(taxableSubtotalMinor) || !Number.isSafeInteger(nonTaxableSubtotalMinor)) {
      throw new Error("Tax subtotal is outside the supported range");
    }
  }

  const taxTotalMinor = Math.round((taxableSubtotalMinor * rate) / 10_000);
  if (!Number.isSafeInteger(taxTotalMinor) || taxTotalMinor < 0) {
    throw new Error("Tax total is outside the supported range");
  }

  const totalMinor = taxableSubtotalMinor + nonTaxableSubtotalMinor + taxTotalMinor;
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) {
    throw new Error("Tax calculation total is outside the supported range");
  }

  return {
    taxableSubtotalMinor,
    nonTaxableSubtotalMinor,
    taxRateBasisPoints: rate,
    taxTotalMinor,
    totalMinor,
  };
}
