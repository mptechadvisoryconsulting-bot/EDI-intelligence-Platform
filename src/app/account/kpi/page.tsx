import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { KpiWorkbookPreview } from "@/components/kpi-workbook-preview";
import { getSession } from "@/lib/auth";

export default async function AccountKpiPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">Account intelligence</p>
          <h1 className="mt-1 text-2xl font-semibold ai-gradient-text">KPI dashboard setup</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Inspect reporting workbooks and verify which worksheets contain authoritative source data before creating any KPI configuration. Dashboard setup remains preview-only until you explicitly confirm a proposal.
          </p>
        </div>
        <KpiWorkbookPreview />
      </div>
    </AppShell>
  );
}
