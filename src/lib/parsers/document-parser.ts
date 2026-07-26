import type { ParsedDocument, ParsedSourceField, ParsedTargetField } from "@/lib/types/parsing";
import { parseEdiText } from "@/lib/edi/parse";
import { extractTextFromBuffer } from "@/lib/parsers/extract-text";
import {
  extractTestScenariosFromText,
  parseTestScenariosFromCsv,
} from "@/lib/parsers/test-scenario-parser";
import { isErpLayoutFile, layoutFieldsToSourceFields, parseErpLayoutFile } from "@/lib/erp-layout";

// Match common alphanumeric segment identifiers before generic alphabetic
// identifiers so PO107 is interpreted as PO1/07 (not PO/107) and N104 as
// N1/04. The generic branch continues to cover identifiers such as BEG03.
const SEGMENT_ELEMENT_PATTERN = /\b(PO1|N[1-4]|[A-Z]{2,3})\*?(\d{2,3})\b/g;
const SEGMENT_DOT_PATTERN = /\b(PO1|N[1-4]|[A-Z]{2,3})\.(\d{2,3})\b/g;
const QUALIFIER_PATTERN = /\b(PO1|N[1-4]|[A-Z]{2,3})\*([A-Z0-9]{1,4})\*(\d{2,3})\b/g;

