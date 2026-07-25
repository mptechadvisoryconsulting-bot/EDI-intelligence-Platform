# EDI Implementation Lifecycle Platform

## Product Requirements Document

**Version:** 1.0  
**Status:** Baseline for engineering  
**Date:** July 25, 2026  
**Product owner:** MP Tech Advisory Consulting  
**System of record:** This document and the supporting files in `/docs`

---

## 1. Executive Summary

The EDI Intelligence Platform will evolve from an implementation workspace into an EDI Implementation Lifecycle Management Platform. The platform will manage the complete customer relationship from the first specification received through technical assessment, business approval, implementation, testing, production, and every future change request.

The primary business object is **Customer**. A project is created only after a request has passed technical assessment and business approval. Initial implementations and later changes use the same governed lifecycle, retain permanent history, and produce comparable operational data.

The platform is not an EDI translator and is not only a mapping tool. Mapping, validation, comparison, and translator export remain important modules within a larger system of record.

## 2. Product Vision

Create the authoritative record for every EDI customer decision, artifact, version, test, deployment, and change from specification intake through long-term maintenance.

The product must answer four questions at any time:

1. What has the customer requested?
2. What did the technical team determine?
3. What did the business approve, and why?
4. What is running in production now, and how did it get there?

## 3. Business Problem

EDI implementations are commonly coordinated across email, spreadsheets, ticketing systems, shared drives, translator configuration, and individual analyst knowledge. This fragmentation creates recurring problems:

- Work begins before technical scope is understood.
- Business commitments are made without objective impact analysis.
- Customer clarifications and approval decisions are difficult to reconstruct.
- Initial implementations and maintenance changes are tracked differently.
- Estimates cannot be compared with actual delivery performance.
- Production versions are not reliably connected to specifications, mappings, and tests.
- Institutional knowledge leaves when an analyst changes roles.

The platform will centralize these records and enforce stage gates without replacing translator-specific execution tools.

## 4. Goals

### 4.1 Primary goals

- Make Customer the top-level entity.
- Separate pre-approval intake and assessment from approved implementation work.
- Provide repeatable, evidence-based technical assessments.
- Require business approval before creating implementation projects.
- Preserve complete customer, project, version, testing, and production history.
- Apply the same controlled workflow to initial implementations and change requests.
- Reuse the existing specification parser, ERP layout, mapping, comparison, testing, and export capabilities.
- Generate measurable lifecycle data for management reporting.
- Maintain a complete, immutable audit history of material actions.

### 4.2 Success outcomes

- No mapping project is created without a recorded approval or authorized exception.
- Every production deployment is traceable to an approved request, version, test evidence, and approver.
- Business users can understand scope, complexity, impact, risk, and recommendation without reading an implementation guide.
- Analysts can find all specifications, decisions, mappings, tests, and deployments for a customer in one place.
- Management can compare estimated and actual duration and effort by customer, transaction, ERP, complexity, and reason for change.

## 5. Non-Goals

Version 1 does not attempt to:

- Replace IBM Sterling, Cleo, Boomi, OpenText, or other translators.
- Transmit production EDI documents.
- Replace ERP master data or ERP development tooling.
- Provide a customer-facing portal unless separately approved.
- Automatically approve work or deploy mappings without human authorization.
- Rewrite existing parser, mapping recommendation, EDI comparison, ERP layout, sample verification, authentication, theme, or translator export capabilities.

## 6. Product Principles

1. **Customer first:** all implementations and future changes belong to a customer.
2. **Assess before committing:** technical review precedes business approval and project creation.
3. **Evidence over opinion:** decisions cite specifications, findings, assumptions, and interface impact.
4. **One lifecycle:** initial implementation and maintenance changes use governed, comparable workflows.
5. **Version everything:** specifications, mappings, interfaces, tests, and production deployments are version-aware.
6. **Audit every material action:** actors, timestamps, before/after values, comments, and transition reasons are recorded.
7. **Human approval for commitments:** AI assists analysis but does not silently approve scope, timelines, or production.
8. **Additive evolution:** existing capabilities are reused and migrated without destructive redesign.

## 7. Personas and Roles

### 7.1 Business Analyst

