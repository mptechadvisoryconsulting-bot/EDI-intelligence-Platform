import * as XLSX from "xlsx";
import type { EnrichedMappingRow } from "./enrich-mappings";
import { countPositionalCoverage } from "./enrich-mappings";
import { cellNum } from "./positional-resolve";
import {
  activeTransactionCodes,
  dedupeMappings,
  groupMappingsByTransaction,
} from "./transaction-grouping";

export type ProjectExportMeta = {
  name: string;
  customer: string;
  tradingPartner: string;
  erpSystem: string;
  erpVersion?: string | null;
  translatorTarget: string;
  transactions: string;
  layoutFileName?: string | null;
  layoutFormat?: string | null;
};

function projectInfoRows(meta: ProjectExportMeta, mappings?: EnrichedMappingRow[]) {
  const coverage = mappings ? countPositionalCoverage(mappings) : null;
  return [
    { Field: "Implementation", Value: meta.name },
    { Field: "Customer", Value: meta.customer },
    { Field: "Trading partner", Value: meta.tradingPartner },
    { Field: "ERP system", Value: meta.erpSystem },
    { Field: "ERP version", Value: meta.erpVersion ?? "" },
    { Field: "Translator target", Value: meta.translatorTarget },
    { Field: "Transactions", Value: meta.transactions },
    { Field: "Source layout file", Value: meta.layoutFileName ?? "Not configured" },
    { Field: "Layout format", Value: meta.layoutFormat ?? "positional" },
    ...(coverage
      ? [
          {
            Field: "Mappings with Record/Start/Width",
            Value: `${coverage.withPositions} of ${coverage.withSource} sourced mappings`,
          },
        ]
      : []),
    { Field: "Generated", Value: new Date().toISOString() },
  ];
}

function buildWorkbook(sheets: Array<{ name: string; rows: Record<string, unknown>[] }>) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    if (sheet.rows.length === 0) continue;
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** IBM Sterling MRS — positional columns first (what map builders need) */
function sterlingMrsRow(_meta: ProjectExportMeta, txCode: string, m: EnrichedMappingRow) {
  const style = m.interfaceStyle ?? "positional";
  const core = {
    "Interface Column": m.interfaceColumn ?? m.sourceField ?? "",
    "Record Number": cellNum(m.recNumber),
    "Start Column": cellNum(m.startPosition),
    Width: cellNum(m.charLimit),
    "Transaction Set": txCode,
    "EDI Segment": m.targetSegment,
    "EDI Element": m.targetElement,
    Qualifier: m.qualifier ?? "",
  };

  if (style === "rest") {
    return { ...core, "JSON Path": m.jsonPath ?? "" };
  }
  if (style === "xml") {
    return { ...core, XPath: m.xpath ?? "" };
  }
  if (style === "soap") {
    return { ...core, "SOAP Path": m.soapPath ?? "" };
  }

  return {
    ...core,
    "ERP Field Name": m.fieldName ?? "",
    "Data Type": m.dataType ?? "",
    Table: m.table ?? "",
    "Review Status": m.reviewStatus,
  };
}

function cleoMrsRow(txCode: string, m: EnrichedMappingRow) {
  return {
    "Interface Column": m.interfaceColumn ?? m.sourceField ?? "",
    "Record Number": cellNum(m.recNumber),
    "Start Column": cellNum(m.startPosition),
    Width: cellNum(m.charLimit),
    "Transaction Set": txCode,
    "EDI Segment": m.targetSegment,
    "EDI Element": m.targetElement,
    Qualifier: m.qualifier ?? "",
    "ERP Field": m.fieldName ?? "",
    Status: m.reviewStatus,
  };
}

function openTextMrsRow(meta: ProjectExportMeta, txCode: string, m: EnrichedMappingRow) {
  return {
    Partner: meta.tradingPartner,
    "Interface Column": m.interfaceColumn ?? m.sourceField ?? "",
    "Record Number": cellNum(m.recNumber),
    "Start Column": cellNum(m.startPosition),
    Width: cellNum(m.charLimit),
    "Transaction Set": txCode,
    Segment: m.targetSegment,
    Element: m.targetElement,
    Qualifier: m.qualifier ?? "",
    Approval: m.reviewStatus,
  };
}

