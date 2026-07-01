import { NextRequest, NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import { applyMappingMemory } from "@/lib/spec-review";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;

  const { id } = await params;
  const body = await request.json();
  const suggestions = body.suggestions ?? [];

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return NextResponse.json({ error: "No suggestions provided" }, { status: 400 });
  }

  const result = await applyMappingMemory({
    projectId: id,
    ownerId: session.id,
    suggestions,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
