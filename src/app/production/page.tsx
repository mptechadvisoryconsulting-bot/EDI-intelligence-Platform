import { redirect } from "next/navigation";
import { RadioTower } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TransactionWorkspaceCard } from "@/components/transaction-workspace-card";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ProductionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const transactions = await db.tradingPartnerTransaction.findMany({
    where: { tradingPartner: { ownerId: session.id }, lifecycleState: { in: ["production", "revision"] } },
    include: { tradingPartner: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <RadioTower className="h-6 w-6 text-emerald-600" /> Production
        </h1>
        <p className="mt-1 text-sm text-slate-500">Live trading partner transactions, current versions, and active production revisions.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {transactions.map((transaction) => <TransactionWorkspaceCard key={transaction.id} transaction={transaction} />)}
        </div>
        {transactions.length === 0 && <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-500">No live transactions yet.</div>}
      </div>
    </AppShell>
  );
}
