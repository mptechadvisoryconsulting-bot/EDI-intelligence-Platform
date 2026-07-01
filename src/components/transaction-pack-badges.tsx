import { resolveTransactionPacks, SUPPORTED_TRANSACTION_CODES } from "@/lib/transaction-packs";

export function TransactionPackBadges({ transactions }: { transactions: string }) {
  const packs = resolveTransactionPacks(transactions);

  if (packs.length === 0) {
    return (
      <p className="text-xs text-amber-700">
        No supported transaction packs. Use: {SUPPORTED_TRANSACTION_CODES.join(", ")}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {packs.map((pack) => (
        <span
          key={pack.code}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100"
          title={pack.description}
        >
          <span className="font-mono">{pack.code}</span>
          {pack.name}
        </span>
      ))}
    </div>
  );
}
