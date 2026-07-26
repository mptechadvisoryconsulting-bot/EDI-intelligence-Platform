import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requireSession();
  const tradingPartners = await db.tradingPartner.findMany({
    where: { ownerId: session.id },
    include: {
      transactions: {
        include: { revisions: { where: { isCurrent: true } } },
        orderBy: { transactionCode: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ tradingPartners });
}
