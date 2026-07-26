import { NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;
  const { id } = await params;
  const transaction = await db.tradingPartnerTransaction.findFirst({
    where: { id, tradingPartner: { ownerId: session.id } },
    include: {
      tradingPartner: true,
      revisions: { orderBy: { createdAt: "desc" } },
      legacyLinks: true,
      interfaceDefinition: true,
    },
  });
  if (!transaction) return NextResponse.json({ error: "Transaction workspace not found" }, { status: 404 });
  return NextResponse.json(transaction);
}
