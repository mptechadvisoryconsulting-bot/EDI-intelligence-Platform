import { NextRequest, NextResponse } from "next/server";
import { runProjectAnalysis } from "@/lib/analysis/run-project-analysis";
import { requireSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;

  const result = await runProjectAnalysis(id, session.id);

  if (!result.ok) {
    const status = result.error === "Project not found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    message: "Analysis complete",
    summary: result.summary,
    mappingCount: result.mappingCount,
    questionCount: result.questionCount,
  });
}
