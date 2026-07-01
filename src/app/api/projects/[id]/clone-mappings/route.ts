import { NextRequest, NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import { cloneMappingsFromProject } from "@/lib/spec-review";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;

  const { id } = await params;
  const body = await request.json();
  const sourceProjectId = String(body.sourceProjectId ?? "").trim();
  const replaceExisting = Boolean(body.replaceExisting);

  if (!sourceProjectId) {
    return NextResponse.json({ error: "sourceProjectId is required" }, { status: 400 });
  }

  if (sourceProjectId === id) {
    return NextResponse.json({ error: "Cannot clone from the same workspace" }, { status: 400 });
  }

  const result = await cloneMappingsFromProject({
    targetProjectId: id,
    sourceProjectId,
    ownerId: session.id,
    replaceExisting,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
