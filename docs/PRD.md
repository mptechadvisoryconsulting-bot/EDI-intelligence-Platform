# EDI Implementation Platform

## Operations and Software Blueprint

**Version:** 2.0
**Status:** Production product baseline
**Date:** July 25, 2026  
**Product owner:** MP Tech Advisory Consulting  
**System of record:** This document and the supporting files in `/docs`

---

## 1. Platform Vision

### 1.1 Mission statement

The EDI Implementation Platform is designed to manage the complete lifecycle of a customer's EDI implementation—from the moment a customer submits an implementation guide, through technical assessment, business approval, mapping, testing, production deployment, and every future revision. The platform is not an EDI mapper or a project management system. It is the operational system used by Business Analysts, EDI Analysts, QA, and Management to implement and maintain EDI trading partners.

### 1.2 Product identity

The platform models how an EDI department works. It does not organize the work around generic software modules, files, or projects. It organizes the work around customer transaction implementations.

A customer is the long-lived business container. An **Implementation** is the operational object.

Examples:

- Target - 850 Purchase Order
- Target - 856 Advance Ship Notice
- Target - 810 Invoice
- Walmart - 850 Purchase Order

Each implementation has its own specification, assessment, mapping, validation, testing, production deployment, revisions, documents, activity, approvals, and history.

### 1.3 Product promise

At any time, the platform must answer:

1. What did the customer request?
2. What did EDI determine?
3. What did Business approve?
4. What is implemented for each transaction?
5. What is running in production?
6. What changed between versions?
7. Who approved each change?

### 1.4 Non-goals

The platform does not:

- Replace an EDI translator.
- Transmit production EDI documents.
- Replace an ERP.
- Act as a generic task or project management system.
- Treat mappings as uploaded documents.
- Automatically approve scope, customer commitments, or production deployment.
- Rewrite the existing specification parser, ERP layout, mapping, comparison, testing, authentication, theme, navigation, or translator export capabilities without an approved requirement.

## 2. How an EDI Analyst Works

This operating story is the design authority for the product:

1. A customer sends an implementation guide.
2. Business creates or selects the customer and records the request.
3. Business uploads the guide, samples, questionnaire, transaction list, and requested date.
4. EDI receives a technical-assessment assignment.
5. EDI reviews each requested transaction against the organization's interface.
6. EDI identifies supported fields, missing fields, transformations, ERP changes, risks, complexity, and questions.
7. EDI records a recommendation.
8. Business reviews the assessment rather than the raw specification.
9. Business approves, rejects, delays, or requests more information.
10. Approval creates one Implementation for each approved transaction.
11. The analyst opens the transaction workspace, such as Target - 850 Purchase Order.
12. The analyst builds and reviews one living mapping for that implementation.
13. Validation runs against the specification, interface, and mapping.
14. Internal and customer testing are executed and recorded.
15. Production is approved and deployed.
16. The implementation receives a production version and go-live record.
17. Six months later, the customer sends an updated guide.
18. Business records a revision request against the same implementation.
19. Assessment, approval, mapping changes, validation, testing, and deployment repeat.
20. The transaction workspace permanently shows the complete history.

Every screen, data relationship, workflow, and permission must support this story.

## 3. The Real Workflow

### 3.1 Department workflow

```text
Customer Sends Specification
        |
        v
Business Receives Request
        |
        v
EDI Technical Assessment
        |
        v
Business Reviews Assessment
        |
        v
Business Approval
        |
        v
Implementation Begins
        |
        v
Transaction Implementation
        |
        v
Validation and Testing
        |
        v
Production
        |
        v
Customer Revision Requests
        |
        v
Repeat on the Same Implementation
```

### 3.2 Governing rules

- No implementation is created before business approval, except an authorized legacy import.
- Each approved transaction becomes a separate implementation.
- A multi-transaction customer request may create several implementations.
- Mapping, validation, testing, production, and revisions belong to the implementation.
- Every material decision records actor, timestamp, comments, and evidence.
- Every implementation remains attached to its customer permanently.
- Revision work updates the same implementation and creates a new version.

## 4. Business Responsibilities

Business owns:

