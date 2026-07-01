"use client";

import { useEffect, useState } from "react";
import type { TransactionSetCatalogEntry } from "@/lib/industry/transaction-sets";
import { RETAIL_CORE_BUNDLE } from "@/lib/industry/transaction-sets";

export function TransactionCatalogPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (codes: string) => void;
}) {
  const [catalog, setCatalog] = useState<TransactionSetCatalogEntry[]>([]);

  useEffect(() => {
    fetch("/api/industry/catalog")
      .then((r) => r.json())
      .then((data) => setCatalog(data.transactionSets ?? []))
      .catch(() => {});
  }, []);

  const selected = new Set(
    value
      .split(/[,;\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
  );

  function toggle(code: string) {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange([...next].sort().join(", "));
  }

  const core = catalog.filter((t) => t.category === "retail_core");
  const extended = catalog.filter((t) => t.category !== "retail_core");

  return (
    <div className="sm:col-span-2">
      <label htmlFor="transactions" className="mb-1.5 block text-sm font-medium text-slate-700">
        EDI transaction sets
      </label>
      <input
        id="transactions"
        name="transactions"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="850, 856, 810"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(RETAIL_CORE_BUNDLE.join(", "))}
          className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-200"
        >
          Retail core bundle (846, 850, 855, 856, 810, 997)
        </button>
      </div>

      {core.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Retail core</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {core.map((tx) => (
              <TxChip key={tx.code} tx={tx} selected={selected.has(tx.code)} onToggle={() => toggle(tx.code)} />
            ))}
          </div>
        </div>
      )}

      {extended.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Extended / warehouse / transport</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {extended.map((tx) => (
              <TxChip key={tx.code} tx={tx} selected={selected.has(tx.code)} onToggle={() => toggle(tx.code)} />
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-slate-500">
        Solid chips = full mapping pack in platform. Outlined = industry catalog (feasibility tracked; mapping pack coming).
      </p>
    </div>
  );
}

function TxChip({
  tx,
  selected,
  onToggle,
}: {
  tx: TransactionSetCatalogEntry;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={tx.description}
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        selected
          ? tx.implemented
            ? "bg-indigo-600 text-white"
            : "border-2 border-indigo-600 bg-indigo-50 text-indigo-800"
          : tx.implemented
            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
            : "border border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400"
      }`}
    >
      {tx.code} {tx.name.split(" ")[0]}
    </button>
  );
}
