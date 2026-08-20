import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { inspectKpiWorkbook, type WorkbookInspection } from "@/lib/kpi/workbook-inspector";

export type KpiProposalStatus = "pending" | "confirmed" | "rejected";

export type KpiProposalInput = {
  fileName: string;
  fileSize: number;
  buffer: Buffer;
  sourceSheet: string;
  dimensions: string[];
  measures: string[];
};

export type KpiProposalRecord = {
  id: string;
  accountId: string;
  status: KpiProposalStatus;
  originalFileName: string;
  fileSize: number;
  contentSha256: string;
  sourceSheet: string;
  headerRow: number;
  dimensions: string[];
  measures: string[];
  sourceEvidence: Record<string, unknown>;
  revision: number;
  confirmedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProposalRow = {
  id: string;
  accountId: string;
  status: string;
  originalFileName: string;
  fileSize: number;
  contentSha256: string;
  sourceSheet: string;
  headerRow: number;
  dimensionContent: string;
  measureContent: string;
  sourceEvidence: string;
  revision: number;
  confirmedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function normalizeFieldList(values: string[], label: string) {
  if (!Array.isArray(values)) throw new Error(`${label} must be a list`);
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (normalized.length > 50) throw new Error(`${label} may contain at most 50 fields`);
  if (normalized.some((value) => value.length > 128)) throw new Error(`${label} field names are too long`);
  return normalized;
}

export function validateProposalSelection(
  inspection: WorkbookInspection,
  sourceSheet: string,
  dimensions: string[],
  measures: string[]
) {
  const sheet = inspection.sheets.find((candidate) => candidate.name === sourceSheet);
  if (!sheet || !inspection.candidateSourceSheets.some((candidate) => candidate.name === sourceSheet)) {
    throw new Error("Selected source sheet is not an approved workbook source candidate");
  }
  if (!sheet.headerRow || sheet.headers.length === 0) {
    throw new Error("Selected source sheet does not have a reliable detected header row");
  }

  const normalizedDimensions = normalizeFieldList(dimensions, "Dimensions");
  const normalizedMeasures = normalizeFieldList(measures, "Measures");
  if (normalizedDimensions.length === 0 && normalizedMeasures.length === 0) {
    throw new Error("Select at least one KPI dimension or measure");
  }

  const allowed = new Set(sheet.headers);
  const invalid = [...normalizedDimensions, ...normalizedMeasures].filter((field) => !allowed.has(field));
  if (invalid.length > 0) {
    throw new Error(`Unknown KPI field selection: ${invalid.slice(0, 3).join(", ")}`);
  }

  return { sheet, dimensions: normalizedDimensions, measures: normalizedMeasures };
}

function mapRow(row: ProposalRow): KpiProposalRecord {
  let evidence: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(row.sourceEvidence);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) evidence = parsed;
  } catch {
    evidence = {};
  }
  return {
    id: row.id,
    accountId: row.accountId,
    status: row.status as KpiProposalStatus,
    originalFileName: row.originalFileName,
    fileSize: row.fileSize,
    contentSha256: row.contentSha256,
    sourceSheet: row.sourceSheet,
    headerRow: row.headerRow,
    dimensions: parseJsonArray(row.dimensionContent),
    measures: parseJsonArray(row.measureContent),
    sourceEvidence: evidence,
    revision: row.revision,
    confirmedAt: row.confirmedAt,
    rejectedAt: row.rejectedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createKpiProposal(accountId: string, userId: string, input: KpiProposalInput) {
  const inspection = inspectKpiWorkbook(input.buffer);
  const selection = validateProposalSelection(inspection, input.sourceSheet, input.dimensions, input.measures);
  const contentSha256 = createHash("sha256").update(input.buffer).digest("hex");

  const existing = await db.$queryRaw<ProposalRow[]>`
    SELECT * FROM "KpiDashboardProposal"
    WHERE "accountId" = ${accountId}
      AND "contentSha256" = ${contentSha256}
      AND "sourceSheet" = ${selection.sheet.name}
      AND "status" = 'pending'
    ORDER BY "revision" DESC
    LIMIT 1
  `;
  if (existing[0]) return mapRow(existing[0]);

  const revisionRows = await db.$queryRaw<Array<{ nextRevision: number | bigint }>>`
    SELECT COALESCE(MAX("revision"), 0) + 1 AS "nextRevision"
    FROM "KpiDashboardProposal"
    WHERE "accountId" = ${accountId}
      AND "contentSha256" = ${contentSha256}
      AND "sourceSheet" = ${selection.sheet.name}
  `;
  const revision = Number(revisionRows[0]?.nextRevision ?? 1);
  const id = randomUUID();
  const sourceEvidence = JSON.stringify({
    workbookSheetCount: inspection.sheets.length,
    candidateSourceSheets: inspection.candidateSourceSheets.map((sheet) => ({
      name: sheet.name,
      headerRow: sheet.headerRow,
      headers: sheet.headers,
      sourceScore: sheet.sourceScore,
      role: sheet.role,
    })),
    selectedSheet: {
      name: selection.sheet.name,
      headerRow: selection.sheet.headerRow,
      headers: selection.sheet.headers,
      sourceScore: selection.sheet.sourceScore,
      role: selection.sheet.role,
    },
    warnings: inspection.warnings,
  });

  await db.$executeRaw`
    INSERT INTO "KpiDashboardProposal" (
      "id", "accountId", "createdByUserId", "status", "sourceType",
      "originalFileName", "fileSize", "contentSha256", "sourceSheet", "headerRow",
      "dimensionContent", "measureContent", "sourceEvidence", "revision"
    ) VALUES (
      ${id}, ${accountId}, ${userId}, 'pending', 'workbook',
      ${input.fileName}, ${input.fileSize}, ${contentSha256}, ${selection.sheet.name}, ${selection.sheet.headerRow},
      ${JSON.stringify(selection.dimensions)}, ${JSON.stringify(selection.measures)}, ${sourceEvidence}, ${revision}
    )
  `;

  const created = await getKpiProposal(accountId, id);
  if (!created) throw new Error("KPI proposal was not created");
  return created;
}

export async function getKpiProposal(accountId: string, proposalId: string) {
  const rows = await db.$queryRaw<ProposalRow[]>`
    SELECT * FROM "KpiDashboardProposal"
    WHERE "accountId" = ${accountId} AND "id" = ${proposalId}
    LIMIT 1
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function reviewKpiProposal(
  accountId: string,
  userId: string,
  proposalId: string,
  decision: "confirm" | "reject"
) {
  const current = await getKpiProposal(accountId, proposalId);
  if (!current) throw new Error("KPI proposal not found");
  if (current.status !== "pending") return current;

  if (decision === "confirm") {
    await db.$executeRaw`
      UPDATE "KpiDashboardProposal"
      SET "status" = 'confirmed', "confirmedAt" = CURRENT_TIMESTAMP,
          "reviewedByUserId" = ${userId}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "accountId" = ${accountId} AND "id" = ${proposalId} AND "status" = 'pending'
    `;
  } else {
    await db.$executeRaw`
      UPDATE "KpiDashboardProposal"
      SET "status" = 'rejected', "rejectedAt" = CURRENT_TIMESTAMP,
          "reviewedByUserId" = ${userId}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "accountId" = ${accountId} AND "id" = ${proposalId} AND "status" = 'pending'
    `;
  }

  const reviewed = await getKpiProposal(accountId, proposalId);
  if (!reviewed) throw new Error("KPI proposal disappeared during review");
  return reviewed;
}
