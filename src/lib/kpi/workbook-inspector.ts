import * as XLSX from "xlsx";

export type WorkbookSheetRole =
  | "dashboard"
  | "source_data"
  | "staging"
  | "report"
  | "support"
  | "unknown";

export type WorkbookSheetPreview = {
  name: string;
  role: WorkbookSheetRole;
  headerRow: number | null;
  headers: string[];
  rowCount: number;
  columnCount: number;
  sourceScore: number;
  confidence: number;
};

export type WorkbookInspection = {
  kind: "kpi_workbook";
  sheets: WorkbookSheetPreview[];
  candidateSourceSheets: WorkbookSheetPreview[];
  dashboardSheets: string[];
  reportSheets: string[];
  warnings: string[];
};

const MAX_INSPECT_ROWS = 200;
const MAX_INSPECT_COLUMNS = 100;
const MAX_HEADER_SCAN_ROWS = 30;

const FIELD_HINTS = [
  "date",
  "month",
  "year",
  "partner",
  "customer",
  "transaction",
  "status",
  "error",
  "errors",
  "fine",
  "fines",
  "reimport",
  "re-import",
  "count",
  "total",
  "amount",
  "open",
  "fixed",
  "resolved",
  "type",
];

function normalized(value: unknown) {
  return String(value ?? "").trim();
}

function normalizedName(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function roleFromName(name: string): WorkbookSheetRole | null {
  const value = normalizedName(name);
  if (/\bdashboard\b|\bscorecard\b/.test(value)) return "dashboard";
  if (/\bstag(e|ing)\b|\bimport staging\b|\braw import\b/.test(value)) return "staging";
  if (/\ball data\b|\bsource data\b|\braw data\b|\bhistory\b|\bhistorical\b|\bdata extract\b/.test(value)) {
    return "source_data";
  }
  if (/\breport\b|\bmonthly\b|\bfines?\b|\berrors?\b/.test(value)) return "report";
  if (/\bqa\b|\bautomation\b|\blookup\b|\bconfig\b|\bsettings?\b|\bhelper\b/.test(value)) return "support";
  return null;
}

function usedRange(sheet: XLSX.WorkSheet) {
  const ref = sheet["!ref"];
  if (!ref) return null;
  try {
    return XLSX.utils.decode_range(ref);
  } catch {
    return null;
  }
}

function rowValues(sheet: XLSX.WorkSheet, range: XLSX.Range) {
  const endRow = Math.min(range.e.r, range.s.r + MAX_INSPECT_ROWS - 1);
  const endColumn = Math.min(range.e.c, range.s.c + MAX_INSPECT_COLUMNS - 1);
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    range: {
      s: { r: range.s.r, c: range.s.c },
      e: { r: endRow, c: endColumn },
    },
  }) as unknown[][];
}

function headerCandidateScore(row: unknown[], followingRows: unknown[][]) {
  const values = row.map(normalized);
  const nonEmpty = values.filter(Boolean);
  if (nonEmpty.length < 2) return -1;

  const unique = new Set(nonEmpty.map((value) => value.toLowerCase())).size;
  const stringLike = nonEmpty.filter((value) => /[A-Za-z]/.test(value)).length;
  const hintCount = nonEmpty.filter((value) => {
    const lower = value.toLowerCase();
    return FIELD_HINTS.some((hint) => lower.includes(hint));
  }).length;

  const widths = followingRows.slice(0, 12).map((candidate) => candidate.map(normalized).filter(Boolean).length);
  const consistentRows = widths.filter((width) => width >= Math.max(2, Math.floor(nonEmpty.length * 0.5))).length;

  return nonEmpty.length * 2 + unique + stringLike + hintCount * 3 + consistentRows * 2;
}

function detectHeader(rows: unknown[][]) {
  let bestIndex: number | null = null;
  let bestScore = -1;
  const limit = Math.min(rows.length, MAX_HEADER_SCAN_ROWS);

  for (let index = 0; index < limit; index += 1) {
    const score = headerCandidateScore(rows[index] ?? [], rows.slice(index + 1));
    if (score > bestScore) {
      bestScore = score;
      bestIndex = score >= 6 ? index : null;
    }
  }

  if (bestIndex == null) return { headerRow: null, headers: [] as string[], score: 0 };
  const headers = (rows[bestIndex] ?? [])
    .map(normalized)
    .map((header, index) => header || `Column ${index + 1}`);

  return { headerRow: bestIndex, headers, score: bestScore };
}

