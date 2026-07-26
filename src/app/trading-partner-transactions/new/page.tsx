import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { NewProjectForm } from "@/components/new-project-form";
import { getSession } from "@/lib/auth";

export default async function NewTransactionWorkspacePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <AppShell user={session}><div className="mx-auto max-w-3xl px-8 py-8"><NewProjectForm /></div></AppShell>;
}