- Customer requests
- Customer communications
- Receiving specifications
- Customer contacts
- Requested timelines
- Business priority and justification
- Business approval
- Customer approvals
- Production approval
- Revision requests
- Business-facing status and escalation

Business does not own or edit:

- Mapping rules
- Technical transformations
- Interface field assignments
- Validation configuration
- Translator exports

Business may view technical artifacts and must receive a readable assessment summary before approval.

## 5. EDI Responsibilities

EDI owns:

- Technical assessment
- Interface review
- Customer specification review
- Transaction feasibility
- Mapping
- Transformation rules
- Validation
- Test scenarios
- Technical customer testing
- Translator handoff
- Production deployment execution
- Technical revision analysis

EDI recommends readiness but does not make the business commitment unless the user also holds the required Business Approver permission.

## 6. Operating Hierarchy

### 6.1 Canonical hierarchy

```text
Company
  |
  +-- Customer
        |
        +-- Implementation Request
        |     |
        |     +-- Requested Transaction: 850
        |     +-- Requested Transaction: 856
        |     +-- Requested Transaction: 810
        |
        +-- Implementation: 850 Purchase Order
        |     |
        |     +-- Customer Specification
        |     +-- Mapping
        |     +-- Validation
        |     +-- Testing
        |     +-- Production
        |     +-- Revision History
        |     +-- Documents
        |     +-- Activity
        |
        +-- Implementation: 856 Advance Ship Notice
        |
        +-- Implementation: 810 Invoice
```

### 6.2 Meaning of each level

**Company** represents the organization operating the platform.

**Customer** is the business and trading-partner container. It holds profile, contacts, connectivity, interface assignments, requests, implementations, and aggregate history.

**Implementation Request** is pre-approval work. It may contain one or more requested transactions.

**Requested Transaction** is the unit assessed and approved within a request.

**Implementation** is the long-lived operational record for one customer transaction and direction.

**Implementation Version** is an immutable approved or production state of the implementation.

### 6.3 Uniqueness

An implementation is uniquely identified by:

- Company
- Customer
- Transaction set
- Direction
- Implementation stream or business context when parallel implementations are required

## 7. Specification Intake

### 7.1 Purpose

Capture what the customer is asking for before technical work or business commitment.

### 7.2 Required information

- Customer
- Request title
- Request type
- Requested transactions and direction
- Business owner
- Customer contact
- Requested go-live date
- Priority
- Business justification
- EDI version when known
- Connectivity or translator change when known
- Reason for change for existing implementations

### 7.3 Required evidence

- Customer implementation guide or specification
- Transaction list
- Sample EDI when available
- Test scenarios when available
- Customer questionnaire
- Label requirements
- Code lists
- Supporting communication

### 7.4 Intake statuses

- Draft
- Submitted
- Pending Technical Assessment
- Technical Assessment In Progress
- Waiting on Customer Information
- Assessment Complete
- Waiting Business Approval
- Approved
- Rejected
- Delayed
- Cancelled

### 7.5 Rules

- Submission does not create an implementation.
- Replacement files create document versions.
- A request may contain several transactions.
- Each requested transaction receives its own assessment result.
- Existing production implementations must be linked when the request is a revision.

## 8. Technical Assessment

### 8.1 Purpose

The technical assessment tells Business what the organization would be committing to for every requested transaction.

### 8.2 Required answers per transaction

- Is this a new implementation or a revision?
- Can the current interface support the customer requirement?
- Which interface fields already exist?
- Which customer-required fields are missing?
- Which mappings can be reused?
- Which transformations are required?
- Are new ERP fields or record types required?
- Are connectivity or translator changes required?
- What clarifications are needed?
- What is the estimated complexity?
- What is the estimated effort?
- What are the risks and dependencies?
- What is EDI's recommendation?

### 8.3 Scope classification

- New customer transaction
- Existing implementation revision
- New transaction for an existing customer
- Specification revision
- ERP-driven change
- Connectivity change
- Compliance change
- Mapping defect correction
- Decommission

### 8.4 Interface impact

- Existing Interface
- Minor Interface Change
- New Interface Required
- ERP Changes Required
- Translator Configuration Only
- Connectivity Change Required
- Unknown - customer clarification required

### 8.5 Findings

Findings are structured records:

