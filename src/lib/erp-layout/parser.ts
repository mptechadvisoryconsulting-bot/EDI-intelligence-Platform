import type { ErpLayoutField, ErpLayoutProfile, InterfaceStyle } from "./types";

export type { ErpLayoutField, ErpLayoutProfile, InterfaceStyle } from "./types";
export { layoutFieldsToSourceFields, layoutFieldToSource, sourceTransformation, styleLabel, inferInterfaceStyle } from "./transform";

function parseCsvLine(line: string, delimiter = ","): string[] {
  return line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
}

function detectDelimiter(headerLine: string): string {
  const tabs = headerLine.split("\t").length;
  const commas = headerLine.split(",").length;
  if (tabs > commas) return "\t";
  return ",";
}

function normalizeLayoutText(text: string): string {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

function findCol(headers: string[], patterns: RegExp[]): number {
  return headers.findIndex((h) => patterns.some((p) => p.test(h)));
}

function parseNum(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseStyle(value: string | undefined): InterfaceStyle | undefined {
  if (!value?.trim()) return undefined;
  const v = value.toLowerCase();
  if (/positional|flat|fixed|oracle|delimited/.test(v)) return "positional";
  if (/xml/.test(v)) return "xml";
  if (/soap|wsdl/.test(v)) return "soap";
  if (/rest|json|api|http/.test(v)) return "rest";
  return undefined;
}

function buildField(input: {
  interfaceColumn: string;
  fieldName: string;
  recNumber?: number;
  startPosition?: number;
  charLimit?: number;
  interfaceStyle?: InterfaceStyle;
  recordType?: string;
  dataType?: string;
  table?: string;
  description?: string;
  validationRule?: string;
  repeating?: boolean;
  xpath?: string;
  jsonPath?: string;
  soapPath?: string;
  soapOperation?: string;
  sortOrder?: number;
}): ErpLayoutField {
  const style =
    input.interfaceStyle ??
    (input.jsonPath ? "rest" : input.soapPath ? "soap" : input.xpath ? "xml" : "positional");

  return {
    fieldName: input.fieldName.trim(),
    interfaceColumn: input.interfaceColumn.trim(),
    interfaceStyle: style,
    recordType: input.recordType,
    recNumber: input.recNumber,
    startPosition: input.startPosition,
    charLimit: input.charLimit,
    dataType: input.dataType,
    table: input.table,
    description: input.description,
    validationRule: input.validationRule,
    repeating: input.repeating,
    xpath: input.xpath,
    jsonPath: input.jsonPath,
    soapPath: input.soapPath,
    soapOperation: input.soapOperation,
    sortOrder: input.sortOrder,
  };
}

export function parseErpLayoutCsv(text: string, defaultStyle: InterfaceStyle = "positional"): ErpLayoutField[] {
  const normalized = normalizeLayoutText(text);
  const lines = normalized.split(/\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((h) => h.toLowerCase().replace(/^\uFEFF/, ""));

  const ifaceIdx = findCol(headers, [
    /interface.?column/,
    /^interface$/,
    /^column$/,
    /iface/,
    /source.?column/,
    /element.?name/,
    /segfld/,
    /api.?field/,
  ]);
  const nameIdx = findCol(headers, [
    /field.?name/,
    /^field$/,
    /^name$/,
    /source.?field/,
    /element/,
    /attribute/,
    /ddic/,
  ]);
  const recordTypeIdx = findCol(headers, [
    /record.?type/,
    /record.?group/,
    /^group$/,
    /^section$/,
  ]);
  const recIdx = findCol(headers, [
    /rec.?number/,
    /^rec$/,
    /record.?num/,
    /record.?number/,
    /segment.?number/,
    /segnum/,
    /line.?number/,
  ]);
  const startIdx = findCol(headers, [
    /start.?column/,
    /start.?pos/,
    /^start$/,
    /^position$/,
    /begin/,
    /^offset$/,
    /position.?in.?segment/,
    /\bpos\b/,
    /from.?position/,
  ]);
  const widthIdx = findCol(headers, [
    /^width$/,
    /char.?limit/,
    /character.?limit/,
    /^length$/,
    /max.?len/,
    /internal.?length/,
    /field.?length/,
    /^size$/,
    /max.?length/,
  ]);
  const styleIdx = findCol(headers, [/interface.?style/, /^format$/, /^style$/, /protocol/]);
  const xpathIdx = findCol(headers, [/xpath/, /xml.?path/]);
  const jsonIdx = findCol(headers, [/json.?path/, /rest.?path/, /api.?path/]);
  const soapIdx = findCol(headers, [/soap.?path/, /wsdl.?path/]);
  const soapOpIdx = findCol(headers, [/soap.?operation/, /operation/, /service/]);
  const typeIdx = findCol(headers, [/data.?type/, /^type$/]);
  const tableIdx = findCol(headers, [/^table$/, /entity/, /segment.?name/, /segnam/, /structure/]);
  const descIdx = findCol(headers, [/description/, /^desc$/, /notes/]);
  const validationIdx = findCol(headers, [/validation/, /business.?rule/, /^rule$/]);
  const repeatIdx = findCol(headers, [/repeat/, /repeating/, /cardinality/]);

  const fields: ErpLayoutField[] = [];

  lines.slice(1).forEach((line, index) => {
    const cols = parseCsvLine(line, delimiter);
    if (cols.every((c) => !c)) return;

    const interfaceColumn = ifaceIdx >= 0 ? cols[ifaceIdx] : cols[0];
    const fieldName = nameIdx >= 0 ? cols[nameIdx] : interfaceColumn ?? cols[0];
    if (!fieldName?.trim() && !interfaceColumn?.trim()) return;

    fields.push(
      buildField({
        interfaceColumn: interfaceColumn || fieldName,
        fieldName: fieldName || interfaceColumn,
        recNumber: recIdx >= 0 ? parseNum(cols[recIdx]) : undefined,
        startPosition: startIdx >= 0 ? parseNum(cols[startIdx]) : undefined,
        charLimit: widthIdx >= 0 ? parseNum(cols[widthIdx]) : undefined,
        interfaceStyle: styleIdx >= 0 ? parseStyle(cols[styleIdx]) ?? defaultStyle : defaultStyle,
        recordType: recordTypeIdx >= 0 ? cols[recordTypeIdx] : undefined,
        dataType: typeIdx >= 0 ? cols[typeIdx] : undefined,
        table: tableIdx >= 0 ? cols[tableIdx] : undefined,
        description: descIdx >= 0 ? cols[descIdx] : undefined,
        validationRule: validationIdx >= 0 ? cols[validationIdx] : undefined,
        repeating:
          repeatIdx >= 0
            ? /^(?:yes|true|y|1|repeat|repeating|\*)$/i.test(cols[repeatIdx] ?? "")
            : undefined,
        xpath: xpathIdx >= 0 ? cols[xpathIdx] : undefined,
        jsonPath: jsonIdx >= 0 ? cols[jsonIdx] : undefined,
        soapPath: soapIdx >= 0 ? cols[soapIdx] : undefined,
        soapOperation: soapOpIdx >= 0 ? cols[soapOpIdx] : undefined,
        sortOrder: index,
      })
    );
  });

  return fields;
}

export function parseRestLayoutJson(text: string): ErpLayoutField[] {
  try {
    const parsed = JSON.parse(text) as { fields?: ErpLayoutField[] } | ErpLayoutField[];
    const rows = Array.isArray(parsed) ? parsed : parsed.fields ?? [];
    return rows.map((row, index) =>
      buildField({
        interfaceColumn: row.interfaceColumn ?? row.fieldName,
        fieldName: row.fieldName,
        interfaceStyle: "rest",
        jsonPath: row.jsonPath,
        dataType: row.dataType,
        recordType: row.recordType,
        description: row.description,
        validationRule: row.validationRule,
        repeating: row.repeating,
        table: row.table,
        sortOrder: index,
      })
    );
  } catch {
    return [];
  }
}

export function parseXmlLayout(text: string): ErpLayoutField[] {
  const fields: ErpLayoutField[] = [];
  const fieldBlocks = text.matchAll(/<Field\b[^>]*\/?>/gi);
  let index = 0;

  for (const match of fieldBlocks) {
    const tag = match[0];
    const attr = (name: string) => tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1];
    const fieldName = attr("name") ?? attr("fieldName");
    const interfaceColumn = attr("interfaceColumn") ?? attr("column") ?? fieldName;
    if (!fieldName && !interfaceColumn) continue;

    fields.push(
      buildField({
        fieldName: fieldName ?? interfaceColumn!,
        interfaceColumn: interfaceColumn ?? fieldName!,
        interfaceStyle: parseStyle(attr("style") ?? attr("format")) ?? "xml",
        recordType: attr("recordType") ?? attr("group") ?? attr("section"),
        recNumber: parseNum(attr("recNumber") ?? attr("rec")),
        startPosition: parseNum(attr("startColumn") ?? attr("start")),
        charLimit: parseNum(attr("width") ?? attr("charLimit")),
        xpath: attr("xpath") ?? attr("path"),
        jsonPath: attr("jsonPath"),
        soapPath: attr("soapPath"),
        soapOperation: attr("soapOperation") ?? attr("operation"),
        dataType: attr("type") ?? attr("dataType"),
        table: attr("table"),
        description: attr("description"),
        validationRule: attr("validation") ?? attr("rule"),
        repeating: /^(?:yes|true|1)$/i.test(attr("repeating") ?? ""),
        sortOrder: index++,
      })
    );
  }

  if (fields.length > 0) return fields;

  // Fallback: XPath comments in plain XML guide text
  const xpathLines = text.matchAll(/(\w[\w_]*)\s*[:\-]\s*(\/\/[^\n<]+)/g);
  for (const m of xpathLines) {
    fields.push(
      buildField({
        fieldName: m[1],
        interfaceColumn: m[1],
        interfaceStyle: "xml",
        xpath: m[2].trim(),
        sortOrder: index++,
      })
    );
  }

  return fields;
}

export function parseErpLayoutFile(text: string, filename: string): ErpLayoutField[] {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") return parseRestLayoutJson(text);
  if (ext === "xml") return parseXmlLayout(text);
  return parseErpLayoutCsv(text);
}

export function parseErpLayoutBuffer(buffer: Buffer, filename: string): ErpLayoutField[] {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "xlsx" || ext === "xls") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const XLSX = require("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      return parseErpLayoutCsv(csv);
    } catch {
      return [];
    }
  }
  return parseErpLayoutFile(buffer.toString("utf8"), filename);
}

