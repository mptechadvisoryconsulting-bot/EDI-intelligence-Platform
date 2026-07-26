import { db } from "@/lib/db";
import {
  detectLayoutStyles,
  deserializeLayoutProfile,
} from "@/lib/erp-layout/parser";
import type { ErpLayoutField } from "@/lib/erp-layout/types";
import { verifyLayoutAgainstSample } from "@/lib/erp-layout/sample-verify";
import { validateLayoutFields } from "@/lib/erp-layout/validate-layout";
import { parseTransactionCodes } from "@/lib/transaction-packs";

export const INTERFACE_LAYOUT_TYPES = [
  "fixed_width",
  "csv",
  "xml",
  "json",
  "api",
] as const;

export type InterfaceLayoutType = (typeof INTERFACE_LAYOUT_TYPES)[number];

type StoredDefinition = {
  fields: ErpLayoutField[];
  sampleOutputFileName?: string | null;
  sampleOutputContent?: string | null;
};

function deserializeDefinition(content: string): StoredDefinition {
  try {
    const parsed = JSON.parse(content) as StoredDefinition;
    return {
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
      sampleOutputFileName: parsed.sampleOutputFileName ?? null,
      sampleOutputContent: parsed.sampleOutputContent ?? null,
    };
  } catch {
    return { fields: [] };
  }
}

function recordGroups(fields: ErpLayoutField[]) {
  const groups = new Map<string, { name: string; fieldCount: number; repeating: boolean }>();
  for (const field of fields) {
    const name =
      field.recordType?.trim() ||
      (field.recNumber === 1 ? "Header" : field.recNumber === 2 ? "Detail" : field.recNumber === 3 ? "Summary" : "Ungrouped");
    const current = groups.get(name) ?? { name, fieldCount: 0, repeating: false };
    current.fieldCount += 1;
    current.repeating ||= Boolean(field.repeating) || /detail|item|line/i.test(name);
    groups.set(name, current);
  }
  return [...groups.values()];
}

function hydrateDefinition(row: {
  id: string;
  transactionCode: string;
  name: string;
  version: string;
  layoutType: string;
  status: string;
  description: string | null;
  erpSystem: string | null;
  originalFileName: string | null;
  fieldCount: number;
  definitionContent: string;
  updatedAt: Date;
  _count?: { implementations: number };
}) {
  const stored = deserializeDefinition(row.definitionContent);
  const fields = [...stored.fields].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const validation = validateLayoutFields(fields);
  return {
    id: row.id,
    transactionCode: row.transactionCode,
    name: row.name,
    version: row.version,
    erpVersion: row.version,
    layoutType: row.layoutType,
    status: row.status,
    description: row.description,
    erpSystem: row.erpSystem,
    originalFileName: row.originalFileName,
    fieldCount: row.fieldCount,
    fields,
    interfaceStyles: detectLayoutStyles(fields),
    recordGroups: recordGroups(fields),
    validation,
    sampleOutputFileName: stored.sampleOutputFileName ?? null,
    hasSampleOutput: Boolean(stored.sampleOutputContent?.trim()),
    sampleVerification: verifyLayoutAgainstSample(
      fields,
      stored.sampleOutputContent,
      stored.sampleOutputFileName
    ),
    implementationCount: row._count?.implementations ?? 0,
    updatedAt: row.updatedAt.toISOString(),
    source: "interface_library" as const,
  };
}

export async function listInterfaceDefinitions(userId: string) {
  const rows = await db.transactionInterfaceDefinition.findMany({
    where: { userId },
    include: { _count: { select: { implementations: true } } },
    orderBy: [{ transactionCode: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(hydrateDefinition);
}

export async function getInterfaceDefinition(userId: string, id: string) {
  const row = await db.transactionInterfaceDefinition.findFirst({
    where: { id, userId },
    include: { _count: { select: { implementations: true } } },
  });
  return row ? hydrateDefinition(row) : null;
}

export async function findDefaultInterfaceDefinition(
  userId: string,
  transactions: string
) {
  const transactionCode = parseTransactionCodes(transactions)[0];
  if (!transactionCode) return null;
  const row = await db.transactionInterfaceDefinition.findFirst({
    where: { userId, transactionCode, status: "active" },
    include: { _count: { select: { implementations: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return row ? hydrateDefinition(row) : null;
}

export async function getImplementationInterface(input: {
  userId: string;
  transactions: string;
  interfaceDefinitionId?: string | null;
}) {
  if (input.interfaceDefinitionId) {
    const assigned = await getInterfaceDefinition(input.userId, input.interfaceDefinitionId);
    if (assigned) return assigned;
  }

  const standard = await findDefaultInterfaceDefinition(input.userId, input.transactions);
  if (standard) return standard;

  const legacy = await db.erpLayoutProfile.findUnique({ where: { userId: input.userId } });
  if (!legacy) return null;
  const profile = deserializeLayoutProfile(legacy.layoutContent);
  const fields = (profile?.fields ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const validation = validateLayoutFields(fields);
  return {
    id: legacy.id,
    transactionCode: null,
    name: "Legacy account interface",
    version: legacy.erpVersion ?? "legacy",
    erpVersion: legacy.erpVersion,
    layoutType: detectLayoutStyles(fields)[0] ?? "positional",
    status: "legacy",
    description: "Legacy account-wide ERP layout compatibility fallback",
    erpSystem: legacy.erpSystem,
    originalFileName: legacy.originalFileName,
    fieldCount: legacy.fieldCount,
    fields,
    interfaceStyles: detectLayoutStyles(fields),
    recordGroups: recordGroups(fields),
    validation,
    sampleOutputFileName: legacy.sampleOutputFileName,
    hasSampleOutput: Boolean(legacy.sampleOutputContent?.trim()),
    sampleVerification: verifyLayoutAgainstSample(
      fields,
      legacy.sampleOutputContent,
      legacy.sampleOutputFileName
    ),
    implementationCount: 0,
    updatedAt: legacy.updatedAt.toISOString(),
    source: "legacy_erp_layout" as const,
  };
}

export async function createInterfaceDefinition(
  userId: string,
  input: {
    transactionCode: string;
    name: string;
    version: string;
    layoutType: InterfaceLayoutType;
    description?: string | null;
    erpSystem?: string | null;
    originalFileName?: string | null;
    fields: ErpLayoutField[];
  }
) {
  const transactionCode = parseTransactionCodes(input.transactionCode)[0];
  if (!transactionCode) throw new Error("A valid three-digit transaction code is required");
  return db.transactionInterfaceDefinition.create({
    data: {
      userId,
      transactionCode,
      name: input.name,
      version: input.version,
      layoutType: input.layoutType,
      description: input.description ?? null,
      erpSystem: input.erpSystem ?? null,
      originalFileName: input.originalFileName ?? null,
      fieldCount: input.fields.length,
      definitionContent: JSON.stringify({
        fields: input.fields.map((field, index) => ({ ...field, sortOrder: index })),
      }),
    },
  });
}
