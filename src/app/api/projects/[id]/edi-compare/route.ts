import { NextRequest, NextResponse } from "next/server";
import { compareEdiSamples } from "@/lib/edi-compare";
import { resolvePartnerPack } from "@/lib/partner-packs";
import { resolveTransactionPacks } from "@/lib/transaction-packs";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { deserializeParsed, normalizeParsedDocument } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;

  const project = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
    include: {
      documents: true,
      mappingRecommendations: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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

  const packs = resolveTransactionPacks(project.transactions);
  const partnerPack = resolvePartnerPack(project.tradingPartner);

  const mappings = project.mappingRecommendations.map((m) => ({
    targetSegment: m.targetSegment,
    targetElement: m.targetElement,
    sourceField: m.sourceField,
    transformation: m.transformation,
    qualifier: m.qualifier,
    confidence: m.confidence,
    rationale: m.rationale ?? "",
  }));

  const report = compareEdiSamples({
    ediTexts,
    mappings,
    partnerPack,
    transactionPacks: packs,
    projectTransactions: project.transactions,
  });

  return NextResponse.json({
    report,
    partnerPack: { id: partnerPack.id, name: partnerPack.name },
    hasSampleEdi: ediTexts.length > 0,
    mappingCount: mappings.length,
  });
}