- New required field
- Removed field
- New segment
- Removed segment
- New or changed loop
- New qualifier
- Custom code list
- Business rule change
- Label change
- ERP gap
- Interface gap
- Connectivity change
- Ambiguity
- Reuse opportunity

Each finding records transaction, source document, source location, severity, disposition, owner, and status.

### 8.6 Complexity and effort

Complexity is Low, Medium, or High and uses a configurable rubric based on:

- Number and novelty of segments and loops
- Required fields and interface gaps
- Transformations and conditional rules
- ERP changes
- Connectivity changes
- Customer testing requirements
- External dependencies
- Reuse availability
- Historical outcomes for similar implementations

Effort categories:

- Mapping: None, Low, Medium, High
- Testing: None, Low, Medium, High
- ERP: None, Low, Medium, High
- Connectivity: None, Low, Medium, High
- Customer coordination: None, Low, Medium, High
- Overall: Low, Medium, High

### 8.7 Recommendation

Exactly one recommendation is required:

- Ready to Implement
- Needs ERP Development
- Waiting on Customer Clarification
- Needs Additional Scope Review
- Recommend Rejecting

## 9. Automated Impact Analysis

The platform compares the customer specification with the selected interface layout and approved mapping history.

Required output:

- Total customer-required fields
- Interface-supported fields
- Missing interface fields
- Reusable mapping candidates
- New segments, loops, qualifiers, and code lists
- Required transformations
- New record types
- ERP gaps
- Estimated mapping completeness
- Confidence and evidence coverage
- Suggested complexity with rationale
- Customer clarification questions

Generated findings are recommendations. Analysts accept, edit, or reject them. Overrides require a reason and create an audit event.

## 10. Business Review and Approval

### 10.1 Business review screen

Business sees:

- Customer and request
- Requested transactions
- Requested date
- New implementation or revision
- Overall and per-transaction complexity
- Estimated duration and effort
- Interface and ERP impact
- Risks
- Missing information
- Technical recommendation
- Analyst comments
- Comparable historical implementations when available

### 10.2 Decisions

- Approve
- Reject
- Request More Information
- Delay

### 10.3 Approval result

For a new transaction, approval creates exactly one implementation. For a revision request, approval creates a new draft version under the linked existing implementation rather than creating another implementation.

Both approval paths store an immutable snapshot of:

- Approved scope
- Assessment version
- Risks
- Assumptions
- Target date
- Assigned owners
- Approval comments
- Approver identity and timestamp

The commands are idempotent and cannot create duplicate implementations or duplicate revision versions.

## 11. Transaction Workspace

### 11.1 Purpose

The Transaction Workspace is the heart of the application and the primary daily screen for EDI Analysts.

Example:

```text
Target
850 Purchase Order
Current Version 2.4

Overview | Customer Specification | Mapping | Validation
Testing | Production | Revision History | Documents | Activity
```

### 11.2 Workspace tabs

**Overview**

- Status and owners
- Current production version
- Customer and transaction
- Requested and actual dates
- Readiness
- Open questions
- Risks
- Recent activity

**Customer Specification**

- Current specification
- Prior specification versions
- Parsed requirements
- Findings
- Change comparison
- Source navigation

**Mapping**

- One living implementation mapping
- Segment navigation
- Interface source
- Customer requirement
- Transformation
- Result
- Review and completion

**Validation**

- Requirement coverage
- Interface coverage
- Mapping completeness
- Code-list and qualifier checks
- Business-rule validation
- Validation history

**Testing**

- Test plan
- Scenarios
- Expected EDI
- Actual EDI
- Comparison results
- Defects and retests
- Customer approvals

**Production**

- Readiness
- Approval
- Deployment plan
- Rollback plan
- Go-live
- Production verification

**Revision History**

- Version list
- Change summary
- Approval
- Go-live date
- Comparison

**Documents**

- Specifications
- Samples
- Test evidence
- Approval evidence
- Production artifacts

**Activity**

- Complete implementation timeline
- Comments
- Assignments
- Status transitions
- Audit-relevant actions

### 11.3 Workspace acceptance criteria

- The analyst can reach every artifact for one transaction without leaving the workspace.
- The current version is always visible.
- The active tab is deep-linkable.
- Counts and readiness update after material actions.
- Permissions control edit actions without hiding readable history.
- Empty, loading, error, and permission-denied states are provided.

