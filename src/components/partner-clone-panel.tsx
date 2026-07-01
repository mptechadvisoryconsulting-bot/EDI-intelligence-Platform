"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2 } from "lucide-react";

type CloneCandidate = {
  id: string;
  name: string;
  customer: string;
  tradingPartner: string;
  erpSystem: string;
  transactions: string;
  mappingCount: number;
  approvedCount: number;
};

export function PartnerClonePanel({
  projectId,
  currentPartner,
  onCloned,
}: {
  projectId: string;
  currentPartner: string;
  onCloned: () => void;
}) {
  const [candidates, setCandidates] = useState<CloneCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceId, setSourceId] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}/clone-candidates`)
      .then((res) => (res.ok ? res.json() : { candidates: [] }))
      .then((data) => setCandidates(data.candidates ?? []))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function clone() {
    if (!sourceId) return;
    setCloning(true);
    setMessage("");
    try {
      const res = await fetch(`/api/projects/${projectId}/clone-mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceProjectId: sourceId, replaceExisting }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Clone failed");
        return;
      }
      setMessage(
        `Cloned ${data.clonedCount} mapping(s) from ${data.sourceName}${
          data.partnerChanged ? " — review open questions for partner-specific meanings" : ""
        }`
      );
      onCloned();
    } finally {
      setCloning(false);
    }
  }

  if (loading) {
    return (
      <section className="glass-panel mb-8 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading prior workspaces...
        </div>
      </section>
    );
  }

  if (candidates.length === 0) return null;

  const selected = candidates.find((c) => c.id === sourceId);

  return (
    <section className="glass-panel mb-8 rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <Copy className="h-5 w-5 text-indigo-400" />
        <h2 className="text-lg font-semibold text-slate-100">Clone from prior partner layout</h2>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Reuse interface positions from another workspace when layout structure is the same — confirm customer-specific meanings for{" "}
        <strong className="text-slate-300">{currentPartner}</strong>.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[240px] flex-1 text-sm">
          <span className="text-slate-400">Source workspace</span>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
          >
            <option value="">Select workspace...</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.tradingPartner} · {c.mappingCount} mappings ({c.approvedCount} approved)
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(e) => setReplaceExisting(e.target.checked)}
            className="rounded border-slate-600"
          />
          Replace existing mappings
        </label>

        <button
          type="button"
          onClick={clone}
          disabled={!sourceId || cloning}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {cloning && <Loader2 className="h-4 w-4 animate-spin" />}
          Clone mappings
        </button>
      </div>

      {selected && selected.tradingPartner !== currentPartner && (
        <p className="mt-3 text-xs text-amber-400/90">
          Different trading partner ({selected.tradingPartner} → {currentPartner}) — open questions will be created for each cloned field.
        </p>
      )}

      {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
    </section>
  );
}
