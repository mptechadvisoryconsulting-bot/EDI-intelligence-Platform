# Property media storage policy rollout

This slice defines the fail-closed contract that a future private object-storage adapter must satisfy before property evidence can be persisted or exposed.

## Required controls

- Property media object keys remain tenant-bound under `tenants/{tenantId}/property-evidence/`.
- Remote/public URLs and traversal-like object keys are rejected.
- Declared image MIME type must match content-sniffed MIME type and remain within the existing JPEG/PNG/WebP allowlist.
- Image size and SHA-256 identity remain bounded and deterministic.
- Privacy metadata handling must complete before persistence.
- Signed access is same-tenant only and short-lived (30 seconds to 15 minutes).
- This contract never uploads, signs, publishes, deletes, or makes a bucket public.

## Explicitly deferred

Before any production storage write path is introduced, separately review the exact provider/bucket configuration, encryption/private-access defaults, tenant authorization, signed-delivery implementation, malware/safety scan hook, thumbnail lineage, retention/deletion rules, audit events, rollback, and existing-data behavior. No production customer imagery may be used as a fixture.

This document does not authorize a database migration or storage-provider change by itself.
