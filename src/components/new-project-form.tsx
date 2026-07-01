"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { RETAIL_TRANSACTION_BUNDLE, SUPPORTED_TRANSACTION_CODES } from "@/lib/transaction-packs";
import { ErpSystemPicker } from "@/components/erp-system-picker";
import { PartnerPicker } from "@/components/partner-picker";

const TRANSACTION_PRESETS: Record<string, string> = {
  "846": "846 Inventory Advice",
  "850": "850 Purchase Order",
  "855": "855 PO Acknowledgment",
  "856": "856 Ship Notice / ASN",
  "810": "810 Invoice",
};

export function NewProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState("850");
  const [erpSystem, setErpSystem] = useState("");
  const [tradingPartner, setTradingPartner] = useState("");
  const [accountErp, setAccountErp] = useState<{ erpSystem: string; fieldCount: number } | null>(null);

  useEffect(() => {
    fetch("/api/account/erp-layout")
      .then((r) => r.json())
      .then((data) => {
        if (data.configured && data.layout) {
          setAccountErp({ erpSystem: data.layout.erpSystem, fieldCount: data.layout.fieldCount });
          setErpSystem((prev) => prev || data.layout.erpSystem);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.transactions = transactions;
    payload.erpSystem = erpSystem;
    payload.tradingPartner = tradingPartner;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError("Failed to create workspace");
        return;
      }

      const project = await res.json();
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch {
      setError("Unable to create workspace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">New implementation workspace</h2>
      <p className="mt-1 text-sm text-slate-500">
        Set up customer, partner, ERP, and translator context. Supports all ERP systems — pick from the catalog or enter your own.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Workspace name" name="name" required placeholder="Acme 850 PO Setup" />
        <Field label="Customer" name="customer" required placeholder="Acme Corp" />
        <PartnerPicker value={tradingPartner} onChange={setTradingPartner} />
        <ErpSystemPicker value={erpSystem} onChange={setErpSystem} />
        {accountErp && (
          <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Account ERP layout active: {accountErp.fieldCount} fields from {accountErp.erpSystem} — no need to
            re-upload ERP schema per workspace.
          </p>
        )}
        <Field label="ERP version" name="erpVersion" placeholder="2024.1" />
        <Field label="Translator target" name="translatorTarget" required placeholder="IBM Sterling" />
        <div className="sm:col-span-2">
          <label htmlFor="transactions" className="mb-1.5 block text-sm font-medium text-slate-700">
            Transactions
          </label>
          <input
            id="transactions"
            name="transactions"
            required
            value={transactions}
            onChange={(e) => setTransactions(e.target.value)}
            placeholder="850, 856, 810"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTransactions(RETAIL_TRANSACTION_BUNDLE.join(", "))}
              className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-200"
            >
              Retail bundle: 846, 850, 855, 856, 810
            </button>
            {SUPPORTED_TRANSACTION_CODES.map((code) => {
              const selected = transactions.split(/[,;\s]+/).includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    const current = transactions
                      .split(/[,;\s]+/)
                      .map((t) => t.trim())
                      .filter(Boolean);
                    const next = selected
                      ? current.filter((t) => t !== code)
                      : [...current, code];
                    setTransactions(next.join(", "));
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selected
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {code} {TRANSACTION_PRESETS[code]?.split(" ").slice(1).join(" ")}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Supported family packs: {SUPPORTED_TRANSACTION_CODES.join(", ")}. Each pack adds standard fields, checklists, and test scenarios.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="Implementation scope, deadlines, or known constraints..."
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Create workspace
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}
