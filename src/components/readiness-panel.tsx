"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ReadinessReport = {
  score: number;
  label: string;
  blockers: string[];
  nextActions: string[];
  checks: Array<{ label: string; passed: boolean; detail: string }>;
  transactionReadiness: Array<{
    code: string;
    name: string;
    score: number;
    label: string;
    blockers: string[];
  }>;
  canApprove: boolean;
  approvalBlockers: string[];
};

export function ReadinessPanel({ projectId }: { projectId: string }) {
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/readiness`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setReport)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <section className="glass-panel mb-8 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading readiness...
        </div>
      </section>
    );
  }

  if (!report) return null;

  const scoreColor =
    report.score >= 85 ? "text-emerald-400" : report.score >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <section className="glass-panel mb-8 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Implementation readiness</h2>
          <p className="mt-1 text-sm text-slate-400">Pre-build checklist before translator configuration</p>
        </div>
        <div className="text-right">
          <p className={cn("text-3xl font-bold", scoreColor)}>{report.score}</p>
          <p className="text-xs text-slate-500">/ 100</p>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium text-slate-300">{report.label}</p>

      <ul className="mt-4 space-y-2">
        {report.checks.map((check) => (
          <li key={check.label} className="flex items-start gap-2 text-sm">
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            )}
            <span>
              <span className="font-medium text-slate-200">{check.label}</span>
              <span className="text-slate-400"> — {check.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      {report.transactionReadiness.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">By transaction</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {report.transactionReadiness.map((tx) => (
              <div key={tx.code} className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">
                    {tx.code} {tx.name}
                  </span>
                  <span className="text-xs font-semibold text-indigo-400">{tx.score}%</span>
                </div>
                <p className="text-xs text-slate-500">{tx.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.blockers.length > 0 && (
        <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-3">
          <p className="text-xs font-medium uppercase text-red-400">Blockers</p>
          <ul className="mt-1 space-y-1">
            {report.blockers.map((b) => (
              <li key={b} className="text-sm text-red-300">
                • {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function ApprovalPanel({
  projectId,
  reviewStatus,
  onApproved,
}: {
  projectId: string;
  reviewStatus: string;
  onApproved: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [approvals, setApprovals] = useState<
    Array<{ id: string; action: string; notes: string | null; createdAt: string; user: { username: string; name: string | null } }>
  >([]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/approve`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setApprovals);
  }, [projectId, reviewStatus]);

  async function submit(action: "approve" | "reject") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.approvalBlockers?.join(" ") ?? data.error ?? "Approval failed");
        return;
      }
      setNotes("");
      onApproved();
      setApprovals((prev) => [data.approval, ...prev]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-panel mb-8 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-100">Package approval</h2>
      <p className="mt-1 text-sm text-slate-400">
        Sign off on the implementation package before translator handoff. Status:{" "}
        <span className="font-medium capitalize text-slate-200">{reviewStatus.replace(/_/g, " ")}</span>
      </p>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Approval notes (optional)"
        className="mt-4 w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-slate-100"
      />

      {error && (
        <p className="mt-2 flex items-start gap-2 text-sm text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => submit("approve")}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Approve package
        </button>
        <button
          onClick={() => submit("reject")}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
        >
          Reject package
        </button>
      </div>

      {approvals.length > 0 && (
        <ul className="mt-6 divide-y divide-slate-700/50 rounded-lg border border-slate-700/50">
          {approvals.map((a) => (
            <li key={a.id} className="px-4 py-3 text-sm">
              <p className="font-medium capitalize text-slate-200">{a.action.replace(/_/g, " ")}</p>
              <p className="text-xs text-slate-500">
                {a.user.name ?? a.user.username} · {new Date(a.createdAt).toLocaleString()}
              </p>
              {a.notes && <p className="mt-1 text-slate-400">{a.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
