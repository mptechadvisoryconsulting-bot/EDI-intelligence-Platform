"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

type ErpOption = {
  id: string;
  name: string;
  vendor: string;
  category: string;
  label: string;
};

export function ErpSystemPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [options, setOptions] = useState<ErpOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/erp-profiles")
      .then((r) => r.json())
      .then((data) => setOptions(data.profiles ?? []))
      .catch(() => setOptions([]));
  }, []);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 12);
    return options
      .filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.vendor.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [options, value]);

  function select(option: ErpOption) {
    onChange(option.name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <label htmlFor="erpSystem" className="mb-1.5 block text-sm font-medium text-slate-700">
        ERP / source system
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="erpSystem"
          name="erpSystem"
          required
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Select ERP — SAP, NetSuite, Dynamics, JD Edwards..."
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          autoComplete="off"
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {options.length > 0
          ? `${options.length}+ ERP profiles with field aliases — or enter any system name.`
          : "Enter any ERP name; upload a source field list for mapping."}
      </p>
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(option)}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-indigo-50"
              >
                <span className="font-medium text-slate-900">{option.name}</span>
                <span className="text-xs text-slate-500">
                  {option.vendor} · {option.category}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
