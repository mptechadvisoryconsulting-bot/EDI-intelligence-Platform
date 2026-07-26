import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requireSession();
  const transactions = await db.tradingPartnerTransaction.findMany({
    where: {
      tradingPartner: { ownerId: session.id },
      lifecycleState: { in: ["production", "revision"] },
    },
    include: {
      tradingPartner: true,
      revisions: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ tradingPartner: { name: "asc" } }, { transactionCode: "asc" }],
  });
  return NextResponse.json({ transactions });
}
