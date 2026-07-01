import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AccountErpLayoutPanel } from "@/components/account-erp-layout-panel";
import { getSession } from "@/lib/auth";

export default async function AccountErpLayoutPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-4xl px-8 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">Account settings</p>
          <h1 className="mt-1 text-2xl font-semibold ai-gradient-text">ERP layout &amp; sample verification</h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure your company ERP interface once — used across all implementation workspaces. Sample output verifies Rec/Start/Width only.
          </p>
        </div>
        <AccountErpLayoutPanel />
      </div>
    </AppShell>
  );
}
