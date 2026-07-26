import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { InterfaceLibraryPanel } from "@/components/interface-library-panel";
import { getSession } from "@/lib/auth";

export default async function InterfaceLibraryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="mb-7">
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">Configuration</p>
          <h1 className="mt-1 text-2xl font-semibold ai-gradient-text">Interface Library</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Your company&apos;s reusable internal transaction knowledge, separated from customer implementation work.
          </p>
        </div>
        <InterfaceLibraryPanel />
      </div>
    </AppShell>
  );
}
