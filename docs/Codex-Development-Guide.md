# Codex Development Guide

## Governing Instruction

Follow the documentation in `/docs`. Do not deviate from the documented architecture or workflow without recording an Architecture Decision Record.

## Product Identity

This application manages the complete EDI implementation lifecycle. Mapping is one module within the platform.

## Protected Capabilities

Do not replace or redesign the specification parser, ERP layout module, sample output verification, mapping recommendation engine, EDI comparison engine, test scenario support, translator exports, authentication, theme, or navigation style unless a requirement explicitly authorizes the change.

## Engineering Rules

1. Build one vertical slice at a time.
2. Prefer additive migrations and compatibility adapters.
3. Reuse existing components and services.
4. Use Customer as the root entity for new lifecycle features.
5. Do not create a project before technical assessment and business approval.
6. Route status changes through a centralized workflow service.
7. Enforce authorization server-side.
8. Record audit events in the same transaction as material changes.
9. Preserve version history; do not overwrite approved or production records.
10. Add tests for permissions, transitions, migration, and failure paths.
11. Read the installed Next.js 16 documentation under `node_modules/next/dist/docs/` before changing framework APIs.
12. Never commit secrets or production credentials.

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

