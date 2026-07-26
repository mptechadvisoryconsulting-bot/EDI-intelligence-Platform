import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProjectCard } from "@/components/project-card";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projects = await db.implementationProject.findMany({
    where: { ownerId: session.id, status: { not: "production" } },
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

  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Implementations</h1>
            <p className="mt-1 text-sm text-slate-500">
              One operational record for each customer transaction, from specification through revisions
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            New implementation
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-slate-600">Create an implementation for an approved customer transaction.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
