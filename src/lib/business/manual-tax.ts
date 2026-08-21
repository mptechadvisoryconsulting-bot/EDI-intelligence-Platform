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

function roundedTaxMinor(taxableSubtotalMinor: number, rateBasisPoints: number) {
  const numerator = BigInt(taxableSubtotalMinor) * BigInt(rateBasisPoints);
  const divisor = BigInt(10_000);
  const rounded = (numerator + divisor / BigInt(2)) / divisor;

  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Tax total is outside the supported range");
  }

  return Number(rounded);
}

/**
 * Calculates a deterministic manual tax snapshot from canonical minor-unit lines.
 * Quantities are intentionally restricted to positive safe integers so line amounts
 * cannot lose minor-unit precision before the exact BigInt tax calculation begins.
 * Runtime taxability must be an explicit boolean; malformed truthy/falsy values fail closed.
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
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("Tax line quantity must be a positive integer");
    }
    if (typeof line.taxable !== "boolean") {
      throw new Error("Tax line taxable flag must be a boolean");
    }
    const amountMinor = lineAmountMinor(line.quantity, line.unitPriceMinor);
    if (line.taxable) taxableSubtotalMinor += amountMinor;
    else nonTaxableSubtotalMinor += amountMinor;

    if (!Number.isSafeInteger(taxableSubtotalMinor) || !Number.isSafeInteger(nonTaxableSubtotalMinor)) {
      throw new Error("Tax subtotal is outside the supported range");
    }
  }

  const taxTotalMinor = roundedTaxMinor(taxableSubtotalMinor, rate);
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
