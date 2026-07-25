import type { ErpLayoutField } from "./types";
import { db } from "@/lib/db";
import { deserializeLayoutProfile, detectLayoutStyles } from "./parser";
import { verifyLayoutAgainstSample, type SampleVerificationReport } from "./sample-verify";
import { validateLayoutFields } from "./validate-layout";

export async function getAccountErpLayout(userId: string) {
  const row = await db.erpLayoutProfile.findUnique({ where: { userId } });
  if (!row) return null;

  const profile = deserializeLayoutProfile(row.layoutContent);
  const fields = (profile?.fields ?? []).sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  const validation = validateLayoutFields(fields);
  const sampleVerification: SampleVerificationReport | null = verifyLayoutAgainstSample(
    fields,
    row.sampleOutputContent,
    row.sampleOutputFileName
  );

  return {
    id: row.id,
    erpSystem: row.erpSystem,
    erpVersion: row.erpVersion,
    originalFileName: row.originalFileName,
    fieldCount: row.fieldCount,
    fields,
    interfaceStyles: detectLayoutStyles(fields),
    updatedAt: row.updatedAt.toISOString(),
    sampleOutputFileName: row.sampleOutputFileName,
    hasSampleOutput: Boolean(row.sampleOutputContent?.trim()),
    validation,
    sampleVerification,
  };
}

export async function saveAccountErpLayout(
  userId: string,
  input: {
    erpSystem: string;
    erpVersion?: string | null;
    originalFileName?: string | null;
    fields: ErpLayoutField[];
  }
) {
  const profile = {
    erpSystem: input.erpSystem,
    erpVersion: input.erpVersion,
    originalFileName: input.originalFileName,
    fields: input.fields.map((f, i) => ({ ...f, sortOrder: i })),
    fieldCount: input.fields.length,
    defaultInterfaceStyle: detectLayoutStyles(input.fields)[0] ?? "positional",
  };

  return db.erpLayoutProfile.upsert({
    where: { userId },
    create: {
      userId,
      erpSystem: input.erpSystem,
      erpVersion: input.erpVersion ?? null,
      originalFileName: input.originalFileName ?? null,
      fieldCount: input.fields.length,
      layoutContent: JSON.stringify(profile),
    },
    update: {
      erpSystem: input.erpSystem,
      erpVersion: input.erpVersion ?? null,
      originalFileName: input.originalFileName ?? null,
      fieldCount: input.fields.length,
      layoutContent: JSON.stringify(profile),
    },
  });
}
