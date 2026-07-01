"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStep = {
  id: string;
  label: string;
  hint: string;
  status: "done" | "current" | "pending" | "loading";
};

export function WorkflowStepper({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-2 sm:gap-0">
      {steps.map((step, index) => (
        <li key={step.id} className="flex min-w-[140px] flex-1 items-center gap-2 sm:min-w-0">
          <div
            className={cn(
              "flex flex-1 flex-col rounded-xl border px-3 py-2.5 transition",
              step.status === "current" && "border-indigo-400/50 bg-indigo-500/10 ai-glow-border",
              step.status === "done" && "border-emerald-500/30 bg-emerald-500/5",
              step.status === "pending" && "border-slate-700/50 bg-slate-800/30",
              step.status === "loading" && "border-cyan-400/40 bg-cyan-500/5"
            )}
          >
            <div className="flex items-center gap-2">
              {step.status === "done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
              {step.status === "current" && (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                  {index + 1}
                </span>
              )}
              {step.status === "pending" && <Circle className="h-4 w-4 shrink-0 text-slate-600" />}
              {step.status === "loading" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-400" />}
              <span
                className={cn(
                  "text-xs font-semibold",
                  step.status === "current" && "text-indigo-200",
                  step.status === "done" && "text-emerald-300",
                  step.status === "pending" && "text-slate-500",
                  step.status === "loading" && "text-cyan-300"
                )}
              >
                {step.label}
              </span>
            </div>
            <p className="mt-0.5 pl-6 text-[10px] leading-snug text-slate-500">{step.hint}</p>
          </div>
          {index < steps.length - 1 && (
            <div className="hidden h-px w-3 shrink-0 bg-slate-700 sm:block" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}