Creates customer requests, manages customer and contact data, uploads intake documents, supplies requested timelines, responds to clarification requests, and submits work for approval. May not modify mapping rules or approve production.

### 7.2 EDI Analyst

Performs technical assessment, records findings, evaluates interface impact, creates and reviews mappings, prepares tests, manages customer testing evidence, and recommends readiness. May not provide final business or production approval unless explicitly granted a separate role.

### 7.3 QA Analyst

Creates or executes test scenarios, records evidence, manages defects, and approves or rejects testing gates. May not edit approved mappings without reopening the applicable review.

### 7.4 Business Manager

Approves, rejects, delays, or requests more information for intake requests. Reviews scope, complexity, estimates, risks, missing information, and technical recommendations.

### 7.5 Production Approver

Authorizes production deployment after required evidence and signoffs are complete. This role may be held by a manager but remains a distinct permission.

### 7.6 Administrator

Manages users, roles, permissions, reference values, workflow configuration, retention rules, integrations, and system settings. Administrative access does not imply authority to approve business or production work.

### 7.7 Executive or Auditor

Has read-only access to dashboards, customer history, decision records, metrics, and audit logs within assigned organizational scope.

## 8. Authorization Model

The system will use role-based access control with optional customer or business-unit scope.

Material actions require explicit permissions:

- `customer.create`, `customer.update`, `customer.archive`
- `intake.create`, `intake.submit`, `intake.cancel`
- `assessment.assign`, `assessment.edit`, `assessment.complete`, `assessment.reopen`
- `business_approval.decide`
- `project.create_from_approval`, `project.manage`
- `mapping.edit`, `mapping.review`
- `test.execute`, `test.approve`
- `production.request`, `production.approve`, `production.record`
- `change_request.create`, `change_request.approve`
- `audit.view`, `report.view`, `admin.manage`

The application must enforce authorization server-side. UI hiding alone is not sufficient.

## 9. Core Domain Model

### 9.1 Customer

Customer is the top-level record and owns:

- Profile and identifiers
- Contacts
- Trading partner and communication settings
- ERP and internal interface assignments
- Transactions
- Intake requests
- Implementation projects
- Change requests
- Specifications and attachments
- Versions
- Test and production history
- Timeline
- Comments
- Audit events

### 9.2 Request

A request represents work proposed by the business or customer before a project exists. Types include:

- Initial implementation
- New transaction set
- Customer specification revision
- Existing mapping change
- ERP-driven change
- Compliance or regulatory change
- Defect correction
- Decommission

### 9.3 Technical Assessment

The structured assessment describes scope, feasibility, complexity, interface impact, findings, effort category, risks, missing information, expected duration, and recommendation.

### 9.4 Project

A project is an approved body of implementation work. It references the originating request and approved assessment snapshot. Existing `ImplementationProject` records will be migrated into this concept without losing current data.

### 9.5 Version

A version is the governed configuration outcome of an initial project or change request. It connects the exact specification set, interface version, mappings, test evidence, approvals, and deployment.

### 9.6 Change Request

A change request is a new request attached to an active customer and optionally to a current production version. It must include a required reason for change and follows intake, assessment, approval, implementation, testing, and production stages.

## 10. End-to-End Lifecycle

The lifecycle is:

`Customer Request -> Specification Intake -> Technical Assessment -> Business Approval -> Project Creation -> Mapping -> Validation -> Internal Testing -> Customer Testing -> Production Approval -> Go Live -> Maintenance -> Change Requests`

Every stage must:

- Have an explicit status.
- Record the responsible actor and assignment.
- Record entry and completion timestamps.
- Support comments and attachments.
- Create audit events.
- Enforce transition rules.
- Expose age and service-level indicators.

## 11. Specification Intake

### 11.1 Purpose

Capture the request and supporting evidence before technical or business commitment.

### 11.2 Required intake fields

- Customer
- Request title
- Request type
- Requesting business unit
- Business owner
- Customer contact
- Requested go-live date
- Business priority
- Business justification
- Requested transactions
- Direction for each transaction: inbound or outbound
- Known EDI version
- Known translator or connectivity changes
- Initial notes

### 11.3 Intake uploads

