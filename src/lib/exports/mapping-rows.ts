import type { MappingRow } from "./enrich-mappings";

type DbMapping = {
  targetSegment: string;
  targetElement: string;
  sourceField: string | null;
  interfaceColumn?: string | null;
  recNumber?: number | null;
  startPosition?: number | null;
  charLimit?: number | null;
  transformation: string | null;
  qualifier: string | null;
  confidence: number;
  reviewStatus: string;
  rationale?: string | null;
};

export function toExportMappingRow(m: DbMapping): MappingRow {
  return {
    targetSegment: m.targetSegment,
    targetElement: m.targetElement,
    sourceField: m.sourceField,
    interfaceColumn: m.interfaceColumn,
    recNumber: m.recNumber,
    startPosition: m.startPosition,
    charLimit: m.charLimit,
    transformation: m.transformation,
    qualifier: m.qualifier,
    confidence: m.confidence,
    reviewStatus: m.reviewStatus,
    rationale: m.rationale,
  };
}
