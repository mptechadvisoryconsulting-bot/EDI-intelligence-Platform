import { NextResponse } from "next/server";
import { requireSession, type SessionUser } from "@/lib/auth";

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized — please sign in again" }, { status: 401 });
}

export async function requireSessionOr401(): Promise<SessionUser | NextResponse> {
  try {
    return await requireSession();
  } catch {
    return unauthorizedResponse();
  }
}

export function isSessionResponse(
  value: SessionUser | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}
