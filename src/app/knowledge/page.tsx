import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function KnowledgePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projects = await db.implementationProject.findMany({
    where: { ownerId: session.id },
    select: {
      customer: true,
      tradingPartner: true,
      erpSystem: true,
      translatorTarget: true,
      transactions: true,
    },
  });

  const customers = [...new Set(projects.map((p) => p.customer).filter(Boolean))];
  const erps = [...new Set(projects.map((p) => p.erpSystem).filter(Boolean))];
  const translators = [...new Set(projects.map((p) => p.translatorTarget).filter(Boolean))];

  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-4xl px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Knowledge reuse</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search prior implementations, ERP patterns, and mapping decisions across workspaces
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers, partners, ERP fields, segments..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
              disabled
            />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Full-text knowledge search ships in a future release. Below is context from your workspaces.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <KnowledgeList title="Customers seen" items={customers} empty="No customers yet" />
          <KnowledgeList title="ERP systems" items={erps} empty="No ERP profiles yet" />
          <KnowledgeList title="Translators" items={translators} empty="No translator targets yet" />
        </div>
      </div>
    </AppShell>
  );
}

function KnowledgeList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