- Customer implementation guide or specification
- Transaction list
- Sample EDI files
- Test scenarios
- Customer questionnaire
- Label specifications
- Code lists
- Timeline or onboarding plan
- Supporting email or decision record

### 11.4 Intake statuses

- Draft
- New Request
- Pending Technical Review
- Technical Review In Progress
- Waiting on Customer Information
- Assessment Complete
- Waiting Business Approval
- Approved
- Rejected
- Delayed
- Cancelled

### 11.5 Intake rules

- A request may be saved as draft with incomplete data.
- Submission requires Customer, request type, requested transactions, business owner, requested date, and at least one specification or documented exception.
- Submission creates a timeline and audit event.
- Submitted intake documents are versioned; replacement never destroys the prior file.
- No implementation project is created at intake submission.

## 12. Technical Assessment

### 12.1 Purpose

Answer what the organization is committing to before implementation begins.

### 12.2 Scope classification

- New customer
- Existing customer update
- New transaction
- Specification revision
- New connectivity
- ERP-driven change
- Compliance update
- Defect correction

### 12.3 Transaction assessment

For each transaction, record:

- Transaction code and name
- Direction
- EDI version
- Required, optional, or informational
- Current support status
- Reusable mapping candidate
- Specification delta summary
- Interface coverage
- Complexity
- Open questions

### 12.4 Complexity

Allowed overall values are Low, Medium, and High. Complexity is calculated from a configurable rubric and may be overridden with a required explanation.

Rubric inputs include:

- Number and novelty of transactions
- New segments, loops, qualifiers, and code lists
- New required data
- Transformations and conditional business rules
- Interface coverage
- ERP development
- Label or document changes
- Connectivity changes
- Customer testing requirements
- External dependencies
- Historical performance for similar work

### 12.5 Interface impact

Each assessment selects one or more:

- Existing Interface
- Minor Interface Changes
- New Interface Required
- ERP Changes Required
- Translator Configuration Only
- Connectivity Changes Required
- Unknown - clarification required

The assessment records affected interface, version, missing fields, field-level coverage, new record types, and downstream owners.

### 12.6 Findings

Findings use typed categories:

- New required field
- Removed field
- New segment
- Removed segment
- New loop
- Changed loop
- New qualifier
- Custom code list
- Business rule change
- Label change
- Connectivity change
- ERP gap
- Ambiguity
- Reuse opportunity

Every finding records source document, page or section where available, transaction, severity, disposition, owner, and resolution status.

### 12.7 Estimated effort

Version 1 uses categorical estimates:

- Mapping: None, Low, Medium, High
- Testing: None, Low, Medium, High
- ERP: None, Low, Medium, High
- Connectivity: None, Low, Medium, High
- Customer coordination: None, Low, Medium, High
- Overall: Low, Medium, High

The analyst also records estimated duration range, assumptions, dependencies, confidence, and earliest feasible start. Numeric hours may be added later without replacing historical categories.

### 12.8 Risks

Risks record category, description, probability, impact, severity, mitigation, owner, due date, and status.

### 12.9 Recommendation

Exactly one recommendation is required:

- Ready to Implement
- Needs ERP Development
- Waiting on Customer Clarification
- Needs Additional Scope Review
- Recommend Rejecting

Completion requires transaction assessments, complexity, interface impact, effort, risks, open questions, recommendation, and analyst attestation.

## 13. Automated Impact Analysis

### 13.1 Objective

Compare customer requirements with the selected internal interface and known reusable mappings to produce objective assessment evidence.

### 13.2 Required outputs

- Count of customer-required fields
- Count of interface-covered fields
- Count of missing interface fields
- Count of reusable mappings
- Count of new fields, loops, segments, qualifiers, and code lists
- New record types required
- Estimated mapping completeness percentage
- Confidence and evidence coverage
- Unresolved ambiguities
- Suggested complexity with rationale

### 13.3 Guardrails

- Generated results are recommendations, not approvals.
- Every generated finding must link to supporting source content when possible.
- Analysts can accept, edit, or reject findings.
- Overrides require a reason and are audited.
- Low-confidence output must be visibly labeled.
- Raw customer content is not sent to an external model unless configured and permitted.

