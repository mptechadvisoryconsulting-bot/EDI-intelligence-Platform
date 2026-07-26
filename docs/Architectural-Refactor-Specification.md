# EDI Engineering Platform

## Architectural Refactor Specification

**Version:** 1.0  
**Status:** Governing target architecture  
**Date:** July 26, 2026  
**Authority:** This specification governs the refactor from the legacy project-centered implementation to the permanent Trading Partner Transaction domain.

---

> **The application is no longer a project management application.**
>
> **The application is an EDI Engineering Platform.**
>
> Engineers do not work on projects. They work on permanent Trading Partner Transactions such as Walmart 850, Target 856, and Costco 810. Every screen, workflow, API, and database model must reflect this mental model.

## 1. Objective

Refactor the platform from a project-centric architecture to a Trading Partner Transaction-centric architecture that models how an EDI department actually operates.

The refactor must:

- Preserve the existing specification parser, requirement extraction, Interface Library, mapping, comparison, testing, production, revision, and translator-export capabilities.
- Replace the temporary project mental model with a permanent transaction workspace.
- Make the Trading Partner Transaction the aggregate root for engineering work.
- Separate reusable company configuration from customer operations.
- Store specifications, requirements, mappings, tests, deployments, and revisions as structured, versioned records.
- Migrate existing production data without destructive replacement or loss of history.

This is a domain-driven refactor. Renaming a page, adding a tab, or changing navigation without changing aggregate ownership does not satisfy this specification.

## 2. Architectural Principles

### AR-001 — Permanent operational identity

One Trading Partner Transaction represents one trading partner, transaction set, direction, and business stream.

Example:

```text
Company
└── Walmart
    ├── 850 Purchase Order — inbound
    ├── 856 Advance Ship Notice — outbound
    └── 810 Invoice — outbound
```

The record remains permanent from initial specification receipt through production and every future revision.

### AR-002 — No new projects

New customer work never creates a generic Project. It creates or reopens a Trading Partner Transaction.

- A new transaction creates a new Trading Partner Transaction.
- A new guide for an existing transaction creates a Transaction Revision.
- Testing corrections, customer changes, ERP changes, and mapping defects remain revisions of the same transaction.

### AR-003 — Aggregate ownership

The Trading Partner Transaction owns:

- Engineering Workspace
- Implementation Guides
- Requirement Sets
- Technical Assessments
- Interface assignments
- Mapping versions
- Validation runs
- Test plans and executions
- Go-live decisions
- Production deployments
- Revision history
- Documents
- Activity and audit history

No operational artifact may be orphaned or owned only by a generic project identifier.

### AR-004 — Configuration is separate from operations

Reusable definitions belong to Configuration:

- Interface Library
- Interface Definition Versions
- Code Lists
- Transformation Rules
- Validation Rules
- Templates
- Translator profiles

Customer-specific work belongs to Operations:

- Trading Partners
- Trading Partner Transactions
- Engineering Queue
- Production
- Revisions

### AR-005 — Structured data is authoritative

PDFs, spreadsheets, emails, and generated documents are evidence or outputs. They are not the authoritative domain model.

The authoritative records are structured:

- Requirement
- Interface Field
- Mapping Rule
- Validation Finding
- Test Execution
- Deployment
- Revision

### AR-006 — Versioned production truth

Approved and production versions are immutable. Corrections occur in a new revision.

The platform must always answer:

1. What is live?
2. Which specification version produced it?
3. Which interface definition was used?
4. Which mapping rules are active?
5. Which tests approved it?
6. Who approved and deployed it?
7. What changed from the prior version?

## 3. Core Domain

### 3.1 Canonical hierarchy

```text
Company
└── Trading Partner
    └── Trading Partner Transaction
        ├── Current Production Version
        ├── Engineering Workspace
        └── Transaction Revisions
```

### 3.2 Aggregate definitions

#### Company

The tenant or operating organization. It owns users, configuration, trading partners, interface definitions, security policy, and reporting scope.

#### Trading Partner

The durable customer or external partner identity.

Required attributes:

- Name
- Legal or display name
- Partner identifiers
- Contacts
- Connectivity profile
- Status
- Industry
- Notes
- Created and archived metadata

#### Trading Partner Transaction