## 12. Mapping

### 12.1 Definition

A mapping is a living implementation artifact that connects the customer's specification to the organization's interface layout.

Mappings are structured data, not uploaded documents. From mapping data, the platform generates:

- Mapping document
- Validation report
- Test scenarios
- Expected EDI
- Translator export
- Change comparison

### 12.2 One implementation, one mapping

An implementation has one current mapping composed of versioned rules.

Example:

```text
850 Purchase Order Mapping

BEG
REF
N1
PO1
PID
CTT

Interface Layout -> Customer Requirement -> Transformation -> Result
```

The user does not manage separate mappings for each segment. Segments are sections within the same mapping.

### 12.3 Mapping rule fields

- Transaction
- Segment
- Element
- Loop context
- Requirement status
- Qualifier
- Source interface field
- Interface record and position
- Transformation type
- Transformation configuration
- Constant or code translation
- Condition
- Result example
- Confidence
- Rationale
- Review status
- Reviewer
- Version introduced
- Version retired

### 12.4 Mapping rules

- Approved production mapping versions are immutable.
- Mapping edits occur in a draft implementation version.
- Each rule is traceable to a specification requirement.
- Reused rules retain their source lineage.
- Required unresolved rules block readiness.
- One export generates the complete transaction mapping for the selected translator.

## 13. Validation

Validation evaluates:

- Required-field coverage
- Customer requirement traceability
- Interface-field coverage
- Segment and loop constraints
- Qualifier and code-list validity
- Conditional business rules
- Transformation configuration
- Positional interface completeness
- Mapping review status
- Example output conformance

Every validation run records input version, ruleset version, results, actor, timestamp, and disposition.

## 14. Testing

### 14.1 Test stages

- Mapping validation
- Internal integration testing
- QA testing
- Customer testing
- Regression testing
- Production smoke test

### 14.2 Test artifacts

- Test plan
- Test scenario
- Input file
- Expected output
- Actual output
- EDI comparison
- 997 or acknowledgement
- Defect
- Retest
- Customer response
- Signoff

### 14.3 Testing rules

- Every required transaction requirement has approved coverage.
- Failed tests block production unless an authorized waiver exists.
- Test evidence belongs to the implementation version.
- Customer acceptance is recorded with source evidence.
- Existing EDI comparison and test-scenario capabilities are reused.

## 15. Production

### 15.1 Production readiness

Required:

- Approved scope
- Completed mapping
- Validation passed
- Required tests passed
- Customer approval when required
- High-severity defects resolved or waived
- Deployment plan
- Rollback plan
- Production approval

### 15.2 Deployment record

- Implementation and version
- Environment
- Scheduled date
- Actual date
- Translator target
- Deployment owner
- Production approver
- Smoke-test result
- Rollback status
- Incident links
- Final outcome

Production creates an immutable version and sets it as current after verification.

## 16. Revisions

### 16.1 Principle

Revisions belong to the implementation, not to a generic project.

Example:

```text
Target
850 Purchase Order
Current Version 2.4

1.0  Initial Implementation
1.1  Customer Added REF
1.2  Updated PO1
2.0  New PID Rules
2.1  Testing Corrections
2.2  TD5 Update
2.3  SCAC Changes
2.4  Current
```

### 16.2 Version detail

Selecting any version shows:

- What changed
- Why it changed
- Who requested it
- Who assessed it
- Who approved it
- When it went live
- Specification version
- Mapping version
- Validation results
- Testing evidence
- Production record
- Documents

### 16.3 Required reason for change

- Customer implementation guide update
- New transaction requirement
- ERP enhancement
- Mapping defect
- Customer business process change
- Internal business process change
- Compliance or regulatory update
- Connectivity change
- Performance improvement
- Decommission
- Other with explanation

### 16.4 Revision workflow

```text
Customer Requests Revision
        |
        v
Business Intake
        |
        v
EDI Technical Assessment
        |
        v
Business Approval
        |
        v
Draft Version Created
        |
        v
Mapping Changes
        |
        v
Validation and Testing
        |
        v
Production
        |
        v
Version Closed
```

## 17. Timeline

Every implementation has a permanent, filterable timeline:

