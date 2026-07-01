import { runImplementationAnalysis } from "@/lib/analysis/engine";
import { db } from "@/lib/db";
import { resolvePositionalFields } from "@/lib/exports/positional-resolve";
import { getAccountErpLayout, layoutFieldsToSourceFields } from "@/lib/erp-layout";
import { deserializeParsed, normalizeParsedDocument } from "@/lib/uploads";
import type { ParsedDocument } from "@/lib/types/parsing";

export type ProjectAnalysisResult = {
  projectId: string;
  projectName: string;
  ok: boolean;
  error?: string;
  mappingCount?: number;
  questionCount?: number;
  summary?: string;
};

export async function runProjectAnalysis(
  projectId: string,
  userId: string
): Promise<ProjectAnalysisResult> {
  const project = await db.implementationProject.findFirst({
    where: { id: projectId, ownerId: userId },
    include: { documents: true },
  });

  if (!project) {
    return { projectId, projectName: "", ok: false, error: "Project not found" };
  }

  const parsedDocuments: ParsedDocument[] = project.documents
    .map((doc) => deserializeParsed(doc.parsedContent))
    .filter((doc): doc is ParsedDocument => doc !== null)
    .map(normalizeParsedDocument);

  if (parsedDocuments.length === 0) {
    return {
      projectId,
      projectName: project.name,
      ok: false,
      error: "No parsed documents",
    };
  }

  const ediTexts = project.documents
    .filter((d) => d.type === "sample_edi")
    .map((d) => {
      const raw = deserializeParsed(d.parsedContent);
      if (!raw) return null;
      const parsed = normalizeParsedDocument(raw);
      if (!parsed.fullText && !parsed.rawExcerpt) return null;
      return { name: d.name, text: parsed.fullText ?? parsed.rawExcerpt };
    })
    .filter((x): x is { name: string; text: string } => x !== null);

  const accountLayout = await getAccountErpLayout(userId);
  const accountSourceFields = accountLayout
    ? layoutFieldsToSourceFields(accountLayout.fields)
    : undefined;
  const layoutFields = accountLayout?.fields ?? [];

  const analysis = runImplementationAnalysis({
    parsedDocuments,
    projectTransactions: project.transactions,
    erpSystem: project.erpSystem || accountLayout?.erpSystem || "",
    tradingPartner: project.tradingPartner,
    ediTexts,
    accountSourceFields,
  });

  await db.mappingRecommendation.deleteMany({ where: { projectId } });
  await db.openQuestion.deleteMany({ where: { projectId } });
  await db.assumption.deleteMany({ where: { projectId } });
  await db.generatedArtifact.deleteMany({ where: { projectId } });
  await db.testScenario.deleteMany({ where: { projectId } });

  await db.mappingRecommendation.createMany({
    data: analysis.mappings.map((m) => {
      const pos = resolvePositionalFields({
        sourceField: m.sourceField,
        transformation: m.transformation,
        stored: {
          interfaceColumn: m.interfaceColumn ?? undefined,
          recNumber: m.recNumber ?? undefined,
          startPosition: m.startPosition ?? undefined,
          charLimit: m.charLimit ?? undefined,
        },
        layoutFields,
      });
      return {
        projectId,
        targetSegment: m.targetSegment,
        targetElement: m.targetElement,
        sourceField: m.sourceField,
        interfaceColumn: pos.interfaceColumn ?? null,
        recNumber: pos.recNumber ?? null,
        startPosition: pos.startPosition ?? null,
        charLimit: pos.charLimit ?? null,
        transformation: m.transformation,
        qualifier: m.qualifier,
        confidence: m.confidence,
        rationale: m.rationale,
      };
    }),
  });

  await db.openQuestion.createMany({
    data: analysis.openQuestions.map((q) => ({ ...q, projectId })),
  });

  await db.assumption.createMany({
    data: analysis.assumptions.map((a) => ({ ...a, projectId })),
  });

  await db.generatedArtifact.createMany({
    data: analysis.artifacts.map((a) => ({ ...a, projectId })),
  });

  await db.testScenario.createMany({
    data: analysis.testCoverage.scenarios.map((s) => ({
      projectId,
      name: s.name,
      description: s.description ?? null,
      source: s.source,
      transactionCode: s.transactionCode ?? null,
      preconditions: s.preconditions ?? null,
      expectedOutcome: s.expectedOutcome ?? null,
      relatedSegments: s.relatedSegments.join("; ") || null,
      coveredMappings: s.coveredMappings.join("; ") || null,
      coverageStatus: s.coverageStatus,
    })),
  });

  await db.implementationProject.update({
    where: { id: projectId },
    data: { status: "analysis_complete", reviewStatus: "ready_for_review" },
  });

  return {
    projectId,
    projectName: project.name,
    ok: true,
    mappingCount: analysis.mappings.length,
    questionCount: analysis.openQuestions.length,
    summary: analysis.summary,
  };
}

export async function reanalyzeAllUserProjects(userId: string) {
  const projects = await db.implementationProject.findMany({
    where: { ownerId: userId },
    include: { documents: true },
    orderBy: { updatedAt: "desc" },
  });

  const eligible = projects.filter((p) =>
    p.documents.some((d) => d.parsedContent?.trim())
  );

  const results: ProjectAnalysisResult[] = [];
  for (const project of eligible) {
    results.push(await runProjectAnalysis(project.id, userId));
  }

  return {
    totalProjects: projects.length,
    analyzed: results.filter((r) => r.ok).length,
    skipped: projects.length - eligible.length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}