The primary operational aggregate.

Required identity:

- Company
- Trading Partner
- Transaction code
- Direction
- Business stream when parallel implementations are required

Required attributes:

- Transaction code and name
- Direction
- Lifecycle state
- Engineering owner
- Business owner
- Assigned Interface Definition Version
- Current production revision
- Requested and target dates
- Risk
- Created and updated metadata

Uniqueness:

```text
Company + Trading Partner + Transaction Code + Direction + Business Stream
```

#### Transaction Revision

A versioned unit of change within a Trading Partner Transaction.

Required attributes:

- Revision number
- Reason for change
- Source request
- Base revision
- Lifecycle state
- Specification version
- Requirement-set version
- Mapping version
- Test evidence
- Approval evidence
- Deployment record
- Effective date
- Change summary

Revision examples:

```text
1.0  Initial implementation
1.1  Customer added Header REF
1.2  PO1 item logic update
2.0  Customer guide major revision
2.1  Testing correction
```

#### Engineering Workspace

The permanent operational view of one Trading Partner Transaction. It is a projection over the aggregate, not a separate generic project object.

## 4. Transaction Workspace

Every Trading Partner Transaction has the following permanent workspace:

1. Overview
2. Implementation Guide
3. Requirements
4. Technical Assessment
5. Internal Interface
6. Mapping
7. Validation
8. Testing
9. Go Live
10. Production
11. Revision History
12. Documents
13. Activity

### Workspace rules

- The partner, transaction, direction, lifecycle state, current revision, and production revision remain visible on every tab.
- The workspace URL uses a transaction identifier, not a project identifier.
- Every tab reads and writes artifacts owned by the Trading Partner Transaction or selected revision.
- Revision context is explicit. Users can never unknowingly edit a production version.
- Production history remains readable while a new revision is in progress.
- Deep links identify the transaction, revision, and tab.

Target route:

```text
/trading-partners/{partnerId}/transactions/{transactionId}
/trading-partners/{partnerId}/transactions/{transactionId}?revision=2.1&tab=mapping
```

## 5. Interface Library

The Interface Library is reusable company knowledge.

```text
Interface Library
├── 850 Purchase Order
├── 855 Purchase Order Acknowledgment
├── 856 Advance Ship Notice
├── 810 Invoice
└── 846 Inventory
```

Each Interface Definition Version contains:

- Transaction type
- Version
- Layout type
- Record hierarchy
- Fields
- Positions or structured references
- Data types
- Cardinality
- Validation rules
- Repeating records
- Source-system metadata
- Effective and retired dates

Supported layout types:

- Fixed width
- Delimited or CSV
- XML
- JSON
- SQL
- API
- Custom normalized source

One Interface Definition Version may be referenced by many Trading Partner Transactions. The exact assigned version is retained for every assessment, mapping version, and deployment.

Legacy account-wide ERP layouts remain compatibility inputs during migration only. New domain services must resolve transaction-specific Interface Definition Versions.

## 6. Specification Processing

Uploading an implementation guide starts a deterministic processing pipeline:

```text
Upload
  ↓
Detect Transaction
  ↓
Parse Hierarchy
  ↓
Normalize Requirements
  ↓
Analyst Review
  ↓
Approve Requirement Set
  ↓
Engineering Analysis
```

The parser must extract:

- Transaction
- Loop path
- Parent loop
- Segment
- Element
- Qualifier
- Usage
- Conditions
- Data type
- Format
- Cardinality
- Repeat rules
- Customer business rules
- Source evidence

Requirement identity includes:

```text
Transaction + Loop Path + Parent + Segment + Element + Qualifier
```

Repeated segments in different contexts must never be collapsed.

An analyst may correct parsed data. Every correction records actor, timestamp, previous value, new value, and reason.

## 7. Engineering Analysis

Engineering Analysis occurs after requirement normalization and before business commitment or mapping.

The analysis compares two structured models:

```text
Customer Requirement Model
            ↓
Structural Comparison
            ↓
Internal Interface Model
            ↓
Field and Rule Comparison
```

Required outputs:

