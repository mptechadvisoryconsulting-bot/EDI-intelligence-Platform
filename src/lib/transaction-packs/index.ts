import { PACK_810 } from "./810";
import { PACK_820 } from "./820";
import { PACK_846 } from "./846";
import { PACK_850 } from "./850";
import { PACK_855 } from "./855";
import { PACK_856 } from "./856";
import { PACK_860 } from "./860";
import { PACK_997 } from "./997";
import type { TransactionPack } from "./types";

export const TRANSACTION_PACKS: Record<string, TransactionPack> = {
  "846": PACK_846,
  "850": PACK_850,
  "855": PACK_855,
  "856": PACK_856,
  "810": PACK_810,
  "997": PACK_997,
  "860": PACK_860,
  "820": PACK_820,
};

/** Common retail / supplier onboarding bundle */
export const RETAIL_TRANSACTION_BUNDLE = ["846", "850", "855", "856", "810"] as const;

export const SUPPORTED_TRANSACTION_CODES = Object.keys(TRANSACTION_PACKS);

export function parseTransactionCodes(transactions: string): string[] {
  return transactions
    .split(/[,;/\s]+/)
    .map((t) => t.trim().replace(/^0+/, "").padStart(3, "0"))
    .filter((t) => /^\d{3}$/.test(t));
}

export function resolveTransactionPacks(transactions: string): TransactionPack[] {
  const codes = parseTransactionCodes(transactions);
  const unique = [...new Set(codes)];

  return unique
    .map((code) => TRANSACTION_PACKS[code])
    .filter((pack): pack is TransactionPack => Boolean(pack));
}

export function getUnsupportedCodes(transactions: string): string[] {
  const codes = parseTransactionCodes(transactions);
  return [...new Set(codes.filter((code) => !TRANSACTION_PACKS[code]))];
}

export function describeTransactionCoverage(transactions: string): string {
  const packs = resolveTransactionPacks(transactions);
  const unsupported = getUnsupportedCodes(transactions);

  if (packs.length === 0 && unsupported.length === 0) {
    return "No transaction codes configured.";
  }

  const supported = packs.map((p) => `${p.code} ${p.name}`).join(", ");
  const missing = unsupported.length ? ` Unsupported packs not yet loaded: ${unsupported.join(", ")}.` : "";

  return `Active transaction packs: ${supported || "none"}.${missing}`;
}

export function isRetailBundle(transactions: string): boolean {
  const codes = new Set(parseTransactionCodes(transactions));
  return RETAIL_TRANSACTION_BUNDLE.every((code) => codes.has(code));
}

export * from "./types";
