"use client";

import { useState } from "react";

type FieldJob = {
  id: string;
  workOrderNumber: string;
  serviceType: string;
  status: string;
  serviceAddress: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  arrivalWindow: string | null;
  customerName: string;
  allowedNextStatuses: string[];
};

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatWhen(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function FieldServiceToday({ initialJobs }: { initialJobs: FieldJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function move(job: FieldJob, nextStatus: string) {
    setBusyId(job.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/account/field-service/work-orders/${encodeURIComponent(job.id)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update work order");
      setJobs((current) =>
        current.map((candidate) =>
          candidate.id === job.id
            ? { ...candidate, status: payload.workOrder.status, allowedNextStatuses: [] }
            : candidate,
        ),
      );
      setMessage(`${job.workOrderNumber} moved to ${humanize(payload.workOrder.status)}. Refresh for the next governed actions.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update work order");
    } finally {
      setBusyId(null);
    }
  }

  if (jobs.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">No active field-service work is assigned in this view.</div>;
  }

  return (
    <div className="space-y-4">
      {message ? <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-3 text-sm text-indigo-100">{message}</div> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {jobs.map((job) => (
          <article key={job.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">{job.workOrderNumber}</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{job.serviceType}</h2>
                <p className="mt-1 text-sm text-slate-400">{job.customerName}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">{humanize(job.status)}</span>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Schedule</dt><dd className="mt-1 text-slate-200">{formatWhen(job.scheduledStart)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Arrival window</dt><dd className="mt-1 text-slate-200">{job.arrivalWindow || "—"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-slate-500">Service location</dt><dd className="mt-1 text-slate-200">{job.serviceAddress || "No service address recorded"}</dd></div>
            </dl>

            {job.allowedNextStatuses.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                {job.allowedNextStatuses.map((nextStatus) => (
                  <button
                    key={nextStatus}
                    type="button"
                    disabled={busyId === job.id}
                    onClick={() => move(job, nextStatus)}
                    className="rounded-lg border border-indigo-400/30 bg-indigo-400/10 px-3 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {humanize(nextStatus)}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
