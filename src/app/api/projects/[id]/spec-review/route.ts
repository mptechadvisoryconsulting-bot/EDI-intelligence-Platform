import { NextRequest, NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import { db } from "@/lib/db";
import { getImplementationInterface } from "@/lib/interface-definitions";
import { findTradingPartner } from "@/lib/industry/trading-partners";
import { buildSpecReviewReport, getMappingMemorySuggestions } from "@/lib/spec-review";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;

  const { id } = await params;

  const project = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
    include: { documents: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Implementation not found" }, { status: 404 });
  }

  const report = buildSpecReviewReport({
    transactions: project.transactions,
    tradingPartner: project.tradingPartner,
    translatorTarget: project.translatorTarget,
    erpSystem: project.erpSystem,
    customer: project.customer,
    documents: project.documents,
  });

  const specKeys = report.requirements.map(
    (r) => `${r.segment}.${r.element}${r.qualifier ? `:${r.qualifier}` : ""}`
  );
  const memorySuggestions = await getMappingMemorySuggestions({
    ownerId: session.id,
    projectId: id,
    erpSystem: project.erpSystem,
    tradingPartner: project.tradingPartner,
    specKeys,
  });

  const accountLayout = await getImplementationInterface({
    userId: session.id,
    transactions: project.transactions,
    interfaceDefinitionId: project.interfaceDefinitionId,
  });
  const partnerCatalog = findTradingPartner(project.tradingPartner);

  return NextResponse.json({
    ...report,
    memorySuggestions,
    partnerCatalog: partnerCatalog
      ? {
          name: partnerCatalog.name,
          portal: partnerCatalog.portal,
          portalUrl: partnerCatalog.portalUrl,
          suggestedEdiVersion: partnerCatalog.ediVersions?.[0] ?? null,
          ediVersions: partnerCatalog.ediVersions ?? [],
          typicalTransactions: partnerCatalog.typicalTransactions,
        }
      : null,
    projectEdiVersion: project.ediVersion,
    accountLayout: accountLayout
      ? {
          erpSystem: accountLayout.erpSystem,
          transactionCode: accountLayout.transactionCode,
          name: accountLayout.name,
          version: accountLayout.version,
          source: accountLayout.source,
          fieldCount: accountLayout.fieldCount,
          hasSampleOutput: accountLayout.hasSampleOutput,
        }
      : null,
  });
}
