import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncTransactionLifecycleForLegacyProject } from "@/lib/trading-partner-transactions";
import { parseTransactionCodes } from "@/lib/transaction-packs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;

  const project = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      mappingRecommendations: { orderBy: { confidence: "desc" } },
      openQuestions: { orderBy: { createdAt: "desc" } },
      assumptions: { orderBy: { createdAt: "desc" } },
      artifacts: { orderBy: { createdAt: "desc" } },
      testScenarios: { orderBy: { createdAt: "asc" } },
      approvals: {
        include: { user: { select: { username: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      interfaceDefinition: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Implementation not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json();

  const existing = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Implementation not found" }, { status: 404 });
  }

  let interfaceDefinitionId: string | null | undefined;
  if (body.interfaceDefinitionId !== undefined) {
    interfaceDefinitionId = body.interfaceDefinitionId ? String(body.interfaceDefinitionId) : null;
    if (interfaceDefinitionId) {
      const definition = await db.transactionInterfaceDefinition.findFirst({
        where: { id: interfaceDefinitionId, userId: session.id, status: "active" },
      });
      const implementationCodes = parseTransactionCodes(
        body.transactions !== undefined ? String(body.transactions) : existing.transactions
      );
      if (!definition || !implementationCodes.includes(definition.transactionCode)) {
        return NextResponse.json(
          { error: "Select an active interface definition for this implementation transaction" },
          { status: 400 }
        );
      }
    }
  }

  const project = await db.implementationProject.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      customer: body.customer ?? undefined,
      tradingPartner: body.tradingPartner ?? undefined,
      erpSystem: body.erpSystem ?? undefined,
      erpVersion: body.erpVersion ?? undefined,
      translatorTarget: body.translatorTarget ?? undefined,
      transactions: body.transactions ?? undefined,
      status: body.status ?? undefined,
      reviewStatus: body.reviewStatus ?? undefined,
      description: body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
      connectionType: body.connectionType !== undefined ? (body.connectionType ? String(body.connectionType) : null) : undefined,
      connectionProvider:
        body.connectionProvider !== undefined
          ? body.connectionProvider
            ? String(body.connectionProvider)
            : null
          : undefined,
      ediVersion: body.ediVersion !== undefined ? (body.ediVersion ? String(body.ediVersion) : null) : undefined,
      interfaceDefinitionId,
    },
  });
  await syncTransactionLifecycleForLegacyProject(id, project.status, project.reviewStatus);

  return NextResponse.json(project);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;

  const existing = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Implementation not found" }, { status: 404 });
  }

  await db.implementationProject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