- Structural matches and mismatches
- Existing interface-field matches
- Missing internal fields
- New or changed customer requirements
- Reusable mapping rules
- Suggested mappings
- Required transformations
- ERP or source-system changes
- Validation gaps
- Complexity
- Estimated effort category
- Risks
- Customer clarification questions
- Recommendation

This output becomes the Technical Assessment. AI may propose findings, but an EDI Analyst must disposition them.

## 8. Mapping Domain

A Mapping connects:

```text
Approved Customer Requirement
        ↓
Internal Interface Field
        ↓
Transformation and Conditions
        ↓
Validation
        ↓
EDI Output
```

Mappings are structured, versioned domain records.

Required Mapping Rule fields:

- Requirement identifier
- Interface Definition Version
- Interface Field identifier
- Source reference
- Transformation
- Condition
- Qualifier logic
- Code-list translation
- Validation rules
- Example input and output
- Confidence
- Analyst disposition
- Revision introduced
- Revision retired

Mapping documents, translator workbooks, validation reports, and test cases are generated outputs from the structured mapping model.

## 9. Lifecycle State Machine

Canonical lifecycle:

```text
Specification Received
        ↓
Analysis
        ↓
Technical Assessment
        ↓
Waiting Business Approval
        ↓
Mapping
        ↓
Validation
        ↓
Internal Testing
        ↓
Customer Testing
        ↓
Ready for Go Live
        ↓
Go Live Approval
        ↓
Scheduled
        ↓
Production
        ↓
Revision
```

Additional states:

- Waiting on Customer
- Waiting on ERP
- On Hold
- Rejected
- Cancelled
- Retired
- Rolled Back

All transitions use a centralized workflow service.

Each transition defines:

- Allowed source states
- Required permission
- Preconditions
- Required evidence
- Side effects
- Timeline event
- Audit event
- Notification
- Failure response

Direct status mutation through generic update APIs is prohibited.

## 10. Go Live and Production

### Go Live

Go Live is a controlled gate, not a date field.

Required evidence:

- Approved requirement set
- Approved mapping version
- Validation passed
- Required tests passed
- Customer approval when required
- Production plan
- Rollback plan
- Production approval

### Production

Production is a projection of live Trading Partner Transactions.

Production displays:

- Trading Partner
- Transaction
- Direction
- Current production revision
- Go-live date
- Status
- Production documents
- Production mapping
- Test evidence
- Deployment history
- Open revision

The existing “Live Trading Partners” concept becomes the Production bounded context and route.

## 11. Revision Model

A new guide for an existing transaction creates a Transaction Revision.

Revision workflow:

```text
Revision Request
  ↓
Specification Version
  ↓
Requirement Difference Analysis
  ↓
Technical Assessment
  ↓
Approval
  ↓
Mapping Changes
  ↓
Validation and Testing
  ↓
Go Live
  ↓
New Production Revision
```

Rules:

- The Trading Partner Transaction is never duplicated.
- The prior production revision remains immutable and readable.
- A revision identifies its base revision.
- Added, changed, and removed requirements are recorded explicitly.
- Mapping, validation, and testing differences are traceable to requirement changes.
- Rollback selects a prior deployable revision; it does not overwrite history.

## 12. Navigation and Experience

Target navigation:

### Operations

- Dashboard
- Trading Partners
- Engineering Queue
- Production
- Reports

### Configuration

- Interface Library
- Code Lists
- Transformations
- Templates
- Administration

Remove “Projects” from user-facing navigation and terminology.

### Engineering Queue

The queue is a work projection, not another task database.

Queues:

- Specifications to Process
- Technical Reviews
- Waiting Business Approval
- Needs Mapping
- Validation Failures
- Internal Testing
- Customer Testing
- Ready for Go Live
- Production Changes
- Revision Requests
- Waiting on Customer
- Waiting on ERP

Queue membership is derived from transaction and revision state, ownership, blockers, and dates.

## 13. Target Data Model

Core entities:

- Company
- User
- Role
- Permission
- TradingPartner
- TradingPartnerIdentifier
- TradingPartnerContact
- TradingPartnerTransaction
- TransactionRevision
- TransactionAssignment
- ImplementationGuide
- SpecificationVersion
- RequirementSet
- Requirement
- RequirementReview
- TechnicalAssessment
- AssessmentFinding
- Risk
- InterfaceDefinition
- InterfaceDefinitionVersion
- InterfaceRecord
- InterfaceField
- Mapping
- MappingVersion
- MappingRule
- ValidationRun
- ValidationFinding
- TestPlan
- TestScenario
- TestExecution
- GoLiveApproval
- ProductionDeployment
- Document
- Comment
- TimelineEvent
- AuditEvent
- Notification

