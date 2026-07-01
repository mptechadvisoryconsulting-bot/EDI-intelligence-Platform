import type { ErpLayoutField } from "@/lib/erp-layout/types";

export type PositionalFields = {
  interfaceColumn?: string;
  fieldName?: string;
  recNumber?: number;
  startPosition?: number;
  charLimit?: number;
  dataType?: string;
  table?: string;
  interfaceStyle?: string;
  jsonPath?: string;
  xpath?: string;
  soapPath?: string;
};

export function normalizeFieldKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Parse positional metadata from analysis transformation strings */
export function parsePositionalFromTransformation(text: string | null | undefined): PositionalFields {
  if (!text) return {};

  const result: PositionalFields = {};

  const iface =
    text.match(/interface\s+column:\s*([^,]+)/i)?.[1]?.trim() ??
    text.match(/source\s+column:\s*([^,]+)/i)?.[1]?.trim();
  if (iface) result.interfaceColumn = iface;

  const rec =
    text.match(/\brec(?:ord)?(?:\s+number)?\s+(\d+)/i)?.[1] ??
    text.match(/\brecord\s+#?\s*(\d+)/i)?.[1];
  if (rec) result.recNumber = parseInt(rec, 10);

  const start =
    text.match(/start(?:ing)?\s+(?:column|position|pos)\s+(\d+)/i)?.[1] ??
    text.match(/\boffset\s+(\d+)/i)?.[1] ??
    text.match(/\bposition\s+(\d+)/i)?.[1];
  if (start) result.startPosition = parseInt(start, 10);

  const width =
    text.match(/\bwidth\s+(\d+)/i)?.[1] ??
    text.match(/\blength\s+(\d+)/i)?.[1] ??
    text.match(/\bsize\s+(\d+)/i)?.[1];
  if (width) result.charLimit = parseInt(width, 10);

  return result;
}

export function buildLayoutIndex(layoutFields: ErpLayoutField[]): Map<string, ErpLayoutField> {
  const index = new Map<string, ErpLayoutField>();

  const addKey = (raw: string | undefined, field: ErpLayoutField) => {
    if (!raw?.trim()) return;
    const key = normalizeFieldKey(raw);
    if (!key) return;
    if (!index.has(key)) index.set(key, field);
  };

  for (const field of layoutFields) {
    addKey(field.interfaceColumn, field);
    addKey(field.fieldName, field);
    addKey(field.description, field);
    // Oracle often uses SNAKE_CASE interface vs snake field — also index without underscores
    addKey(field.interfaceColumn?.replace(/_/g, ""), field);
    addKey(field.fieldName?.replace(/_/g, ""), field);
  }

  return index;
}

export function findLayoutField(
  sourceField: string | null | undefined,
  layoutIndex: Map<string, ErpLayoutField>,
  layoutFields: ErpLayoutField[]
): ErpLayoutField | undefined {
  if (!sourceField?.trim()) return undefined;

  const key = normalizeFieldKey(sourceField);
  const direct = layoutIndex.get(key);
  if (direct) return direct;

  const compact = key.replace(/_/g, "");
  for (const [indexKey, field] of layoutIndex) {
    if (indexKey.replace(/_/g, "") === compact) return field;
  }

  // Substring match as last resort
  for (const field of layoutFields) {
    const col = normalizeFieldKey(field.interfaceColumn);
    const name = normalizeFieldKey(field.fieldName);
    if (!col && !name) continue;
    if (col && (col.includes(key) || key.includes(col))) return field;
    if (name && (name.includes(key) || key.includes(name))) return field;
  }

  return undefined;
}

export function resolvePositionalFields(input: {
  sourceField?: string | null;
  transformation?: string | null;
  stored?: PositionalFields | null;
  layoutFields?: ErpLayoutField[];
}): PositionalFields {
  const layoutFields = input.layoutFields ?? [];
  const layoutIndex = buildLayoutIndex(layoutFields);

  const fromStored = input.stored ?? {};
  const fromTransform = parsePositionalFromTransformation(input.transformation);

  let fromLayout: PositionalFields = {};
  const lookupKeys = [
    input.sourceField,
    fromStored.interfaceColumn,
    fromTransform.interfaceColumn,
  ].filter(Boolean) as string[];

  for (const key of lookupKeys) {
    const field = findLayoutField(key, layoutIndex, layoutFields);
    if (field) {
      fromLayout = {
        interfaceColumn: field.interfaceColumn,
        fieldName: field.fieldName,
        recNumber: field.recNumber,
        startPosition: field.startPosition,
        charLimit: field.charLimit,
        dataType: field.dataType,
        table: field.table,
        interfaceStyle: field.interfaceStyle,
        jsonPath: field.jsonPath,
        xpath: field.xpath,
        soapPath: field.soapPath,
      };
      break;
    }
  }

  // If transformation names an interface column, try that lookup too
  if (!fromLayout.interfaceColumn && fromTransform.interfaceColumn) {
    const field = findLayoutField(fromTransform.interfaceColumn, layoutIndex, layoutFields);
    if (field) {
      fromLayout = {
        interfaceColumn: field.interfaceColumn,
        fieldName: field.fieldName,
        recNumber: field.recNumber,
        startPosition: field.startPosition,
        charLimit: field.charLimit,
        dataType: field.dataType,
        table: field.table,
        interfaceStyle: field.interfaceStyle,
        jsonPath: field.jsonPath,
        xpath: field.xpath,
        soapPath: field.soapPath,
      };
    }
  }

  return {
    interfaceColumn:
      fromStored.interfaceColumn ??
      fromLayout.interfaceColumn ??
      fromTransform.interfaceColumn ??
      input.sourceField ??
      undefined,
    fieldName: fromStored.fieldName ?? fromLayout.fieldName,
    recNumber: fromStored.recNumber ?? fromLayout.recNumber ?? fromTransform.recNumber,
    startPosition:
      fromStored.startPosition ?? fromLayout.startPosition ?? fromTransform.startPosition,
    charLimit: fromStored.charLimit ?? fromLayout.charLimit ?? fromTransform.charLimit,
    dataType: fromStored.dataType ?? fromLayout.dataType,
    table: fromStored.table ?? fromLayout.table,
    interfaceStyle: fromStored.interfaceStyle ?? fromLayout.interfaceStyle,
    jsonPath: fromStored.jsonPath ?? fromLayout.jsonPath,
    xpath: fromStored.xpath ?? fromLayout.xpath,
    soapPath: fromStored.soapPath ?? fromLayout.soapPath,
  };
}

export function cellNum(value: number | null | undefined): number | string {
  return value != null && Number.isFinite(value) ? value : "";
}
