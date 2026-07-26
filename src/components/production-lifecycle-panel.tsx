"use client";

import { useEffect, useState } from "react";
import { History, Loader2, RadioTower, RefreshCw, Rocket, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductionEvent = {
  id: string;
  action: string;
  notes: string | null;
  createdAt: string;
  user: { username: string; name: string | null };
};

export function ProductionLifecyclePanel({
  projectId,
  status,
  reviewStatus,
  onChanged,
}: {
  projectId: string;
  status: string;
  reviewStatus: string;
  onChanged: () => void;
}) {
  const [events, setEvents] = useState<ProductionEvent[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}/production`)
      .then((response) => (response.ok ? response.json() : []))
      .then(setEvents);
  }, [projectId, status]);

  const deployments = events.filter((event) => event.action === "production_deployed");
  const latestDeployment = deployments[0];
  const version = deployments.length === 0 ? null : deployments.length === 1 ? "1.0" : `1.${deployments.length - 1}`;
  const isLive = status === "production";
  const isRevision = status === "revision";
  const canDeploy = (status === "approved" || isRevision) && reviewStatus === "approved";

  async function submit(action: "deploy" | "request_revision") {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Production action failed");
        return;
      }
      setNotes("");
      if (data.event) setEvents((current) => [data.event, ...current]);
      onChanged();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-panel mb-8 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <RadioTower className="h-5 w-5 text-emerald-400" />
            Go live &amp; production lifecycle
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Production creates a permanent live trading-partner record. Future customer changes reopen this implementation as a revision.
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium uppercase",
            isLive
              ? "bg-emerald-500/15 text-emerald-300"
              : isRevision
                ? "bg-amber-500/15 text-amber-300"
                : "bg-slate-800 text-slate-400"
          )}
        >
          {isLive ? "Live" : isRevision ? "Revision active" : status.replace(/_/g, " ")}
        </span>
      </div>

      {latestDeployment && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <LifecycleFact label="Live version" value={version ?? "1.0"} />
          <LifecycleFact label="Go live" value={new Date(latestDeployment.createdAt).toLocaleDateString()} />
          <LifecycleFact label="Production status" value={isRevision ? "Active · revision underway" : "Active"} />
        </div>
      )}

      {!isLive && !isRevision && status !== "approved" && (
        <p className="mt-5 rounded-lg border border-slate-700/50 bg-slate-900/30 px-4 py-3 text-sm text-slate-400">
          Complete mapping, testing, and package approval before production deployment.
        </p>
      )}

      {(status === "approved" || isRevision) && (
        <div className="mt-5">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder={isRevision ? "Revision deployment notes" : "Go-live notes (optional)"}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="button"
            onClick={() => submit("deploy")}
            disabled={loading || !canDeploy}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {isRevision ? "Deploy revised version" : "Mark implementation live"}
          </button>
          {!canDeploy && (
            <p className="mt-2 text-xs text-amber-400">Package approval is required for this version.</p>
          )}
        </div>
      )}

      {isLive && (
        <div className="mt-5">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Reason for change (required)"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="button"
            onClick={() => submit("request_revision")}
            disabled={loading || !notes.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Open revision request
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 flex items-start gap-2 text-sm text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {events.length > 0 && (
        <div className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <History className="h-4 w-4" />
            Production and revision history
          </h3>
          <ul className="mt-2 divide-y divide-slate-800/70 rounded-lg border border-slate-700/50">
            {events.map((event) => (
              <li key={event.id} className="px-4 py-3 text-sm">
                <p className="font-medium capitalize text-slate-200">
                  {event.action.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-slate-500">
                  {event.user.name ?? event.user.username} · {new Date(event.createdAt).toLocaleString()}
                </p>
                {event.notes && <p className="mt-1 text-slate-400">{event.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function LifecycleFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/30 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-200">{value}</p>
    </div>
  );
}
