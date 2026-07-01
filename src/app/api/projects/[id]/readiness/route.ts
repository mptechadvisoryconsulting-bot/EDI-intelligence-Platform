import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildReadinessReport } from "@/lib/readiness";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;

  const project = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
    include: {
      documents: true,
      mappingRecommendations: true,
      openQuestions: true,
      assumptions: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(buildReadinessReport(project));
}
