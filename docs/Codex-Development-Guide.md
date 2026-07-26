# Codex Development Guide

## Governing Instruction

Follow the documentation in `/docs`. `/docs/Architectural-Refactor-Specification.md` is the authority for all new domain work. Do not deviate from the documented architecture or workflow without recording an Architecture Decision Record.

## Product Identity

This application is an EDI Engineering Platform used by Business, EDI, QA, and Management to implement and maintain Trading Partner Transactions. It is not a mapper or a generic project management system.

A Trading Partner is the long-lived external-party container. A Trading Partner Transaction is the permanent aggregate for one partner, transaction, direction, and business stream. Requirements, assessment, mapping, validation, testing, production, revisions, documents, and activity belong to that aggregate.

## Protected Capabilities

Do not replace or redesign the specification parser, ERP layout module, sample output verification, mapping recommendation engine, EDI comparison engine, test scenario support, translator exports, authentication, theme, or navigation style unless a requirement explicitly authorizes the change.

## Engineering Rules

1. Build one vertical slice at a time.
2. Prefer additive migrations and compatibility adapters.
3. Reuse existing components and services.
4. Use Customer as the container and Implementation as the operational entity.
5. Model one Implementation per customer transaction and direction.
6. Do not create an Implementation before technical assessment and business approval.
7. Do not use Project in new user-facing language.
8. Treat Mapping as living, versioned data owned by an Implementation.
9. Route status changes through a centralized workflow service.
10. Enforce authorization server-side.
11. Record timeline and audit events in the same transaction as material changes.
12. Preserve version history; do not overwrite approved or production records.
13. Add tests for permissions, transitions, migration, and failure paths.
14. Read the installed Next.js 16 documentation under `node_modules/next/dist/docs/` before changing framework APIs.
15. Never commit secrets or production credentials.
16. Treat a customer specification as structured requirements, not merely an attachment.
17. Identify requirements by transaction, loop path, parent, segment, element, and qualifier.
18. Keep customer requirements independent from ERP, source interface format, and translator.
19. Begin mapping from an analyst-reviewed requirement and a normalized interface field.
20. Keep deployed and revision-in-progress implementations in the Live Trading Partners registry.
21. Create revisions against the existing implementation; never duplicate a live trading partner.
22. Keep the reusable Interface Library in Configuration and customer lifecycle work in Operations.
23. Model one versioned Transaction Interface Definition per internal transaction standard and allow many implementations to reference it.
24. Compare internal record structure to customer loop structure before field-level matching.
25. Preserve the legacy account ERP layout only as a compatibility fallback; do not make new features depend on it.
26. Treat `ImplementationProject` and `/api/projects` as migration-only legacy adapters.
27. Do not create new user-facing Project concepts or Project-owned domain artifacts.
28. New customer guides for an existing transaction create Transaction Revisions.
29. New APIs use Trading Partner Transaction identifiers and domain commands.
30. Follow the implementation order and acceptance gates in the Architectural Refactor Specification.

## Required Change Plan

Before implementing a module, state:

- Requirement IDs addressed
- Existing files reused
- Schema changes
- Migration and rollback approach
- Permissions
- Audit events
- API changes
- UI states
- Test plan

## Release Gate

Do not deploy to production until database migration, build, automated tests, authorization tests, security checks, and smoke tests pass in a preview environment.

