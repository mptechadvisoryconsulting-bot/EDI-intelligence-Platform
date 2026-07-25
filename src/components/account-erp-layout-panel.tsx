"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileText,
  GripVertical,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { ErpSystemPicker } from "@/components/erp-system-picker";
import { FileDropZone } from "@/components/file-drop-zone";
import { cn } from "@/lib/utils";
import type { ErpLayoutField, InterfaceStyle } from "@/lib/erp-layout/types";
import { styleLabel } from "@/lib/erp-layout/transform";
import type { LayoutValidation } from "@/lib/erp-layout/validate-layout";
import type { SampleVerificationReport, SampleVerificationRow } from "@/lib/erp-layout/sample-verify";

type AccountLayout = {
  erpSystem: string;
  erpVersion?: string | null;
  originalFileName?: string | null;
  fieldCount: number;
  fields: ErpLayoutField[];
  interfaceStyles?: InterfaceStyle[];
  updatedAt?: string;
  sampleOutputFileName?: string | null;
  hasSampleOutput?: boolean;
  validation?: LayoutValidation;
  sampleVerification?: SampleVerificationReport | null;
};

const STYLE_BADGE: Record<InterfaceStyle, string> = {
  positional: "bg-slate-700/60 text-slate-200",
  xml: "bg-orange-500/20 text-orange-300",
  soap: "bg-violet-500/20 text-violet-300",
  rest: "bg-sky-500/20 text-sky-300",
};

const VERIFY_STATUS: Record<SampleVerificationRow["status"], string> = {
  ok: "text-emerald-400",
  empty: "text-amber-400",
  out_of_range: "text-red-400",
  missing_record: "text-red-400",
  no_layout_position: "text-amber-400",
  non_positional: "text-slate-500",
};

