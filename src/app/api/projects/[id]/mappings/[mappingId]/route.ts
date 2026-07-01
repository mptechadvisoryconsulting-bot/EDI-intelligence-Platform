import { NextRequest, NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; mappingId: string }> };

function parseOptionalInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;

  const { id, mappingId } = await params;
  const body = await request.json();

  const mapping = await db.mappingRecommendation.findFirst({
    where: {
      id: mappingId,
      projectId: id,
      project: { ownerId: session.id },
    },
  });

  if (!mapping) {
    return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
  }

  const data: {
    reviewStatus?: string;
    reviewerId?: string | null;
    interfaceColumn?: string | null;
    sourceField?: string | null;
    recNumber?: number | null;
    startPosition?: number | null;
    charLimit?: number | null;
  } = {};

  if (body.reviewStatus !== undefined) {
    const reviewStatus = String(body.reviewStatus);
    if (!["approved", "rejected", "pending"].includes(reviewStatus)) {
      return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
    }
    data.reviewStatus = reviewStatus;
    data.reviewerId = reviewStatus === "pending" ? null : session.id;
  }

  if (body.interfaceColumn !== undefined) {
    const col = String(body.interfaceColumn ?? "").trim();
    data.interfaceColumn = col || null;
    if (col) data.sourceField = col;
  }

  const rec = parseOptionalInt(body.recNumber);
  if (rec !== undefined) data.recNumber = rec;
  const start = parseOptionalInt(body.startPosition);
  if (start !== undefined) data.startPosition = start;
  const width = parseOptionalInt(body.charLimit);
  if (width !== undefined) data.charLimit = width;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const updated = await db.mappingRecommendation.update({
    where: { id: mappingId },
    data,
  });

  return NextResponse.json(updated);
}
