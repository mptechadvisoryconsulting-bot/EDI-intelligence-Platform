import Link from "next/link";
import { requireAccountContext } from "@/lib/account-context";
import { db } from "@/lib/db";
import { validateStorefrontDraft } from "@/lib/business/storefront-service";

export default async function StorefrontControlCenterPage() {
  const account = await requireAccountContext();
  const storefront = await db.storefrontConfig.findFirst({
    where: { accountId: account.accountId },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 5 },
    },
  });

  if (!storefront) {
    return <div className="p-8 text-slate-200">Storefront configuration is unavailable.</div>;
  }

  let validationMessage = "Ready for preview";
  let valid = true;
  try {
    validateStorefrontDraft(storefront.themeContent, storefront.sectionContent);
  } catch (error) {
    valid = false;
    validationMessage = error instanceof Error ? error.message : "Storefront validation failed";
  }

  const catalogCount = await db.catalogItem.count({ where: { accountId: account.accountId, active: true } });
  const recentOrders = await db.businessOrder.count({ where: { accountId: account.accountId, source: "storefront" } });
  const isPublished = storefront.status === "published" && Boolean(storefront.publishedVersionNumber);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">Account capability</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">Storefront control center</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Governed storefront status, catalog readiness, published version history, and public preview for {account.accountName}.
          </p>
        </div>
        {isPublished ? (
          <Link
            href={`/store/${account.accountSlug}`}
            target="_blank"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            Open published storefront
          </Link>
        ) : (
          <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            Not public yet
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Status", storefront.status],
          ["Active catalog items", String(catalogCount)],
          ["Storefront orders", String(recentOrders)],
          ["Published version", storefront.publishedVersionNumber ? `v${storefront.publishedVersionNumber}` : "None"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-semibold capitalize text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Validation & publishing safety</h2>
            <p className="mt-1 text-sm text-slate-400">
              Draft changes remain separate from the published snapshot until an explicit publish action succeeds.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${valid ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
            {valid ? "Valid draft" : "Needs attention"}
          </span>
        </div>
        <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">{validationMessage}</p>
        <div className="mt-4 grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
          <p>Tenant-scoped catalog bindings</p>
          <p>No arbitrary executable HTML/JS</p>
          <p>No live electronic payment UI</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Version history</h2>
        <div className="mt-4 space-y-2">
          {storefront.versions.length ? storefront.versions.map((version) => (
            <div key={version.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-3 text-sm">
              <span className="font-medium text-slate-200">Version {version.versionNumber}</span>
              <span className="text-slate-500">{version.publishedAt ? version.publishedAt.toLocaleString() : version.state}</span>
            </div>
          )) : <p className="text-sm text-slate-500">No published versions yet.</p>}
        </div>
      </section>
    </div>
  );
}
