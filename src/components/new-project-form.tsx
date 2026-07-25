"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { ConnectionSetupPicker } from "@/components/connection-setup-picker";
import { ErpSystemPicker } from "@/components/erp-system-picker";
import { PartnerPicker, type PartnerSelection } from "@/components/partner-picker";
import { TransactionCatalogPicker } from "@/components/transaction-catalog-picker";

export function NewProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState("850");
  const [erpSystem, setErpSystem] = useState("");
  const [tradingPartner, setTradingPartner] = useState("");
  const [connectionType, setConnectionType] = useState("");
  const [connectionProvider, setConnectionProvider] = useState("");
  const [ediVersion, setEdiVersion] = useState("");
  const [translatorTarget, setTranslatorTarget] = useState("");
  const [translatorOptions, setTranslatorOptions] = useState<string[]>([]);
  const [accountErp, setAccountErp] = useState<{ erpSystem: string; fieldCount: number } | null>(null);
  const [partnerHint, setPartnerHint] = useState("");

  useEffect(() => {
    fetch("/api/industry/catalog")
      .then((r) => r.json())
      .then((data) => setTranslatorOptions(data.translatorPlatforms ?? []))
      .catch(() => {});

    fetch("/api/account/erp-layout")
      .then((r) => r.json())
      .then((data) => {
        if (data.configured && data.layout) {
          setAccountErp({ erpSystem: data.layout.erpSystem, fieldCount: data.layout.fieldCount });
        }
      })
      .catch(() => {});
  }, []);

  function applyAccountErp() {
    if (accountErp) setErpSystem(accountErp.erpSystem);
  }

  function handlePartnerSelect(selection: PartnerSelection) {
    const cat = selection.catalog;
    if (!cat) return;

    const hints: string[] = [];
    if (cat.typicalTransactions.length) {
      setTransactions(cat.typicalTransactions.join(", "));
      hints.push(`Transactions: ${cat.typicalTransactions.join(", ")}`);
    }
    if (cat.ediVersions?.length) {
      setEdiVersion(cat.ediVersions[0] ?? "");
      hints.push(`EDI version: ${cat.ediVersions.join(" or ")}`);
    }
    if (cat.portal) hints.push(`Portal: ${cat.portal}`);

    const conn = cat.typicalConnections[0]?.toLowerCase() ?? "";
    if (conn.includes("as2")) setConnectionType("as2");
    else if (conn.includes("sftp")) setConnectionType("sftp");
    else if (conn.includes("van")) setConnectionType("van");
    else if (conn.includes("api")) setConnectionType("api");

    if (conn.includes("sterling")) {
      setConnectionProvider("ibm_sterling_van");
      setTranslatorTarget((prev) => prev || "IBM Sterling B2B Integrator");
    } else if (conn.includes("sps")) {
      setConnectionProvider("sps_commerce");
    }

    setPartnerHint(hints.join(" · "));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      customer: String(form.get("customer") ?? ""),
      tradingPartner,
      erpSystem,
      erpVersion: form.get("erpVersion") ? String(form.get("erpVersion")) : null,
      translatorTarget,
      connectionType,
      connectionProvider,
      ediVersion: ediVersion || null,
      transactions,
      description: form.get("description") ? String(form.get("description")) : null,
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create implementation");
        return;
      }

      const project = await res.json();
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch {
      setError("Unable to create implementation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-100">New implementation</h2>
      <p className="mt-1 text-sm text-slate-400">
        Customer, trading partner, ERP platform, connection (VAN/SFTP/AS2), and industry transaction sets — not locked to any single vendor.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Implementation name" name="name" required placeholder="Acme 850 Purchase Order" />
        <Field label="Customer / vendor name" name="customer" required placeholder="Your customer or client company" />

        <div className="sm:col-span-2 [&_label]:text-slate-400 [&_input]:border-slate-700 [&_input]:bg-slate-900/60 [&_input]:text-slate-100">
          <PartnerPicker
            value={tradingPartner}
            onChange={setTradingPartner}
            onSelectPartner={handlePartnerSelect}
          />
        </div>

        {partnerHint && (
          <p className="sm:col-span-2 rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-300">{partnerHint}</p>
        )}

        <div className="sm:col-span-2 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p className="text-sm font-medium text-slate-200">Connection setup</p>
          <p className="mt-0.5 text-xs text-slate-500">How EDI flows between your customer and the trading partner.</p>
          <div className="mt-3 [&_label]:text-slate-400 [&_select]:border-slate-700 [&_select]:bg-slate-900/60 [&_select]:text-slate-100">
            <ConnectionSetupPicker
              connectionType={connectionType}
              connectionProvider={connectionProvider}
              onChange={(type, provider) => {
                setConnectionType(type);
                setConnectionProvider(provider);
              }}
            />
          </div>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-400">Map / translator platform</span>
          <select
            value={translatorTarget}
            onChange={(e) => setTranslatorTarget(e.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Select platform...</option>
            {translatorOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-400">X12 EDI version</span>
          <select
            value={ediVersion}
            onChange={(e) => setEdiVersion(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Select if known...</option>
            <option value="4010">4010</option>
            <option value="5010">5010</option>
            <option value="6020">6020</option>
          </select>
        </label>

        <div className="sm:col-span-2 [&_label]:text-slate-400 [&_input]:border-slate-700 [&_input]:bg-slate-900/60 [&_input]:text-slate-100">
          <ErpSystemPicker value={erpSystem} onChange={setErpSystem} />
          {accountErp && erpSystem !== accountErp.erpSystem && (
            <button
              type="button"
              onClick={applyAccountErp}
              className="mt-2 text-xs font-medium text-emerald-400 hover:underline"
            >
              Use account layout ERP: {accountErp.erpSystem} ({accountErp.fieldCount} fields) — optional
            </button>
          )}
        </div>

        <Field label="ERP version" name="erpVersion" placeholder="2024.1 / 11i / etc." />

        <div className="sm:col-span-2 [&_label]:text-slate-300 [&_input]:border-slate-700 [&_input]:bg-slate-900/60 [&_input]:text-slate-100">
          <TransactionCatalogPicker value={transactions} onChange={setTransactions} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-400">
            Notes
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Implementation scope, certification deadline, VAN mailbox ID..."
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !erpSystem || !connectionType || !connectionProvider}
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
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
    </div>
  );
}
