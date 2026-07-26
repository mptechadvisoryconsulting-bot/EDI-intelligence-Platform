import Link from "next/link";
import { ArrowRight, RadioTower } from "lucide-react";
import { cn, formatDate, statusColor } from "@/lib/utils";

type TransactionSummary = {
  id: string;
  transactionCode: string;
  transactionName: string;
  lifecycleState: string;
  currentVersion: string;
  productionVersion: string | null;
  updatedAt: Date | string;
  tradingPartner: { name: string };
};

export function TransactionWorkspaceCard({ transaction }: { transaction: TransactionSummary }) {
  return (
    <Link
      href={`/trading-partner-transactions/${transaction.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-900 px-2 py-1 font-mono text-xs font-semibold text-white">
              {transaction.transactionCode}
            </span>
            <h3 className="font-semibold text-slate-900">{transaction.tradingPartner.name}</h3>
          </div>
          <p className="mt-2 text-sm text-slate-500">{transaction.transactionName}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("rounded-full px-2.5 py-1 font-medium", statusColor(transaction.lifecycleState))}>
          {transaction.lifecycleState.replaceAll("_", " ")}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
          Version {transaction.currentVersion}
        </span>
        {transaction.productionVersion && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
            <RadioTower className="h-3 w-3" />
            Live {transaction.productionVersion}
          </span>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-400">Updated {formatDate(transaction.updatedAt)}</p>
    </Link>
  );
}
