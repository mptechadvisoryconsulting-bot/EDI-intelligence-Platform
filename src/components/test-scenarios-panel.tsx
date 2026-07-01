"use client";

import { Download, FlaskConical } from "lucide-react";
import { cn, statusColor } from "@/lib/utils";

type TestScenario = {
  id: string;
  name: string;
  description: string | null;
  source: string;
  transactionCode: string | null;
  preconditions: string | null;
  expectedOutcome: string | null;
  relatedSegments: string | null;
  coveredMappings: string | null;
  coverageStatus: string;
};

const SOURCE_LABEL: Record<string, string> = {
  customer: "Customer spec",
  pack: "Transaction pack",
  mapping: "Mapping-derived",
};

export function TestScenariosPanel({
  projectId,
  scenarios,
  uncoveredCount,
}: {
  projectId: string;
  scenarios: TestScenario[];
  uncoveredCount?: number;
}) {
  if (scenarios.length === 0) {
    return (
      <section className="glass-panel mb-8 rounded-2xl border-dashed p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <FlaskConical className="h-5 w-5 text-violet-400" />
          Test scenarios
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Upload a guide or test spec with customer test scenarios, then run analysis to merge with generated QA cases.
        </p>
      </section>
    );
  }

  const customer = scenarios.filter((s) => s.source === "customer");
  const generated = scenarios.filter((s) => s.source !== "customer");

  return (
    <section className="glass-panel mb-8 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <FlaskConical className="h-5 w-5 text-violet-400" />
            Test scenarios & QA plan
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {customer.length} from customer spec · {generated.length} generated ·{" "}
            {uncoveredCount ?? 0} mapping coverage gap(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/projects/${projectId}/export?type=testing_scenarios`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-600/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/50"
          >
            <Download className="h-3.5 w-3.5" />
            QA plan
          </a>
          <a
            href={`/api/projects/${projectId}/export?type=qa_test_plan_csv`}
            className="inline-flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20"
          >
            <Download className="h-3.5 w-3.5" />
            QA plan CSV
          </a>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {scenarios.map((s) => (
          <div key={s.id} className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-100">{s.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {SOURCE_LABEL[s.source] ?? s.source}
                  {s.transactionCode ? ` · TX ${s.transactionCode}` : ""}
                </p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColor(s.coverageStatus))}>
                {s.coverageStatus}
              </span>
            </div>
            {s.description && <p className="mt-2 text-sm text-slate-400">{s.description}</p>}
            {s.preconditions && (
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-medium text-slate-400">Given:</span> {s.preconditions}
              </p>
            )}
            {s.expectedOutcome && (
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-medium text-slate-400">Expected:</span> {s.expectedOutcome}
              </p>
            )}
            {s.relatedSegments && (
              <p className="mt-1 text-xs font-mono text-indigo-400">{s.relatedSegments}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
