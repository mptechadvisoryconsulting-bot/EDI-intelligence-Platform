import type { ErpLayoutField } from "./types";

export type SampleVerificationRow = {
  interfaceColumn: string;
  fieldName: string;
  recNumber: number | null;
  startPosition: number | null;
  width: number | null;
  extractedValue: string;
  rawSlice: string;
  lineIndex: number | null;
  lineLength: number | null;
  status: "ok" | "empty" | "out_of_range" | "missing_record" | "no_layout_position" | "non_positional";
  message: string;
};

export type SampleVerificationReport = {
  fileName: string | null;
  lineCount: number;
  recordLineMap: Record<number, number>;
  rows: SampleVerificationRow[];
  okCount: number;
  issueCount: number;
  summary: string;
};

function normalizeSampleText(text: string): string {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

/** Group physical file lines by record number (1-based). Default: line N = record N. */
export function buildRecordLineMap(lines: string[]): Record<number, number> {
  const map: Record<number, number> = {};
  lines.forEach((line, index) => {
    const rec = index + 1;
    if (line.trim().length > 0 && map[rec] == null) {
      map[rec] = index;
    }
  });
  return map;
}

function extractAtPosition(line: string, startColumn: number, width: number) {
  const start = startColumn - 1;
  const end = start + width;
  if (start < 0) return { raw: "", value: "", outOfRange: true };
  if (start >= line.length) return { raw: "", value: "", outOfRange: true };
  const raw = line.slice(start, Math.min(end, line.length));
  return { raw, value: raw.trim(), outOfRange: end > line.length };
}

export function verifyLayoutAgainstSample(
  fields: ErpLayoutField[],
  sampleText: string | null | undefined,
  fileName?: string | null
): SampleVerificationReport | null {
  if (!sampleText?.trim()) return null;

  const lines = normalizeSampleText(sampleText)
    .split("\n")
    .filter((l) => l.length > 0);

  const recordLineMap = buildRecordLineMap(lines);
  const rows: SampleVerificationRow[] = [];

  for (const field of fields) {
    const style = field.interfaceStyle ?? "positional";
    if (style !== "positional") {
      rows.push({
        interfaceColumn: field.interfaceColumn,
        fieldName: field.fieldName,
        recNumber: field.recNumber ?? null,
        startPosition: field.startPosition ?? null,
        width: field.charLimit ?? null,
        extractedValue: "",
        rawSlice: "",
        lineIndex: null,
        lineLength: null,
        status: "non_positional",
        message: `${style} field — position verification not applicable`,
      });
      continue;
    }

    if (field.recNumber == null || field.startPosition == null || field.charLimit == null) {
      rows.push({
        interfaceColumn: field.interfaceColumn,
        fieldName: field.fieldName,
        recNumber: field.recNumber ?? null,
        startPosition: field.startPosition ?? null,
        width: field.charLimit ?? null,
        extractedValue: "",
        rawSlice: "",
        lineIndex: null,
        lineLength: null,
        status: "no_layout_position",
        message: "Layout missing Rec Number, Start Column, or Width",
      });
      continue;
    }

    const lineIndex = recordLineMap[field.recNumber];
    if (lineIndex == null) {
      rows.push({
        interfaceColumn: field.interfaceColumn,
        fieldName: field.fieldName,
        recNumber: field.recNumber,
        startPosition: field.startPosition,
        width: field.charLimit,
        extractedValue: "",
        rawSlice: "",
        lineIndex: null,
        lineLength: null,
        status: "missing_record",
        message: `Sample file has no line for record ${field.recNumber}`,
      });
      continue;
    }

    const line = lines[lineIndex];
    const { raw, value, outOfRange } = extractAtPosition(line, field.startPosition, field.charLimit);

    let status: SampleVerificationRow["status"] = "ok";
    let message = "Extracted sample value at defined position";

    if (outOfRange) {
      status = "out_of_range";
      message = `Start ${field.startPosition} + width ${field.charLimit} exceeds line length ${line.length}`;
    } else if (!value) {
      status = "empty";
      message = "Position is blank or whitespace in sample file";
    }

    rows.push({
      interfaceColumn: field.interfaceColumn,
      fieldName: field.fieldName,
      recNumber: field.recNumber,
      startPosition: field.startPosition,
      width: field.charLimit,
      extractedValue: value,
      rawSlice: raw,
      lineIndex,
      lineLength: line.length,
      status,
      message,
    });
  }

  const okCount = rows.filter((r) => r.status === "ok").length;
  const issueCount = rows.filter(
    (r) => !["ok", "non_positional"].includes(r.status)
  ).length;

  return {
    fileName: fileName ?? null,
    lineCount: lines.length,
    recordLineMap,
    rows,
    okCount,
    issueCount,
    summary:
      issueCount === 0
        ? `${okCount} positional fields verified against sample output.`
        : `${okCount} OK · ${issueCount} issue(s) — review Rec/Start/Width or sample file structure.`,
  };
}
