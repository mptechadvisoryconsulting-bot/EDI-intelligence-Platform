import type { ParsedSourceField } from "@/lib/types/parsing";
import type { ErpLayoutField, InterfaceStyle } from "./types";

export function inferInterfaceStyle(field: ErpLayoutField): InterfaceStyle {
  if (field.interfaceStyle) return field.interfaceStyle;
  if (field.jsonPath) return "rest";
  if (field.soapPath) return "soap";
  if (field.xpath) return "xml";
  return "positional";
}

export function layoutFieldToSource(field: ErpLayoutField): ParsedSourceField {
  const style = inferInterfaceStyle(field);
  return {
    name: field.fieldName,
    type: field.dataType,
    table: field.table,
    interfaceColumn: field.interfaceColumn,
    interfaceStyle: style,
    recNumber: field.recNumber,
    startPosition: field.startPosition,
    charLimit: field.charLimit,
    xpath: field.xpath,
    jsonPath: field.jsonPath,
    soapPath: field.soapPath,
    soapOperation: field.soapOperation,
  };
}

export function layoutFieldsToSourceFields(fields: ErpLayoutField[]): ParsedSourceField[] {
  return fields.map(layoutFieldToSource);
}

export function sourceTransformation(source: ParsedSourceField): string | null {
  const style = source.interfaceStyle ?? "positional";
  const col = source.interfaceColumn ?? source.name;

  if (style === "rest" && source.jsonPath) {
    return `REST extract — ${col}, JSONPath: ${source.jsonPath}`;
  }
  if (style === "soap" && source.soapPath) {
    const op = source.soapOperation ? ` operation ${source.soapOperation},` : "";
    return `SOAP extract —${op} path: ${source.soapPath}`;
  }
  if (style === "xml" && source.xpath) {
    return `XML extract — ${col}, XPath: ${source.xpath}`;
  }

  if (
    source.recNumber != null ||
    source.startPosition != null ||
    source.charLimit != null ||
    source.interfaceColumn
  ) {
    const parts = [`Interface column: ${col}`];
    if (source.recNumber != null) parts.push(`rec ${source.recNumber}`);
    if (source.startPosition != null) parts.push(`start column ${source.startPosition}`);
    if (source.charLimit != null) parts.push(`width ${source.charLimit}`);
    return `Positional extract — ${parts.join(", ")}`;
  }

  return null;
}

export function styleLabel(style: InterfaceStyle): string {
  const labels: Record<InterfaceStyle, string> = {
    positional: "Positional / flat file",
    xml: "XML",
    soap: "SOAP",
    rest: "REST / JSON",
  };
  return labels[style];
}
