import Link from "next/link";
import { redirect } from "next/navigation";
import { Database, Settings } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";

export default async function AdministrationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-5xl px-8 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900"><Settings className="h-6 w-6 text-indigo-600" /> Administration</h1>
        <p className="mt-1 text-sm text-slate-500">Reusable engineering configuration remains separate from operational work.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href="/interface-library" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300">
            <Database className="h-6 w-6 text-indigo-600" /><h2 className="mt-3 font-semibold text-slate-900">Interface Library</h2><p className="mt-1 text-sm text-slate-500">Manage reusable normalized 850, 856, 810, and other internal transaction definitions.</p>
          </Link>
          <Link href="/account" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300">
            <Settings className="h-6 w-6 text-indigo-600" /><h2 className="mt-3 font-semibold text-slate-900">Account & security</h2><p className="mt-1 text-sm text-slate-500">Manage credentials and account-level configuration.</p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
