"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

type PartnerOption = {
  id: string;
  name: string;
  retailer: string;
  category: string;
  label: string;
};

export function PartnerPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [options, setOptions] = useState<PartnerOption[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/partner-profiles")
      .then((r) => r.json())
      .then((data) => setOptions(data.profiles ?? []))
      .catch(() => setOptions([]));
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 10);
    return options
      .filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.retailer.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [options, query]);

  function select(option: PartnerOption) {
    onChange(option.name);
    setQuery(option.name);
    setOpen(false);
  }

  return (
    <div className="relative">
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
          placeholder="Walmart, Target, Amazon, or any partner..."
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          autoComplete="off"
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Named retailers get partner rule packs and certification checklists — or enter any partner name.
      </p>
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(option)}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-violet-50"
              >
                <span className="font-medium text-slate-900">{option.name}</span>
                <span className="text-xs text-slate-500">{option.category.replace(/_/g, " ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
