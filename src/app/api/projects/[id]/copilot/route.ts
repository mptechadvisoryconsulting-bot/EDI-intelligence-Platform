import { NextRequest, NextResponse } from "next/server";
import { buildCopilotContext } from "@/lib/copilot/context";
import { findReuseInsights } from "@/lib/copilot/reuse";
import { respondToCopilotMessage } from "@/lib/copilot/respond";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;

  const project = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Implementation not found" }, { status: 404 });
  }

  const messages = await db.copilotMessage.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json(messages);
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json();
  const message = String(body.message ?? "").trim();

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Implementation not found" }, { status: 404 });
  }

  await db.copilotMessage.create({
    data: { projectId: id, role: "user", content: message },
  });

  const context = buildCopilotContext(project);
  const reuseInsights = await findReuseInsights({
    projectId: id,
    ownerId: session.id,
    customer: project.customer,
    tradingPartner: project.tradingPartner,
    erpSystem: project.erpSystem,
    transactions: project.transactions,
  });

  const history = await db.copilotMessage.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const { reply, mode } = await respondToCopilotMessage({
    message,
    context,
    reuseInsights,
    history: history.map((m) => ({ role: m.role, content: m.content })),
  });

  const assistantMessage = await db.copilotMessage.create({
    data: { projectId: id, role: "assistant", content: reply },
  });

  return NextResponse.json({
    message: assistantMessage,
    readinessScore: context.readinessScore,
    readinessLabel: context.readinessLabel,
    nextActions: context.nextActions,
    blockers: context.blockers,
    mode,
  });
}
