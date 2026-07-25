# Codex Development Guide

## Governing Instruction

Follow the documentation in `/docs`. Do not deviate from the documented architecture or workflow without recording an Architecture Decision Record.

## Product Identity

This application is the operational system used by Business, EDI, QA, and Management to implement and maintain EDI trading partners. It is not a mapper or a generic project management system.

A Customer is the long-lived container. An Implementation is the operational object for one customer transaction and direction. Mapping, validation, testing, production, revisions, documents, and activity belong to that Implementation.

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

