"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Upload,
} from "lucide-react";
import { EdiComparePanel } from "@/components/edi-compare-panel";
import { FileDropZone } from "@/components/file-drop-zone";
import { PartnerPackBadge } from "@/components/partner-pack-badge";
import { CopilotPanel } from "@/components/copilot-panel";
import { ApprovalPanel, ReadinessPanel } from "@/components/readiness-panel";
import { TestScenariosPanel } from "@/components/test-scenarios-panel";
import { TransactionPackBadges } from "@/components/transaction-pack-badges";
import { WorkflowStepper, type WorkflowStep } from "@/components/workflow-stepper";
import { parsePositionalFromTransformation } from "@/lib/exports/positional-resolve";
import { cn, confidenceColor, formatDate, statusColor } from "@/lib/utils";
import { resolveErpProfile } from "@/lib/erp-profiles";
import { parseTransactionCodes } from "@/lib/transaction-packs";

type DocumentItem = {
  id: string;
  name: string;
  type: string;
  status: string;
  originalFileName?: string | null;
  parseSummary?: string | null;
  fileSize?: number | null;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  customer: string;
  tradingPartner: string;
  erpSystem: string;
  erpVersion: string | null;
  translatorTarget: string;
  transactions: string;
  status: string;
  reviewStatus: string;
  description: string | null;
  updatedAt: string;
  documents: DocumentItem[];
  mappingRecommendations: Array<{
    id: string;
    targetSegment: string;
    targetElement: string;
    sourceField: string | null;
    interfaceColumn?: string | null;
    recNumber?: number | null;
    startPosition?: number | null;
    charLimit?: number | null;
    transformation: string | null;
    qualifier: string | null;
    confidence: number;
    rationale: string | null;
    reviewStatus: string;
  }>;
  openQuestions: Array<{
    id: string;
    question: string;
    category: string;
    priority: string;
    status: string;
  }>;
  assumptions: Array<{ id: string; assumption: string; risk: string; status: string }>;
  artifacts: Array<{ id: string; type: string; title: string; content: string; createdAt: string }>;
  testScenarios: Array<{
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
  }>;
};

function countUncoveredMappings(
  mappings: Project["mappingRecommendations"],
  scenarios: Project["testScenarios"]
): number {
  const keys = mappings.map(
    (m) => `${m.targetSegment}.${m.targetElement}${m.qualifier ? `:${m.qualifier}` : ""}`
  );
  const covered = new Set(
    scenarios.flatMap((s) => (s.coveredMappings ? s.coveredMappings.split("; ").filter(Boolean) : []))
  );
  return keys.filter((k) => !covered.has(k)).length;
}

const SAMPLE_FILES = [
  { href: "/samples/erp-source-fields-846.csv", label: "ERP fields — 846 Inventory" },
  { href: "/samples/erp-source-fields.csv", label: "ERP fields — 850 PO" },
  { href: "/samples/erp-source-fields-855.csv", label: "ERP fields — 855 PO Ack" },
  { href: "/samples/erp-source-fields-856.csv", label: "ERP fields — 856 ASN" },
  { href: "/samples/erp-source-fields-810.csv", label: "ERP fields — 810 Invoice" },
  { href: "/samples/mapping-requirements.csv", label: "Mapping requirements (850)" },
  { href: "/samples/sample-846-guide.txt", label: "846 guide (TXT)" },
  { href: "/samples/sample-850-guide.txt", label: "850 guide (TXT)" },
  { href: "/samples/customer-test-scenarios.csv", label: "Customer test scenarios (CSV)" },
  { href: "/samples/sample-855-guide.txt", label: "855 guide (TXT)" },
  { href: "/samples/sample-856-guide.txt", label: "856 guide (TXT)" },
  { href: "/samples/sample-810-guide.txt", label: "810 guide (TXT)" },
  { href: "/samples/sample-850.edi", label: "Sample 850 EDI" },
  { href: "/samples/sample-walmart-850.edi", label: "Walmart-style 850 EDI" },
];

