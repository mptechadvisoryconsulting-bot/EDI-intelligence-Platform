export type CanonicalLineInput = {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  catalogItemId?: string | null;
};

export function requireNonEmpty(value: string, field: string, maxLength = 200) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  if (normalized.length > maxLength) throw new Error(`${field} is too long`);
  return normalized;
}

export function normalizeIdempotencyKey(value: string) {
  return requireNonEmpty(value, "Idempotency key", 160);
}

export function normalizeCurrency(value = "USD") {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) throw new Error("Currency must be a 3-letter code");
  return normalized;
}

export function validateMoneyMinor(value: number, field = "Amount") {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer in minor currency units`);
  }
  return value;
}

export function validateQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error("Quantity must be greater than zero");
  return value;
}

export function validateCanonicalLines(lines: CanonicalLineInput[]) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("At least one line is required");
  if (lines.length > 500) throw new Error("Too many lines in one operation");

  return lines.map((line) => ({
    description: requireNonEmpty(line.description, "Line description", 500),
    quantity: validateQuantity(line.quantity),
    unitPriceMinor: validateMoneyMinor(line.unitPriceMinor, "Unit price"),
    catalogItemId: line.catalogItemId?.trim() || null,
  }));
}

export function lineAmountMinor(quantity: number, unitPriceMinor: number) {
  validateQuantity(quantity);
  validateMoneyMinor(unitPriceMinor, "Unit price");
  const amount = Math.round(quantity * unitPriceMinor);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Line amount is outside the supported range");
  return amount;
}

const WRITE_ROLES = new Set(["owner", "admin", "manager", "operations"]);
const FIELD_ROLES = new Set(["owner", "admin", "manager", "operations", "dispatcher", "field_technician"]);
const INVOICE_ROLES = new Set(["owner", "admin", "manager", "accounting", "invoicing"]);

export type AccountCapability = "business_write" | "field_service" | "invoice_write";

export function assertRoleCapability(role: string, capability: AccountCapability) {
  const normalized = role.trim().toLowerCase();
  const allowed = capability === "field_service" ? FIELD_ROLES : capability === "invoice_write" ? INVOICE_ROLES : WRITE_ROLES;
  if (!allowed.has(normalized)) throw new Error("Forbidden");
}