## 14. Business Review and Approval

### 14.1 Business review summary

Business users see:

- Customer and request
- Requested go-live
- Transactions
- Overall complexity
- Estimated duration
- Effort categories
- Interface and ERP impact
- Risk count and severity
- Missing information
- Dependencies
- Technical recommendation
- Analyst comments
- Comparable historical implementations when available

### 14.2 Decisions

- Approve
- Reject
- Request More Information
- Delay

### 14.3 Approval rules

- The approver cannot alter the completed technical assessment.
- Request More Information reopens the assessment or intake with a reason and assigned owner.
- Approve records the approved scope snapshot and authorizes project creation.
- Reject requires a reason.
- Delay requires reason and review date.
- Decisions record actor, role, timestamp, comments, and assessment version.
- Self-approval is prohibited where separation-of-duties policy is enabled.

## 15. Project Creation

An approved request creates a project through a controlled command, not arbitrary manual duplication.

The new project inherits:

- Customer
- Request
- Approved assessment snapshot
- Approved transaction scope
- Target date
- Interface assignment
- ERP context
- Documents
- Risks
- Assumptions
- Open questions
- Business and technical owners

Project creation must be idempotent: one approval cannot accidentally create multiple projects.

## 16. Project Workflow

Project states are:

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
- Closed
- Maintenance
- On Hold
- Cancelled

Project transitions must use a workflow service that validates permissions, prerequisites, and current state. Direct unvalidated status writes are prohibited.

## 17. Mapping Module

The existing parser, recommendation engine, mapping workspace, positional data, review actions, and translator exports are preserved.

Enhancements:

- Attach mappings to a customer, project, transaction, and version.
- Maintain immutable approved mapping revisions.
- Record mapping rule history and reviewers.
- Connect mapping rules to requirements and assessment findings.
- Distinguish reused, modified, and new mappings.
- Support constants, code translations, conditions, calculations, and lookup dependencies.
- Track completion and review by transaction.
- Prevent production readiness when required mappings are unresolved.

## 18. Validation Module

Validation will evaluate:

- Required-field coverage
- Qualifier and code-list validity
- Segment and loop constraints
- Interface position completeness
- Transformation configuration
- Cross-field business rules
- Mapping review status
- Specification-to-mapping traceability

Every run stores engine version, inputs, results, actor, timestamp, and disposition.

## 19. Testing Module

### 19.1 Test artifacts

- Test plan
- Test scenarios
- Test cases
- Input files
- Expected outputs
- Actual outputs
- EDI comparison results
- 997 or acknowledgement evidence
- Customer rejection or acceptance
- Defects
- Retest evidence
- Signoff

### 19.2 Test stages

- Unit or mapping validation
- Internal integration testing
- QA testing
- Customer testing
- Regression testing
- Production smoke test

### 19.3 Rules

- Every required transaction has approved test coverage.
- Failed tests block production unless a documented waiver is approved.
- Evidence is retained and version-linked.
- Customer communication may be logged as an event and attachment.
- Existing EDI compare and test scenario capabilities are reused.

## 20. Production Module

Production readiness requires:

- Approved scope
- Completed mappings
- Validation passed
- Required test scenarios passed
- Customer signoff where required
- Open high-severity defects resolved or waived
- Rollback plan
- Deployment plan
- Production approver authorization

Deployment records include scheduled and actual date, environment, deployed version, translator target, deployment owner, validation result, rollback status, incident links, and final outcome.

Go-live creates a production version and moves the customer relationship to active maintenance. Closing the project does not archive the customer.

## 21. Change Request Module

### 21.1 Required reason for change

Every change request must select one:

- Customer implementation guide update
- New transaction set
- ERP enhancement
- Mapping defect
- Customer business process change
- Internal business process change
- Compliance or regulatory update
- Connectivity change
- Performance improvement
- Decommission
- Other, with explanation

### 21.2 Workflow

`Customer Requests Update -> Business Intake -> EDI Technical Review -> Business Approval -> Version Created -> Mapping Updates -> Testing -> Production -> Version Closed`

### 21.3 Change request rules

