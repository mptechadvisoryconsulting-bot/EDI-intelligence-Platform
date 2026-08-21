import { calculateManualTax, type ManualTaxLine } from "@/lib/business/manual-tax";

export type TaxAddressBasis = "ship_to" | "service_location" | "delivery_address";

export type ManualTaxSnapshotInput = {
  lines: ManualTaxLine[];
  taxRateBasisPoints: number;
  jurisdictionState: string;
  jurisdictionLabel?: string | null;
  addressBasis: TaxAddressBasis;
  configuredRevision: number;
  calculatedAt: string;
};

export type ManualTaxSnapshot = {
  version: 1;
  calculationMode: "manual_configured_rate";
  taxableSubtotalMinor: number;
  nonTaxableSubtotalMinor: number;
  taxRateBasisPoints: number;
  taxTotalMinor: number;
  totalMinor: number;
  jurisdictionState: string;
  jurisdictionLabel: string | null;
  addressBasis: TaxAddressBasis;
  configuredRevision: number;
  calculatedAt: string;
  roundingMethod: "nearest_minor_unit_half_up";
};

function normalizeState(value: string) {
  const state = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) {
    throw new Error("Tax jurisdiction state must be a two-letter code");
  }
  return state;
}

function normalizeLabel(value: string | null | undefined) {
  if (value == null) return null;
  const label = value.trim();
  if (!label) return null;
  if (label.length > 160) throw new Error("Tax jurisdiction label is too long");
  return label;
}

function validateCalculatedAt(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("Tax calculation timestamp is invalid");
  const normalized = new Date(timestamp).toISOString();
  if (normalized !== value) {
    throw new Error("Tax calculation timestamp must be a canonical ISO timestamp");
  }
  return value;
}

/**
 * Builds the immutable data payload that should be snapshotted onto a transaction
 * when an account explicitly uses its own configured manual tax rate.
 *
 * This function does not determine nexus, source a jurisdiction, infer taxability,
 * or look up tax rates. Those are governed account-policy/provider responsibilities.
 */
export function buildManualTaxSnapshot(input: ManualTaxSnapshotInput): ManualTaxSnapshot {
  if (!Number.isSafeInteger(input.configuredRevision) || input.configuredRevision <= 0) {
    throw new Error("Tax configuration revision must be a positive integer");
  }

  const calculation = calculateManualTax(input.lines, input.taxRateBasisPoints);

  return {
    version: 1,
    calculationMode: "manual_configured_rate",
    taxableSubtotalMinor: calculation.taxableSubtotalMinor,
    nonTaxableSubtotalMinor: calculation.nonTaxableSubtotalMinor,
    taxRateBasisPoints: calculation.taxRateBasisPoints,
    taxTotalMinor: calculation.taxTotalMinor,
    totalMinor: calculation.totalMinor,
    jurisdictionState: normalizeState(input.jurisdictionState),
    jurisdictionLabel: normalizeLabel(input.jurisdictionLabel),
    addressBasis: input.addressBasis,
    configuredRevision: input.configuredRevision,
    calculatedAt: validateCalculatedAt(input.calculatedAt),
    roundingMethod: "nearest_minor_unit_half_up",
  };
}

export function assertTaxSnapshotReconciles(snapshot: ManualTaxSnapshot) {
  const expectedTotal = snapshot.taxableSubtotalMinor + snapshot.nonTaxableSubtotalMinor + snapshot.taxTotalMinor;
  if (!Number.isSafeInteger(expectedTotal) || expectedTotal !== snapshot.totalMinor) {
    throw new Error("Tax snapshot does not reconcile to its transaction total");
  }
  return true;
}