function boomiMrsRow(txCode: string, m: EnrichedMappingRow) {
  return {
    "Interface Column": m.interfaceColumn ?? m.sourceField ?? "",
    "Record Number": cellNum(m.recNumber),
    "Start Column": cellNum(m.startPosition),
    Width: cellNum(m.charLimit),
    "Transaction Set": txCode,
    Target: `${m.targetSegment}.${m.targetElement}`,
    Qualifier: m.qualifier ?? "",
    Source: m.sourceField ?? "",
    "Review Status": m.reviewStatus,
  };
}

function mappingMatrixRow(m: EnrichedMappingRow) {
  return {
    "Interface Column": m.interfaceColumn ?? m.sourceField ?? "",
    "Record Number": cellNum(m.recNumber),
    "Start Column": cellNum(m.startPosition),
    Width: cellNum(m.charLimit),
    Segment: m.targetSegment,
    Element: m.targetElement,
    Qualifier: m.qualifier ?? "",
    "ERP Field Name": m.fieldName ?? "",
    Review: m.reviewStatus,
  };
}

type RowBuilder = (meta: ProjectExportMeta, txCode: string, m: EnrichedMappingRow) => Record<string, unknown>;

function transactionSheets(
  meta: ProjectExportMeta,
  mappings: EnrichedMappingRow[],
  rowBuilder: RowBuilder,
  sheetPrefix: string,
  filterTransaction?: string
) {
  const grouped = groupMappingsByTransaction(mappings, meta.transactions);
  const sheets: Array<{ name: string; rows: Record<string, unknown>[] }> = [];

  for (const [txCode, rows] of grouped) {
    if (filterTransaction && txCode !== filterTransaction) continue;
    const deduped = dedupeMappings(rows) as EnrichedMappingRow[];
    sheets.push({
      name: `${sheetPrefix} ${txCode}`.trim(),
      rows: deduped.map((m) => rowBuilder(meta, txCode, m)),
    });
  }

  return sheets;
}

export function exportSterlingExcel(
  meta: ProjectExportMeta,
  mappings: EnrichedMappingRow[],
  filterTransaction?: string
) {
  const sheets = [
    { name: "Implementation", rows: projectInfoRows(meta, mappings) },
    ...transactionSheets(meta, mappings, sterlingMrsRow, "MRS", filterTransaction),
  ];
  return buildWorkbook(sheets);
}

export function exportCleoExcel(
  meta: ProjectExportMeta,
  mappings: EnrichedMappingRow[],
  filterTransaction?: string
) {
  const sheets = [
    { name: "Implementation", rows: projectInfoRows(meta, mappings) },
    ...transactionSheets(meta, mappings, (meta, tx, m) => cleoMrsRow(tx, m), "Cleo", filterTransaction),
  ];
  return buildWorkbook(sheets);
}

export function exportOpenTextExcel(
  meta: ProjectExportMeta,
  mappings: EnrichedMappingRow[],
  filterTransaction?: string
) {
  const sheets = [
    { name: "Implementation", rows: projectInfoRows(meta, mappings) },
    ...transactionSheets(meta, mappings, openTextMrsRow, "OpenText", filterTransaction),
  ];
  return buildWorkbook(sheets);
}

export function exportBoomiExcel(
  meta: ProjectExportMeta,
  mappings: EnrichedMappingRow[],
  filterTransaction?: string
) {
  const sheets = [
    { name: "Implementation", rows: projectInfoRows(meta, mappings) },
    ...transactionSheets(meta, mappings, (meta, tx, m) => boomiMrsRow(tx, m), "Boomi", filterTransaction),
  ];
  return buildWorkbook(sheets);
}

export function exportMappingMatrixExcel(
  meta: ProjectExportMeta,
  mappings: EnrichedMappingRow[],
  filterTransaction?: string
) {
  const grouped = groupMappingsByTransaction(mappings, meta.transactions);
  const sheets: Array<{ name: string; rows: Record<string, unknown>[] }> = [
    { name: "Implementation", rows: projectInfoRows(meta, mappings) },
  ];

  for (const [txCode, rows] of grouped) {
    if (filterTransaction && txCode !== filterTransaction) continue;
    const deduped = dedupeMappings(rows) as EnrichedMappingRow[];
    sheets.push({
      name: `Matrix ${txCode}`,
      rows: deduped.map((m) => mappingMatrixRow(m)),
    });
  }

  return buildWorkbook(sheets);
}

export function listExportTransactions(projectTransactions: string): string[] {
  return activeTransactionCodes(projectTransactions);
}
