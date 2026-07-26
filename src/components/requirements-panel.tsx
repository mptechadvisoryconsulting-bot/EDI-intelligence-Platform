"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Loader2,
  Pencil,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Requirement = {
  key: string;
  sourceDocumentId: string;
  sourceDocument?: string;
  loopPath: string;
  parent: string;
  segment: string;
  element: string;
  qualifier?: string;
  description?: string;
  required: boolean;
  usage: "required" | "optional" | "conditional";
  condition?: string;
  dataType?: string;
  expectedFormat?: string;
  repeats?: string;
  reviewStatus: "pending" | "confirmed" | "needs_review";
};

type MappingTarget = {
  targetSegment: string;
  targetElement: string;
  qualifier: string | null;
  sourceField: string | null;
};

type RequirementDraft = {
  description: string;
  expectedFormat: string;
  condition: string;
  usage: Requirement["usage"];
};

function baseKey(requirement: Pick<Requirement, "segment" | "element" | "qualifier">) {
  return `${requirement.segment}.${requirement.element}${requirement.qualifier ? `:${requirement.qualifier}` : ""}`;
}

export function RequirementsPanel({
  projectId,
  mappings,
}: {
  projectId: string;
  mappings: MappingTarget[];
}) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "missing" | "review">("all");
  const [openLoops, setOpenLoops] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<RequirementDraft | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/spec-review`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const rows = (data.requirements ?? []) as Requirement[];
        setRequirements(rows);
        setOpenLoops(new Set(rows.map((row) => row.loopPath)));
      })
      .catch(() => setError("Could not load parsed requirements"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const mappingKeys = useMemo(
    () =>
      new Set(
        mappings
          .filter((mapping) => mapping.sourceField)
          .map(
            (mapping) =>
              `${mapping.targetSegment}.${mapping.targetElement}${mapping.qualifier ? `:${mapping.qualifier}` : ""}`
          )
      ),
    [mappings]
  );

  const duplicateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const requirement of requirements) {
      const key = baseKey(requirement);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [requirements]);

  const mappingState = useCallback(
    (requirement: Requirement) => {
      const key = baseKey(requirement);
      if (!mappingKeys.has(key)) return "missing" as const;
      if ((duplicateCounts.get(key) ?? 0) > 1) return "context_review" as const;
      return "mapped" as const;
    },
    [duplicateCounts, mappingKeys]
  );

  const metrics = useMemo(() => {
    const mapped = requirements.filter((row) => mappingState(row) === "mapped").length;
    const missing = requirements.filter((row) => mappingState(row) === "missing").length;
    const needsReview = requirements.filter(
      (row) => row.reviewStatus !== "confirmed" || mappingState(row) === "context_review"
    ).length;
    return {
      total: requirements.length,
      mapped,
      missing,
      needsReview,
      coverage: requirements.length ? Math.round((mapped / requirements.length) * 100) : 0,
    };
  }, [mappingState, requirements]);

  const filtered = requirements.filter((row) => {
    if (filter === "missing") return mappingState(row) === "missing";
    if (filter === "review") {
      return row.reviewStatus !== "confirmed" || mappingState(row) === "context_review";
    }
    return true;
  });

  const groups = [...new Set(filtered.map((row) => row.loopPath))].map((loopPath) => ({
    loopPath,
    rows: filtered.filter((row) => row.loopPath === loopPath),
  }));

  function toggleLoop(loopPath: string) {
    setOpenLoops((current) => {
      const next = new Set(current);
      if (next.has(loopPath)) next.delete(loopPath);
      else next.add(loopPath);
      return next;
    });
  }

  async function updateRequirement(
    requirement: Requirement,
    reviewStatus: Requirement["reviewStatus"],
    updates?: RequirementDraft
  ) {
    setSavingKey(requirement.key);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/requirements`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: requirement.sourceDocumentId,
          requirementKey: requirement.key,
          reviewStatus,
          updates,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not update requirement");
        return;
      }
      setRequirements((current) =>
        current.map((row) =>
          row.key === requirement.key
            ? {
                ...row,
                reviewStatus,
                ...(updates ?? {}),
                required: updates ? updates.usage === "required" : row.required,
              }
            : row
        )
      );
      setEditingKey(null);
      setDraft(null);
    } finally {
      setSavingKey(null);
    }
  }

  function beginEdit(requirement: Requirement) {
    setEditingKey(requirement.key);
    setDraft({
      description: requirement.description ?? "",
      expectedFormat: requirement.expectedFormat ?? "",
      condition: requirement.condition ?? "",
      usage: requirement.usage,
    });
  }

  if (loading) {
    return (
      <section className="glass-panel mb-8 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building requirement hierarchy...
        </div>
      </section>
    );
  }

  if (requirements.length === 0) return null;

  return (
    <section className="glass-panel mb-8 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Requirements</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Analyst-reviewed customer requirements organized by loop context before interface mapping.
          </p>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-right">
          <p className="text-2xl font-semibold text-indigo-300">{metrics.coverage}%</p>
          <p className="text-xs text-slate-400">mapping coverage</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total requirements" value={metrics.total} />
        <Metric label="Mapped" value={metrics.mapped} tone="emerald" />
        <Metric label="Missing" value={metrics.missing} tone="red" />
        <Metric label="Needs review" value={metrics.needsReview} tone="amber" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["all", "missing", "review"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize",
              filter === value
                ? "bg-indigo-600 text-white"
                : "border border-slate-700 text-slate-400 hover:bg-slate-800"
            )}
          >
            {value === "review" ? "Needs review" : value}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {groups.map((group) => {
          const open = openLoops.has(group.loopPath);
          return (
            <div key={group.loopPath} className="overflow-hidden rounded-xl border border-slate-700/50">
              <button
                type="button"
                onClick={() => toggleLoop(group.loopPath)}
                className="flex w-full items-center justify-between bg-slate-900/50 px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 font-medium text-slate-200">
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {group.loopPath}
                </span>
                <span className="text-xs text-slate-500">{group.rows.length} requirement(s)</span>
              </button>

              {open && (
                <div className="divide-y divide-slate-800/70">
                  {group.rows.map((requirement) => {
                    const state = mappingState(requirement);
                    const editing = editingKey === requirement.key && draft;
                    return (
                      <div key={requirement.key} className="bg-slate-950/20 px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-cyan-300">
                                {requirement.segment}
                                {requirement.element}
                                {requirement.qualifier ? ` · ${requirement.qualifier}` : ""}
                              </span>
                              <StatusPill state={state} />
                              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase text-slate-400">
                                {requirement.usage}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-300">
                              {requirement.description ?? "No description extracted"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Parent: {requirement.parent} · Source: {requirement.sourceDocument ?? "Specification"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => beginEdit(requirement)}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                              title="Edit requirement"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateRequirement(requirement, "needs_review")}
                              disabled={savingKey === requirement.key}
                              className="rounded-lg border border-amber-500/30 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                            >
                              Needs review
                            </button>
                            <button
                              type="button"
                              onClick={() => updateRequirement(requirement, "confirmed")}
                              disabled={savingKey === requirement.key}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              {savingKey === requirement.key ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Confirm
                            </button>
                          </div>
                        </div>

                        {(requirement.expectedFormat || requirement.condition || requirement.repeats) && (
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                            {requirement.expectedFormat && <span>Format: {requirement.expectedFormat}</span>}
                            {requirement.condition && <span>Condition: {requirement.condition}</span>}
                            {requirement.repeats && <span>Repeats: {requirement.repeats}</span>}
                          </div>
                        )}

                        {editing && (
                          <div className="mt-4 grid gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 sm:grid-cols-2">
                            <label className="text-xs text-slate-400 sm:col-span-2">
                              Customer requirement
                              <input
                                value={draft.description}
                                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                              />
                            </label>
                            <label className="text-xs text-slate-400">
                              Usage
                              <select
                                value={draft.usage}
                                onChange={(event) =>
                                  setDraft({ ...draft, usage: event.target.value as Requirement["usage"] })
                                }
                                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                              >
                                <option value="required">Required</option>
                                <option value="optional">Optional</option>
                                <option value="conditional">Conditional</option>
                              </select>
                            </label>
                            <label className="text-xs text-slate-400">
                              Expected format
                              <input
                                value={draft.expectedFormat}
                                onChange={(event) => setDraft({ ...draft, expectedFormat: event.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                              />
                            </label>
                            <label className="text-xs text-slate-400 sm:col-span-2">
                              Condition / business rule
                              <input
                                value={draft.condition}
                                onChange={(event) => setDraft({ ...draft, condition: event.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => updateRequirement(requirement, "confirmed", draft)}
                              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Save and confirm
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "red" | "amber";
}) {
  const color = {
    slate: "text-slate-100",
    emerald: "text-emerald-400",
    red: "text-red-400",
    amber: "text-amber-400",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/30 p-4">
      <p className={cn("text-2xl font-semibold", color)}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function StatusPill({ state }: { state: "mapped" | "missing" | "context_review" }) {
  if (state === "mapped") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase text-emerald-300">
        <Check className="h-3 w-3" /> Mapped
      </span>
    );
  }
  if (state === "context_review") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase text-amber-300">
        <CircleDashed className="h-3 w-3" /> Context review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] uppercase text-red-300">
      <AlertTriangle className="h-3 w-3" /> Missing
    </span>
  );
}