```text
Customer Sent Specification
Technical Assessment Started
Technical Assessment Completed
Business Approved
Implementation Created
Mapping Started
Validation Passed
Testing Started
Customer Passed
Production Approved
Go Live
Revision 1 Requested
Revision 1 Deployed
Revision 2 Requested
Revision 2 Deployed
```

Timeline events record type, actor, timestamp, implementation version, comments, attachments, and related entity.

## 18. Dashboards

### 18.1 Business dashboard

- Requests Waiting
- Technical Assessments
- Business Approvals
- Customer Clarifications
- Upcoming Go Lives
- Revision Requests
- Delayed Commitments

### 18.2 EDI dashboard

- My Technical Assessments
- My Implementations
- Mappings
- Validation Failures
- Testing
- Production
- Waiting on Customer
- Revision Queue

### 18.3 QA dashboard

- Ready for QA
- Failed Scenarios
- Retests
- Coverage Gaps
- Waiting for Signoff

### 18.4 Manager dashboard

- Average Assessment Time
- Average Implementation Time
- Stage Cycle Time
- Production Success
- Estimate Accuracy
- Customers Requiring Most Updates
- Transaction Sets Taking Longest
- ERP Systems Driving Most Changes
- Open Revisions

## 19. Screen Blueprint

### 19.1 Global navigation

Primary navigation:

- Dashboard
- Customers
- Requests
- Implementations
- Assessments
- Approvals
- Reports
- Administration

The existing Mapping, ERP Layout, Knowledge, comparison, and export capabilities remain accessible in their operational context.

### 19.2 Customer list

Displays customer, status, current implementations, open requests, open revisions, next go-live, risk, and last activity.

Acceptance criteria:

- Search by customer, partner identifier, transaction, and contact.
- Filter by active status, open work, risk, and ownership.
- Create Customer is permission-controlled.
- Archived customers remain discoverable to authorized users.

### 19.3 Customer 360

```text
Target
Active Customer

Overview | Implementations | Requests | Contacts
Documents | Production | Timeline | Metrics

Implementations
850 Purchase Order       Production  v2.4
856 Advance Ship Notice  Testing     v1.0
810 Invoice              Production  v1.3
```

### 19.4 Request intake

Uses a guided form:

1. Customer and request
2. Transactions
3. Timeline and business context
4. Documents
5. Review and submit

### 19.5 Technical assessment

Uses a transaction selector and repeated structured assessment:

```text
Request: Target 2027 EDI Onboarding

Transactions
[850] [856] [810]

850 Purchase Order
Support: Partial
Interface Coverage: 88%
Missing Fields: 2
Reusable Rules: 34
ERP Impact: None
Complexity: Medium
Recommendation: Ready to Implement
```

### 19.6 Business approval

Shows a decision summary, risks, missing information, and per-transaction recommendation. Raw technical detail is available but not required to understand the commitment.

### 19.7 Transaction workspace

The tab design in Chapter 11 is mandatory. Mapping does not replace the workspace.

### 19.8 Revision comparison

Side-by-side comparison:

- Specification requirements added, changed, removed
- Mapping rules added, changed, retired
- Validation changes
- Testing differences
- Approval and deployment metadata

### 19.9 Screen-wide acceptance rules

Every screen must provide:

- Page title and operational context
- Current status
- Owner
- Primary next action
- Permission-aware controls
- Activity or audit access
- Loading, empty, validation, error, and success states
- Keyboard operation and accessible labels
- Deep links

## 20. Workflow and State Model

### 20.1 Request states

- Draft
- Submitted
- Technical Assessment
- Waiting on Customer
- Assessment Complete
- Waiting Business Approval
- Approved
- Rejected
- Delayed
- Cancelled

### 20.2 Implementation states

- Approved
- Assigned
- Mapping
- Validation
- Internal Testing
- Customer Testing
- Ready for Production
- Production Approval
- Scheduled
- Production
- Maintenance
- On Hold
- Retired

### 20.3 Version states

- Draft
- In Development
- In Validation
- In Testing
- Approved
- Scheduled
- Production
- Superseded
- Rolled Back
- Retired

### 20.4 Transition service

All state changes pass through a centralized workflow service that:

