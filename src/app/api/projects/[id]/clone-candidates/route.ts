import { NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import { listCloneCandidates } from "@/lib/spec-review";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;

  const { id } = await params;
  const candidates = await listCloneCandidates(session.id, id);
  return NextResponse.json({ candidates });
}