function tabularScore(rows: unknown[][], headerRow: number | null, headerCount: number) {
  if (headerRow == null || headerCount < 2) return 0;
  const dataRows = rows.slice(headerRow + 1);
  const populated = dataRows.filter((row) => row.map(normalized).filter(Boolean).length >= Math.max(2, Math.floor(headerCount * 0.4)));
  return Math.min(30, populated.length * 2);
}

function sourceScore(name: string, role: WorkbookSheetRole, rows: unknown[][], headerRow: number | null, headers: string[]) {
  let score = tabularScore(rows, headerRow, headers.length);
  const lowerHeaders = headers.map((header) => header.toLowerCase());
  score += Math.min(
    30,
    lowerHeaders.filter((header) => FIELD_HINTS.some((hint) => header.includes(hint))).length * 4
  );

  const namedRole = roleFromName(name);
  if (namedRole === "source_data") score += 30;
  if (namedRole === "staging") score += 12;
  if (namedRole === "report") score += 5;
  if (namedRole === "dashboard") score -= 35;
  if (namedRole === "support") score -= 20;
  if (role === "source_data") score += 10;

  return Math.max(0, Math.min(100, score));
}

function inferredRole(name: string, score: number, headerCount: number): WorkbookSheetRole {
  const named = roleFromName(name);
  if (named) return named;
  if (score >= 35 && headerCount >= 2) return "source_data";
  return "unknown";
}

function inspectSheet(name: string, sheet: XLSX.WorkSheet): WorkbookSheetPreview {
  const range = usedRange(sheet);
  if (!range) {
    return {
      name,
      role: roleFromName(name) ?? "unknown",
      headerRow: null,
      headers: [],
      rowCount: 0,
      columnCount: 0,
      sourceScore: 0,
      confidence: 0,
    };
  }

  const rows = rowValues(sheet, range);
  const detected = detectHeader(rows);
  const preliminaryRole = roleFromName(name) ?? "unknown";
  const score = sourceScore(name, preliminaryRole, rows, detected.headerRow, detected.headers);
  const role = inferredRole(name, score, detected.headers.length);

  return {
    name,
    role,
    headerRow: detected.headerRow == null ? null : range.s.r + detected.headerRow + 1,
    headers: detected.headers,
    rowCount: range.e.r - range.s.r + 1,
    columnCount: range.e.c - range.s.c + 1,
    sourceScore: score,
    confidence: Math.min(1, Math.round((score / 100) * 100) / 100),
  };
}

/**
 * Inspect every worksheet and propose likely source sheets without importing or
 * persisting any workbook rows. This is intentionally deterministic: later AI
 * suggestions may enrich the preview but cannot bypass confirmation or lineage.
 */
export function inspectKpiWorkbook(buffer: Buffer): WorkbookInspection {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    cellFormula: false,
    cellHTML: false,
    cellNF: false,
    cellStyles: false,
    dense: false,
  });

  const sheets = workbook.SheetNames.map((name) => inspectSheet(name, workbook.Sheets[name]));
  const candidateSourceSheets = sheets
    .filter((sheet) => sheet.sourceScore >= 25 && sheet.role !== "dashboard" && sheet.role !== "support")
    .sort((left, right) => right.sourceScore - left.sourceScore || left.name.localeCompare(right.name));

  const warnings: string[] = [];
  if (sheets.length === 0) warnings.push("Workbook contains no worksheets");
  if (candidateSourceSheets.length === 0) {
    warnings.push("No reliable source-data sheet was detected; review the workbook structure manually");
  }

  return {
    kind: "kpi_workbook",
    sheets,
    candidateSourceSheets,
    dashboardSheets: sheets.filter((sheet) => sheet.role === "dashboard").map((sheet) => sheet.name),
    reportSheets: sheets.filter((sheet) => sheet.role === "report").map((sheet) => sheet.name),
    warnings,
  };
}