- Confirms current state
- Confirms permission
- Confirms prerequisites
- Stores reason and comments
- Creates audit event
- Emits notification
- Executes related commands idempotently

Direct arbitrary status updates are prohibited.

## 21. Roles and Permissions

### 21.1 Roles

- Business Analyst
- EDI Analyst
- QA Analyst
- Business Approver
- Production Approver
- Manager
- Administrator
- Auditor

### 21.2 Permission matrix

Operational roles:

| Capability | Business | EDI | QA | Business Approver | Production Approver |
|---|---:|---:|---:|---:|---:|
| Create customer | Yes | View | View | View | View |
| Submit request | Yes | View | View | View | View |
| Complete assessment | View | Yes | View | View | View |
| Approve business scope | No | No | No | Yes | No |
| Edit mapping | No | Yes | No | View | View |
| Execute tests | View | Yes | Yes | View | View |
| Approve test gate | No | No | Yes | View | View |
| Approve production | No | No | No | No | Yes |
| Deploy production | No | Yes | No | No | Configurable |
| View audit history | Scoped | Scoped | Scoped | Scoped | Scoped |

Oversight roles:

| Capability | Manager | Administrator | Auditor |
|---|---:|---:|---:|
| Create customer | View | Yes | View |
| Submit request | View | Yes | View |
| Complete assessment | View | Configurable | View |
| Approve business scope | Configurable | Configurable | View |
| Edit mapping | View | Configurable | View |
| Execute tests | View | Configurable | View |
| Approve test gate | Configurable | Configurable | View |
| Approve production | Configurable | Configurable | View |
| Deploy production | Configurable | Configurable | View |
| View audit history | Company | Authorized | Authorized |

Permissions are enforced server-side. "Scoped" means records within the user's assigned customers and implementations. Managers may view audit history for their company; Administrators and Auditors may view all companies explicitly granted to them, with Auditor access remaining read-only. Separation of duties is configurable and enabled for business and production approval in controlled environments.

## 22. Database Blueprint

### 22.1 Core entities

- Company
- User
- Role
- Permission
- UserRole
- Customer
- CustomerContact
- CustomerIdentifier
- InterfaceProfile
- InterfaceVersion
- InterfaceField
- ImplementationRequest
- RequestedTransaction
- Specification
- SpecificationVersion
- TechnicalAssessment
- TransactionAssessment
- AssessmentFinding
- Risk
- Approval
- Implementation
- ImplementationVersion
- Mapping
- MappingVersion
- MappingRule
- ValidationRun
- ValidationFinding
- TestPlan
- TestScenario
- TestExecution
- Defect
- CustomerApproval
- ProductionDeployment
- RevisionRequest
- Comment
- Attachment
- TimelineEvent
- AuditEvent
- Notification

### 22.2 ERD

```text
Company
  1--* Customer
  1--* User

Customer
  1--* ImplementationRequest
  1--* Implementation
  1--* CustomerContact

ImplementationRequest
  1--* RequestedTransaction
  1--* TechnicalAssessment
  1--* Approval

RequestedTransaction
  0--1 Implementation
  1--1 TransactionAssessment

Implementation
  1--* ImplementationVersion
  1--1 Mapping
  1--* RevisionRequest
  1--* TimelineEvent

ImplementationVersion
  1--1 SpecificationVersion
  1--1 MappingVersion
  1--* ValidationRun
  1--* TestExecution
  0--1 ProductionDeployment

Mapping
  1--* MappingVersion

MappingVersion
  1--* MappingRule
```

### 22.3 Data rules

- Customer is a container; Implementation owns operational transaction history.
- One Implementation represents one transaction and direction.
- One Implementation owns one logical Mapping.
- MappingVersion and ImplementationVersion are aligned.
- Production versions are immutable.
- Documents use versioned metadata and secure object storage.
- Timeline events are user-readable.
- Audit events are append-only and system-oriented.

## 23. API Blueprint

### 23.1 Resource routes

```text
/api/customers
/api/customers/{customerId}
/api/customers/{customerId}/implementations
/api/requests
/api/requests/{requestId}
/api/requests/{requestId}/submit
/api/requests/{requestId}/assessment
/api/requests/{requestId}/approve
/api/implementations/{implementationId}
/api/implementations/{implementationId}/mapping
/api/implementations/{implementationId}/validation-runs
/api/implementations/{implementationId}/tests
/api/implementations/{implementationId}/production
/api/implementations/{implementationId}/revisions
/api/implementations/{implementationId}/timeline
```