- The current production version remains identifiable.
- The request identifies the proposed base version.
- Approved scope creates a new version draft.
- Unrelated changes should not be bundled without documented scope review.
- Emergency changes use an expedited workflow but require retrospective assessment and approval.
- Every production version links to one or more approved requests.

## 22. Version Management

Version numbers follow a configurable major/minor policy.

- Initial implementation begins at 1.0 unless migrated from an existing production version.
- Major versions represent material specification, interface, or process changes.
- Minor versions represent backward-compatible or limited mapping changes.
- Version state: Draft, In Development, In Testing, Approved, Scheduled, Production, Superseded, Rolled Back, Retired.
- Only one version per customer and implementation stream may be current in production unless parallel production is explicitly enabled.
- Production versions are immutable; corrections create a new version.

## 23. Customer 360 and Timeline

The customer page includes:

- Profile summary
- Current lifecycle status
- Current production version
- Transactions
- Contacts
- Interfaces and ERP assignments
- Active work
- Pending decisions
- Risks
- Projects
- Change requests
- Documents
- Testing
- Production
- Metrics
- Complete timeline

Timeline events include creation, assignment, uploads, assessment changes, findings, questions, approvals, mapping milestones, tests, customer responses, deployments, incidents, and version changes. Users can filter by event type, project, transaction, version, and date.

## 24. Dashboards

### 24.1 Business dashboard

- New requests
- Pending technical reviews
- Waiting business approval
- Requests waiting on customer
- Delayed requests
- Upcoming target dates
- Risks requiring business action

### 24.2 EDI dashboard

- My assigned assessments
- My implementation work
- Mapping review queue
- Open technical questions
- Customer testing
- Production candidates
- Aging work and SLA breaches

### 24.3 QA dashboard

- Tests ready to execute
- Failed tests
- Retests
- Coverage gaps
- Awaiting signoff

### 24.4 Management dashboard

- Active customers
- Open projects
- Pending assessments
- Pending approvals
- Go-lives this month
- Average intake, review, development, and testing duration
- Estimate accuracy
- Change requests per customer
- Work by reason for change
- High-risk work
- Production success rate

## 25. Reporting and Analytics

Reports must support filtering and export. Minimum reports:

- Estimated versus actual duration and effort
- Cycle time by stage
- Customer complexity distribution
- Transaction implementation duration
- ERP impact and delay
- Interface gap frequency
- Change reason trends
- Rework and defect trends
- Customer-specific maintenance volume
- Approval turnaround
- Production outcome
- Analyst workload
- SLA compliance

Historical metrics must use stored snapshots so later edits do not rewrite prior decisions.

## 26. Notifications

Configurable in-app and email notifications include:

- Assignment
- Intake submitted
- Assessment due or overdue
- Customer clarification requested
- Assessment completed
- Approval requested
- Decision recorded
- Target date risk
- Test failure
- Customer testing response
- Production approval requested
- Deployment scheduled or completed
- Change request created

Notifications must be deduplicated, auditable, and respect user preferences.

## 27. Search

Global search includes customer, request, project, change request, transaction, version, specification, finding, mapping field, test, and deployment. Results respect authorization scope and provide direct links to the governing record.

## 28. Documents and Attachments

- Files are stored outside the relational database with secure references.
- Metadata includes checksum, size, MIME type, uploader, source, created date, and document version.
- Replacement creates a new version.
- Files may be attached to multiple contextual records through explicit links.
- Malware scanning and file-type validation are required for production.
- Retention and deletion follow configured policy and legal holds.
- Sensitive content is not exposed through public URLs.

## 29. Audit and Compliance

The audit log is append-only at the application layer and records:

- Actor and effective role
- Action
- Entity type and identifier
- Timestamp
- Request or correlation identifier
- Before and after values for material changes
- Transition reason
- Source IP and user agent where allowed
- Automation or AI origin

Audit records cannot be edited through normal application APIs. Administrators may export but not rewrite audit history.

## 30. Security Requirements

