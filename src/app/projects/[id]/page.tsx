import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export default async function LegacyImplementationRedirect({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const link = await db.legacyImplementationLink.findFirst({
    where: {
      legacyProjectId: id,
      transaction: { tradingPartner: { ownerId: session.id } },
    },
    orderBy: { relationship: "asc" },
  });
  if (!link) notFound();
  redirect(`/trading-partner-transactions/${link.transactionId}`);
}
