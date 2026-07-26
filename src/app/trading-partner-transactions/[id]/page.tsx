import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectWorkspace } from "@/components/project-workspace";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export default async function TransactionWorkspacePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const transaction = await db.tradingPartnerTransaction.findFirst({
    where: { id, tradingPartner: { ownerId: session.id } },
  });
  if (!transaction) notFound();
  const project = await db.implementationProject.findFirst({
    where: { id: transaction.legacyProjectId, ownerId: session.id },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      mappingRecommendations: { orderBy: { confidence: "desc" } },
      openQuestions: { orderBy: { createdAt: "desc" } },
      assumptions: { orderBy: { createdAt: "desc" } },
      artifacts: { orderBy: { createdAt: "desc" } },
      testScenarios: { orderBy: { createdAt: "asc" } },
      interfaceDefinition: true,
    },
  });
  if (!project) notFound();
  const workspaceProject = {
    ...project,
    name: `${transaction.transactionCode} ${transaction.transactionName}`,
    transactions: transaction.transactionCode,
  };
  return <AppShell user={session}><ProjectWorkspace
    project={JSON.parse(JSON.stringify(workspaceProject))}
    workspace={{
      transactionCode: transaction.transactionCode,
      transactionName: transaction.transactionName,
      version: transaction.currentVersion,
    }}
  /></AppShell>;
}
