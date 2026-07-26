import { NextRequest, NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import { db } from "@/lib/db";
import { syncTransactionLifecycleForLegacyProject } from "@/lib/trading-partner-transactions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;
  const { id } = await params;

  const events = await db.approvalRecord.findMany({
    where: {
      project: { id, ownerId: session.id },
      action: { in: ["production_deployed", "revision_requested"] },
    },
    include: { user: { select: { username: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(events);
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;
  const { id } = await params;
  const body = await request.json();
  const action = String(body.action ?? "");
  const notes = body.notes ? String(body.notes).trim() : null;

  const implementation = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
    include: {
      mappingRecommendations: true,
      testScenarios: true,
      approvals: true,
    },
  });

  if (!implementation) {
    return NextResponse.json({ error: "Implementation not found" }, { status: 404 });
  }

  if (action === "deploy") {
    if (implementation.reviewStatus !== "approved") {
      return NextResponse.json(
        { error: "Business approval is required before go live" },
        { status: 409 }
      );
    }
    if (implementation.mappingRecommendations.length === 0) {
      return NextResponse.json(
        { error: "At least one mapping is required before go live" },
        { status: 409 }
      );
    }
    if (implementation.mappingRecommendations.some((mapping) => mapping.reviewStatus !== "approved")) {
      return NextResponse.json(
        { error: "All mappings must be approved before go live" },
        { status: 409 }
      );
    }
    if (implementation.testScenarios.length === 0) {
      return NextResponse.json(
        { error: "Testing evidence is required before go live" },
        { status: 409 }
      );
    }
    if (!["approved", "revision"].includes(implementation.status)) {
      return NextResponse.json(
        { error: "Only an approved implementation or active revision can be deployed" },
        { status: 409 }
      );
    }

    const deploymentNumber =
      implementation.approvals.filter((approval) => approval.action === "production_deployed").length + 1;
    const version = deploymentNumber === 1 ? "1.0" : `1.${deploymentNumber - 1}`;
    const deployment = await db.approvalRecord.create({
      data: {
        projectId: id,
        userId: session.id,
        action: "production_deployed",
        notes: [`Version ${version}`, notes].filter(Boolean).join(" — "),
      },
      include: { user: { select: { username: true, name: true } } },
    });
    await db.implementationProject.update({
      where: { id },
      data: { status: "production" },
    });
    await db.tradingPartnerTransaction.updateMany({
      where: { legacyLinks: { some: { legacyProjectId: id } } },
      data: { lifecycleState: "production", currentVersion: version, productionVersion: version },
    });
    await db.transactionRevision.updateMany({
      where: {
        transaction: { legacyLinks: { some: { legacyProjectId: id } } },
        version,
      },
      data: {
        lifecycleState: "production",
        isCurrent: true,
        goLiveAt: deployment.createdAt,
      },
    });
    await syncTransactionLifecycleForLegacyProject(id, "production", implementation.reviewStatus);

    return NextResponse.json({ ok: true, status: "production", version, event: deployment });
  }

  if (action === "request_revision") {
    if (implementation.status !== "production") {
      return NextResponse.json(
        { error: "A revision can only be opened against a live implementation" },
        { status: 409 }
      );
    }
    if (!notes) {
      return NextResponse.json(
        { error: "Reason for change is required" },
        { status: 400 }
      );
    }

    const revision = await db.approvalRecord.create({
      data: {
        projectId: id,
        userId: session.id,
        action: "revision_requested",
        notes,
      },
      include: { user: { select: { username: true, name: true } } },
    });
    await db.implementationProject.update({
      where: { id },
      data: { status: "revision", reviewStatus: "pending" },
    });
    const transactionWorkspaces = await db.tradingPartnerTransaction.findMany({
      where: { legacyLinks: { some: { legacyProjectId: id } } },
      include: { revisions: true },
    });
    for (const workspace of transactionWorkspaces) {
      const nextMinor =
        Math.max(
          0,
          ...workspace.revisions
            .map((item) => Number(item.version.split(".")[1]))
            .filter(Number.isFinite)
        ) + 1;
      const version = `1.${nextMinor}`;
      await db.transactionRevision.updateMany({
        where: { transactionId: workspace.id },
        data: { isCurrent: false },
      });
      await db.transactionRevision.upsert({
        where: { transactionId_version: { transactionId: workspace.id, version } },
        update: { reason: notes, lifecycleState: "revision", isCurrent: true },
        create: {
          transactionId: workspace.id,
          version,
          reason: notes,
          lifecycleState: "revision",
          isCurrent: true,
          legacyProjectId: id,
        },
      });
      await db.tradingPartnerTransaction.update({
        where: { id: workspace.id },
        data: { lifecycleState: "revision", currentVersion: version },
      });
    }
    await syncTransactionLifecycleForLegacyProject(id, "revision", "pending");

    return NextResponse.json({ ok: true, status: "revision", event: revision });
  }

  return NextResponse.json({ error: "Unsupported production action" }, { status: 400 });
}