function uniqueFields(fields: ParsedTargetField[]) {
  const seen = new Set<string>();
  return fields.filter((f) => {
    const key = `${f.loopPath ?? "Header"}|${f.parent ?? ""}|${f.segment}.${f.element}${f.qualifier ? `:${f.qualifier}` : ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeElement(segment: string, element: string) {
  const value = element.toUpperCase().replace(segment.toUpperCase(), "").replace(/\D/g, "");
  return value.padStart(2, "0");
}

function inferLoopPath(segment: string, currentLoop: string) {
  if (["ISA", "GS", "ST", "BEG"].includes(segment)) return "Header";
  if (segment === "N1") return "N1 Loop 1000";
  if (["N2", "N3", "N4"].includes(segment)) return currentLoop.startsWith("N1") ? currentLoop : "N1 Loop 1000";
  if (segment === "PO1") return "PO1 Loop 2000";
  if (["PID", "SAC"].includes(segment)) return currentLoop.startsWith("PO1") ? currentLoop : "PO1 Loop 2000";
  if (["CTT", "SE", "GE", "IEA"].includes(segment)) return "Summary";
  return currentLoop;
}

function parentForLoop(loopPath: string) {
  if (loopPath.startsWith("N1")) return "N1";
  if (loopPath.startsWith("PO1")) return "PO1";
  return loopPath;
}

function metadataFromLine(line: string) {
  const usage: ParsedTargetField["usage"] =
    /required|mandatory|\bM\b/i.test(line)
      ? "required"
      : /conditional|when|if\b/i.test(line)
        ? "conditional"
        : /optional|\bO\b/i.test(line)
          ? "optional"
          : undefined;
  const condition = line.match(/\b(?:if|when|only when)\b(.{1,120})/i);
  const format = line.match(/\b(\d+\s*(?:numeric|alphanumeric|alpha|characters?|chars?|digits?))\b/i);
  const repeats = line.match(/\b(?:repeat(?:s)?|max(?:imum)?)\s*[:=]?\s*(\d+|unbounded|each|every [a-z ]+)/i);
  const dataType = line.match(/\b(numeric|alphanumeric|alpha|date|time|decimal|integer|string)\b/i);

  return {
    required: usage === "required",
    usage,
    condition: condition?.[0].trim(),
    expectedFormat: format?.[1],
    repeats: repeats?.[1],
    dataType: dataType?.[1],
    reviewStatus: "pending" as const,
  };
}

function extractTargetFieldsFromText(text: string): ParsedTargetField[] {
  const fields: ParsedTargetField[] = [];
  let currentLoop = "Header";

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const namedLoopMatch = line.match(/\b([A-Z0-9]+)\s+loop\s*\(?([A-Z0-9]+)?\)?/i);
    const loopMatch = line.match(/\b(?:loop(?:\s+id)?|loop path)\s*[:#-]?\s*\(?([A-Z0-9]+)\)?(?:\s*[-–]\s*(.+))?/i);
    if (namedLoopMatch) {
      currentLoop = `${namedLoopMatch[1].toUpperCase()} Loop${namedLoopMatch[2] ? ` ${namedLoopMatch[2].toUpperCase()}` : ""}`;
    } else if (loopMatch) {
      const label = loopMatch[2]?.trim();
      currentLoop = label ? `${label} Loop ${loopMatch[1].toUpperCase()}` : `Loop ${loopMatch[1].toUpperCase()}`;
    } else if (/^(header|summary)\s*:?\s*$/i.test(line)) {
      currentLoop = /^summary/i.test(line) ? "Summary" : "Header";
    }

    const metadata = metadataFromLine(line);
    const qualifierMatches = [...line.matchAll(QUALIFIER_PATTERN)];
    for (const match of qualifierMatches) {
      currentLoop = inferLoopPath(match[1], currentLoop);
      fields.push({
        segment: match[1],
        element: normalizeElement(match[1], match[3]),
        qualifier: match[2],
        description: line.trim().slice(0, 120),
        loopPath: currentLoop,
        parent: parentForLoop(currentLoop),
        ...metadata,
      });
    }

    const patterns = [SEGMENT_DOT_PATTERN, SEGMENT_ELEMENT_PATTERN];
    for (const pattern of patterns) {
      for (const match of line.matchAll(pattern)) {
        currentLoop = inferLoopPath(match[1], currentLoop);
        fields.push({
          segment: match[1],
          element: normalizeElement(match[1], match[2]),
          description: line.trim().slice(0, 120),
          loopPath: currentLoop,
          parent: parentForLoop(currentLoop),
          ...metadata,
        });
      }
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
    let currentLoop = "Header";
    if (message.transactionSet) transactionSets.add(message.transactionSet);
    for (const row of message.segments) {
      segments.add(row.segment);
      currentLoop = inferLoopPath(row.segment, currentLoop);
      for (let i = 0; i < row.elements.length; i++) {
        const element = String(i + 1).padStart(2, "0");
        targetFields.push({
          segment: row.segment,
          element,
          qualifier: row.qualifier,
          description: row.elements[i] ? `Sample value: ${row.elements[i].slice(0, 40)}` : undefined,
          loopPath: currentLoop,
          parent: parentForLoop(currentLoop),
          usage: "optional",
          reviewStatus: "pending",
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
    const loopIdx = lowerHeaders.findIndex((h) => h.includes("loop"));
    const parentIdx = lowerHeaders.findIndex((h) => h.includes("parent"));
    const descIdx = lowerHeaders.findIndex((h) => /description|requirement|customer rule/.test(h));
    const requiredIdx = lowerHeaders.findIndex((h) => /required|usage/.test(h));
    const conditionIdx = lowerHeaders.findIndex((h) => /condition|business rule|customer rule/.test(h));
    const formatIdx = lowerHeaders.findIndex((h) => /format|length/.test(h));
    const repeatIdx = lowerHeaders.findIndex((h) => /repeat|cardinality/.test(h));
    const dataTypeIdx = lowerHeaders.findIndex((h) => /data type|datatype|type/.test(h));

    const targetFields: ParsedTargetField[] = [];
    for (const line of lines.slice(1)) {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (!cols[segIdx] || !cols[elIdx]) continue;
      const segment = cols[segIdx].toUpperCase();
      const usageValue = requiredIdx >= 0 ? cols[requiredIdx].toLowerCase() : "";
      const usage: ParsedTargetField["usage"] =
        /^(m|required|yes|y)$/.test(usageValue)
          ? "required"
          : /conditional|^c$/.test(usageValue)
            ? "conditional"
            : "optional";
      const loopPath = loopIdx >= 0 && cols[loopIdx] ? cols[loopIdx] : inferLoopPath(segment, "Header");
      targetFields.push({
        segment,
        element: normalizeElement(segment, cols[elIdx]),
        qualifier: qualIdx >= 0 ? cols[qualIdx] || undefined : undefined,
        description:
          descIdx >= 0 && cols[descIdx]
            ? cols[descIdx]
            : srcIdx >= 0 && cols[srcIdx]
              ? `Mapped from ${cols[srcIdx]}`
              : undefined,
        required: usage === "required",
        usage,
        loopPath,
        parent: parentIdx >= 0 && cols[parentIdx] ? cols[parentIdx] : parentForLoop(loopPath),
        condition: conditionIdx >= 0 ? cols[conditionIdx] || undefined : undefined,
        expectedFormat: formatIdx >= 0 ? cols[formatIdx] || undefined : undefined,
        repeats: repeatIdx >= 0 ? cols[repeatIdx] || undefined : undefined,
        dataType: dataTypeIdx >= 0 ? cols[dataTypeIdx] || undefined : undefined,
        reviewStatus: "pending",
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
