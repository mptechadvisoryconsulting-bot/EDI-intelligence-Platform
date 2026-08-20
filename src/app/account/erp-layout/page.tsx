import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AccountErpLayoutPanel } from "@/components/account-erp-layout-panel";
import { AccountPasswordPanel } from "@/components/account-password-panel";
import { OracleLayoutReportImport } from "@/components/oracle-layout-report-import";
import { getSession } from "@/lib/auth";

export default async function AccountErpLayoutPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-4xl px-8 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">Legacy configuration</p>
          <h1 className="mt-1 text-2xl font-semibold ai-gradient-text">Legacy account interface</h1>
          <p className="mt-1 text-sm text-slate-400">
            Compatibility fallback for implementations that have not yet been assigned a transaction-specific Interface Library definition.
          </p>
        </div>
        <OracleLayoutReportImport />
        <AccountErpLayoutPanel />
        <div className="mt-8">
          <AccountPasswordPanel />
        </div>
      </div>
    </AppShell>
  );
}
