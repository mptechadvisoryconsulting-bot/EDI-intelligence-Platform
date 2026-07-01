import { db } from "@/lib/db";
import type { MappingMemorySuggestion } from "./partner-clone";

function parseTargetKey(key: string) {
  const [segEl, qualifier] = key.split(":");
  const [targetSegment, targetElement] = segEl.split(".");
  return { targetSegment, targetElement, qualifier: qualifier ?? null };
}

export async function applyMappingMemory(input: {
  projectId: string;
  ownerId: string;
  suggestions: MappingMemorySuggestion[];
}) {
  const project = await db.implementationProject.findFirst({
    where: { id: input.projectId, ownerId: input.ownerId },
    include: { mappingRecommendations: true },
  });

  if (!project) return { ok: false as const, error: "Project not found" };

  let applied = 0;
  let skipped = 0;

  for (const s of input.suggestions) {
    const { targetSegment, targetElement, qualifier } = parseTargetKey(s.targetKey);
    if (!targetSegment || !targetElement) {
      skipped++;
      continue;
    }

    const existing = project.mappingRecommendations.find(
      (m) =>
        m.targetSegment === targetSegment &&
        m.targetElement === targetElement &&
        (m.qualifier ?? null) === qualifier
    );

    if (existing) {
      await db.mappingRecommendation.update({
        where: { id: existing.id },
        data: {
          interfaceColumn: s.interfaceColumn ?? existing.interfaceColumn,
          sourceField: s.sourceField ?? s.interfaceColumn ?? existing.sourceField,
          recNumber: s.recNumber ?? existing.recNumber,
          startPosition: s.startPosition ?? existing.startPosition,
          charLimit: s.charLimit ?? existing.charLimit,
          rationale: `Applied from memory: ${s.priorProject} (${s.priorPartner})`,
          reviewStatus: "pending",
        },
      });
      applied++;
    } else {
      await db.mappingRecommendation.create({
        data: {
          projectId: input.projectId,
          targetSegment,
          targetElement,
          qualifier,
          sourceField: s.sourceField ?? s.interfaceColumn ?? null,
          interfaceColumn: s.interfaceColumn ?? null,
          recNumber: s.recNumber ?? null,
          startPosition: s.startPosition ?? null,
          charLimit: s.charLimit ?? null,
          transformation: null,
          confidence: s.confidence,
          rationale: `Applied from memory: ${s.priorProject} (${s.priorPartner}) — ${s.note}`,
          reviewStatus: "pending",
        },
      });
      applied++;
    }
  }

  return { ok: true as const, applied, skipped };
}