Relationship summary:

```text
Company
  1 ── * TradingPartner
  1 ── * InterfaceDefinition

TradingPartner
  1 ── * TradingPartnerTransaction

TradingPartnerTransaction
  1 ── * TransactionRevision
  1 ── 1 Mapping
  * ── 1 InterfaceDefinitionVersion

TransactionRevision
  1 ── 1 SpecificationVersion
  1 ── 1 RequirementSet
  1 ── 1 MappingVersion
  1 ── * ValidationRun
  1 ── * TestExecution
  0 ── 1 ProductionDeployment

RequirementSet
  1 ── * Requirement

MappingVersion
  1 ── * MappingRule

MappingRule
  * ── 1 Requirement
  * ── 1 InterfaceField
```

## 14. API Architecture

New APIs use domain terminology:

```text
/api/trading-partners
/api/trading-partners/{partnerId}
/api/trading-partners/{partnerId}/transactions

/api/trading-partner-transactions/{transactionId}
/api/trading-partner-transactions/{transactionId}/workspace
/api/trading-partner-transactions/{transactionId}/requirements
/api/trading-partner-transactions/{transactionId}/assessment
/api/trading-partner-transactions/{transactionId}/mapping
/api/trading-partner-transactions/{transactionId}/validation-runs
/api/trading-partner-transactions/{transactionId}/tests
/api/trading-partner-transactions/{transactionId}/go-live
/api/trading-partner-transactions/{transactionId}/production
/api/trading-partner-transactions/{transactionId}/revisions
/api/trading-partner-transactions/{transactionId}/timeline

/api/engineering-queue
/api/production
/api/interface-definitions
```

API rules:

- Commands represent workflow transitions.
- Generic status mutation is prohibited.
- Authorization is enforced server-side.
- Material commands write audit and timeline records transactionally.
- Critical commands accept idempotency keys.
- Version edits use concurrency tokens.
- Error envelopes are consistent.
- Legacy routes are adapters only.

## 15. Legacy Compatibility

`ImplementationProject` and `/api/projects` are legacy implementation details.

During migration:

- Existing records remain readable.
- A compatibility mapping links each legacy record to a Trading Partner Transaction.
- Existing features may temporarily resolve through an adapter.
- New UI and APIs never expose Project terminology.
- New domain records become authoritative before legacy removal.
- No production artifact is deleted during the refactor.

The compatibility layer must have a documented removal gate. It must not become permanent architecture.

## 16. Migration Strategy

### Phase 0 — Architecture freeze

- Approve this specification.
- Inventory every Project table, route, component, service, and report.
- Map each legacy field and relationship to the target domain.
- Add Architecture Decision Records for deviations.

### Phase 1 — Additive domain foundation

- Add Company, TradingPartner, TradingPartnerTransaction, and TransactionRevision.
- Add stable legacy-link identifiers.
- Add uniqueness and ownership constraints.
- Backfill Trading Partners from existing customer and trading-partner values.
- Split multi-transaction legacy records into one transaction aggregate per transaction code.
- Create revision 1.0 from current state.

### Phase 2 — Dual-read and dual-write

- Introduce repositories and domain services.
- Write new transactions to the new model.
- Mirror required values to legacy storage only through an adapter.
- Compare record counts and content continuously.

### Phase 3 — Experience cutover

- Replace Project navigation with Trading Partners, Engineering Queue, and Production.
- Move the permanent workspace to transaction routes.
- Adapt parser, requirements, mapping, testing, and exports to transaction identifiers.
- Redirect legacy Project URLs.

### Phase 4 — Domain cutover

- Make TradingPartnerTransaction authoritative.
- Stop new writes to legacy Project fields.
- Run reconciliation and production verification.
- Retain read-only compatibility for an approved period.

### Phase 5 — Legacy retirement

