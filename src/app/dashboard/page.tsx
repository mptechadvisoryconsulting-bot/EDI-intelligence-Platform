import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProjectCard } from "@/components/project-card";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccountErpLayout } from "@/lib/erp-layout/account";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projects = await db.implementationProject.findMany({
    where: { ownerId: session.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          documents: true,
          mappingRecommendations: true,
          openQuestions: true,
          artifacts: true,
        },
      },
    },
  });

  const accountLayout = await getAccountErpLayout(session.id);

  const stats = {
    total: projects.length,
    inReview: projects.filter((p) => p.reviewStatus.includes("review")).length,
    questions: projects.reduce((sum, p) => sum + p._count.openQuestions, 0),
    mappings: projects.reduce((sum, p) => sum + p._count.mappingRecommendations, 0),
  };

  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">AI platform</p>
            <h1 className="mt-1 text-2xl font-semibold ai-gradient-text">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage each customer transaction from specification through production and revisions
            </p>
          </div>
          <Link
            href="/projects/new"
            className="btn-ai-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            New implementation
          </Link>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <Stat label="Implementations" value={stats.total} />
          <Stat label="In review" value={stats.inReview} />
          <Stat label="Open questions" value={stats.questions} />
          <Stat label="AI mappings" value={stats.mappings} />
        </div>

        {!accountLayout ? (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <div className="text-sm text-amber-100">
              <p className="font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Step 1: Configure account ERP layout
              </p>
              <p className="mt-1 text-amber-200/80">
                Upload Interface Column, Record Number, Start Column, Width once — every implementation inherits it for MRS export.
              </p>
            </div>
            <Link
              href="/account/erp-layout"
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
            >
              Set up ERP layout
            </Link>
          </div>
        ) : (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4 text-sm">
            <p className="text-emerald-100">
              <span className="font-medium">Account ERP ready:</span> {accountLayout.erpSystem}
              {accountLayout.erpVersion ? ` ${accountLayout.erpVersion}` : ""} · {accountLayout.fieldCount}{" "}
              fields with positional data for MRS export
            </p>
            <Link
              href="/account/erp-layout"
              className="font-medium text-emerald-400 hover:text-emerald-300"
            >
              Manage layout →
            </Link>
          </div>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Recent implementations</h2>
          {projects.length === 0 ? (
            <div className="glass-panel rounded-2xl px-6 py-12 text-center">
              <p className="text-slate-400">No implementations yet.</p>
              <Link href="/projects/new" className="mt-3 inline-block text-sm font-medium text-indigo-400 hover:text-indigo-300">
                Create your first implementation →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-panel rounded-xl p-5">
      <p className="text-2xl font-semibold text-slate-100">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
