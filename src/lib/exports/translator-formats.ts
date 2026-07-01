import type { ErpLayoutField } from "@/lib/erp-layout/types";
import {
  enrichMappingsWithLayout,
  type EnrichedMappingRow,
  type MappingRow,
} from "./enrich-mappings";
import { dedupeMappings, groupMappingsByTransaction } from "./transaction-grouping";
import {
  exportBoomiExcel,
  exportCleoExcel,
  exportMappingMatrixExcel,
  exportOpenTextExcel,
  exportSterlingExcel,
  type ProjectExportMeta,
} from "./mapping-excel";

export type { MappingRow, EnrichedMappingRow, ProjectExportMeta };

export type TranslatorFormat = "sterling" | "cleo" | "boomi" | "opentext" | "clarification_email";

export type ExportResult =
  | { kind: "text"; content: string; mimeType: string; extension: string }
  | { kind: "binary"; content: Buffer; mimeType: string; extension: string };

function targetKey(m: MappingRow) {
  return `${m.targetSegment}${m.qualifier ? `*${m.qualifier}` : ""}*${m.targetElement}`;
}

export function exportClarificationEmail(project: ProjectExportMeta, questions: string[]) {
  return [
    `Subject: EDI setup clarifications — ${project.tradingPartner} (${project.transactions})`,
    "",
    "Hello,",
    "",
    `We are preparing the EDI implementation for ${project.tradingPartner} targeting ${project.translatorTarget}.`,
    `ERP source: ${project.erpSystem}. Transactions in scope: ${project.transactions}.`,
    "",
    "Please clarify the following before we configure the translator:",
    "",
    ...questions.map((q, i) => `${i + 1}. ${q}`),
    "",
    "Thank you,",
    "EDI Implementation Team",
  ].join("\n");
}

/** Fallback CSV when account layout is missing — still includes positional columns (empty). */
export function exportSterlingCsv(
  project: ProjectExportMeta,
  mappings: EnrichedMappingRow[],
  filterTransaction?: string
) {
  let rows: EnrichedMappingRow[] = mappings;
  if (filterTransaction) {
    const groups = groupMappingsByTransaction(mappings, project.transactions);
    rows = dedupeMappings(groups.get(filterTransaction) ?? []) as EnrichedMappingRow[];
  }

  const txHeader = filterTransaction ? ` · Transaction ${filterTransaction}` : "";
  const lines = [
    `# IBM Sterling / B2Bi MRS Mapping Export — ${project.name}${txHeader}`,
    `# Partner: ${project.tradingPartner} | ERP: ${project.erpSystem} | Transactions: ${project.transactions}`,
    "Interface Column,Record Number,Start Column,Width,Target Segment,Target Element,Qualifier,ERP Field Name,Transformation,Confidence,Review Status",
    ...rows.map(
      (m) =>
        `"${m.interfaceColumn ?? m.sourceField ?? ""}","${m.recNumber ?? ""}","${m.startPosition ?? ""}","${m.charLimit ?? ""}","${m.targetSegment}","${m.targetElement}","${m.qualifier ?? ""}","${m.fieldName ?? ""}","${(m.transformation ?? "").replace(/"/g, "'")}",${Math.round(m.confidence * 100)}%,${m.reviewStatus}`
    ),
  ];
  return lines.join("\n");
}

export function exportCleoCsv(project: ProjectExportMeta, mappings: EnrichedMappingRow[]) {
  const lines = [
    `# Cleo Integration Cloud Mapping Export — ${project.name}`,
    "RuleName,EDIPath,Source Attribute,ERP Field,Rec Number,Start Position,Field Length,TransformLogic,Status",
    ...mappings.map(
      (m) =>
        `"${m.targetSegment}.${m.targetElement}","${targetKey(m)}","${m.interfaceColumn ?? m.sourceField ?? ""}","${m.fieldName ?? ""}","${m.recNumber ?? ""}","${m.startPosition ?? ""}","${m.charLimit ?? ""}","${(m.transformation ?? "Direct").replace(/"/g, "'")}",${m.reviewStatus}`
    ),
  ];
  return lines.join("\n");
}

export type TranslatorOutput = "xlsx" | "csv";

export function generateTranslatorExport(
  format: TranslatorFormat,
  project: ProjectExportMeta,
  mappings: MappingRow[],
  openQuestions: string[],
  layoutFields: ErpLayoutField[] = [],
  filterTransaction?: string,
  output: TranslatorOutput = "xlsx"
): ExportResult {
  const enriched = enrichMappingsWithLayout(mappings, layoutFields);
  const hasLayout = layoutFields.length > 0;
  const xlsx =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;

  switch (format) {
    case "sterling":
      if (output === "csv" || !hasLayout) {
        return {
          kind: "text",
          content: exportSterlingCsv(project, enriched, filterTransaction),
          mimeType: "text/csv",
          extension: "csv",
        };
      }
      return {
        kind: "binary",
        content: exportSterlingExcel(project, enriched, filterTransaction),
        mimeType: xlsx,
        extension: "xlsx",
      };
    case "cleo":
      if (hasLayout) {
        return {
          kind: "binary",
          content: exportCleoExcel(project, enriched, filterTransaction),
          mimeType: xlsx,
          extension: "xlsx",
        };
      }
      return {
        kind: "text",
        content: exportCleoCsv(project, enriched),
        mimeType: "text/csv",
        extension: "csv",
      };
    case "boomi":
      return {
        kind: "binary",
        content: exportBoomiExcel(project, enriched, filterTransaction),
        mimeType: xlsx,
        extension: "xlsx",
      };
    case "opentext":
      return {
        kind: "binary",
        content: exportOpenTextExcel(project, enriched, filterTransaction),
        mimeType: xlsx,
        extension: "xlsx",
      };
    case "clarification_email":
      return {
        kind: "text",
        content: exportClarificationEmail(
          project,
          openQuestions.length ? openQuestions : ["No open questions at this time."]
        ),
        mimeType: "text/plain",
        extension: "txt",
      };
  }
}

export function generateMappingMatrixExport(
  project: ProjectExportMeta,
  mappings: MappingRow[],
  layoutFields: ErpLayoutField[] = [],
  filterTransaction?: string
): ExportResult {
  const enriched = enrichMappingsWithLayout(mappings, layoutFields);

  if (layoutFields.length > 0) {
    return {
      kind: "binary",
      content: exportMappingMatrixExcel(project, enriched, filterTransaction),
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      extension: "xlsx",
    };
  }

  const lines = [
    "Segment,Element,Qualifier,Source,Transformation,Confidence,Review",
    ...enriched.map(
      (m) =>
        `${m.targetSegment},${m.targetElement},${m.qualifier ?? ""},${m.sourceField ?? ""},${m.transformation ?? ""},${Math.round(m.confidence * 100)}%,${m.reviewStatus}`
    ),
  ];

  return {
    kind: "text",
    content: lines.join("\n"),
    mimeType: "text/csv",
    extension: "csv",
  };
}
