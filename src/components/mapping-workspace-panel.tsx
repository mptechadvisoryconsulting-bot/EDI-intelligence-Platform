"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn, confidenceColor } from "@/lib/utils";
import { parsePositionalFromTransformation } from "@/lib/exports/positional-resolve";

type MappingRow = {
  id: string;
  targetSegment: string;
  targetElement: string;
  qualifier: string | null;
  sourceField: string | null;
  interfaceColumn?: string | null;
  recNumber?: number | null;
  startPosition?: number | null;
  charLimit?: number | null;
  transformation: string | null;
  confidence: number;
  reviewStatus: string;
};

type WorkspaceRow = {
  targetKey: string;
  specDescription?: string;
  specRequired?: boolean;
  interfaceColumn?: string;
  recNumber?: number | null;
  startPosition?: number | null;
  charLimit?: number | null;
  confidence?: number;
  reviewStatus?: string;
  mappingId?: string;
};

export function MappingWorkspacePanel({
  projectId,
  mappings,
}: {
  projectId: string;
  mappings: MappingRow[];
}) {
  const [rows, setRows] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/spec-review`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const merged = new Map<string, WorkspaceRow>();

        for (const r of data.requirements ?? []) {
          merged.set(r.key, {
            targetKey: r.key,
            specDescription: r.description,
            specRequired: r.required,
          });
        }

        for (const m of mappings) {
          const key = `${m.targetSegment}.${m.targetElement}${m.qualifier ? `:${m.qualifier}` : ""}`;
          const parsed = parsePositionalFromTransformation(m.transformation);
          const existing = merged.get(key) ?? { targetKey: key };
          merged.set(key, {
            ...existing,
            interfaceColumn: m.interfaceColumn ?? parsed.interfaceColumn ?? m.sourceField ?? undefined,
            recNumber: m.recNumber ?? parsed.recNumber,
            startPosition: m.startPosition ?? parsed.startPosition,
            charLimit: m.charLimit ?? parsed.charLimit,
            confidence: m.confidence,
            reviewStatus: m.reviewStatus,
            mappingId: m.id,
          });
        }

        for (const s of data.memorySuggestions ?? []) {
          const existing = merged.get(s.targetKey);
          if (existing?.mappingId) continue;
          if (!existing) {
            merged.set(s.targetKey, {
              targetKey: s.targetKey,
              interfaceColumn: s.interfaceColumn ?? undefined,
              recNumber: s.recNumber,
              startPosition: s.startPosition,
              charLimit: s.charLimit,
            });
          } else if (!existing.interfaceColumn && s.interfaceColumn) {
            merged.set(s.targetKey, {
              ...existing,
              interfaceColumn: s.interfaceColumn ?? undefined,
              recNumber: existing.recNumber ?? s.recNumber,
              startPosition: existing.startPosition ?? s.startPosition,
              charLimit: existing.charLimit ?? s.charLimit,
            });
          }
        }

        setRows([...merged.values()].slice(0, 50));
      })
      .finally(() => setLoading(false));
  }, [projectId, mappings]);

  if (loading) {
    return (
      <section className="glass-panel mb-8 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building mapping workspace...
        </div>
      </section>
    );
  }

  if (rows.length === 0) return null;

  return (
    <section className="glass-panel mb-8 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-100">Mapping workspace</h2>
      <p className="mt-1 text-sm text-slate-400">
        Customer spec · ERP interface / MRS · current mapping — before translator handoff
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-3 pr-4">Customer spec</th>
              <th className="pb-3 pr-4">ERP / interface</th>
              <th className="pb-3 pr-4">Mapping</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.targetKey} className="border-b border-slate-800/50 align-top">
                <td className="py-3 pr-4">
                  <p className="font-mono text-xs text-cyan-400/90">{row.targetKey}</p>
                  {row.specDescription && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{row.specDescription}</p>
                  )}
                  {row.specRequired && (
                    <span className="mt-1 inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                      Required in spec
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <p className="font-medium text-slate-200">{row.interfaceColumn ?? "—"}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-cyan-400/90">
                    Rec {row.recNumber ?? "—"} · Start {row.startPosition ?? "—"} · Width {row.charLimit ?? "—"}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  {row.mappingId ? (
                    <>
                      <span className={cn("font-semibold", confidenceColor(row.confidence ?? 0))}>
                        {Math.round((row.confidence ?? 0) * 100)}%
                      </span>
                      <span className="ml-2 text-xs text-slate-500">{row.reviewStatus}</span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">Suggested from memory — run analysis or clone</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
