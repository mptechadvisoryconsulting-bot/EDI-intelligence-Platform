import Link from "next/link";
import { ArrowRight, FileText, HelpCircle, Map, Sparkles } from "lucide-react";
import { cn, formatDate, statusColor } from "@/lib/utils";

type ProjectSummary = {
  id: string;
  name: string;
  customer: string;
  tradingPartner: string;
  status: string;
  reviewStatus: string;
  updatedAt: string | Date;
  _count: {
    documents: number;
    mappingRecommendations: number;
    openQuestions: number;
    artifacts: number;
  };
};

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700">
            {project.name}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {project.customer} → {project.tradingPartner}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-indigo-500" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusColor(project.status))}>
          {project.status.replace(/_/g, " ")}
        </span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusColor(project.reviewStatus))}>
          {project.reviewStatus.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Stat icon={FileText} label="Docs" value={project._count.documents} />
        <Stat icon={Map} label="Maps" value={project._count.mappingRecommendations} />
        <Stat icon={HelpCircle} label="Questions" value={project._count.openQuestions} />
        <Stat icon={Sparkles} label="Artifacts" value={project._count.artifacts} />
      </div>

      <p className="mt-4 text-xs text-slate-400">Updated {formatDate(project.updatedAt)}</p>
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <Icon className="mx-auto h-3.5 w-3.5 text-slate-400" />
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
