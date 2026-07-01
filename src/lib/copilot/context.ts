import type {
  Assumption,
  Document,
  ImplementationProject,
  MappingRecommendation,
  OpenQuestion,
} from "@/generated/prisma/client";
import {
  getUnsupportedCodes,
  resolveTransactionPacks,
} from "@/lib/transaction-packs";
import { describeErpSupport, resolveErpProfile } from "@/lib/erp-profiles";

export type ProjectWithRelations = ImplementationProject & {
  documents: Document[];
  mappingRecommendations: MappingRecommendation[];
  openQuestions: OpenQuestion[];
  assumptions: Assumption[];
};

export type CopilotContext = {
  project: {
    name: string;
    customer: string;
    tradingPartner: string;
    erpSystem: string;
    erpVersion: string | null;
    translatorTarget: string;
    transactions: string;
    status: string;
    reviewStatus: string;
  };
  documents: {
    total: number;
    parsed: number;
    types: string[];
    summaries: string[];
  };
  mappings: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    lowConfidence: number;
    unmapped: number;
    samples: Array<{
      target: string;
      source: string | null;
      confidence: number;
      reviewStatus: string;
    }>;
  };
  openQuestions: Array<{ question: string; priority: string; category: string }>;
  assumptions: Array<{ assumption: string; risk: string }>;
  blockers: string[];
  nextActions: string[];
  readinessScore: number;
  readinessLabel: string;
  transactionPacks: Array<{
    code: string;
    name: string;
    family: string;
    fieldCount: number;
    testScenarios: string[];
  }>;
  unsupportedTransactions: string[];
  erpProfile: { id: string; name: string; vendor: string; description: string };
};

