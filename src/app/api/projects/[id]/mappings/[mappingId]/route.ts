import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; mappingId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id, mappingId } = await params;
  const body = await request.json();
  const reviewStatus = String(body.reviewStatus ?? "");

  if (!["approved", "rejected", "pending"].includes(reviewStatus)) {
    return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
  }

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

  const updated = await db.mappingRecommendation.update({
    where: { id: mappingId },
    data: {
      reviewStatus,
      reviewerId: reviewStatus === "pending" ? null : session.id,
    },
  });

  return NextResponse.json(updated);
}
