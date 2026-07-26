import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTradingPartnerTransactions } from "@/lib/trading-partner-transactions";

export async function GET() {
  const session = await requireSession();
  const transactions = await db.tradingPartnerTransaction.findMany({
    where: { tradingPartner: { ownerId: session.id } },
    include: {
      tradingPartner: true,
      revisions: { where: { isCurrent: true }, orderBy: { updatedAt: "desc" } },
      interfaceDefinition: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  try {
    const transactions = await createTradingPartnerTransactions(session.id, await request.json());
    return NextResponse.json(
      { id: transactions[0].id, transactions },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create transaction workspace" },
      { status: 400 }
    );
  }
}