export function buildCopilotContext(project: ProjectWithRelations): CopilotContext {
  const packs = resolveTransactionPacks(project.transactions);
  const unsupportedTransactions = getUnsupportedCodes(project.transactions);
  const erpResolved = resolveErpProfile(project.erpSystem);
  const parsedDocs = project.documents.filter((d) => d.status.startsWith("parsed"));
  const hasErpSource = project.documents.some((d) => d.type === "erp_schema");
  const hasGuide = project.documents.some((d) => ["guide", "mapping_sheet", "sample_edi"].includes(d.type));

  const approved = project.mappingRecommendations.filter((m) => m.reviewStatus === "approved").length;
  const rejected = project.mappingRecommendations.filter((m) => m.reviewStatus === "rejected").length;
  const pending = project.mappingRecommendations.filter((m) => m.reviewStatus === "pending").length;
  const lowConfidence = project.mappingRecommendations.filter((m) => m.confidence < 0.7).length;
  const unmapped = project.mappingRecommendations.filter((m) => !m.sourceField).length;

  const blockers: string[] = [];
  const nextActions: string[] = [];

  if (packs.length === 0 && project.transactions.trim()) {
    blockers.push("No supported transaction family packs loaded for configured transaction codes.");
    nextActions.push("Use supported codes 850, 856, or 810 — or upload partner-specific guides.");
  }

  if (unsupportedTransactions.length > 0) {
    blockers.push(`Unsupported transaction code(s): ${unsupportedTransactions.join(", ")}.`);
  }

  for (const pack of packs) {
    nextActions.push(`Review ${pack.code} ${pack.name} setup checklist and test scenarios.`);
  }

  if (project.documents.length === 0) {
    blockers.push("No documents uploaded yet.");
    nextActions.push("Upload the customer implementation guide and ERP/source field list.");
  }

  if (!hasGuide && project.documents.length > 0) {
    blockers.push("No implementation guide, mapping sheet, or sample EDI uploaded.");
    nextActions.push("Upload a guide, mapping sheet, or sample EDI file.");
  }

  if (!hasErpSource) {
    blockers.push("No ERP/source schema uploaded — mapping confidence will stay low.");
    nextActions.push("Upload an ERP field list or source extract CSV.");
  }

  if (parsedDocs.length === 0 && project.documents.length > 0) {
    blockers.push("Documents uploaded but none parsed successfully.");
    nextActions.push("Re-upload files in CSV, TXT, EDI, or Excel format.");
  }

  if (project.mappingRecommendations.length === 0 && parsedDocs.length > 0) {
    nextActions.push("Run analysis to generate mapping recommendations and artifacts.");
  }

  if (project.openQuestions.length > 0) {
    blockers.push(`${project.openQuestions.length} open question(s) need customer or business clarification.`);
    nextActions.push("Review open questions and send clarification to the customer.");
  }

  if (lowConfidence > 0) {
    blockers.push(`${lowConfidence} mapping(s) have confidence below 70%.`);
    nextActions.push("Review and approve/reject low-confidence mappings.");
  }

  if (pending > 0 && project.mappingRecommendations.length > 0) {
    nextActions.push(`Review ${pending} pending mapping recommendation(s).`);
  }

  if (
    project.mappingRecommendations.length > 0 &&
    approved === project.mappingRecommendations.length &&
    project.openQuestions.length === 0
  ) {
    nextActions.push("Export the mapping matrix and handoff summary for translator configuration.");
  }

  let readinessScore = 100;
  if (project.documents.length === 0) readinessScore -= 30;
  if (!hasErpSource) readinessScore -= 20;
  if (!hasGuide) readinessScore -= 15;
  if (project.mappingRecommendations.length === 0) readinessScore -= 20;
  if (project.openQuestions.length > 0) readinessScore -= Math.min(20, project.openQuestions.length * 5);
  if (lowConfidence > 0) readinessScore -= Math.min(15, lowConfidence * 3);
  if (pending > 0) readinessScore -= Math.min(10, pending * 2);
  readinessScore = Math.max(0, readinessScore);

  const readinessLabel =
    readinessScore >= 85
      ? "Ready for translator handoff"
      : readinessScore >= 60
        ? "Nearly ready — resolve remaining review items"
        : readinessScore >= 35
          ? "In progress — analysis or source data incomplete"
          : "Not ready — upload documents and run analysis";

  return {
    project: {
      name: project.name,
      customer: project.customer,
      tradingPartner: project.tradingPartner,
      erpSystem: project.erpSystem,
      erpVersion: project.erpVersion,
      translatorTarget: project.translatorTarget,
      transactions: project.transactions,
      status: project.status,
      reviewStatus: project.reviewStatus,
    },
    documents: {
      total: project.documents.length,
      parsed: parsedDocs.length,
      types: [...new Set(project.documents.map((d) => d.type))],
      summaries: project.documents
        .filter((d) => d.parseSummary)
        .map((d) => `${d.name}: ${d.parseSummary}`),
    },
    mappings: {
      total: project.mappingRecommendations.length,
      approved,
      rejected,
      pending,
      lowConfidence,
      unmapped,
      samples: project.mappingRecommendations.slice(0, 8).map((m) => ({
        target: `${m.targetSegment}.${m.targetElement}${m.qualifier ? ` (${m.qualifier})` : ""}`,
        source: m.sourceField,
        confidence: m.confidence,
        reviewStatus: m.reviewStatus,
      })),
    },
    openQuestions: project.openQuestions.map((q) => ({
      question: q.question,
      priority: q.priority,
      category: q.category,
    })),
    assumptions: project.assumptions.map((a) => ({
      assumption: a.assumption,
      risk: a.risk,
    })),
    blockers,
    nextActions: [...new Set(nextActions)].slice(0, 8),
    readinessScore,
    readinessLabel,
    transactionPacks: packs.map((p) => ({
      code: p.code,
      name: p.name,
      family: p.family,
      fieldCount: p.fields.length,
      testScenarios: p.testScenarios,
    })),
    unsupportedTransactions,
    erpProfile: {
      id: erpResolved.id,
      name: erpResolved.name,
      vendor: erpResolved.vendor,
      description: describeErpSupport(project.erpSystem),
    },
  };
}
