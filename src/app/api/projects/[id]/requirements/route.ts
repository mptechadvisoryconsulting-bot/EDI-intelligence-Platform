import { NextRequest, NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import { db } from "@/lib/db";
import { specRequirementKey } from "@/lib/spec-review";
import { buildParseSummary, deserializeParsed, normalizeParsedDocument } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

const REVIEW_STATUSES = new Set(["pending", "confirmed", "needs_review"]);
const USAGES = new Set(["required", "optional", "conditional"]);

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;

  const { id } = await params;
  const body = await request.json();
  const documentId = String(body.documentId ?? "");
  const requirementKey = String(body.requirementKey ?? "");

  if (!documentId || !requirementKey) {
    return NextResponse.json(
      { error: "Document and requirement are required" },
      { status: 400 }
    );
  }

  const document = await db.document.findFirst({
    where: {
      id: documentId,
      project: { id, ownerId: session.id },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Specification document not found" }, { status: 404 });
  }

  const parsed = deserializeParsed(document.parsedContent);
  if (!parsed) {
    return NextResponse.json({ error: "Specification has not been parsed" }, { status: 409 });
  }

  const normalized = normalizeParsedDocument(parsed);
  const requirement = normalized.targetFields.find(
    (field) => specRequirementKey(field) === requirementKey
  );

  if (!requirement) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  if (body.reviewStatus !== undefined) {
    const reviewStatus = String(body.reviewStatus);
    if (!REVIEW_STATUSES.has(reviewStatus)) {
      return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
    }
    requirement.reviewStatus = reviewStatus as "pending" | "confirmed" | "needs_review";
  }

  const updates = body.updates && typeof body.updates === "object" ? body.updates : {};
  for (const field of ["description", "condition", "dataType", "expectedFormat", "repeats"] as const) {
    if (updates[field] !== undefined) {
      const value = String(updates[field]).trim();
      requirement[field] = value || undefined;
    }
  }
  if (updates.usage !== undefined) {
    const usage = String(updates.usage);
    if (!USAGES.has(usage)) {
      return NextResponse.json({ error: "Invalid requirement usage" }, { status: 400 });
    }
    requirement.usage = usage as "required" | "optional" | "conditional";
    requirement.required = usage === "required";
  }

  await db.document.update({
    where: { id: document.id },
    data: {
      parsedContent: JSON.stringify(normalized),
      parseSummary: buildParseSummary(normalized),
    },
  });

  return NextResponse.json({ ok: true, requirement });
}
