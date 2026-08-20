"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { FileDropZone } from "@/components/file-drop-zone";

export function OracleLayoutReportImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [erpVersion, setErpVersion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function upload(files: FileList) {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    setMessage("");
    setIsError(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("erpSystem", "Oracle");
    formData.append("erpVersion", erpVersion);

    try {
      const response = await fetch("/api/account/erp-layout", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setIsError(true);
        setMessage(data.error ?? `Upload failed (${response.status})`);
        return;
      }

      setMessage(
        `Imported ${data.layout?.fieldCount ?? 0} Oracle layout fields from ${file.name}. Refresh below to review the saved positions.`
      );
    } catch {
      setIsError(true);
      setMessage("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="glass-panel mb-6 rounded-2xl border border-indigo-500/20 p-6">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
        <div>
          <h2 className="text-base font-semibold text-slate-100">Oracle layout report import</h2>
          <p className="mt-1 text-sm text-slate-400">
            Upload an Oracle E-Commerce Gateway Transaction Layout Definition Report directly as TXT or PDF. MP Tech extracts Rec Number, Start Column, Width, data type, and record code without requiring you to convert the report to CSV first.
          </p>
        </div>
      </div>

      <div className="mt-4 max-w-sm">
        <label htmlFor="oracle-erp-version" className="mb-1.5 block text-sm font-medium text-slate-300">
          Oracle / ERP version (optional)
        </label>
        <input
          id="oracle-erp-version"
          value={erpVersion}
          onChange={(event) => setErpVersion(event.target.value)}
          placeholder="12.2 / EBS release"
          className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div className="mt-4">
        <FileDropZone
          disabled={uploading}
          accept=".txt,.pdf"
          onFiles={upload}
          label="Drag and drop Oracle TXT/PDF layout report, or click to browse"
          hint="Oracle Transaction Layout Definition Report · TXT or searchable PDF"
        />
      </div>

      <div className="mt-3">
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf"
          className="hidden"
          onChange={(event) => event.target.files && upload(event.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-500/20 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Browse TXT/PDF report
        </button>
      </div>

      {message && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${isError ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>
          {message}
        </p>
      )}
    </section>
  );
}
