import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectWorkspace } from "@/components/project-workspace";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const project = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      mappingRecommendations: { orderBy: { confidence: "desc" } },
      openQuestions: { orderBy: { createdAt: "desc" } },
      assumptions: { orderBy: { createdAt: "desc" } },
      artifacts: { orderBy: { createdAt: "desc" } },
      testScenarios: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project) notFound();

  return (
    <AppShell user={session}>
      <ProjectWorkspace project={JSON.parse(JSON.stringify(project))} />
    </AppShell>
  );
}