export function AccountErpLayoutPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const sampleRef = useRef<HTMLInputElement>(null);
  const [layout, setLayout] = useState<AccountLayout | null>(null);
  const [fields, setFields] = useState<ErpLayoutField[]>([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sampleUploading, setSampleUploading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [erpSystem, setErpSystem] = useState("");
  const [erpVersion, setErpVersion] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "warning">("success");
  const [validation, setValidation] = useState<LayoutValidation | null>(null);
  const [sampleVerification, setSampleVerification] = useState<SampleVerificationReport | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/account/erp-layout");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Could not load ERP layout");
        setMessageType("error");
        return;
      }
      setConfigured(data.configured);
      if (data.layout) {
        setLayout(data.layout);
        setFields(data.layout.fields);
        setErpSystem(data.layout.erpSystem);
        setErpVersion(data.layout.erpVersion ?? "");
        setValidation(data.layout.validation ?? null);
        setSampleVerification(data.layout.sampleVerification ?? null);
      }
    } catch {
      setMessage("Network error loading ERP layout");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const uploadFiles = useCallback(
    async (files: FileList) => {
      const file = files[0];
      if (!file) return;
      setUploading(true);
      setMessage("");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("erpSystem", erpSystem);
      formData.append("erpVersion", erpVersion);

      try {
        const res = await fetch("/api/account/erp-layout", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessageType("error");
          setMessage(data.error ?? `Upload failed (${res.status})`);
          return;
        }
        setValidation(data.validation ?? null);
        if (data.validation?.warnings?.length) {
          setMessageType("warning");
          setMessage(
            `Saved ${data.layout.fieldCount} fields with ${data.validation.missingPositionCount} positional gap(s) — review warnings below.`
          );
        } else {
          setMessageType("success");
          setMessage(
            `Saved ${data.layout.fieldCount} fields — ${(data.layout.interfaceStyles ?? []).join(", ") || "positional"}`
          );
        }
        await load();
      } catch {
        setMessageType("error");
        setMessage("Upload failed — check your connection and file format");
      } finally {
        setUploading(false);
      }
    },
    [erpSystem, erpVersion]
  );

  const uploadSample = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    setSampleUploading(true);
    setMessage("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/account/erp-layout/sample-output", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessageType("error");
        setMessage(data.error ?? "Sample upload failed");
        return;
      }
      setSampleVerification(data.verification ?? null);
      setMessageType(data.verification?.issueCount ? "warning" : "success");
      setMessage(
        data.verification?.summary ??
          `Sample output saved — ${file.name}. Positions verified against layout (not used for EDI mapping).`
      );
      await load();
    } catch {
      setMessageType("error");
      setMessage("Sample upload failed");
    } finally {
      setSampleUploading(false);
    }
  }, []);

  async function removeSample() {
    if (!confirm("Remove account sample output file?")) return;
    await fetch("/api/account/erp-layout/sample-output", { method: "DELETE" });
    setSampleVerification(null);
    setMessage("Sample output removed.");
    setMessageType("success");
    await load();
  }

  async function reanalyzeAll() {
    if (
      !confirm(
        "Re-run AI analysis on all implementations with uploaded documents? Existing mappings will be replaced."
      )
    ) {
      return;
    }
    setReanalyzing(true);
    setMessage("");
    try {
      const res = await fetch("/api/account/reanalyze-all", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessageType("error");
        setMessage(data.error ?? "Re-analyze failed");
        return;
      }
      setMessageType("success");
      setMessage(
        `Re-analyzed ${data.analyzed} implementation(s) — ${data.skipped} skipped (no documents), ${data.failed} failed.`
      );
    } catch {
      setMessageType("error");
      setMessage("Re-analyze failed");
    } finally {
      setReanalyzing(false);
    }
  }

  async function saveFieldOrder(nextFields: ErpLayoutField[]) {
    setSavingOrder(true);
    try {
      const res = await fetch("/api/account/erp-layout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: nextFields }),
      });
      if (res.ok) {
        const data = await res.json();
        setLayout(data.layout);
        setFields(data.layout.fields);
      }
    } finally {
      setSavingOrder(false);
    }
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setFields(next);
    saveFieldOrder(next);
  }

  async function removeLayout() {
    if (!confirm("Remove account ERP layout and sample output?")) return;
    await fetch("/api/account/erp-layout", { method: "DELETE" });
    setLayout(null);
    setFields([]);
    setConfigured(false);
    setValidation(null);
    setSampleVerification(null);
    setMessage("Account ERP layout removed.");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading account ERP layout...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
              <Database className="h-5 w-5 text-indigo-400" />
              Account ERP / source layout
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Pick your ERP or source platform, then upload layout once. Supports positional flat files, SAP IDoc, JD Edwards, XML, SOAP, REST/JSON — any vendor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SampleLink href="/samples/oracle-erp-layout.csv" label="Oracle CSV" />
            <SampleLink href="/samples/rest-erp-layout.csv" label="REST CSV" />
            <SampleLink href="/samples/xml-erp-layout.xml" label="XML/SOAP" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="[&_label]:text-slate-300 [&_input]:border-slate-600/50 [&_input]:bg-slate-900/50 [&_input]:text-slate-100 [&_p]:text-slate-500">
            <ErpSystemPicker value={erpSystem} onChange={setErpSystem} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">ERP version</label>
            <input
              value={erpVersion}
              onChange={(e) => setErpVersion(e.target.value)}
              className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-slate-100"
              placeholder="2024.1"
            />
          </div>
        </div>

        <div className="mt-4">
          <FileDropZone
            disabled={uploading}
            accept=".csv,.json,.xml,.xlsx,.xls"
            onFiles={uploadFiles}
            label="Drag and drop ERP layout file, or click to browse"
            hint="CSV · Excel · JSON · XML — positional, REST, SOAP, or XML (industry-agnostic column detection)"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,.xml,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600/50 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/50 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Browse layout
          </button>
          {configured && (
            <>
              <button
                type="button"
                onClick={reanalyzeAll}
                disabled={reanalyzing}
                className="btn-ai-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {reanalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Re-analyze all workspaces
              </button>
              <button
                type="button"
                onClick={removeLayout}
                className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Remove layout
              </button>
            </>
          )}
          {savingOrder && <span className="text-xs text-slate-500">Saving field order…</span>}
        </div>

        {message && (
          <p
            className={cn(
              "mt-3 rounded-lg px-3 py-2 text-sm",
              messageType === "error" && "bg-red-500/15 text-red-300",
              messageType === "warning" && "bg-amber-500/15 text-amber-200",
              messageType === "success" && "bg-emerald-500/15 text-emerald-300"
            )}
          >
            {message}
          </p>
        )}

        {validation && validation.warnings.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Layout validation — {validation.missingPositionCount} field(s) missing Rec/Start/Width
            </p>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-100/90">
              {validation.warnings.slice(0, 12).map((w) => (
                <li key={w}>• {w}</li>
              ))}
              {validation.warnings.length > 12 && (
                <li className="text-amber-300/70">…and {validation.warnings.length - 12} more</li>
              )}
            </ul>
          </div>
        )}

        {layout && fields.length > 0 && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-200">
                {layout.erpSystem} · {layout.fieldCount} fields
                {layout.originalFileName ? ` · ${layout.originalFileName}` : ""}
              </p>
              {(layout.interfaceStyles ?? []).map((s) => (
                <span key={s} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STYLE_BADGE[s])}>
                  {styleLabel(s)}
                </span>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">Drag rows to reorder mapping priority</p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-700/50">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-900/50 text-slate-400">
                    <th className="w-8 px-2 py-2" />
                    <th className="px-3 py-2">Style</th>
                    <th className="px-3 py-2">Interface column</th>
                    <th className="px-3 py-2">Field name</th>
                    <th className="px-3 py-2">Rec #</th>
                    <th className="px-3 py-2">Start col</th>
                    <th className="px-3 py-2">Width</th>
                    <th className="px-3 py-2">Path / XPath</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f, index) => (
                    <tr
                      key={`${f.interfaceColumn}-${f.fieldName}-${index}`}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex != null) reorder(dragIndex, index);
                        setDragIndex(null);
                      }}
                      className={cn(
                        "border-b border-slate-800/50 cursor-grab active:cursor-grabbing",
                        dragIndex === index && "bg-indigo-500/10"
                      )}
                    >
                      <td className="px-2 py-2 text-slate-600">
                        <GripVertical className="h-4 w-4" />
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("rounded px-1.5 py-0.5 font-medium", STYLE_BADGE[f.interfaceStyle])}>
                          {f.interfaceStyle}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-300">{f.interfaceColumn}</td>
                      <td className="px-3 py-2 text-slate-300">{f.fieldName}</td>
                      <td className="px-3 py-2 text-slate-300">{f.recNumber ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-300">{f.startPosition ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-300">{f.charLimit ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-slate-400">
                        {f.jsonPath ?? f.xpath ?? f.soapPath ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {configured && (
        <section className="glass-panel rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                <FileText className="h-5 w-5 text-cyan-400" />
                Sample ERP output (position verification)
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                Upload a sample flat file from your ERP interface. The system extracts values at each layout field&apos;s
                Rec Number, Start Column, and Width to confirm positions are correct. This sample is{" "}
                <strong className="text-slate-300">not</strong> used for EDI field mapping — only for verifying your
                account layout positions across all workspaces.
              </p>
            </div>
            {layout?.hasSampleOutput && (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                {layout.sampleOutputFileName}
              </span>
            )}
          </div>

          <div className="mt-4">
            <FileDropZone
              disabled={sampleUploading}
              accept=".txt,.dat,.csv,.out,.flat"
              onFiles={uploadSample}
              label="Drop sample ERP output file (one record per line)"
              hint="Plain text flat file — line 1 = record 1, line 2 = record 2, etc."
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={sampleRef}
              type="file"
              accept=".txt,.dat,.csv,.out,.flat"
              className="hidden"
              onChange={(e) => e.target.files && uploadSample(e.target.files)}
            />
            <button
              type="button"
              onClick={() => sampleRef.current?.click()}
              disabled={sampleUploading}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {sampleUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Browse sample file
            </button>
            {layout?.hasSampleOutput && (
              <button
                type="button"
                onClick={removeSample}
                className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Remove sample
              </button>
            )}
          </div>

          {sampleVerification && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-300">
                  <Sparkles className="mr-1 inline h-4 w-4 text-indigo-400" />
                  {sampleVerification.summary}
                </p>
                <p className="text-xs text-slate-500">
                  {sampleVerification.lineCount} line(s) · {sampleVerification.okCount} OK ·{" "}
                  {sampleVerification.issueCount} issue(s)
                </p>
              </div>

              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-700/50">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-900/50 text-slate-400">
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Interface column</th>
                      <th className="px-3 py-2">Rec #</th>
                      <th className="px-3 py-2">Start</th>
                      <th className="px-3 py-2">Width</th>
                      <th className="px-3 py-2">Sample value at position</th>
                      <th className="px-3 py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleVerification.rows
                      .filter((r) => r.status !== "non_positional")
                      .map((row) => (
                        <tr key={`${row.interfaceColumn}-${row.recNumber}-${row.startPosition}`} className="border-b border-slate-800/50">
                          <td className="px-3 py-2">
                            {row.status === "ok" ? (
                              <CheckCircle2 className={cn("h-4 w-4", VERIFY_STATUS.ok)} />
                            ) : (
                              <AlertTriangle className={cn("h-4 w-4", VERIFY_STATUS[row.status])} />
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-300">{row.interfaceColumn}</td>
                          <td className="px-3 py-2 text-slate-300">{row.recNumber ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-300">{row.startPosition ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-300">{row.width ?? "—"}</td>
                          <td className="px-3 py-2 font-mono text-cyan-300">
                            {row.extractedValue || row.rawSlice || "—"}
                          </td>
                          <td className={cn("px-3 py-2", VERIFY_STATUS[row.status])}>{row.message}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SampleLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1 rounded-lg border border-slate-600/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/50"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}
