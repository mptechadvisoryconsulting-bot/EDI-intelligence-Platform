# MP Business 2.0/3.0 implementation guardrails

Approved scope: adaptive multi-format intake, tenant-isolated KPI configuration, ERP-grounded EDI mapping/spec proposals, customizable storefront/catalog/order-request workflows, customers/orders/invoices, print/PDF/export, canonical synchronization, audit/versioning, and enterprise-grade usability.

## Explicit hold
Stripe onboarding and live electronic payment activation are out of scope until separately approved. Do not expose live card entry, bank linking, Connect onboarding, or a misleading Pay Now flow.

## Delivery gates
1. Tenant isolation and authorization before new business domains.
2. Canonical IDs, source lineage, idempotency, audit and conflict handling before cross-module sync.
3. Imports propose changes; users review/confirm before publishing or destructive writes.
4. Storefront configuration uses sanitized structured themes with Draft/Preview/Publish and rollback; no arbitrary executable customer HTML/JS.
5. ERP positional facts come from the configured ERP layout; partner EDI requirements come from the partner guide; production samples corroborate. Conflicts are surfaced and low-confidence mappings require review.
6. Finalized invoices retain immutable/versioned business-data and rendering snapshots.
7. Each PR must pass lint/type/build/tests and preview verification before merge. Production remains untouched until the full approved non-Stripe phase is complete and ready for owner test.
