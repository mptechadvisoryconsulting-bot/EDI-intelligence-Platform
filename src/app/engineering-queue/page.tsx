import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TransactionWorkspaceCard } from "@/components/transaction-workspace-card";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { engineeringLane, LIFECYCLE_LANES } from "@/lib/trading-partner-transactions";

const labels: Record<string, string> = {
  technical_review: "Technical Reviews",
  needs_mapping: "Needs Mapping",
  testing: "Testing",
  ready_for_go_live: "Ready for Go Live",
  production_changes: "Production Changes",
};

export default async function EngineeringQueuePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const transactions = await db.tradingPartnerTransaction.findMany({
    where: { tradingPartner: { ownerId: session.id }, lifecycleState: { not: "production" } },
    include: { tradingPartner: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-7xl px-8 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <ClipboardCheck className="h-6 w-6 text-indigo-600" /> Engineering Queue
        </h1>
        <p className="mt-1 text-sm text-slate-500">Work grouped by lifecycle state, not by files or generic projects.</p>
        <div className="mt-8 grid gap-5 xl:grid-cols-5">
          {LIFECYCLE_LANES.map((lane) => {
            const items = transactions.filter((transaction) => engineeringLane(transaction.lifecycleState) === lane);
            return (
              <section key={lane} className="rounded-2xl bg-slate-100/80 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-slate-800">{labels[lane]}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.map((transaction) => <TransactionWorkspaceCard key={transaction.id} transaction={transaction} />)}
                  {items.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-400">Queue clear</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
