import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers3, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TransactionWorkspaceCard } from "@/components/transaction-workspace-card";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const transactions = await db.tradingPartnerTransaction.findMany({
    where: { tradingPartner: { ownerId: session.id } },
    include: { tradingPartner: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  const [partners, interfaceStandards] = await Promise.all([
    db.tradingPartner.count({ where: { ownerId: session.id } }),
    db.transactionInterfaceDefinition.count({ where: { userId: session.id, status: "active" } }),
  ]);
  const pendingReview = transactions.filter((item) =>
    ["specification_received", "analysis", "technical_assessment", "waiting_business_approval"].includes(item.lifecycleState)
  ).length;
  const live = transactions.filter((item) => ["production", "revision"].includes(item.lifecycleState)).length;

  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">EDI engineering platform</p>
            <h1 className="mt-1 text-2xl font-semibold ai-gradient-text">Operations Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Permanent transaction workspaces from specification through production revisions.</p>
          </div>
          <Link href="/trading-partner-transactions/new" className="btn-ai-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> New transaction workspace
          </Link>
        </div>
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <Stat label="Trading partners" value={partners} />
          <Stat label="Transactions" value={transactions.length} />
          <Stat label="Pending reviews" value={pendingReview} />
          <Stat label="Live transactions" value={live} />
        </div>
        {interfaceStandards === 0 && (
          <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <div><p className="flex items-center gap-2 font-medium text-amber-100"><Layers3 className="h-4 w-4" /> Build your Interface Library</p><p className="mt-1 text-sm text-amber-200/80">Define each internal transaction interface once and reuse it for every partner.</p></div>
            <Link href="/interface-library" className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white">Build library</Link>
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Recent transaction workspaces</h2>
          <Link href="/engineering-queue" className="text-sm font-medium text-indigo-400">Open engineering queue →</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {transactions.map((transaction) => <TransactionWorkspaceCard key={transaction.id} transaction={transaction} />)}
        </div>
        {transactions.length === 0 && <div className="glass-panel rounded-2xl px-6 py-12 text-center text-slate-400">No transaction workspaces yet.</div>}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="glass-panel rounded-xl p-5"><p className="text-2xl font-semibold text-slate-100">{value}</p><p className="text-sm text-slate-500">{label}</p></div>;
}
