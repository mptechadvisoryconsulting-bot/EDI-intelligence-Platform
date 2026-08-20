import { extractTextFromBuffer } from "@/lib/parsers/extract-text";
import { parseErpLayoutBuffer } from "./parser";
import type { ErpLayoutField } from "./types";

const ORACLE_REPORT_MARKERS = [
  "transaction layout definition report",
  "interface column",
  "record layout",
];

function parseNumber(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isOracleTransactionLayoutReport(text: string): boolean {
  const normalized = text.toLowerCase();
  return ORACLE_REPORT_MARKERS.every((marker) => normalized.includes(marker));
}

/**
 * Parse Oracle E-Commerce Gateway "Transaction Layout Definition Report" rows.
 *
 * Typical data rows look like:
 *   CUSTOMER_PO_NUMBER  1000  50  50  VARCHAR2  118  PO  PO1
 * or, when a sequence column is present:
 *   OPERATION_CODE_EXT1 1000  40  5   VARCHAR2  113  1  PO  PO1
 *
 * The parser deliberately requires the Oracle report markers above so ordinary
 * TXT/PDF documents are never mistaken for an ERP layout.
 */
export function parseOracleTransactionLayoutReport(text: string): ErpLayoutField[] {
  if (!isOracleTransactionLayoutReport(text)) return [];

  const fields: ErpLayoutField[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^[-\f]/.test(line)) continue;

    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length < 6) continue;

    // Locate the Oracle data type first. Everything immediately before it is
    // Rec / Pos / Width; the token after it is Start Col.
    const typeIndex = tokens.findIndex((token) =>
      /^(?:VARCHAR2?|CHAR|NUMBER|DATE|INTEGER|DECIMAL|RAW|LONG|CLOB|BLOB)$/i.test(token)
    );
    if (typeIndex < 4 || typeIndex + 1 >= tokens.length) continue;

    const recNumber = parseNumber(tokens[typeIndex - 3]);
    const position = parseNumber(tokens[typeIndex - 2]);
    const width = parseNumber(tokens[typeIndex - 1]);
    const startPosition = parseNumber(tokens[typeIndex + 1]);
    if (recNumber == null || position == null || width == null || startPosition == null) continue;

    const prefix = tokens.slice(0, typeIndex - 3);
    if (prefix.length === 0) continue;

    // Oracle reports can include an "Ext Table" column between Interface Column
    // and Rec Num. Interface names themselves do not contain spaces, so use the
    // first token as the stable source-field identity.
    const interfaceColumn = prefix[0];
    if (!/^[A-Za-z][A-Za-z0-9_$#]*$/.test(interfaceColumn)) continue;

    const trailing = tokens.slice(typeIndex + 2);
    const code = trailing.length >= 2 ? trailing[trailing.length - 2] : undefined;
    const qualifier = trailing.length >= 1 ? trailing[trailing.length - 1] : undefined;
    const key = `${interfaceColumn}|${recNumber}|${startPosition}|${width}`;
    if (seen.has(key)) continue;
    seen.add(key);

    fields.push({
      fieldName: interfaceColumn,
      interfaceColumn,
      interfaceStyle: "positional",
      recordType: code && qualifier ? `${code}/${qualifier}` : qualifier ?? code,
      recNumber,
      startPosition,
      charLimit: width,
      dataType: tokens[typeIndex].toUpperCase(),
      description: `Oracle layout position ${position}`,
      sortOrder: fields.length,
    });
  }

  return fields;
}

export async function parseUploadedErpLayout(
  buffer: Buffer,
  filename: string,
  mimeType = "application/octet-stream"
): Promise<ErpLayoutField[]> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "txt" || ext === "dat" || ext === "out" || ext === "flat") {
    const text = buffer.toString("utf8");
    const oracleFields = parseOracleTransactionLayoutReport(text);
    if (oracleFields.length > 0) return oracleFields;
  }

  if (ext === "pdf" || mimeType === "application/pdf") {
    const { text } = await extractTextFromBuffer(buffer, filename, mimeType);
    const oracleFields = parseOracleTransactionLayoutReport(text);
    if (oracleFields.length > 0) return oracleFields;
    return [];
  }

  return parseErpLayoutBuffer(buffer, filename);
}
