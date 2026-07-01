import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildReadinessReport } from "@/lib/readiness";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json();
  const action = String(body.action ?? "approve");
  const notes = body.notes ? String(body.notes) : null;
  const force = Boolean(body.force);

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
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const readiness = buildReadinessReport(project);

  if (action === "approve" && !readiness.canApprove && !force) {
    return NextResponse.json(
      {
        error: "Package cannot be approved yet.",
        approvalBlockers: readiness.approvalBlockers,
        readiness,
      },
      { status: 400 }
    );
  }

  const reviewStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";
  const projectStatus = action === "approve" ? "approved" : action === "reject" ? "blocked" : project.status;

  const approval = await db.approvalRecord.create({
    data: {
      projectId: id,
      userId: session.id,
      action: action === "approve" ? "package_approved" : action === "reject" ? "package_rejected" : action,
      notes,
    },
    include: { user: { select: { username: true, name: true } } },
  });

  await db.implementationProject.update({
    where: { id },
    data: { reviewStatus, status: projectStatus },
  });

  return NextResponse.json({
    ok: true,
    approval,
    reviewStatus,
    readiness: buildReadinessReport({
      ...project,
      reviewStatus,
      status: projectStatus,
    }),
  });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;

  const approvals = await db.approvalRecord.findMany({
    where: { project: { id, ownerId: session.id } },
    include: { user: { select: { username: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(approvals);
}