### 23.2 API rules

- Version contracts.
- Validate bodies with shared schemas.
- Return consistent error envelopes.
- Enforce authorization and scope centrally.
- Use idempotency keys for approval, implementation creation, and deployment.
- Use concurrency tokens for critical edits.
- Create audit events in the same transaction as material changes.
- Expose commands for transitions rather than generic status mutation.

### 23.3 Legacy compatibility

Existing `/api/projects` routes and `ImplementationProject` storage may remain temporarily behind adapters. They are legacy implementation details and must not drive new product language or domain design.

## 24. Architecture Blueprint

### 24.1 Existing stack

- Next.js 16
- React 19
- Prisma 7
- SQLite locally
- Turso/libSQL in production
- JWT-based authentication
- Vercel deployment

### 24.2 Target layers

- Presentation: role-specific pages and transaction workspace
- Application: request, assessment, approval, implementation, mapping, testing, revision commands
- Domain: implementation lifecycle, versioning, transition rules
- Data: Prisma repositories and additive migrations
- Integration: storage, notifications, AI, translator exports
- Observability: logs, errors, metrics, audit

### 24.3 Existing capabilities to preserve

- Customer specification parser
- ERP layout module
- Sample output position verification
- Mapping recommendation engine
- Mapping workspace behavior
- EDI comparison engine
- Test scenario support
- Partner and prior-work reuse
- IBM Sterling MRS export
- Cleo, Boomi, and OpenText export
- Authentication during migration
- Existing visual theme

These capabilities are connected to the Implementation domain rather than rewritten.

## 25. Security and Operations

- Server-side session validation
- Role and scope enforcement for every protected endpoint
- Strong secret management
- Secure file validation and private storage
- Malware scanning for production uploads
- Encryption in transit and at rest
- Rate limiting for authentication and expensive analysis
- Security headers and content policy
- Dependency and secret scanning
- Backup and restore testing
- Credential rotation
- Separation of duties
- Structured logs with correlation identifiers
- Error tracking
- Health and background-job monitoring

Target availability is 99.9% after formal production launch. Recovery objectives and retention requirements must be approved before storing regulated or contractual customer records.

## 26. UI Standards

- Use the existing visual theme and design tokens.
- Use EDI department language: Customer, Request, Assessment, Implementation, Transaction, Mapping, Testing, Production, Revision.
- Do not expose the word Project in new user-facing interfaces.
- Do not use color as the only status signal.
- Meet WCAG 2.2 AA for core workflows.
- Keep the implementation identity and current version visible.
- Show one primary action per state.
- Use tables only for comparable operational records.
- Use tabs for stable implementation workspace areas.
- Use drawers or dialogs only for bounded edits.
- Preserve URLs for direct navigation.

## 27. Notifications

Notifications include:

- Request submitted
- Assessment assigned
- Assessment due or overdue
- Customer clarification requested
- Assessment complete
- Business approval requested
- Decision recorded
- Implementation assigned
- Validation failed
- Test failed
- Customer approved
- Production approval requested
- Deployment scheduled
- Deployment completed
- Revision requested

Notifications are deduplicated, auditable, preference-aware, and contain direct links.

## 28. Reporting

Minimum reports:

- Assessment cycle time
- Implementation cycle time
- Stage wait time
- Estimated versus actual duration
- Complexity accuracy
- Customer update frequency
- Revision reason
- Transaction duration
- ERP impact and delay
- Interface gap frequency
- Test failure and rework
- Approval turnaround
- Production success and rollback
- Analyst workload

Historical reports use stored snapshots so later edits do not rewrite past decisions.

## 29. AI Capabilities

Near-term:

- Parse specifications
- Compare specification versions
- Identify interface coverage and gaps
- Suggest assessment findings
- Suggest reusable mapping rules
- Draft clarification questions
- Suggest complexity and risks
- Generate test scenarios

Future:

- Estimate duration from historical implementations
- Predict testing and schedule risk
- Detect recurring customer and ERP patterns
- Recommend reusable transformations