export function ProjectWorkspace({ project: initial }: { project: Project }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState(initial);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("guide");
  const [message, setMessage] = useState("");

  async function refreshProject() {
    const res = await fetch(`/api/projects/${project.id}`);
    if (res.ok) setProject(await res.json());
    router.refresh();
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setMessage("");
    try {
      const res = await fetch(`/api/projects/${project.id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Analysis failed");
        return;
      }
      setMessage(data.summary ?? "Analysis complete");
      await refreshProject();
    } finally {
      setAnalyzing(false);
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMessage("");

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        let type = docType;
        if (/\.(edi|x12)$/i.test(file.name) || ext === "edi") type = "sample_edi";
        else if (/test|scenario|qa/i.test(file.name)) type = "test_spec";
        else if (/mapping|map/i.test(file.name)) type = "mapping_sheet";
        else if (/erp|source|field/i.test(file.name) && ext === "csv") type = "erp_schema";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);
        formData.append("name", file.name);

        const res = await fetch(`/api/projects/${project.id}/documents/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(data.error ?? `Failed to upload ${file.name}`);
          return;
        }
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshProject();
    } catch {
      setMessage("Upload failed — check connection and try again");
    } finally {
      setUploading(false);
    }
  }

  async function reviewMapping(mappingId: string, reviewStatus: "approved" | "rejected") {
    await fetch(`/api/projects/${project.id}/mappings/${mappingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    });
    await refreshProject();
  }

  async function removeDocument(documentId: string, name: string) {
    if (!confirm(`Remove "${name}" from this workspace?`)) return;
    const res = await fetch(`/api/projects/${project.id}/documents/${documentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Could not remove document");
      return;
    }
    setProject((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== documentId),
    }));
    setMessage("Document removed.");
    router.refresh();
  }

  const transactionCodes = parseTransactionCodes(project.transactions);
  const parsedCount = project.documents.filter((d) => d.status.startsWith("parsed")).length;
  const erpProfile = resolveErpProfile(project.erpSystem);
  const hasMappings = project.mappingRecommendations.length > 0;

  const workflowSteps: WorkflowStep[] = [
    {
      id: "upload",
      label: "Upload specs",
      hint: "Drop customer guides, test specs, sample EDI",
      status: uploading ? "loading" : parsedCount > 0 ? "done" : "current",
    },
    {
      id: "analyze",
      label: "AI analyze",
      hint: "Match ERP layout to transaction sets",
      status: analyzing ? "loading" : hasMappings ? "done" : parsedCount > 0 ? "current" : "pending",
    },
    {
      id: "export",
      label: "Export MRS",
      hint: "Sterling Excel by transaction (850, 856…)",
      status: hasMappings ? "current" : "pending",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">AI workspace</p>
            <h1 className="mt-1 text-2xl font-semibold ai-gradient-text">{project.name}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {project.customer} · {project.tradingPartner} · {project.erpSystem}
              {project.erpVersion ? ` ${project.erpVersion}` : ""} → {project.translatorTarget}
            </p>
            <p className="mt-1 text-sm text-slate-500">Transactions: {project.transactions}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TransactionPackBadges transactions={project.transactions} />
              <PartnerPackBadge tradingPartner={project.tradingPartner} />
              {erpProfile.id !== "custom" && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {erpProfile.name} field aliases
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={analyzing || parsedCount === 0}
              className="btn-ai-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              title={parsedCount === 0 ? "Upload at least one parsed document first" : "Run AI mapping analysis"}
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Run AI analysis
            </button>
            <span className={cn("rounded-full px-3 py-1 text-xs font-medium", statusColor(project.status))}>
              {project.status.replace(/_/g, " ")}
            </span>
            <span className={cn("rounded-full px-3 py-1 text-xs font-medium", statusColor(project.reviewStatus))}>
              {project.reviewStatus.replace(/_/g, " ")}
            </span>
          </div>
        </div>
        {project.description && (
          <p className="mt-4 rounded-xl glass-panel px-4 py-3 text-sm text-slate-400">{project.description}</p>
        )}
      </header>

      <div className="mb-8 glass-panel rounded-2xl p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Setup workflow</p>
        <WorkflowStepper steps={workflowSteps} />
        {parsedCount === 0 && (
          <p className="mt-3 text-xs text-amber-400/90">
            Upload customer specs below, then click <strong className="text-amber-200">Run AI analysis</strong> to generate mappings.
          </p>
        )}
      </div>

      <section className="glass-panel mb-8 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">1 · Upload customer specs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Drag files in — type is auto-detected. Account ERP layout supplies Interface Column, Record #, Start, Width for MRS.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-sm">
          <p className="font-medium text-indigo-200">Quick start samples</p>
          <p className="mt-1 text-slate-500">
            Download a guide + test spec, upload here, then run AI analysis.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {SAMPLE_FILES.slice(0, 6).map((sample) => (
              <a
                key={sample.href}
                href={sample.href}
                download
                className="text-xs font-medium text-indigo-400 underline hover:text-indigo-300"
              >
                {sample.label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <FileDropZone
            disabled={uploading}
            onFiles={uploadFiles}
            label="Drag and drop customer specs here"
            hint="Guides, test specs, sample EDI, mapping sheets — ERP layout applied from your account"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
          >
            <option value="guide">Implementation guide</option>
            <option value="test_spec">Test spec / QA scenarios</option>
            <option value="mapping_sheet">Mapping sheet</option>
            <option value="sample_edi">Sample EDI</option>
            <option value="erp_schema">ERP schema / field list</option>
            <option value="validation">Validation report</option>
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.edi,.x12,.xlsx,.xls,.pdf,.docx,.doc"
            multiple
            className="hidden"
            onChange={(e) => uploadFiles(e.target.files)}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Browse files
          </button>

          <button
            type="button"
            onClick={runAnalysis}
            disabled={analyzing || parsedCount === 0}
            className="btn-ai-primary inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            2 · Run AI analysis
          </button>
        </div>

        {message && (
          <p className={cn("mt-4 rounded-lg px-3 py-2 text-sm", message.includes("fail") || message.includes("Could not") ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300")}>
            {message}
          </p>
        )}

        {project.documents.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-800 rounded-xl border border-slate-800/80">
            {project.documents.map((doc) => (
              <li key={doc.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-200">{doc.name}</p>
                  <p className="text-xs text-slate-500">
                    {doc.type.replace(/_/g, " ")}
                    {doc.originalFileName ? ` · ${doc.originalFileName}` : ""}
                    {doc.fileSize ? ` · ${Math.round(doc.fileSize / 1024)} KB` : ""}
                  </p>
                  {doc.parseSummary && <p className="mt-1 text-xs text-emerald-400/90">{doc.parseSummary}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", statusColor(doc.status))}>
                    {doc.status.replace(/_/g, " ")}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDocument(doc.id, doc.name)}
                    className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                    title="Remove document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No documents yet — drop files above to begin.</p>
        )}
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <MetricCard icon={FileText} label="Documents" value={project.documents.length} />
        <MetricCard icon={Sparkles} label="Mappings" value={project.mappingRecommendations.length} />
        <MetricCard icon={HelpCircle} label="Open questions" value={project.openQuestions.length} />
        <MetricCard icon={CheckCircle2} label="Artifacts" value={project.artifacts.length} />
      </div>

      {project.mappingRecommendations.length > 0 && (
        <section className="glass-panel mb-8 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-100">AI mapping recommendations</h2>
          <p className="mt-1 text-sm text-slate-500">MRS columns (Rec, Start, Width) appear in export when matched to account ERP layout.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4">Target</th>
                  <th className="pb-3 pr-4">Interface / MRS</th>
                  <th className="pb-3 pr-4">Confidence</th>
                  <th className="pb-3 pr-4">Review</th>
                </tr>
              </thead>
              <tbody>
                {project.mappingRecommendations.map((m) => {
                  const parsed = parsePositionalFromTransformation(m.transformation);
                  const iface = m.interfaceColumn ?? parsed.interfaceColumn ?? m.sourceField;
                  const rec = m.recNumber ?? parsed.recNumber;
                  const start = m.startPosition ?? parsed.startPosition;
                  const width = m.charLimit ?? parsed.charLimit;
                  return (
                  <tr key={m.id} className="border-b border-slate-800/50">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-300">
                      {m.targetSegment}.{m.targetElement}
                      {m.qualifier && <span className="ml-1 text-slate-500">({m.qualifier})</span>}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-200">{iface ?? "—"}</p>
                      {(rec != null || start != null || width != null) && (
                        <p className="mt-0.5 font-mono text-[11px] text-cyan-400/90">
                          Rec {rec ?? "—"} · Start {start ?? "—"} · Width {width ?? "—"}
                        </p>
                      )}
                    </td>
                    <td className={cn("py-3 pr-4 font-semibold", confidenceColor(m.confidence))}>
                      {Math.round(m.confidence * 100)}%
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs", statusColor(m.reviewStatus))}>
                          {m.reviewStatus}
                        </span>
                        <button
                          onClick={() => reviewMapping(m.id, "approved")}
                          className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10"
                          title="Approve"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => reviewMapping(m.id, "rejected")}
                          className="rounded p-1 text-red-400 hover:bg-red-500/10"
                          title="Reject"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {project.openQuestions.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <HelpCircle className="h-5 w-5 text-amber-500" />
              Open questions
            </h2>
            <ul className="mt-4 space-y-3">
              {project.openQuestions.map((q) => (
                <li key={q.id} className="rounded-lg bg-amber-50 px-4 py-3 text-sm">
                  <p className="font-medium text-slate-800">{q.question}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {q.category.replace(/_/g, " ")} · {q.priority} priority
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {project.assumptions.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Assumptions & risks
            </h2>
            <ul className="mt-4 space-y-3">
              {project.assumptions.map((a) => (
                <li key={a.id} className="rounded-lg bg-orange-50 px-4 py-3 text-sm">
                  <p className="text-slate-800">{a.assumption}</p>
                  <p className="mt-1 text-xs text-slate-500">{a.risk} risk</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {(project.mappingRecommendations.length > 0 || project.artifacts.length > 0) && (
        <section className="glass-panel mt-8 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-100">3 · Export MRS handoff</h2>
            {project.mappingRecommendations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/projects/${project.id}/export?type=mapping_matrix`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Mapping matrix (Excel)
              </a>
              <a
                href={`/api/projects/${project.id}/export?type=testing_scenarios`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Test scenarios
              </a>
              <a
                href={`/api/projects/${project.id}/export?type=qa_test_plan_csv`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                QA plan CSV
              </a>
              <a
                href={`/api/projects/${project.id}/export?type=partner_rules`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Partner rules
              </a>
              <a
                href={`/api/projects/${project.id}/export?type=edi_sample_compare`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                EDI compare
              </a>
              <a
                href={`/api/projects/${project.id}/export?type=handoff_summary`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Handoff summary
              </a>
              <a
                href={`/api/projects/${project.id}/export/translator?format=clarification_email`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Customer email
              </a>
            </div>
            )}
          </div>

          {project.mappingRecommendations.length > 0 && (
          <div className="mt-4 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-300">IBM Sterling MRS / translator exports</p>
            <p className="mt-1 text-xs text-indigo-200/80">
              Each file is split by transaction set (850, 856, etc.). MRS includes Interface Column, Record Number, Start Column, and Width from your account layout.
            </p>

            <p className="mt-3 text-xs font-medium text-indigo-200">All transactions (one tab/sheet per set)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  { format: "sterling", label: "Sterling MRS (Excel)", output: "xlsx" },
                  { format: "sterling", label: "Sterling MRS (CSV)", output: "csv" },
                  { format: "cleo", label: "Cleo (Excel)", output: "xlsx" },
                  { format: "boomi", label: "Boomi (Excel)", output: "xlsx" },
                  { format: "opentext", label: "OpenText (Excel)", output: "xlsx" },
                ] as const
              ).map(({ format, label, output }) => (
                <a
                  key={`${format}-${output}`}
                  href={`/api/projects/${project.id}/export/translator?format=${format}&output=${output}`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium",
                    project.translatorTarget.toLowerCase().includes(format)
                      ? "border-indigo-400 bg-indigo-600 text-white hover:bg-indigo-700"
                      : "border-indigo-500/30 bg-slate-900/50 text-indigo-300 hover:bg-indigo-500/20"
                  )}
                >
                  <Download className="h-3.5 w-3.5" />
                  {label}
                </a>
              ))}
            </div>

            {transactionCodes.length > 0 && (
              <>
                <p className="mt-4 text-xs font-medium text-indigo-200">Single transaction export</p>
                <div className="mt-2 flex flex-col gap-3">
                  {transactionCodes.map((tx) => (
                    <div key={tx} className="flex flex-wrap items-center gap-2">
                      <span className="w-10 text-xs font-semibold text-indigo-200">{tx}</span>
                      <a
                        href={`/api/projects/${project.id}/export/translator?format=sterling&output=xlsx&transaction=${tx}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-slate-900/50 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20"
                      >
                        <Download className="h-3 w-3" />
                        MRS Excel
                      </a>
                      <a
                        href={`/api/projects/${project.id}/export/translator?format=sterling&output=csv&transaction=${tx}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-slate-900/50 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20"
                      >
                        <Download className="h-3 w-3" />
                        MRS CSV
                      </a>
                      <a
                        href={`/api/projects/${project.id}/export?type=mapping_matrix&transaction=${tx}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-600/50 bg-slate-900/50 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800/50"
                      >
                        <Download className="h-3 w-3" />
                        Matrix
                      </a>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          )}

          {project.artifacts.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {project.artifacts.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-indigo-600">{a.type.replace(/_/g, " ")}</p>
                <p className="mt-1 font-medium text-slate-900">{a.title}</p>
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-600">{a.content}</pre>
              </div>
            ))}
          </div>
          )}
        </section>
      )}

      <ReadinessPanel projectId={project.id} />

      <ApprovalPanel
        projectId={project.id}
        reviewStatus={project.reviewStatus}
        onApproved={refreshProject}
      />

      <TestScenariosPanel
        projectId={project.id}
        scenarios={project.testScenarios ?? []}
        uncoveredCount={countUncoveredMappings(project.mappingRecommendations, project.testScenarios ?? [])}
      />

      <EdiComparePanel projectId={project.id} />

      <CopilotPanel projectId={project.id} projectName={project.name} />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <Icon className="h-5 w-5 text-indigo-400" />
      <p className="mt-3 text-2xl font-semibold text-slate-100">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
