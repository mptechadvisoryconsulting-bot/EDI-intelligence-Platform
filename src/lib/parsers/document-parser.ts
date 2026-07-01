import type { ParsedDocument, ParsedSourceField, ParsedTargetField } from "@/lib/types/parsing";
import { parseEdiText } from "@/lib/edi/parse";
import { extractTextFromBuffer } from "@/lib/parsers/extract-text";
import {
  extractTestScenariosFromText,
  parseTestScenariosFromCsv,
} from "@/lib/parsers/test-scenario-parser";
import { isErpLayoutFile, layoutFieldsToSourceFields, parseErpLayoutFile } from "@/lib/erp-layout";

const SEGMENT_ELEMENT_PATTERN = /\b([A-Z]{2,3})\*?(\d{2,3})\b/g;
const SEGMENT_DOT_PATTERN = /\b([A-Z]{2,3})\.(\d{2,3})\b/g;
const QUALIFIER_PATTERN = /\b([A-Z]{2,3})\*([A-Z0-9]{1,4})\*(\d{2,3})\b/g;

function uniqueFields(fields: ParsedTargetField[]) {
  const seen = new Set<string>();
  return fields.filter((f) => {
    const key = `${f.segment}.${f.element}${f.qualifier ? `:${f.qualifier}` : ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractTargetFieldsFromText(text: string): ParsedTargetField[] {
  const fields: ParsedTargetField[] = [];

  for (const match of text.matchAll(SEGMENT_DOT_PATTERN)) {
    fields.push({
      segment: match[1],
      element: match[2],
      description: "Referenced in guide text",
    });
  }

  for (const match of text.matchAll(SEGMENT_ELEMENT_PATTERN)) {
    fields.push({
      segment: match[1],
      element: match[2],
      description: "Referenced in guide text",
    });
  }

  for (const match of text.matchAll(QUALIFIER_PATTERN)) {
    fields.push({
      segment: match[1],
      element: match[3],
      qualifier: match[2],
      description: `Qualifier ${match[2]} usage noted in guide`,
    });
  }

  const requiredLines = text.split(/\r?\n/).filter((line) => /required|mandatory/i.test(line));
  for (const line of requiredLines) {
    const segMatch = line.match(/\b([A-Z]{2,3})[\*\.](\d{2,3})\b/);
    if (segMatch) {
      fields.push({
        segment: segMatch[1],
        element: segMatch[2],
        required: true,
        description: line.trim().slice(0, 120),
      });
    }
  }

  return uniqueFields(fields);
}

function extractSegmentsFromEdi(text: string): { segments: string[]; transactionSets: string[]; targetFields: ParsedTargetField[] } {
  const messages = parseEdiText(text);
  const segments = new Set<string>();
  const transactionSets = new Set<string>();
  const targetFields: ParsedTargetField[] = [];

  for (const message of messages) {
    if (message.transactionSet) transactionSets.add(message.transactionSet);
    for (const row of message.segments) {
      segments.add(row.segment);
      for (let i = 0; i < row.elements.length; i++) {
        const element = String(i + 1).padStart(2, "0");
        targetFields.push({
          segment: row.segment,
          element,
          qualifier: row.qualifier,
          description: row.elements[i] ? `Sample value: ${row.elements[i].slice(0, 40)}` : undefined,
        });
      }
    }
  }

  return {
    segments: [...segments],
    transactionSets: [...transactionSets],
    targetFields: uniqueFields(targetFields),
  };
}

function finalizeDoc(doc: Omit<ParsedDocument, "testScenarios">, fullText?: string): ParsedDocument {
  const text = fullText ?? doc.rawExcerpt;
  const csvScenarios = doc.kind.includes("csv") || doc.kind === "source_extract" ? parseTestScenariosFromCsv(text) : [];
  const textScenarios = extractTestScenariosFromText(text);
  const testScenarios = csvScenarios.length > 0 ? csvScenarios : textScenarios;

  return { ...doc, testScenarios };
}

function parseCsv(text: string, docType: string): ParsedDocument {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) {
    return emptyParsed(docType, "CSV file is empty");
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  const isMappingSheet =
    lowerHeaders.some((h) => h.includes("segment")) &&
    lowerHeaders.some((h) => h.includes("element"));

  if (isMappingSheet) {
    const segIdx = lowerHeaders.findIndex((h) => h.includes("segment"));
    const elIdx = lowerHeaders.findIndex((h) => h.includes("element"));
    const srcIdx = lowerHeaders.findIndex((h) => h.includes("source"));
    const qualIdx = lowerHeaders.findIndex((h) => h.includes("qualifier"));

    const targetFields: ParsedTargetField[] = [];
    for (const line of lines.slice(1)) {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (!cols[segIdx] || !cols[elIdx]) continue;
      targetFields.push({
        segment: cols[segIdx].toUpperCase(),
        element: cols[elIdx].padStart(2, "0"),
        qualifier: qualIdx >= 0 ? cols[qualIdx] || undefined : undefined,
        description: srcIdx >= 0 ? `Mapped from ${cols[srcIdx]}` : undefined,
      });
    }

    return finalizeDoc(
      {
        kind: "mapping_sheet",
        targetFields: uniqueFields(targetFields),
        sourceFields: [],
        segments: [...new Set(targetFields.map((f) => f.segment))],
        transactionSets: [],
        rawExcerpt: lines.slice(0, 5).join("\n"),
        warnings: [],
      },
      text
    );
  }

  const testCsv = parseTestScenariosFromCsv(text);
  if (testCsv.length > 0 || docType === "test_spec") {
    return finalizeDoc(
      {
        kind: "test_spec",
        targetFields: [],
        sourceFields: [],
        segments: [],
        transactionSets: [],
        rawExcerpt: lines.slice(0, 8).join("\n"),
        warnings: testCsv.length === 0 ? ["No test scenarios found in CSV columns"] : [],
      },
      text
    );
  }

  if (isErpLayoutFile(text) || docType === "erp_layout") {
    const layoutFields = parseErpLayoutFile(text, "layout.csv");
    const sourceFields = layoutFieldsToSourceFields(layoutFields);
    return finalizeDoc(
      {
        kind: "erp_layout",
        targetFields: [],
        sourceFields,
        segments: [],
        transactionSets: [],
        rawExcerpt: `${layoutFields.length} ERP layout fields with interface column / positional metadata`,
        warnings: layoutFields.length === 0 ? ["No ERP layout fields parsed from CSV"] : [],
      },
      text
    );
  }

  const sourceFields: ParsedSourceField[] = headers.map((header) => ({
    name: header,
    type: "string",
  }));

  return finalizeDoc(
    {
      kind: docType === "erp_schema" ? "erp_schema" : "source_extract",
      targetFields: [],
      sourceFields,
      segments: [],
      transactionSets: [],
      rawExcerpt: `${headers.length} fields: ${headers.slice(0, 8).join(", ")}${headers.length > 8 ? "..." : ""}`,
      warnings: [],
    },
    text
  );
}

function emptyParsed(kind: string, warning: string): ParsedDocument {
  return finalizeDoc({
    kind,
    targetFields: [],
    sourceFields: [],
    segments: [],
    transactionSets: [],
    rawExcerpt: "",
    warnings: [warning],
  });
}

export async function parseDocumentContent(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  docType: string
): Promise<ParsedDocument> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "csv" || mimeType.includes("csv")) {
    return parseCsv(buffer.toString("utf8"), docType);
  }

  if (ext === "edi" || ext === "x12" || docType === "sample_edi") {
    const text = buffer.toString("utf8");
    const edi = extractSegmentsFromEdi(text);
    return finalizeDoc(
      {
        kind: "sample_edi",
        targetFields: edi.targetFields,
        sourceFields: [],
        segments: edi.segments,
        transactionSets: edi.transactionSets,
        rawExcerpt: text.slice(0, 400),
        fullText: text.length <= 100_000 ? text : undefined,
        warnings: edi.segments.length === 0 ? ["No EDI segments detected"] : [],
      },
      text
    );
  }

  if (ext === "xlsx" || ext === "xls") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const XLSX = require("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
      const csvLike = rows.map((row) => row.join(",")).join("\n");
      return parseCsv(csvLike, docType);
    } catch {
      return emptyParsed(docType, "Unable to parse Excel workbook");
    }
  }

  const { text, warnings: extractWarnings } = await extractTextFromBuffer(buffer, filename, mimeType);
  const targetFields = extractTargetFieldsFromText(text);
  const edi = extractSegmentsFromEdi(text);
  const allWarnings = [...extractWarnings];

  if (targetFields.length === 0 && edi.segments.length === 0 && text.length > 0) {
    allWarnings.push("No EDI segment/element patterns detected in extracted text");
  }

  const kind =
    ext === "pdf" ? "guide_pdf" : ext === "docx" || ext === "doc" ? "guide_word" : docType;

  return finalizeDoc(
    {
      kind,
      targetFields: uniqueFields([...targetFields, ...edi.targetFields]),
      sourceFields: [],
      segments: edi.segments,
      transactionSets: edi.transactionSets,
      rawExcerpt: text.slice(0, 400),
      warnings: allWarnings,
    },
    text
  );
}

export function summarizeParsed(parsed: ParsedDocument): string {
  const parts: string[] = [];
  if (parsed.targetFields.length) parts.push(`${parsed.targetFields.length} target fields`);
  if (parsed.sourceFields.length) parts.push(`${parsed.sourceFields.length} source fields`);
  if (parsed.testScenarios.length) parts.push(`${parsed.testScenarios.length} test scenarios`);
  if (parsed.segments.length) parts.push(`${parsed.segments.length} segments`);
  if (parsed.transactionSets.length) parts.push(`transactions: ${parsed.transactionSets.join(", ")}`);
  if (parsed.warnings.length) parts.push(`${parsed.warnings.length} warnings`);
  return parts.join(" · ") || "Parsed with no structured fields detected";
}
