"use client";

import { useEffect, useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { ConnectionSetupPicker } from "@/components/connection-setup-picker";
import { ErpSystemPicker } from "@/components/erp-system-picker";
import { PartnerPicker, type PartnerSelection } from "@/components/partner-picker";
import { TransactionCatalogPicker } from "@/components/transaction-catalog-picker";

type ProjectSetup = {
  id: string;
  name: string;
  customer: string;
  tradingPartner: string;
  erpSystem: string;
  erpVersion: string | null;
  translatorTarget: string;
  connectionType?: string | null;
  connectionProvider?: string | null;
  ediVersion?: string | null;
  transactions: string;
  description: string | null;
  interfaceDefinitionId?: string | null;
  interfaceDefinition?: {
    id: string;
    transactionCode: string;
    name: string;
    version: string;
  } | null;
};

export function WorkspaceSettingsPanel({
  project,
  onSaved,
}: {
  project: ProjectSetup;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState(project.name);
  const [customer, setCustomer] = useState(project.customer);
  const [tradingPartner, setTradingPartner] = useState(project.tradingPartner);
  const [erpSystem, setErpSystem] = useState(project.erpSystem);
  const [erpVersion, setErpVersion] = useState(project.erpVersion ?? "");
  const [translatorTarget, setTranslatorTarget] = useState(project.translatorTarget);
  const [connectionType, setConnectionType] = useState(project.connectionType ?? "");
  const [connectionProvider, setConnectionProvider] = useState(project.connectionProvider ?? "");
  const [ediVersion, setEdiVersion] = useState(project.ediVersion ?? "");
  const [transactions, setTransactions] = useState(project.transactions);
  const [description, setDescription] = useState(project.description ?? "");
  const [translatorOptions, setTranslatorOptions] = useState<string[]>([]);
  const [interfaceDefinitionId, setInterfaceDefinitionId] = useState(project.interfaceDefinitionId ?? "");
  const [interfaceDefinitions, setInterfaceDefinitions] = useState<
    Array<{ id: string; transactionCode: string; name: string; version: string; status: string }>
  >([]);

  useEffect(() => {
    fetch("/api/industry/catalog")
      .then((r) => r.json())
      .then((d) => setTranslatorOptions(d.translatorPlatforms ?? []))
      .catch(() => {});
    fetch("/api/interface-definitions")
      .then((r) => r.json())
      .then((d) => setInterfaceDefinitions(d.definitions ?? []))
      .catch(() => {});
  }, []);

  function handlePartnerSelect(selection: PartnerSelection) {
    const cat = selection.catalog;
    if (!cat) return;
    if (cat.typicalTransactions.length) setTransactions(cat.typicalTransactions.join(", "));
    if (cat.ediVersions?.length) setEdiVersion(cat.ediVersions[0] ?? "");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          customer,
          tradingPartner,
          erpSystem,
          erpVersion: erpVersion || null,
          translatorTarget,
          connectionType: connectionType || null,
          connectionProvider: connectionProvider || null,
          ediVersion: ediVersion || null,
          transactions,
          description: description || null,
          interfaceDefinitionId: interfaceDefinitionId || null,
        }),
      });
      if (!res.ok) {
        setMessage("Could not save");
        return;
      }
      setMessage("Saved");
      onSaved();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/50"
      >
        <Settings2 className="h-3.5 w-3.5" />
        {open ? "Close setup" : "Edit implementation setup"}
      </button>

      {open && (
        <form onSubmit={save} className="glass-panel mt-3 rounded-2xl p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-slate-400">Implementation name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
                required
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-400">Customer</span>
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
                required
              />
            </label>
            <div className="sm:col-span-2 [&_label]:text-slate-400 [&_input]:border-slate-700 [&_input]:bg-slate-900/60 [&_input]:text-slate-100">
              <PartnerPicker
                value={tradingPartner}
                onChange={setTradingPartner}
                onSelectPartner={handlePartnerSelect}
              />
            </div>
            <div className="sm:col-span-2 [&_label]:text-slate-400 [&_select]:border-slate-700 [&_select]:bg-slate-900/60 [&_select]:text-slate-100">
              <ConnectionSetupPicker
                connectionType={connectionType}
                connectionProvider={connectionProvider}
                onChange={(t, p) => {
                  setConnectionType(t);
                  setConnectionProvider(p);
                }}
              />
            </div>
            <label className="text-sm">
              <span className="text-slate-400">Translator platform</span>
              <select
                value={translatorTarget}
                onChange={(e) => setTranslatorTarget(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
              >
                <option value="">Select...</option>
                {translatorOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-slate-400">X12 EDI version</span>
              <select
                value={ediVersion}
                onChange={(e) => setEdiVersion(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
              >
                <option value="">Not set</option>
                <option value="4010">4010</option>
                <option value="5010">5010</option>
                <option value="6020">6020</option>
              </select>
            </label>
            <div className="sm:col-span-2 [&_label]:text-slate-400 [&_input]:border-slate-700 [&_input]:bg-slate-900/60 [&_input]:text-slate-100">
              <ErpSystemPicker value={erpSystem} onChange={setErpSystem} />
            </div>
            <label className="text-sm">
              <span className="text-slate-400">ERP version</span>
              <input
                value={erpVersion}
                onChange={(e) => setErpVersion(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
              />
            </label>
            <div className="sm:col-span-2 [&_label]:text-slate-300 [&_input]:border-slate-700 [&_input]:bg-slate-900/60 [&_input]:text-slate-100">
              <TransactionCatalogPicker value={transactions} onChange={setTransactions} />
            </div>
            <label className="sm:col-span-2 text-sm">
              <span className="text-slate-400">Internal transaction interface</span>
              <select
                value={interfaceDefinitionId}
                onChange={(event) => setInterfaceDefinitionId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-indigo-500/30 bg-slate-900/60 px-3 py-2 text-slate-100"
              >
                <option value="">Automatic match / legacy fallback</option>
                {interfaceDefinitions
                  .filter((definition) => definition.status === "active")
                  .map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.transactionCode} · {definition.name} v{definition.version}
                    </option>
                  ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                Customer requirements are compared against this reusable internal model.
              </span>
            </label>
            <label className="sm:col-span-2 text-sm">
              <span className="text-slate-400">Notes</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
              />
            </label>
          </div>
          {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save setup
          </button>
        </form>
      )}
    </div>
  );
}
