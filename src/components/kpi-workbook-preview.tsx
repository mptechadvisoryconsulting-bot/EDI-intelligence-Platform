"use client";

import { useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Database, Loader2, ShieldCheck } from "lucide-react";
import { FileDropZone } from "@/components/file-drop-zone";
import type { WorkbookInspection, WorkbookSheetPreview } from "@/lib/kpi/workbook-inspector";

type PreviewResponse = {
  ok: true;
  previewOnly: true;
  file: { name: string; size: number };
  inspection: WorkbookInspection;
  confirmationRequired: true;
  persisted: false;
};

function roleLabel(role: WorkbookSheetPreview["role"]) {
  return role.replaceAll("_", " ");
}

export function KpiWorkbookPreview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  async function previewWorkbook(files: FileList) {
    const file = files[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/account/kpi/preview", {
        method: "POST",
        body: formData,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? `Preview failed (${response.status})`);
        return;
      }
      setPreview(body as PreviewResponse);
    } catch {
      setError("Preview failed — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl border border-indigo-500/20 p-6">
        <div className="mb-4 flex items-start gap-3">
          <BarChart3 className="mt-0.5 h-5 w-5 text-indigo-300" />
          <div>
            <h2 className="text-base font-semibold text-slate-100">KPI workbook preview</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Upload an XLS/XLSX workbook to inspect every worksheet before any dashboard configuration or operational rows are saved.
            </p>
          </div>
        </div>

        <FileDropZone
          disabled={loading}
          accept=".xlsx,.xls"
          onFiles={previewWorkbook}
          label={loading ? "Inspecting workbook…" : "Drop an XLS/XLSX workbook here or click to browse"}
          hint="Preview only · 10 MB maximum · no rows are persisted"
        />

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-indigo-200" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" />
            Inspecting sheets, candidate headers, and likely source data…
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </section>

      {preview && (
        <section className="space-y-5" aria-live="polite">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">Workbook</p>
              <p className="mt-2 truncate text-sm font-semibold text-slate-100">{preview.file.name}</p>
              <p className="mt-1 text-xs text-slate-500">{preview.inspection.sheets.length} worksheets inspected</p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">Likely sources</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{preview.inspection.candidateSourceSheets.length}</p>
              <p className="mt-1 text-xs text-slate-500">Ranked deterministically</p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">Persistence</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-300">
                <ShieldCheck className="h-4 w-4" /> Nothing saved
              </div>
              <p className="mt-1 text-xs text-slate-500">Confirmation remains required</p>
            </div>
          </div>

          {preview.inspection.candidateSourceSheets.length > 0 && (
            <div className="glass-panel rounded-2xl border border-emerald-500/20 p-6">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <h3 className="font-semibold text-slate-100">Recommended source sheets</h3>
              </div>
              <div className="space-y-3">
                {preview.inspection.candidateSourceSheets.map((sheet, index) => (
                  <div key={sheet.name} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-100">
                          {index === 0 ? "Primary candidate · " : "Candidate · "}{sheet.name}
                        </p>
                        <p className="mt-1 text-xs capitalize text-slate-500">
                          {roleLabel(sheet.role)} · header row {sheet.headerRow ?? "not detected"} · {sheet.rowCount} rows
                        </p>
                      </div>
                      <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-200">
                        source score {sheet.sourceScore}/100
                      </span>
                    </div>
                    {sheet.headers.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {sheet.headers.slice(0, 12).map((header) => (
                          <span key={header} className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">
                            {header}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-panel rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-300" />
              <h3 className="font-semibold text-slate-100">Workbook structure</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4">Sheet</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Header</th>
                    <th className="pb-3 pr-4">Rows</th>
                    <th className="pb-3">Source score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {preview.inspection.sheets.map((sheet) => (
                    <tr key={sheet.name}>
                      <td className="py-3 pr-4 font-medium text-slate-200">{sheet.name}</td>
                      <td className="py-3 pr-4 capitalize text-slate-400">{roleLabel(sheet.role)}</td>
                      <td className="py-3 pr-4 text-slate-400">{sheet.headerRow ?? "—"}</td>
                      <td className="py-3 pr-4 text-slate-400">{sheet.rowCount}</td>
                      <td className="py-3 text-slate-400">{sheet.sourceScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {preview.inspection.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
              <div className="flex items-start gap-2 text-sm text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Review required</p>
                  {preview.inspection.warnings.map((warning) => (
                    <p key={warning} className="mt-1 text-amber-200/80">{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
