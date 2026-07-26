import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { engineeringLane } from "@/lib/trading-partner-transactions";

export async function GET() {
  const session = await requireSession();
  const transactions = await db.tradingPartnerTransaction.findMany({
    where: { tradingPartner: { ownerId: session.id }, lifecycleState: { not: "production" } },
    include: { tradingPartner: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    queue: transactions.map((transaction) => ({
      ...transaction,
      lane: engineeringLane(transaction.lifecycleState),
    })),
  });
}
