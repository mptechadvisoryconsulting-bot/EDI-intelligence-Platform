import { db } from "@/lib/db";

export type ReuseInsight = {
  label: string;
  detail: string;
};

export async function findReuseInsights(input: {
  projectId: string;
  ownerId: string;
  customer: string;
  tradingPartner: string;
  erpSystem: string;
  transactions: string;
}): Promise<ReuseInsight[]> {
  const insights: ReuseInsight[] = [];

  const similarProjects = await db.implementationProject.findMany({
    where: {
      ownerId: input.ownerId,
      id: { not: input.projectId },
      OR: [
        { tradingPartner: input.tradingPartner },
        { customer: input.customer },
        { erpSystem: input.erpSystem },
      ],
    },
    include: {
      mappingRecommendations: {
        where: { reviewStatus: "approved" },
        take: 5,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  if (similarProjects.length === 0) {
    return [
      {
        label: "No prior workspaces",
        detail: "This is the first similar implementation in your account. Approved mappings here will become reusable knowledge.",
      },
    ];
  }

  for (const prior of similarProjects) {
    if (prior.tradingPartner === input.tradingPartner) {
      insights.push({
        label: `Prior partner: ${prior.name}`,
        detail: `${prior.mappingRecommendations.length} approved mapping(s) exist for ${input.tradingPartner}. Reuse patterns during review.`,
      });
    }

    if (prior.erpSystem === input.erpSystem && prior.mappingRecommendations.length > 0) {
      const examples = prior.mappingRecommendations
        .slice(0, 3)
        .map((m) => `${m.targetSegment}.${m.targetElement} ← ${m.sourceField ?? "constant"}`)
        .join("; ");
      insights.push({
        label: `Prior ${input.erpSystem} setup`,
        detail: examples,
      });
    }
  }

  return insights.slice(0, 4);
}
