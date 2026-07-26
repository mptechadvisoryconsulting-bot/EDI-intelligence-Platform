import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTradingPartnerTransactions } from "@/lib/trading-partner-transactions";

export async function GET() {
  const session = await requireSession();
  const projects = await db.implementationProject.findMany({
    where: { ownerId: session.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          documents: true,
          mappingRecommendations: true,
          openQuestions: true,
          artifacts: true,
        },
      },
    },
  });

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  const body = await request.json();
  const transactions = await createTradingPartnerTransactions(session.id, body);
  const project = await db.implementationProject.findUnique({
    where: { id: transactions[0].legacyProjectId },
  });
  return NextResponse.json(
    { ...project, transactionWorkspaceId: transactions[0].id },
    {
      status: 201,
      headers: {
        Deprecation: "true",
        Link: `</api/trading-partner-transactions>; rel="successor-version"`,
      },
    }
  );
}
