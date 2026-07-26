"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  Boxes,
  ChevronDown,
  ChevronRight,
  FileDown,
  Layers3,
  Loader2,
  Plus,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

type InterfaceField = {
  fieldName: string;
  interfaceColumn: string;
  recordType?: string;
  recNumber?: number;
  startPosition?: number;
  charLimit?: number;
  dataType?: string;
  validationRule?: string;
  repeating?: boolean;
  jsonPath?: string;
  xpath?: string;
};

type InterfaceDefinition = {
  id: string;
  transactionCode: string;
  name: string;
  version: string;
  layoutType: string;
  status: string;
  description?: string | null;
  erpSystem?: string | null;
  originalFileName?: string | null;
  fieldCount: number;
  fields: InterfaceField[];
  recordGroups: Array<{ name: string; fieldCount: number; repeating: boolean }>;
  implementationCount: number;
  updatedAt: string;
};

const LAYOUT_TYPES = [
  ["fixed_width", "Fixed width"],
  ["csv", "CSV"],
  ["xml", "XML"],
  ["json", "JSON"],
  ["api", "API"],
] as const;

export function InterfaceLibraryPanel() {
  const [definitions, setDefinitions] = useState<InterfaceDefinition[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/interface-definitions");
    const data = await response.json().catch(() => ({}));
    if (response.ok) setDefinitions(data.definitions ?? []);
    else setError(data.error ?? "Could not load the Interface Library");
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createDefinition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/interface-definitions", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not create interface definition");
        return;
      }
      setMessage(`Created ${data.definition.transactionCode} interface version ${data.definition.version}.`);
      setShowCreate(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(definition: InterfaceDefinition) {
    const response = await fetch(`/api/interface-definitions/${definition.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: definition.status === "active" ? "archived" : "active" }),
    });
    if (response.ok) await load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading transaction standards...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
              <Layers3 className="h-5 w-5 text-indigo-400" />
              Transaction Interface Library
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Define each internal transaction once. Customer implementations compare their structured requirements
              against these reusable, versioned interface models.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/samples/transaction-interface-850.csv"
              download
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              <FileDown className="h-4 w-4" />
              850 template
            </a>
            <button
              type="button"
              onClick={() => setShowCreate((value) => !value)}
              className="btn-ai-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Create definition
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Transaction standards" value={definitions.filter((item) => item.status === "active").length} />
          <Metric label="Defined fields" value={definitions.reduce((total, item) => total + item.fieldCount, 0)} />
          <Metric
            label="Implementations using library"
            value={definitions.reduce((total, item) => total + item.implementationCount, 0)}
          />
        </div>
      </section>

      {showCreate && (
        <form onSubmit={createDefinition} className="glass-panel rounded-2xl p-6">
          <h3 className="font-semibold text-slate-100">Create Interface Definition</h3>
          <p className="mt-1 text-sm text-slate-400">
            Classify the transaction and layout, then import its fields. Record Type organizes Header, Detail, and
            Summary visually.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Transaction" name="transactionCode" required placeholder="850" pattern="\d{3}" />
            <Field label="Interface name" name="name" required placeholder="850 Purchase Order" />
            <Field label="Version" name="version" required placeholder="1.0" />
            <label className="text-sm">
              <span className="font-medium text-slate-300">Layout type</span>
              <select
                name="layoutType"
                required
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
              >
                {LAYOUT_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Source system (optional)" name="erpSystem" placeholder="SAP, Oracle, custom API..." />
            <Field label="Description" name="description" placeholder="Company standard purchase-order interface" />
            <label className="sm:col-span-2 text-sm">
              <span className="font-medium text-slate-300">Import layout</span>
              <span className="mt-1.5 flex items-center gap-3 rounded-xl border border-dashed border-indigo-500/40 bg-indigo-500/5 px-4 py-5 text-slate-300">
                <Upload className="h-5 w-5 text-indigo-400" />
                <input name="file" type="file" required accept=".csv,.xlsx,.xls,.json,.xml" className="text-sm" />
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Recommended columns: Record Type, Interface Column, Field Name, Rec Number, Start Column, Width,
                Data Type, Validation, Repeating.
              </span>
            </label>
          </div>
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save reusable definition
          </button>
        </form>
      )}

      {message && <p className="rounded-lg bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300">{message}</p>}
      {error && !showCreate && <p className="rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p>}

      {definitions.length === 0 ? (
        <section className="glass-panel rounded-2xl border-dashed p-10 text-center">
          <Boxes className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 font-medium text-slate-200">Build your first internal transaction standard</p>
          <p className="mt-1 text-sm text-slate-500">
            Start with the transaction your team implements most often, such as 850 Purchase Order.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {definitions.map((definition) => {
            const isExpanded = expanded === definition.id;
            return (
              <section key={definition.id} className="glass-panel overflow-hidden rounded-2xl">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : definition.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-800/30"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-5 w-5 text-indigo-400" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-sm font-bold text-slate-900">
                      {definition.transactionCode}
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-100">{definition.name}</h3>
                      <p className="text-xs text-slate-500">
                        v{definition.version} · {layoutLabel(definition.layoutType)} · {definition.fieldCount} fields
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        definition.status === "active"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-700 text-slate-400"
                      )}
                    >
                      {definition.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {definition.implementationCount} implementation(s)
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-800 px-6 py-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {definition.recordGroups.map((group) => (
                        <div key={group.name} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-slate-200">{group.name}</p>
                            {group.repeating && (
                              <span className="rounded bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-300">
                                repeating
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{group.fieldCount} fields</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700/60">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/70 text-slate-400">
                          <tr>
                            <th className="px-3 py-2">Record</th>
                            <th className="px-3 py-2">Field</th>
                            <th className="px-3 py-2">Reference</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Validation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {definition.fields.map((field, index) => (
                            <tr key={`${field.interfaceColumn}-${index}`} className="border-t border-slate-800">
                              <td className="px-3 py-2 text-slate-400">{field.recordType ?? field.recNumber ?? "—"}</td>
                              <td className="px-3 py-2 text-slate-200">{field.fieldName}</td>
                              <td className="px-3 py-2 font-mono text-cyan-300">{fieldReference(field)}</td>
                              <td className="px-3 py-2 text-slate-400">{field.dataType ?? "—"}</td>
                              <td className="px-3 py-2 text-slate-400">{field.validationRule ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleArchive(definition)}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      {definition.status === "active" ? "Archive version" : "Restore version"}
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/30 px-4 py-3">
      <p className="text-2xl font-semibold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  pattern,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  pattern?: string;
}) {
  return (
    <label className="text-sm">
      <span className="font-medium text-slate-300">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        pattern={pattern}
        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
      />
    </label>
  );
}

function layoutLabel(layoutType: string) {
  return LAYOUT_TYPES.find(([value]) => value === layoutType)?.[1] ?? layoutType;
}

function fieldReference(field: InterfaceField) {
  if (field.jsonPath) return field.jsonPath;
  if (field.xpath) return field.xpath;
  if (field.startPosition != null && field.charLimit != null) {
    const record = field.recordType ?? field.recNumber ?? "?";
    return `${record}:${field.startPosition}-${field.startPosition + field.charLimit - 1}`;
  }
  return field.interfaceColumn;
}
