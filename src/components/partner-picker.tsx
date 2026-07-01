"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { TradingPartnerCatalogEntry } from "@/lib/industry/trading-partners";

type PartnerOption = TradingPartnerCatalogEntry & { hasRulePack?: boolean };

export type PartnerSelection = {
  name: string;
  catalog?: PartnerOption;
};

export function PartnerPicker({
  value,
  onChange,
  onSelectPartner,
}: {
  value: string;
  onChange: (name: string) => void;
  onSelectPartner?: (selection: PartnerSelection) => void;
}) {
  const [options, setOptions] = useState<PartnerOption[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/industry/catalog")
      .then((r) => r.json())
      .then((data) => setOptions(data.tradingPartners ?? []))
      .catch(() => setOptions([]));
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 12);
    return options
      .filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q) ||
          o.searchTerms.some((t) => t.includes(q) || q.includes(t))
      )
      .slice(0, 12);
  }, [options, query]);

  function select(option: PartnerOption) {
    onChange(option.name);
    setQuery(option.name);
    setOpen(false);
    onSelectPartner?.({ name: option.name, catalog: option });
  }

  return (
    <div className="relative sm:col-span-2">
      <label htmlFor="tradingPartner" className="mb-1.5 block text-sm font-medium text-slate-700">
        Trading partner / retailer
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="tradingPartner"
          name="tradingPartner"
          required
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search Walmart, Target, Kroger, UNFI..."
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          autoComplete="off"
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {options.length > 0
          ? `${options.length} industry retailers — pick one to suggest transactions and connection.`
          : "Enter any trading partner name."}
      </p>
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(option)}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-violet-50"
              >
                <span className="font-medium text-slate-900">{option.name}</span>
                <span className="text-xs text-slate-500">
                  {option.category.replace(/_/g, " ")}
                  {option.portal ? ` · ${option.portal}` : ""}
                  {option.hasRulePack ? " · certification pack" : ""}
                </span>
                <span className="mt-0.5 font-mono text-[10px] text-slate-400">
                  {option.typicalTransactions.join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
