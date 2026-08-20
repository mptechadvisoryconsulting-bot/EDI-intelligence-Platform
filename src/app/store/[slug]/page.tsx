import { notFound } from "next/navigation";
import { loadPublishedStorefront } from "@/lib/business/storefront-read";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const storefront = await loadPublishedStorefront(slug);
  if (!storefront) notFound();

  const visible = new Set(storefront.sections.map((section) => section.type));
  const surface = storefront.theme.surface === "dark" ? "bg-slate-950 text-slate-100" : "bg-white text-slate-950";
  const muted = storefront.theme.surface === "dark" ? "text-slate-300" : "text-slate-600";

  return (
    <main className={`min-h-screen ${surface}`}>
      <header className="border-b border-current/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">{storefront.account.name}</p>
            <p className={`text-xs capitalize ${muted}`}>{storefront.account.businessType}</p>
          </div>
          <nav aria-label="Storefront navigation" className={`flex gap-4 text-sm ${muted}`}>
            <a href="#catalog">Products & services</a>
            <a href="#contact">Contact</a>
            <a href="#policies">Policies</a>
          </nav>
        </div>
      </header>

      {visible.has("hero") && (
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <p className={`mb-3 text-sm font-medium uppercase tracking-[0.18em] ${muted}`}>Official storefront</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">{storefront.account.name}</h1>
          <p className={`mt-5 max-w-2xl text-lg ${muted}`}>
            Browse available products and services. Online electronic payment is not enabled; requests are handled directly by the business.
          </p>
        </section>
      )}

      {(visible.has("catalog") || visible.has("featured")) && (
        <section id="catalog" className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Products & services</h2>
            <p className={`mt-1 text-sm ${muted}`}>Current offerings published from the business catalog.</p>
          </div>
          {storefront.catalog.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {storefront.catalog.map((item) => (
                <article key={item.id} className="rounded-2xl border border-current/10 p-5">
                  <p className={`text-xs font-medium uppercase tracking-wider ${muted}`}>{item.kind}</p>
                  <h3 className="mt-2 text-lg font-semibold">{item.name}</h3>
                  {item.description && <p className={`mt-2 text-sm ${muted}`}>{item.description}</p>}
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <p className="font-semibold">
                      {money(item.unitPriceMinor)}{item.unitLabel ? <span className={`text-sm font-normal ${muted}`}> / {item.unitLabel}</span> : null}
                    </p>
                    {item.sku && <p className={`text-xs ${muted}`}>SKU {item.sku}</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className={`rounded-xl border border-current/10 p-5 ${muted}`}>No public catalog items are currently available.</p>
          )}
        </section>
      )}

      {visible.has("process") && (
        <section className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {["Choose an offering", "Contact the business", "Confirm service or order details"].map((label, index) => (
              <div key={label} className="rounded-2xl border border-current/10 p-5">
                <p className={`text-sm ${muted}`}>Step {index + 1}</p>
                <p className="mt-2 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible.has("faq") && (
        <section className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
          <p className={`mt-3 ${muted}`}>Contact the business for availability, fulfillment, scheduling, and payment details.</p>
        </section>
      )}

      {visible.has("contact") && (
        <section id="contact" className="mx-auto max-w-6xl px-6 py-12">
          <div className="rounded-2xl border border-current/10 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">Contact & order requests</h2>
            <p className={`mt-2 max-w-2xl ${muted}`}>
              Contact {storefront.account.name} directly to request an order or service. This storefront does not collect electronic payments.
            </p>
          </div>
        </section>
      )}

      {visible.has("policies") && (
        <footer id="policies" className="mt-10 border-t border-current/10 px-6 py-8">
          <div className={`mx-auto max-w-6xl text-sm ${muted}`}>
            <p>Business policies, fulfillment terms, returns, and service conditions are confirmed directly with {storefront.account.name}.</p>
            <p className="mt-2 text-xs">Published storefront version {storefront.versionNumber}.</p>
          </div>
        </footer>
      )}
    </main>
  );
}
