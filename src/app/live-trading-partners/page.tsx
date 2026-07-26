import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, Map, RadioTower, RefreshCw, TestTube2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseTransactionCodes } from "@/lib/transaction-packs";

export default async function LiveTradingPartnersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const implementations = await db.implementationProject.findMany({
    where: {
      ownerId: session.id,
      status: { in: ["production", "revision"] },
    },
    include: {
      approvals: {
        where: { action: { in: ["production_deployed", "revision_requested"] } },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          documents: true,
          mappingRecommendations: true,
          testScenarios: true,
        },
      },
    },
    orderBy: [{ tradingPartner: "asc" }, { updatedAt: "desc" }],
  });

  const partnerNames = [...new Set(implementations.map((item) => item.tradingPartner || item.customer))];

  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <RadioTower className="h-6 w-6 text-emerald-600" />
              Live Trading Partners
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              The production registry for active customer transactions, live versions, deployment evidence, and revision history.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
            <p className="text-2xl font-semibold text-emerald-700">{implementations.length}</p>
            <p className="text-xs text-emerald-700/70">live implementations</p>
          </div>
        </div>

        {implementations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <RadioTower className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">No live trading partners yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Approved implementations appear here after their production deployment is recorded.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {partnerNames.map((partnerName) => {
              const partnerImplementations = implementations.filter(
                (item) => (item.tradingPartner || item.customer) === partnerName
              );
              return (
                <section key={partnerName} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{partnerName}</h2>
                      <p className="text-xs text-slate-500">
                        {partnerImplementations[0]?.customer} · {partnerImplementations.length} live transaction implementation(s)
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      Active partner
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {partnerImplementations.map((implementation) => {
                      const deployments = implementation.approvals.filter(
                        (approval) => approval.action === "production_deployed"
                      );
                      const latestDeployment = deployments[0];
                      const version = deployments.length <= 1 ? "1.0" : `1.${deployments.length - 1}`;
                      const transactions = parseTransactionCodes(implementation.transactions);
                      return (
                        <Link
                          key={implementation.id}
                          href={`/projects/${implementation.id}`}
                          className="group block px-5 py-5 transition hover:bg-indigo-50/40"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                {transactions.map((transaction) => (
                                  <span
                                    key={transaction}
                                    className="rounded-md bg-slate-900 px-2 py-1 font-mono text-xs font-semibold text-white"
                                  >
                                    {transaction}
                                  </span>
                                ))}
                                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700">
                                  {implementation.name}
                                </h3>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                                <span>
                                  Live version: <strong className="text-slate-700">{version}</strong>
                                </span>
                                <span>
                                  Go live:{" "}
                                  <strong className="text-slate-700">
                                    {latestDeployment
                                      ? new Date(latestDeployment.createdAt).toLocaleDateString()
                                      : "Recorded"}
                                  </strong>
                                </span>
                                <span
                                  className={
                                    implementation.status === "revision"
                                      ? "font-medium text-amber-600"
                                      : "font-medium text-emerald-600"
                                  }
                                >
                                  {implementation.status === "revision" ? "Active · revision underway" : "Active"}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500" />
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Evidence icon={FileText} label={`${implementation._count.documents} documents`} />
                            <Evidence icon={Map} label={`${implementation._count.mappingRecommendations} mappings`} />
                            <Evidence icon={TestTube2} label={`${implementation._count.testScenarios} tests`} />
                            {implementation.status === "revision" && (
                              <Evidence icon={RefreshCw} label="Revision request active" tone="amber" />
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Evidence({
  icon: Icon,
  label,
  tone = "slate",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: "slate" | "amber";
}) {
  return (
    <span
      className={
        tone === "amber"
          ? "inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700"
          : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
