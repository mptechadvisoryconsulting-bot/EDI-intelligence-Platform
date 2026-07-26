import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const transactions = await db.tradingPartnerTransaction.findMany({
    where: { tradingPartner: { ownerId: session.id } },
    include: { revisions: true },
  });
  const live = transactions.filter((item) => ["production", "revision"].includes(item.lifecycleState));
  const revisions = transactions.reduce((sum, item) => sum + Math.max(0, item.revisions.length - 1), 0);
  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900"><BarChart3 className="h-6 w-6 text-indigo-600" /> Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Lifecycle metrics derived from permanent transaction history.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <Metric label="Transactions" value={transactions.length} />
          <Metric label="Live" value={live.length} />
          <Metric label="Open revisions" value={transactions.filter((item) => item.lifecycleState === "revision").length} />
          <Metric label="Historical revisions" value={revisions} />
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-3xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>;
}
