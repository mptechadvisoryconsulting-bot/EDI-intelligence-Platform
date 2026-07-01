import type {
  Assumption,
  Document,
  ImplementationProject,
  MappingRecommendation,
  OpenQuestion,
} from "@/generated/prisma/client";
import { getUnsupportedCodes, resolveTransactionPacks } from "@/lib/transaction-packs";

export type ProjectForReadiness = ImplementationProject & {
  documents: Document[];
  mappingRecommendations: MappingRecommendation[];
  openQuestions: OpenQuestion[];
  assumptions: Assumption[];
};

export type TransactionReadiness = {
  code: string;
  name: string;
  score: number;
  label: string;
  blockers: string[];
};

export type ReadinessReport = {
  score: number;
  label: string;
  blockers: string[];
  nextActions: string[];
  checks: Array<{ label: string; passed: boolean; detail: string }>;
  transactionReadiness: TransactionReadiness[];
  canApprove: boolean;
  approvalBlockers: string[];
};

export function buildReadinessReport(project: ProjectForReadiness): ReadinessReport {
  const packs = resolveTransactionPacks(project.transactions);
  const unsupported = getUnsupportedCodes(project.transactions);
  const parsedDocs = project.documents.filter((d) => d.status.startsWith("parsed"));
  const hasErpSource = project.documents.some((d) => d.type === "erp_schema");
  const hasGuide = project.documents.some((d) =>
    ["guide", "mapping_sheet", "sample_edi"].includes(d.type)
  );
  const hasPdfOrWord = project.documents.some((d) =>
    /\.(pdf|docx)$/i.test(d.originalFileName ?? d.name)
  );

  const approved = project.mappingRecommendations.filter((m) => m.reviewStatus === "approved").length;
  const pending = project.mappingRecommendations.filter((m) => m.reviewStatus === "pending").length;
  const rejected = project.mappingRecommendations.filter((m) => m.reviewStatus === "rejected").length;
  const lowConfidence = project.mappingRecommendations.filter((m) => m.confidence < 0.7).length;
  const unmapped = project.mappingRecommendations.filter((m) => !m.sourceField).length;

  const blockers: string[] = [];
  const nextActions: string[] = [];
  const approvalBlockers: string[] = [];

  const checks = [
    {
      label: "Documents uploaded",
      passed: project.documents.length > 0,
      detail: `${project.documents.length} document(s)`,
    },
    {
      label: "Guide or mapping doc parsed",
      passed: hasGuide && parsedDocs.length > 0,
      detail: hasGuide ? "Guide-type document present" : "Upload implementation guide",
    },
    {
      label: "ERP / source schema uploaded",
      passed: hasErpSource,
      detail: hasErpSource ? "Source field list present" : "Upload ERP schema CSV",
    },
    {
      label: "Analysis completed",
      passed: project.mappingRecommendations.length > 0,
      detail: `${project.mappingRecommendations.length} mapping(s)`,
    },
    {
      label: "Open questions resolved",
      passed: project.openQuestions.length === 0,
      detail: `${project.openQuestions.length} open`,
    },
    {
      label: "Mappings reviewed",
      passed: project.mappingRecommendations.length > 0 && pending === 0 && rejected === 0,
      detail: `${approved} approved · ${pending} pending · ${rejected} rejected`,
    },
    {
      label: "Low-confidence mappings addressed",
      passed: lowConfidence === 0,
      detail: `${lowConfidence} below 70%`,
    },
  ];

  if (project.documents.length === 0) {
    blockers.push("No documents uploaded.");
    approvalBlockers.push("Upload implementation documents before approval.");
    nextActions.push("Upload customer guide and ERP source field list.");
  }

  if (!hasGuide) {
    blockers.push("No implementation guide uploaded.");
    nextActions.push("Upload PDF, Word, or TXT implementation guide.");
  }

  if (!hasErpSource) {
    blockers.push("No ERP/source schema — mapping confidence will remain limited.");
    nextActions.push("Upload ERP field list or source extract.");
  }

  if (hasGuide && !hasPdfOrWord && parsedDocs.length > 0) {
    nextActions.push("Consider uploading official PDF/Word guide if available.");
  }

  if (parsedDocs.length === 0 && project.documents.length > 0) {
    blockers.push("No documents parsed successfully.");
    approvalBlockers.push("Fix document parsing errors.");
  }

  if (project.mappingRecommendations.length === 0 && parsedDocs.length > 0) {
    blockers.push("Analysis not run yet.");
    nextActions.push("Run analysis to generate mappings and artifacts.");
    approvalBlockers.push("Run analysis before package approval.");
  }

  if (project.openQuestions.length > 0) {
    blockers.push(`${project.openQuestions.length} open question(s) unresolved.`);
    approvalBlockers.push("Resolve or accept open questions before approval.");
    nextActions.push("Send customer clarification for open questions.");
  }

  if (pending > 0) {
    blockers.push(`${pending} mapping(s) still pending review.`);
    approvalBlockers.push("Complete mapping review (approve or reject all pending).");
    nextActions.push(`Review ${pending} pending mapping(s).`);
  }

  if (rejected > 0) {
    blockers.push(`${rejected} mapping(s) rejected — remapping required.`);
    approvalBlockers.push("Address rejected mappings before approval.");
  }

  if (lowConfidence > 0) {
    blockers.push(`${lowConfidence} low-confidence mapping(s) need validation.`);
    nextActions.push("Validate low-confidence mappings with business stakeholders.");
  }

  if (unmapped > 0) {
    nextActions.push(`${unmapped} target field(s) have no source assigned.`);
  }

  if (unsupported.length > 0) {
    blockers.push(`Unsupported transaction code(s): ${unsupported.join(", ")}.`);
  }

  let score = 100;
  if (project.documents.length === 0) score -= 25;
  if (!hasGuide) score -= 15;
  if (!hasErpSource) score -= 15;
  if (project.mappingRecommendations.length === 0) score -= 20;
  if (project.openQuestions.length > 0) score -= Math.min(15, project.openQuestions.length * 4);
  if (pending > 0) score -= Math.min(10, pending * 2);
  if (rejected > 0) score -= 10;
  if (lowConfidence > 0) score -= Math.min(10, lowConfidence * 2);
  score = Math.max(0, Math.min(100, score));

  const label =
    score >= 85
      ? "Ready for translator handoff"
      : score >= 60
        ? "Nearly ready — resolve review items"
        : score >= 35
          ? "In progress — complete analysis and review"
          : "Not ready — upload docs and run analysis";

  const transactionReadiness: TransactionReadiness[] = packs.map((pack) => {
    const prefix = pack.fields.map((f) => `${f.segment}.${f.element}`);
    const packMappings = project.mappingRecommendations.filter((m) =>
      prefix.some((p) => p === `${m.targetSegment}.${m.targetElement}`)
    );
    const packPending = packMappings.filter((m) => m.reviewStatus === "pending").length;
    const packOpen = project.openQuestions.filter((q) => q.question.includes(`[${pack.code}]`)).length;
    let txScore = 100;
    if (packMappings.length === 0) txScore -= 40;
    if (packPending > 0) txScore -= 20;
    if (packOpen > 0) txScore -= 15;
    txScore = Math.max(0, txScore);
    const txBlockers: string[] = [];
    if (packMappings.length === 0) txBlockers.push("No mappings generated for this transaction");
    if (packPending > 0) txBlockers.push(`${packPending} mapping(s) pending review`);
    return {
      code: pack.code,
      name: pack.name,
      score: txScore,
      label: txScore >= 80 ? "Ready" : txScore >= 50 ? "In review" : "Incomplete",
      blockers: txBlockers,
    };
  });

  if (
    project.mappingRecommendations.length > 0 &&
    pending === 0 &&
    rejected === 0 &&
    project.openQuestions.length === 0
  ) {
    nextActions.push("Export translator handoff package.");
  }

  const canApprove =
    approvalBlockers.length === 0 &&
    project.mappingRecommendations.length > 0 &&
    pending === 0 &&
    rejected === 0;

  return {
    score,
    label,
    blockers: [...new Set(blockers)],
    nextActions: [...new Set(nextActions)].slice(0, 8),
    checks,
    transactionReadiness,
    canApprove,
    approvalBlockers: [...new Set(approvalBlockers)],
  };
}