- Remove Project terminology, routes, repositories, and schema only after:
  - Zero unmatched records
  - Zero unlinked artifacts
  - Approved rollback snapshot
  - Production smoke tests
  - Product-owner approval

## 17. Migration Invariants

The migration must prove:

- Every legacy project maps to at least one Trading Partner Transaction.
- Every existing document, mapping, test, approval, artifact, and production event remains linked.
- Multi-transaction legacy records are split with lineage retained.
- Production versions remain immutable.
- Existing IDs remain resolvable through redirects or adapter lookup.
- Record counts and checksums are logged before and after migration.
- Re-running a migration is idempotent.
- A failed migration can be rolled back without deleting the source data.

## 18. Security and Permissions

Permissions are domain actions:

- Create Trading Partner
- Create Trading Partner Transaction
- Upload Implementation Guide
- Review Requirements
- Complete Technical Assessment
- Edit Mapping
- Approve Mapping
- Execute Tests
- Approve Go Live
- Deploy Production
- Open Revision
- Retire Transaction
- Manage Interface Library
- View Audit History

Permissions are scoped by Company and optionally by Trading Partner or assigned transaction.

Business approval and production approval support separation of duties.

## 19. Observability

Required telemetry:

- Specification processing duration and failures
- Requirement-review duration
- Assessment cycle time
- Mapping completeness
- Validation failures
- Test pass rate
- Go-live lead time
- Deployment outcome
- Revision frequency
- Legacy-adapter usage
- Migration reconciliation failures

Every workflow command emits structured logs with company, partner, transaction, revision, actor, outcome, and correlation ID.

## 20. Refactor Acceptance Criteria

The architectural refactor is complete only when:

1. Project is absent from user-facing navigation and normal workflow language.
2. Trading Partner Transaction is the aggregate root used by new APIs and repositories.
3. Every transaction has a permanent workspace with all thirteen required areas.
4. A new customer guide for an existing transaction creates a revision, not another project or transaction.
5. Requirements remain structured and context-aware.
6. Mappings connect Requirement to Interface Field as structured data.
7. Interface Definition Versions are reusable across trading partners.
8. Engineering Analysis compares structure before fields.
9. Engineering Queue is derived from lifecycle state and blockers.
10. Production shows current version, deployment evidence, maps, documents, and revision history.
11. Workflow transitions use command services with permission and evidence gates.
12. Existing production data and capabilities remain operational.
13. Legacy Project routes are adapters or redirects with measured usage.
14. Migration reconciliation reports zero missing or orphaned artifacts.
15. Automated migration, permission, transition, API, and failure-path tests pass.
16. Preview migration, production migration, rollback rehearsal, and smoke tests pass.

## 21. Explicit Non-Solutions

The following do not satisfy this refactor:

- Renaming Project to Transaction only in labels.
- Adding more tabs to the current project page.
- Creating a TradingPartner table while artifacts remain owned only by Project.
- Keeping new APIs under `/api/projects`.
- Creating a new project for each revision.
- Treating parsed requirements as unversioned JSON attachments.
- Treating mapping workbooks as the authoritative mapping.
- Building a manually maintained Engineering Queue table.
- Deleting legacy data before reconciliation and rollback approval.

## 22. Required Implementation Order

Codex and engineering teams must implement in this order:

1. Domain entities and invariants
2. Additive migration and reconciliation
3. Repositories and workflow commands
4. Trading Partner and Transaction APIs
5. Permanent Transaction Workspace
6. Requirements and assessment ownership
7. Mapping, validation, and testing ownership
8. Go Live, Production, and revisions
9. Engineering Queue and reports
10. Legacy route retirement

No feature slice may add new dependency on the legacy Project model.

## 23. Codex Instruction

Every implementation request must begin with:

> Follow `/docs/Architectural-Refactor-Specification.md`. The Trading Partner Transaction is the aggregate root. Do not add new user-facing Project concepts, Project-owned domain artifacts, or generic status mutation. Preserve existing capabilities through adapters while moving ownership to the target domain.

Before changing code, Codex must identify:

- Target requirements from this specification
- Aggregate affected
- Legacy dependencies touched
- Additive schema changes
- Backfill and rollback behavior
- Authorization
- Workflow transition
- Audit and timeline behavior
- Tests
- Compatibility-removal impact