AI output retains model version, confidence, evidence links, and human disposition. AI does not approve business scope or production.

## 30. Migration from the Current Application

### 30.1 Current gap

The existing database stores an `ImplementationProject` with customer and transaction strings. It already owns documents, mapping recommendations, questions, assumptions, artifacts, approvals, messages, and test scenarios.

### 30.2 Additive migration

1. Create Customer records from existing customer values.
2. Create one legacy Implementation for each existing project and transaction.
3. Split multi-transaction records into transaction implementations with documented lineage.
4. Preserve original identifiers in migration metadata.
5. Attach current documents, mappings, questions, assumptions, artifacts, and tests.
6. Create baseline ImplementationVersion records.
7. Reclassify current approvals as legacy package approvals.
8. Introduce adapters for existing `/projects` routes.
9. Validate record counts and relationships.
10. Remove legacy fields only in a later approved migration.

No existing production data is deleted.

## 31. Delivery Roadmap

### Phase A - Language and blueprint

- Adopt Implementation terminology
- Publish operations blueprint
- Update user-facing labels
- Preserve legacy internal compatibility

### Phase B - Domain foundation

- Customer model
- Implementation model
- Roles and permissions
- Timeline and audit
- Workflow service
- Additive migration

### Phase C - Pre-implementation lifecycle

- Request intake
- Technical assessment
- Impact analysis
- Business approval
- Controlled implementation creation

### Phase D - Transaction workspace

- Workspace shell and tabs
- Specification area
- One mapping model
- Validation history
- Testing evidence
- Production record

### Phase E - Revisions

- Revision requests
- Version management
- Version comparison
- Production history

### Phase F - Operational intelligence

- Role dashboards
- Estimate accuracy
- Cycle-time, customer, and ERP trend reports
- AI-assisted assessment

## 32. Release 1 Acceptance Criteria

Release 1 is complete when:

- The product uses Implementation instead of Project in user-facing language.
- Customer is the container for separate transaction implementations.
- Business can submit a request without creating an implementation.
- EDI can complete a structured assessment for each requested transaction.
- Business can approve each transaction.
- Approval creates exactly one implementation per approved transaction.
- The Transaction Workspace provides the required nine areas.
- Each implementation has one living, versioned mapping.
- Validation and testing belong to the implementation version.
- Production creates an immutable current version.
- Revision requests update the same implementation.
- Every material action appears in timeline and audit history.
- Existing parser, ERP layout, mapping, comparison, test, and export functions remain operational.
- Migration, permission, workflow, and failure paths have automated tests.
- Preview build, migration checks, security checks, and production smoke tests pass.

## 33. Definition of Done

A screen or capability is complete only when:

- Its operational purpose is documented.
- Acceptance criteria are implemented.
- Authorization is enforced server-side.
- Timeline and audit behavior are included.
- Loading, empty, error, success, and permission-denied states exist.
- Unit and integration tests pass.
- Accessibility checks pass.
- Observability is present.
- Migration and rollback are documented.
- The blueprint is updated.

## Appendix A - Transition Gates

### Request to assessment

- Required business fields complete
- Transactions identified
- Specification or approved exception present
- EDI owner assigned

### Assessment to business approval

- Every transaction assessed
- Interface impact recorded
- Complexity and effort recorded
- Risks and questions recorded
- Recommendation selected

### Approval to implementation creation

- Transaction approved
- Assessment version current
- Scope snapshot stored
- Owner assignable
- Idempotency check passed

### Customer testing to production readiness

- Required scenarios complete
- Customer evidence stored
- Blocking defects resolved or waived
- Mapping and validation versions aligned

### Production approval to deployment

- Deployment and rollback plans complete
- Required approvals current
- Immutable version snapshot created
- Production approver authorized

## Appendix B - Representative Management Questions

- Which customers require the most revisions?
- Which transaction sets take longest to implement?
- How accurate are assessment estimates?
- Which ERP systems cause the most interface changes?
- Where does implementation work wait the longest?
- Which change reasons cause the most rework?
- Which customers repeatedly change specifications?
- Which interface fields are most often missing?
- What percentage of deployments succeed without rollback?
- How much capacity is spent on new implementations versus revisions?