- Secure, server-side session validation
- Strong production secret management
- Role and scope enforcement on every protected API
- CSRF protection appropriate to the authentication design
- Rate limiting for authentication and expensive analysis endpoints
- Secure upload validation and storage
- Encryption in transit and at rest
- No secrets in source control, logs, exports, or client bundles
- Security headers and restrictive content policy
- Dependency and secret scanning in CI
- Backup, recovery, and credential rotation procedures
- Separation of duties for business and production approvals
- Tenant isolation if multi-organization support is introduced

## 31. Nonfunctional Requirements

### 31.1 Availability and recovery

- Target availability: 99.9% after production launch.
- Defined recovery point and recovery time objectives before customer production data is stored.
- Database backups are tested through restoration exercises.

### 31.2 Performance

- Standard authenticated pages should return usable content within two seconds at the 95th percentile under expected load.
- Queue or background-process document parsing and AI analysis that may exceed request limits.
- Paginate high-volume lists and timelines.

### 31.3 Accessibility

- Conform to WCAG 2.2 AA for core workflows.
- All actions are keyboard accessible.
- Status is never conveyed by color alone.
- Forms provide labels, error summaries, and focus management.

### 31.4 Observability

- Structured logs with correlation IDs
- Error tracking
- Health checks
- Background job monitoring
- Audit of external model and integration calls
- Business telemetry for stage transitions and durations

## 32. API Principles

- Version API contracts.
- Validate request bodies with a shared schema system.
- Return consistent error structures.
- Use idempotency keys for project creation, approvals, and deployments.
- Use optimistic concurrency or version checks for critical edits.
- Enforce permission and ownership in a shared authorization layer.
- Record audit events in the same transaction as material state changes.
- Do not permit arbitrary status updates; expose transition commands.

## 33. Data Migration

The migration from the existing project-centric schema will be additive:

1. Create Customer records from distinct existing customer values.
2. Link existing projects to customers while retaining the legacy customer text during transition.
3. Create imported or legacy request records for existing projects.
4. Mark current approval records as legacy package approvals.
5. Preserve documents, mappings, questions, assumptions, artifacts, messages, and tests.
6. Introduce version records and associate existing projects with a baseline version.
7. Validate counts, ownership, and referential integrity before removing any legacy field.

No production data is deleted as part of the initial migration.

## 34. Existing Capabilities to Preserve

The following current modules are protected unless a later requirement explicitly changes them:

- Customer specification parser
- ERP layout module
- Sample output position verification
- Mapping recommendation engine
- Mapping workspace and review
- Partner and project reuse suggestions
- EDI comparison engine
- Test scenario support
- IBM Sterling MRS export
- Cleo, Boomi, and OpenText export
- Existing authentication behavior during the migration
- Existing theme and navigation style

They may be wrapped by new lifecycle navigation and authorization but should not be rewritten without a dedicated design decision.

## 35. Current-State Gap Summary

The July 2026 codebase contains project workspaces, documents, mapping recommendations, questions, assumptions, generated artifacts, approval records, copilot messages, test scenarios, ERP layout profiles, readiness evaluation, and translator exports.

Key gaps:

- Customer is stored as project text rather than a durable entity.
- A project is created before technical and business approval.
- Approval represents package readiness rather than pre-project business authorization.
- Status values are strings without a centralized workflow engine.
- Roles are minimally modeled and permissions are not expressed as capabilities.
- No structured intake, technical assessment, assessment findings, risk register, change request, version, customer timeline, production deployment, attachment link, notification, or immutable audit model exists.
- Existing records are primarily owner-scoped, which is insufficient for cross-functional collaboration.

## 36. Acceptance Criteria for Release 1

Release 1 is accepted when:

- Authorized users can create and manage Customer records.
- A business user can submit a specification intake without creating a project.
- An EDI analyst can complete a structured technical assessment.
- The system generates an impact analysis from the customer specification and internal interface where supported.
- A business manager can approve, reject, delay, or request information.
- Approval creates exactly one project linked to the customer, request, and assessment snapshot.
- Existing mapping and analysis functions operate within the approved project.
- Every material action creates an audit event.
- Existing project data is migrated without loss.
- Role and transition rules are covered by automated tests.
- The production build passes security, migration, and smoke-test gates.

## 37. Delivery Roadmap

### Phase A - Foundation