export function isErpLayoutFile(text: string, filename?: string): boolean {
  const ext = filename?.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json" || ext === "xml") return true;
  const first = text.split(/\r?\n/)[0]?.toLowerCase() ?? "";
  return (
    /interface.?column|rec.?number|start.?column|width|json.?path|xpath|soap.?path/.test(first) &&
    first.includes(",")
  );
}

export function serializeLayoutProfile(profile: ErpLayoutProfile): string {
  return JSON.stringify(profile);
}

export function deserializeLayoutProfile(content: string | null | undefined): ErpLayoutProfile | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as ErpLayoutProfile;
    if (!parsed.fields || !Array.isArray(parsed.fields)) return null;
    parsed.fields = parsed.fields.map((f, i) => ({
      ...f,
      interfaceStyle:
        f.interfaceStyle ??
        (f.jsonPath ? "rest" : f.soapPath ? "soap" : f.xpath ? "xml" : "positional"),
      sortOrder: f.sortOrder ?? i,
    }));
    return parsed;
  } catch {
    return null;
  }
}

export function detectLayoutStyles(fields: ErpLayoutField[]): InterfaceStyle[] {
  return [...new Set(fields.map((f) => f.interfaceStyle))];
}

export function detectLayoutFormat(fields: ErpLayoutField[]): string {
  const styles = detectLayoutStyles(fields);
  if (styles.length === 1) {
    const labels: Record<InterfaceStyle, string> = {
      positional: "Positional flat file (Oracle, SAP IDoc, JDE, etc.)",
      xml: "XML / XPath",
      soap: "SOAP / WSDL",
      rest: "REST / JSON",
    };
    return labels[styles[0]];
  }
  if (styles.length > 1) return `Mixed (${styles.join(", ")})`;
  return "Unknown";
}
