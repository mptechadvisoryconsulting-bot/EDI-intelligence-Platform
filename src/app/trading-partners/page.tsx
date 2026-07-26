import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TransactionWorkspaceCard } from "@/components/transaction-workspace-card";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function TradingPartnersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const partners = await db.tradingPartner.findMany({
    where: { ownerId: session.id },
    include: { transactions: { orderBy: { transactionCode: "asc" } } },
    orderBy: { name: "asc" },
  });
  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <Building2 className="h-6 w-6 text-indigo-600" /> Trading Partners
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Permanent customer relationships containing one engineering workspace per EDI transaction.
            </p>
          </div>
          <Link href="/trading-partner-transactions/new" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500">
            <Plus className="mr-2 inline h-4 w-4" /> New transaction workspace
          </Link>
        </div>
        {partners.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-500">
            Create the first trading partner transaction workspace.
          </div>
        ) : (
          <div className="space-y-7">
            {partners.map((partner) => (
              <section key={partner.id}>
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{partner.name}</h2>
                    <p className="text-xs text-slate-500">{partner.transactions.length} transaction workspace(s)</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {partner.transactions.map((transaction) => (
                    <TransactionWorkspaceCard
                      key={transaction.id}
                      transaction={{ ...transaction, tradingPartner: { name: partner.name } }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