- Documentation baseline
- Customer model
- Roles and authorization
- Audit event framework
- Shared workflow service
- Migration tooling

### Phase B - Pre-Project Lifecycle

- Intake
- Document versioning
- Technical assessment
- Impact analysis
- Business approval
- Controlled project creation

### Phase C - Govern Existing Implementation

- Project status transitions
- Version-aware mappings
- Validation and test gates
- Customer testing evidence
- Production approval and deployment

### Phase D - Maintenance

- Change requests
- Version management
- Customer timeline
- Maintenance analytics

### Phase E - Operational Intelligence

- Role-specific dashboards
- Estimate accuracy
- Cycle-time analytics
- Risk and change-reason reporting
- Historical recommendations

## 38. AI Capabilities

Near-term AI functions:

- Parse and classify specification content.
- Compare specification requirements with interface fields.
- Propose findings, gaps, reuse candidates, complexity, and questions.
- Summarize risk and business impact.
- Draft customer clarification messages.
- Suggest test scenarios.

Future functions:

- Estimate duration using historical outcomes.
- Detect specification changes between versions.
- Recommend reusable mappings across customers.
- Identify recurring ERP gaps and change patterns.
- Predict schedule and testing risk.

All AI output must retain model/version metadata, confidence, evidence links, and human disposition.

## 39. Open Product Decisions

The following decisions should be made before production implementation:

- Single organization versus multi-tenant SaaS architecture
- External file storage provider
- Email and notification provider
- Identity provider and SSO requirements
- Required retention period
- Required compliance attestations
- Approval separation-of-duties policy
- Version numbering policy
- SLA definitions by priority
- Whether customers receive portal access
- Whether emergency changes may deploy before retrospective approval

## 40. Definition of Done

A feature is complete only when:

- Requirements and acceptance criteria are implemented.
- Authorization is enforced server-side.
- Audit behavior is included.
- Empty, loading, error, and permission-denied states are designed.
- Unit and integration tests pass.
- Migration and rollback are documented.
- Accessibility checks pass.
- Observability is present.
- Documentation is updated.
- Production build and smoke tests pass.

## Appendix A - Canonical Status Sets

### Intake

Draft; New Request; Pending Technical Review; Technical Review In Progress; Waiting on Customer Information; Assessment Complete; Waiting Business Approval; Approved; Rejected; Delayed; Cancelled.

### Assessment

Not Started; Assigned; In Progress; Waiting for Information; Complete; Reopened; Superseded.

### Project

Approved; Assigned; Mapping; Validation; Internal Testing; Customer Testing; Ready for Production; Production Approval; Scheduled; Production; Closed; Maintenance; On Hold; Cancelled.

### Change Request

Draft; Submitted; Technical Review; Waiting Business Approval; Approved; In Development; Internal Testing; Customer Testing; Ready for Production; Scheduled; Production; Closed; Rejected; Cancelled.

### Version

Draft; In Development; In Testing; Approved; Scheduled; Production; Superseded; Rolled Back; Retired.

## Appendix B - Representative Transition Gates

### Intake to technical review

- Required intake fields complete
- At least one specification or approved exception
- Transactions identified
- Technical owner assigned

### Assessment to business approval

- Assessment complete
- Complexity and effort recorded
- Interface impact recorded
- Risks and open questions recorded
- Recommendation selected

### Approval to project creation

- Decision is Approve
- Assessment version is current
- Scope snapshot stored
- Project owner assignable
- Idempotency check passes

### Customer testing to production readiness

- Required customer scenarios completed
- Required acknowledgement evidence stored
- Blocking defects resolved
- Customer signoff recorded or waived

### Production approval to scheduled

- Deployment and rollback plans complete
- Required signoffs current
- Version immutable snapshot created
- Production approver authorizes deployment

## Appendix C - Representative Management Questions

- Which customers require the most custom work?
- Which transaction sets take longest to implement?
- How accurate are complexity and duration estimates?
- Which ERP systems generate the most interface changes?
- What proportion of work is new implementation versus maintenance?
- Which change reasons cause the most rework?
- Where does work spend the most time?
- Which customers have repeated specification updates?
- How often do production deployments require rollback?
- Which requirements are frequently missing from internal interfaces?

