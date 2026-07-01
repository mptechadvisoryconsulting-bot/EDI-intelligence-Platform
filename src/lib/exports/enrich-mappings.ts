import type { ErpLayoutField } from "@/lib/erp-layout/types";
import { resolvePositionalFields, type PositionalFields } from "./positional-resolve";

export type MappingRow = {
  targetSegment: string;
  targetElement: string;
  sourceField: string | null;
  transformation: string | null;
  qualifier: string | null;
  confidence: number;
  reviewStatus: string;
  rationale?: string | null;
  interfaceColumn?: string | null;
  recNumber?: number | null;
  startPosition?: number | null;
  charLimit?: number | null;
};

export type EnrichedMappingRow = Omit<
  MappingRow,
  "interfaceColumn" | "recNumber" | "startPosition" | "charLimit"
> &
  PositionalFields & {
    fieldName?: string;
    description?: string;
  };

export function enrichMappingsWithLayout(
  mappings: MappingRow[],
  layoutFields: ErpLayoutField[]
): EnrichedMappingRow[] {
  return mappings.map((mapping) => {
    const positional = resolvePositionalFields({
      sourceField: mapping.sourceField,
      transformation: mapping.transformation,
      stored: {
        interfaceColumn: mapping.interfaceColumn ?? undefined,
        recNumber: mapping.recNumber ?? undefined,
        startPosition: mapping.startPosition ?? undefined,
        charLimit: mapping.charLimit ?? undefined,
      },
      layoutFields,
    });

    return {
      ...mapping,
      interfaceColumn: positional.interfaceColumn ?? mapping.interfaceColumn ?? undefined,
      fieldName: positional.fieldName,
      recNumber: positional.recNumber ?? mapping.recNumber ?? undefined,
      startPosition: positional.startPosition ?? mapping.startPosition ?? undefined,
      charLimit: positional.charLimit ?? mapping.charLimit ?? undefined,
      dataType: positional.dataType,
      table: positional.table,
      interfaceStyle: positional.interfaceStyle,
      jsonPath: positional.jsonPath,
      xpath: positional.xpath,
      soapPath: positional.soapPath,
    };
  });
}

export function countPositionalCoverage(mappings: EnrichedMappingRow[]) {
  const withSource = mappings.filter((m) => m.sourceField);
  const withPositions = withSource.filter(
    (m) => m.recNumber != null && m.startPosition != null && m.charLimit != null
  );
  return { withSource: withSource.length, withPositions: withPositions.length };
}
