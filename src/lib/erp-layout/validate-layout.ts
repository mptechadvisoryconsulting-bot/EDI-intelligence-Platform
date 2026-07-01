import type { ErpLayoutField } from "./types";

export type LayoutValidation = {
  valid: boolean;
  warnings: string[];
  positionalFieldCount: number;
  missingPositionCount: number;
};

export function validateLayoutFields(fields: ErpLayoutField[]): LayoutValidation {
  const warnings: string[] = [];
  const positional = fields.filter((f) => (f.interfaceStyle ?? "positional") === "positional");

  let missingPositionCount = 0;
  for (const field of positional) {
    const missing: string[] = [];
    if (field.recNumber == null) missing.push("Rec Number");
    if (field.startPosition == null) missing.push("Start Column");
    if (field.charLimit == null) missing.push("Width");
    if (missing.length > 0) {
      missingPositionCount++;
      warnings.push(
        `${field.interfaceColumn || field.fieldName}: missing ${missing.join(", ")} — MRS export will be incomplete`
      );
    }
  }

  if (fields.length === 0) {
    warnings.push("No fields parsed from layout file.");
  }

  if (positional.length === 0 && fields.length > 0) {
    warnings.push("No positional fields detected — sample position verification applies to flat-file layouts.");
  }

  return {
    valid: warnings.length === 0,
    warnings,
    positionalFieldCount: positional.length,
    missingPositionCount,
  };
}
