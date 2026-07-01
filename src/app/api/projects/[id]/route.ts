import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

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
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
      description: body.description ?? undefined,
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;

  const existing = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await db.implementationProject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
