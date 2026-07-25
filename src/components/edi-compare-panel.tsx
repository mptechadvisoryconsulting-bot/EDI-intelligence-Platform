"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileDiff, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type CompareItem = {
  key: string;
  label: string;
  status: string;
  severity: string;
  expectedSource?: string | null;
  actualValue?: string;
  message: string;
};

type CompareReport = {
  score: number;
  summary: string;
  messagesAnalyzed: number;
  transactionSets: string[];
  present: CompareItem[];
  missing: CompareItem[];
  warnings: CompareItem[];
  partnerViolations: CompareItem[];
  sampleFile?: string;
};

export function EdiComparePanel({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<CompareReport | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [hasSampleEdi, setHasSampleEdi] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/edi-compare`);
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
        setPartnerName(data.partnerPack?.name ?? "");
        setHasSampleEdi(data.hasSampleEdi);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <section className="glass-panel mb-8 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading EDI compare...
        </div>
      </section>
    );
  }

  if (!hasSampleEdi) {
    return (
      <section className="glass-panel mb-8 rounded-2xl border-dashed p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <FileDiff className="h-5 w-5 text-sky-400" />
          Sample EDI compare
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Upload a partner sample EDI file (document type <strong className="text-slate-300">Sample EDI</strong>), then run analysis to
          compare segments against mappings and {partnerName || "partner"} rules.
        </p>
      </section>
    );
  }

  if (!report) return null;

  return (
    <section className="glass-panel mb-8 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <FileDiff className="h-5 w-5 text-sky-400" />
            Sample EDI compare
          </h2>
          <p className="mt-1 text-sm text-slate-400">{report.summary}</p>
          {report.sampleFile && (
            <p className="mt-0.5 text-xs text-slate-500">Files: {report.sampleFile}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-lg px-4 py-2 text-center",
              report.score >= 80 ? "bg-emerald-500/15" : report.score >= 50 ? "bg-amber-500/15" : "bg-red-500/15"
            )}
          >
            <p className="text-2xl font-bold text-slate-100">{report.score}</p>
            <p className="text-xs text-slate-500">match score</p>
          </div>
          <button
            onClick={load}
            className="rounded-lg border border-slate-600/50 p-2 text-slate-400 hover:bg-slate-800/50"
            title="Refresh compare"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <a
            href={`/api/projects/${projectId}/export?type=edi_compare_csv`}
            className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      {report.missing.length > 0 && (
        <div className="mt-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-400">
            <AlertCircle className="h-4 w-4" />
            Missing / errors ({report.missing.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {report.missing.slice(0, 8).map((item) => (
              <li key={item.key} className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">
                <span className="font-medium">{item.label}</span>
                <p className="mt-0.5 text-xs text-red-300">{item.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.warnings.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-amber-400">Warnings ({report.warnings.length})</h3>
          <ul className="mt-2 space-y-1">
            {report.warnings.slice(0, 5).map((item) => (
              <li key={item.key} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
                {item.label}: {item.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.present.length > 0 && (
        <div className="mt-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Passed ({report.present.length})
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {report.present.slice(0, 12).map((item) => (
              <li
                key={item.key}
                className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300"
                title={item.message}
              >
                {item.label}
                {item.actualValue ? `: ${item.actualValue.slice(0, 20)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
