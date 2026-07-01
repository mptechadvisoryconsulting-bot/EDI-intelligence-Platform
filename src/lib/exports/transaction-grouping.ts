import { TRANSACTION_PACKS, parseTransactionCodes } from "@/lib/transaction-packs";
import type { MappingRow } from "./enrich-mappings";

/** Envelope / interchange segments included on every transaction MRS sheet */
const ENVELOPE_SEGMENTS = new Set(["ISA", "GS", "GE", "IEA", "ST", "SE"]);

/** Shared party/reference segments duplicated onto each active transaction sheet */
const SHARED_SEGMENTS = new Set(["N1", "N2", "N3", "N4", "REF", "DTM", "PER", "MSG"]);

/** Segments that strongly indicate a specific X12 transaction set */
const SIGNATURE_SEGMENTS: Record<string, string[]> = {
  "850": ["BEG", "PO1", "CTT", "SAC", "PID"],
  "855": ["BAK", "ACK", "CSH"],
  "856": ["BSN", "HL", "MAN", "SN1", "PRF", "TD1", "TD3", "TD5", "CLD"],
  "810": ["BIG", "IT1", "TDS", "CAD", "ISS", "TXI"],
  "846": ["BIA", "LIN", "SLN", "QTY", "UIT"],
};

function mappingKey(m: MappingRow) {
  return `${m.targetSegment}.${m.targetElement}${m.qualifier ? `:${m.qualifier}` : ""}`;
}

function packsContainingField(
  code: string,
  m: MappingRow
): boolean {
  const pack = TRANSACTION_PACKS[code];
  if (!pack) return false;
  return pack.fields.some(
    (f) =>
      f.segment === m.targetSegment &&
      f.element === m.targetElement &&
      (f.qualifier ?? null) === (m.qualifier ?? null)
  );
}

function transactionFromStConstant(m: MappingRow, codes: string[]): string | null {
  if (m.targetSegment !== "ST" || m.targetElement !== "01") return null;
  const haystack = `${m.transformation ?? ""} ${m.sourceField ?? ""}`;
  for (const code of codes) {
    if (haystack.includes(code)) return code;
  }
  return null;
}

export function resolveMappingTransaction(m: MappingRow, activeCodes: string[]): string | null {
  const st = transactionFromStConstant(m, activeCodes);
  if (st) return st;

  for (const code of activeCodes) {
    const signatures = SIGNATURE_SEGMENTS[code] ?? [];
    if (signatures.includes(m.targetSegment)) return code;
  }

  const packMatches = activeCodes.filter((code) => packsContainingField(code, m));
  if (packMatches.length === 1) return packMatches[0];

  if (ENVELOPE_SEGMENTS.has(m.targetSegment) || SHARED_SEGMENTS.has(m.targetSegment)) {
    return null;
  }

  return packMatches[0] ?? null;
}

export function groupMappingsByTransaction(
  mappings: MappingRow[],
  projectTransactions: string
): Map<string, MappingRow[]> {
  const codes = parseTransactionCodes(projectTransactions);
  const groups = new Map<string, MappingRow[]>();
  for (const code of codes) groups.set(code, []);

  if (codes.length === 0) {
    groups.set("ALL", [...mappings]);
    return groups;
  }

  for (const mapping of mappings) {
    const tx = resolveMappingTransaction(mapping, codes);

    if (tx && groups.has(tx)) {
      groups.get(tx)!.push(mapping);
      continue;
    }

    if (
      ENVELOPE_SEGMENTS.has(mapping.targetSegment) ||
      SHARED_SEGMENTS.has(mapping.targetSegment)
    ) {
      for (const code of codes) {
        groups.get(code)!.push(mapping);
      }
      continue;
    }

    const fallback = codes[0];
    if (fallback) groups.get(fallback)!.push(mapping);
  }

  return groups;
}

export function dedupeMappings(rows: MappingRow[]): MappingRow[] {
  const seen = new Set<string>();
  const out: MappingRow[] = [];
  for (const row of rows) {
    const key = mappingKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function activeTransactionCodes(projectTransactions: string): string[] {
  return parseTransactionCodes(projectTransactions);
}
