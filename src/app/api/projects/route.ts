import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requireSession();
  const projects = await db.implementationProject.findMany({
    where: { ownerId: session.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          documents: true,
          mappingRecommendations: true,
          openQuestions: true,
          artifacts: true,
        },
      },
    },
  });

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  const body = await request.json();

  const project = await db.implementationProject.create({
    data: {
      name: String(body.name ?? "New Implementation"),
      customer: String(body.customer ?? ""),
      tradingPartner: String(body.tradingPartner ?? ""),
      erpSystem: String(body.erpSystem ?? ""),
      erpVersion: body.erpVersion ? String(body.erpVersion) : null,
      translatorTarget: String(body.translatorTarget ?? ""),
      connectionType: body.connectionType ? String(body.connectionType) : null,
      connectionProvider: body.connectionProvider ? String(body.connectionProvider) : null,
      ediVersion: body.ediVersion ? String(body.ediVersion) : null,
      transactions: String(body.transactions ?? ""),
      description: body.description ? String(body.description) : null,
      ownerId: session.id,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
