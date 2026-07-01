import { db } from "@/lib/db";

export type MappingMemorySuggestion = {
  targetKey: string;
  segment: string;
  element: string;
  qualifier?: string | null;
  interfaceColumn?: string | null;
  recNumber?: number | null;
  startPosition?: number | null;
  charLimit?: number | null;
  sourceField?: string | null;
  priorProject: string;
  priorPartner: string;
  priorErp: string;
  confidence: number;
  note: string;
};

function targetKey(segment: string, element: string, qualifier?: string | null) {
  return `${segment}.${element}${qualifier ? `:${qualifier}` : ""}`;
}

export async function getMappingMemorySuggestions(input: {
  ownerId: string;
  projectId: string;
  erpSystem: string;
  tradingPartner: string;
  specKeys: string[];
}): Promise<MappingMemorySuggestion[]> {
  if (input.specKeys.length === 0) return [];

  const priorProjects = await db.implementationProject.findMany({
    where: {
      ownerId: input.ownerId,
      id: { not: input.projectId },
      mappingRecommendations: { some: { reviewStatus: "approved" } },
    },
    include: {
      mappingRecommendations: {
        where: { reviewStatus: "approved" },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  const suggestions: MappingMemorySuggestion[] = [];
  const seen = new Set<string>();

  for (const key of input.specKeys) {
    if (seen.has(key)) continue;

    for (const prior of priorProjects) {
      const match = prior.mappingRecommendations.find(
        (m) => targetKey(m.targetSegment, m.targetElement, m.qualifier) === key
      );
      if (!match) continue;

      seen.add(key);
      const samePartner = prior.tradingPartner === input.tradingPartner;
      const sameErp = prior.erpSystem === input.erpSystem;

      suggestions.push({
        targetKey: key,
        segment: match.targetSegment,
        element: match.targetElement,
        qualifier: match.qualifier,
        interfaceColumn: match.interfaceColumn,
        recNumber: match.recNumber,
        startPosition: match.startPosition,
        charLimit: match.charLimit,
        sourceField: match.sourceField,
        priorProject: prior.name,
        priorPartner: prior.tradingPartner,
        priorErp: prior.erpSystem,
        confidence: samePartner && sameErp ? 0.95 : sameErp ? 0.85 : samePartner ? 0.75 : 0.65,
        note: samePartner
          ? `Same partner — reuse from ${prior.name}`
          : `Different partner (${prior.tradingPartner}) — confirm field meaning before reuse`,
      });
      break;
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 20);
}

export type CloneCandidate = {
  id: string;
  name: string;
  customer: string;
  tradingPartner: string;
  erpSystem: string;
  transactions: string;
  mappingCount: number;
  approvedCount: number;
  updatedAt: string;
};

export async function listCloneCandidates(ownerId: string, projectId: string): Promise<CloneCandidate[]> {
  const projects = await db.implementationProject.findMany({
    where: {
      ownerId,
      id: { not: projectId },
      mappingRecommendations: { some: {} },
    },
    include: {
      mappingRecommendations: { select: { reviewStatus: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    customer: p.customer,
    tradingPartner: p.tradingPartner,
    erpSystem: p.erpSystem,
    transactions: p.transactions,
    mappingCount: p.mappingRecommendations.length,
    approvedCount: p.mappingRecommendations.filter((m) => m.reviewStatus === "approved").length,
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function cloneMappingsFromProject(input: {
  targetProjectId: string;
  sourceProjectId: string;
  ownerId: string;
  replaceExisting?: boolean;
}) {
  const [target, source] = await Promise.all([
    db.implementationProject.findFirst({
      where: { id: input.targetProjectId, ownerId: input.ownerId },
    }),
    db.implementationProject.findFirst({
      where: { id: input.sourceProjectId, ownerId: input.ownerId },
      include: { mappingRecommendations: true },
    }),
  ]);

  if (!target) return { ok: false as const, error: "Target workspace not found" };
  if (!source) return { ok: false as const, error: "Source workspace not found" };
  if (source.mappingRecommendations.length === 0) {
    return { ok: false as const, error: "Source workspace has no mappings to clone" };
  }

  if (input.replaceExisting) {
    await db.mappingRecommendation.deleteMany({ where: { projectId: input.targetProjectId } });
  }

  const partnerChanged = source.tradingPartner !== target.tradingPartner;
  const cloned = await db.$transaction(async (tx) => {
    const created = [];
    for (const m of source.mappingRecommendations) {
      const row = await tx.mappingRecommendation.create({
        data: {
          projectId: input.targetProjectId,
          targetSegment: m.targetSegment,
          targetElement: m.targetElement,
          sourceField: m.sourceField,
          interfaceColumn: m.interfaceColumn,
          recNumber: m.recNumber,
          startPosition: m.startPosition,
          charLimit: m.charLimit,
          transformation: m.transformation,
          qualifier: m.qualifier,
          confidence: partnerChanged ? Math.min(m.confidence, 0.75) : m.confidence,
          rationale: partnerChanged
            ? `Cloned from ${source.name} (${source.tradingPartner}) — verify meaning for ${target.tradingPartner}`
            : `Cloned from ${source.name}`,
          reviewStatus: "pending",
        },
      });
      created.push(row);

      if (partnerChanged) {
        await tx.openQuestion.create({
          data: {
            projectId: input.targetProjectId,
            question: `[${m.targetSegment}.${m.targetElement}] Confirm "${m.interfaceColumn ?? m.sourceField ?? "source"}" meaning for ${target.tradingPartner} (cloned from ${source.tradingPartner})`,
            category: "partner_reuse",
            priority: "medium",
          },
        });
      }
    }
    return created;
  });

  return {
    ok: true as const,
    clonedCount: cloned.length,
    partnerChanged,
    sourceName: source.name,
  };
}
