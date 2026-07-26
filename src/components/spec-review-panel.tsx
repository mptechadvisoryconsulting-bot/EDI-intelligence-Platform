"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCopy, Download, Loader2, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type TransactionFeasibility = {
  code: string;
  name: string;
  status: "ready" | "partial" | "unsupported" | "not_in_spec";
  detail: string;
};

type SpecReviewData = {
  summary: string;
  canProduceNow: boolean;
  transactionFeasibility: TransactionFeasibility[];
  requirements: Array<{
    key: string;
    segment: string;
    element: string;
    qualifier?: string;
    description?: string;
    required: boolean;
    status: string;
    sourceDocument?: string;
  }>;
  detectedTransactionSets: string[];
  documentSummaries: Array<{ name: string; kind: string; targetFieldCount: number; warnings: string[] }>;
  customerFeasibilityEmail: string;
  memorySuggestions: Array<{
    targetKey: string;
    interfaceColumn?: string | null;
    recNumber?: number | null;
    startPosition?: number | null;
    charLimit?: number | null;
    priorProject: string;
    priorPartner: string;
    note: string;
    confidence: number;
  }>;
  partnerCatalog?: {
    portal?: string;
    portalUrl?: string;
    suggestedEdiVersion?: string | null;
    ediVersions?: string[];
  } | null;
  projectEdiVersion?: string | null;
};

function statusBadge(status: TransactionFeasibility["status"]) {
  if (status === "ready") return "bg-emerald-500/15 text-emerald-400";
  if (status === "partial") return "bg-amber-500/15 text-amber-400";
  if (status === "unsupported") return "bg-red-500/15 text-red-400";
  return "bg-slate-700/50 text-slate-400";
}

export function SpecReviewPanel({
  projectId,
  onMemoryApplied,
}: {
  projectId: string;
  onMemoryApplied?: () => void;
}) {
  const [data, setData] = useState<SpecReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}/spec-review`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [projectId]);

  async function copyEmail() {
    if (!data?.customerFeasibilityEmail) return;
    await navigator.clipboard.writeText(data.customerFeasibilityEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadEmail() {
    if (!data?.customerFeasibilityEmail) return;
    const blob = new Blob([data.customerFeasibilityEmail], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer-feasibility-email.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function applyMemory() {
    if (!data?.memorySuggestions.length) return;
    setApplying(true);
    setApplyMsg("");
    try {
      const res = await fetch(`/api/projects/${projectId}/apply-memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions: data.memorySuggestions }),
      });
      const result = await res.json();
      if (!res.ok) {
        setApplyMsg(result.error ?? "Apply failed");
        return;
      }
      setApplyMsg(`Applied ${result.applied} mapping(s) from memory`);
      onMemoryApplied?.();
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <section className="glass-panel mb-8 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reviewing customer specs...
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="glass-panel mb-8 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Specification analysis &amp; feasibility</h2>
          <p className="mt-1 text-sm text-slate-400">
            How the approved internal transaction interface can satisfy the customer&apos;s structured requirements
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyEmail}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy customer email"}
          </button>
          <button
            type="button"
            onClick={downloadEmail}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            Download email
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-200">{data.summary}</p>

      {data.partnerCatalog?.suggestedEdiVersion && !data.projectEdiVersion && (
        <p className="mt-2 text-xs text-amber-400/90">
          Partner typically uses X12 {data.partnerCatalog.suggestedEdiVersion}
          {data.partnerCatalog.ediVersions && data.partnerCatalog.ediVersions.length > 1
            ? ` (also ${data.partnerCatalog.ediVersions.slice(1).join(", ")})`
            : ""}{" "}
          — set in implementation settings if not already configured.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.transactionFeasibility.map((tx) => (
          <div key={tx.code} className="rounded-xl border border-slate-700/50 bg-slate-900/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-semibold text-slate-100">{tx.code}</p>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase", statusBadge(tx.status))}>
                {tx.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{tx.name}</p>
            <p className="mt-2 text-xs text-slate-500">{tx.detail}</p>
          </div>
        ))}
      </div>

      {data.detectedTransactionSets.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          Transaction sets in uploaded specs: {data.detectedTransactionSets.join(", ")}
        </p>
      )}

      {data.memorySuggestions.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-300">Mapping memory (prior implementations)</h3>
            <button
              type="button"
              onClick={applyMemory}
              disabled={applying}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Apply all to mappings
            </button>
          </div>
          {applyMsg && <p className="mt-2 text-xs text-emerald-400">{applyMsg}</p>}
          <ul className="mt-2 space-y-2">
            {data.memorySuggestions.slice(0, 8).map((s) => (
              <li key={s.targetKey} className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs">
                <span className="font-mono text-indigo-300">{s.targetKey}</span>
                {" → "}
                <span className="font-mono text-slate-300">{s.interfaceColumn ?? "—"}</span>
                {(s.recNumber != null || s.startPosition != null) && (
                  <span className="ml-2 text-cyan-400/80">
                    Rec {s.recNumber ?? "—"} · Start {s.startPosition ?? "—"} · Width {s.charLimit ?? "—"}
                  </span>
                )}
                <p className="mt-1 text-slate-500">
                  From {s.priorProject} ({s.priorPartner}) — {s.note}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.documentSummaries.length === 0 && (
        <p className="mt-4 flex items-center gap-2 text-sm text-amber-400/90">
          <XCircle className="h-4 w-4" />
          Upload customer guide, mapping sheet, or sample EDI to populate spec review.
        </p>
      )}

      {data.canProduceNow && (
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Feasibility check passed — proceed from the internal interface definition to mapping and handoff export.
        </p>
      )}
    </section>
  );
}
