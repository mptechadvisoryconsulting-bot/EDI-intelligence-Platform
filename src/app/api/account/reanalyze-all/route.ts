import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { reanalyzeAllUserProjects } from "@/lib/analysis/run-project-analysis";

export async function POST() {
  try {
    const session = await requireSession();
    const summary = await reanalyzeAllUserProjects(session.id);
    if ("error" in summary && summary.error) {
      return NextResponse.json({ error: summary.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch {
    return NextResponse.json({ error: "Unauthorized — please sign in again" }, { status: 401 });
  }
}
