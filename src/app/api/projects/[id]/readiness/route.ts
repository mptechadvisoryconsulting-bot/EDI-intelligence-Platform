import { NextRequest, NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import { db } from "@/lib/db";
import { getAccountErpLayout } from "@/lib/erp-layout";
import { buildReadinessReport } from "@/lib/readiness";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;

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
    return NextResponse.json({ error: "Implementation not found" }, { status: 404 });
  }

  const layout = await getAccountErpLayout(session.id);
  const account = layout
    ? {
        hasLayout: true,
        layoutValid: layout.validation.valid,
        fieldCount: layout.fieldCount,
        missingPositionCount: layout.validation.missingPositionCount,
        hasSampleOutput: layout.hasSampleOutput,
        sampleIssueCount: layout.sampleVerification?.issueCount ?? 0,
      }
    : {
        hasLayout: false,
        layoutValid: false,
        fieldCount: 0,
        missingPositionCount: 0,
        hasSampleOutput: false,
        sampleIssueCount: 0,
      };

  return NextResponse.json(buildReadinessReport(project, account));
}
