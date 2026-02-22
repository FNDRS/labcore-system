# LabCore LIS — End-to-End Backend Integration Plan

**Date:** 2026-02-21  
**Input reference:** `docs/analysis/gap-analysis.md`  
**Goal:** Integrate real backend business logic end to end for frontend-ready screens, with phased delivery, strong architecture, and implementation standards.

---

## 1) Objectives and Principles

### Primary objectives

1. Replace mock data with production backend flows for all **frontend-ready** routes.
2. Align auth, data model, and status transitions with the operational lab workflow.
3. Build integration layers that are testable, composable, and maintainable.
4. Keep performance, accessibility, and observability as non-negotiable quality gates.

### Engineering principles

- **Backend-first contracts:** define schema, status machine, and API contracts before UI wiring.
- **Thin UI, rich domain layer:** keep business rules in domain/services, not in components.
- **Composition over boolean complexity:** explicit variants + compound components + provider-based state.
- **Server-driven data fetching:** avoid client waterfalls; parallelize independent requests.
- **Strict form handling:** React Hook Form + Zod + shadcn Field/Form patterns.
- **Incremental migration:** route-by-route replacement of mocks with kill switches and rollback options.

---

## 2) Current Readiness Snapshot

Based on `docs/analysis/gap-analysis.md`:

- **Ready to integrate now:** Reception, Technician dashboard + muestras + settings, Supervisor dashboard, Doctor dashboard.
- **Partially ready:** Technician process workspace shells.
- **Not ready (placeholder):** most Supervisor/Doctor detail pages and Admin.
- **Critical backend gaps:** missing auth groups (`doctor`, `recepcion`), missing model fields/statuses for order→sample→validation flow, no explicit audit model.

---

## 3) Target Architecture (Integration)

## 3.1 Layered design

1. **Amplify schema/auth layer** (`amplify/`)
   - Source of truth for entities, auth groups, and status enums.
2. **Domain/services layer** (`src/lib/**` or `src/server/**`)
   - Workflows: order intake, specimen generation, technician processing, validation.
   - Encodes invariants and allowed transitions.
3. **Repository/data-access layer**
   - Typed read/write adapters for Amplify APIs.
   - No UI-level direct data writes.
4. **UI application layer** (`src/app/**`)
   - Route orchestration, loading/error boundaries, optimistic UX where valid.
5. **Shared form + component patterns**
   - RHF/Zod forms, composable components, explicit variants over boolean prop sprawl.

## 3.2 Domain boundaries

- **Order Intake** (Reception): create/search order, map requested exams, generate specimens.
- **Specimen Lifecycle**: labeled → ready_for_lab → received → inprogress → completed/rejected.
- **Exam Lifecycle**: pending → inprogress → ready_for_validation → approved/rejected.
- **Validation** (Supervisor): approve/reject with traceability.
- **Clinical Review** (Doctor): consume validated results.
- **Settings/Profile**: role-specific preferences and station config.
- **Audit/Traceability**: append-only event records for critical workflow actions.

---

## 4) Cross-Cutting Standards (Must Apply in Every Phase)

### 4.1 Composition and component architecture

- Replace mode booleans with explicit subcomponents (`PendingQueue`, `UrgentQueue`, etc.).
- Use provider + context interfaces so state implementation is swappable.
- Lift shared state to route providers for sibling coordination (table/sheet/dialog/scan).
- Prefer children composition over render-prop proliferation.

### 4.2 React/Next performance and data patterns

- Start independent fetches early; `Promise.all` for parallel server data.
- Avoid nested client fetch waterfalls; keep initial data hydration server-first.
- Minimize serialized payloads to client components.
- Direct imports over broad barrel imports in hot paths.
- Use dynamic import for heavy, non-critical client widgets.

### 4.3 Form standards

- Every new/edit form uses **Zod schema + RHF `zodResolver`**.
- Use shadcn `FormField/FormItem/...` or `Controller + Field`.
- Add `aria-invalid` and error messaging consistently.
- Use `useFieldArray` for dynamic exam/value arrays.

### 4.4 Amplify workflow checkpoints

- Before backend implementation tasks, execute backend SOP: `retrieve_agent_sop('amplify-backend-implementation')`.
- Before frontend wiring tasks, execute frontend SOP: `retrieve_agent_sop('amplify-frontend-integration')`.
- Before release/deploy tasks, execute deployment SOP: `retrieve_agent_sop('amplify-deployment-guide')`.
- If SOP tool is unavailable in the active environment, document equivalent checklist in PR/task notes before proceeding.

---

## 5) Phased Implementation Plan

## Phase 0 — Foundation and Contracts (P0, blocker phase)

**Outcome:** backend model and auth are compatible with intended workflow.

### Tasks

1. **Auth groups alignment**
   - Add `doctor` and `recepcion` groups in `amplify/auth/resource.ts`.
   - Define route protection policy for `/recepcion` (remove demo bypass for production path).

2. **Schema lifecycle alignment**
   - Add `WorkOrder.requestedExamTypeCodes` (or `requestedExams` JSON).
   - Add `WorkOrder.referringDoctor`.
   - Extend `Sample.status`: `labeled`, `ready_for_lab`.
   - Extend `Exam.status`: `ready_for_validation`, `approved`, `rejected`.
   - Add `Exam.validatedBy`, `Exam.validatedAt`.

3. **Audit model**
   - Add `AuditEvent` model with: `entityType`, `entityId`, `action`, `userId`, `timestamp`, `metadata`.
   - Define canonical event names for order/specimen/exam/validation transitions.

4. **Authorization hardening**
   - Replace broad guest/authenticated access with role-appropriate rules per model.
   - Validate least-privilege access per route role.

5. **Type-safe contract publication**
   - Generate/update typed client contracts and status enums consumed by UI/domain services.

### Exit criteria

- Schema deployed in dev environment.
- Auth groups functional with role-based route access.
- End-to-end status transitions represent real flow without ad hoc UI-only states.
- Audit events can be written/read for at least one lifecycle path.

---

## Phase 1 — Reception End-to-End (P0)

**Outcome:** order intake and specimen generation run on real backend logic.

### Tasks

1. **Order query and filtering APIs**
   - Replace `INITIAL_ORDERS` usage with repository queries.
   - Support filters: today, urgent, no samples, ready.
   - Support search by patient/accession/order identifiers.

2. **Specimen generation workflow service**
   - Create service: read requested exams → map to specimen types → create samples atomically.
   - Enforce idempotency (prevent duplicate generation on retries/click spam).
   - Emit audit events: `SPECIMENS_GENERATED`, `LABEL_PRINTED`, `ORDER_READY_FOR_LAB`.

3. **Reception UI integration**
   - Wire order sheet and generation dialog to real mutation actions.
   - Keep scan overlay flow, backed by real lookup endpoint.
   - Add loading, retry, and conflict handling (already generated, stale status, not found).

4. **Form and composition conformance**
   - Any order creation/edit inputs use RHF+Zod.
   - Break large client modules into composed units (provider + table + sheet + dialogs).

### Exit criteria

- Reception queue no longer reads local mock constants.
- Generating specimens creates `Sample` records with valid statuses and audit trail.
- Ready-for-lab state is reflected in technician views.

---

## Phase 2 — Technician Dashboard + Muestras (P0)

**Outcome:** technician operational queue and sample lifecycle run on real data.

### Tasks

1. **Dashboard aggregation service**
   - Replace `MOCK_QUEUE`, `MOCK_NEXT_SAMPLE`, `MOCK_METRICS`.
   - Compute urgent/pending/in-progress metrics from backend in one aggregated call.
   - Start independent reads in parallel to avoid waterfalls.

2. **Muestras workstation integration**
   - Replace `MOCK_MUESTRAS` and sample detail mocks.
   - Implement status transition commands (`received`, `inprogress`, `completed`, `rejected`) with guard rules.
   - Track assignment/ownership strategy (use optional `assignedToId` if adopted).

3. **Scan-first operations**
   - Barcode lookup endpoint/service with fast-path response.
   - Reprint label and report-problem actions as first-class mutations with audit.

4. **State architecture refactor**
   - Introduce workstation provider as single source of queue/filter/sheet state.
   - Replace boolean mode flags with explicit components for queue variants.

### Exit criteria

- Dashboard and muestras run fully against backend.
- Status transitions validated and auditable.
- Queue filters and scan flows perform within target latency.

---

## Phase 3 — Technician Process Workspace (P1)

**Outcome:** lab result capture workflow is fully implemented and connected.

### Tasks

1. **Complete UI from shell state**
   - Build exam result form(s) from `ExamType.fieldSchema`.
   - Include analyte value, units, notes, reference-range/flag support as required.

2. **Form platform implementation**
   - RHF + Zod schema generation strategy (static + dynamic constraints).
   - Use `Controller` for complex fields and dynamic arrays.
   - Accessibility and validation errors standardized.

3. **Result workflow commands**
   - Save draft / finalize / send to validation (`ready_for_validation`).
   - Concurrency handling for stale edits and multi-user conflicts.

4. **Performance and UX**
   - Lazy-load heavy result widgets as needed.
   - Preserve local unsaved state safely during transient disruptions.

### Exit criteria

- No placeholder in process route.
- Results persist and transition cleanly to supervisor validation queue.
- Form architecture is reusable across exam types without per-exam component explosion.

---

## Phase 4 — Supervisor Validation (P1)

**Outcome:** supervisor can review, approve/reject, and track validation actions.

### Tasks

1. **Dashboard integration**
   - Replace `MOCK_STATS`, `MOCK_RESULTS` with real pending-validation data.

2. **Validation list + detail pages**
   - Implement `/supervisor/validaciones` and `/supervisor/validaciones/[id]`.
   - Actions: approve, reject, mark incidence; record reason/comments.

3. **Validation audit and reporting base**
   - Populate `validatedBy`, `validatedAt`.
   - Emit `EXAM_APPROVED`, `EXAM_REJECTED`, `INCIDENCE_CREATED`.

4. **Composition and policy**
   - Shared validation provider for list/detail synchronization.
   - Enforce role checks on all validation actions.

### Exit criteria

- Supervisor can process full validation workflow.
- Validation actions are traceable and reflected in downstream doctor-facing views.

---

## Phase 5 — Doctor Consumption (P1)

**Outcome:** doctor views validated clinical results with reliable filters and detail views.

### Tasks

1. **Doctor dashboard integration**
   - Replace dashboard mock stats + patient list with validated-result queries.

2. **Results list + detail routes**
   - Implement `/doctor/resultados` and `/doctor/resultados/[id]`.
   - Enforce only approved/eligible results are visible.

3. **Search and notification hooks**
   - Search by patient, study, accession.
   - Optional: attach notification feed once backend events are stable.

4. **Data minimization**
   - Return only data needed for each doctor view to reduce payload size.

### Exit criteria

- Doctor role sees real validated results end to end.
- Navigation from dashboard to result detail is fully backed by production data.

---

## Phase 6 — Settings, Hardening, and Release Readiness (P2)

**Outcome:** operational quality and maintainability are production-ready.

### Tasks

1. **Technician settings persistence**
   - Add `UserProfile/TechnicianProfile` model or Cognito attributes strategy.
   - Persist workflow/scan/printer/security preferences.

2. **Observability and diagnostics**
   - Add structured logs and correlation IDs for workflow mutations.
   - Surface key metrics: queue latency, transition errors, validation turnaround.

3. **Security hardening**
   - Verify authorization by role and record ownership rules.
   - Validate no guest access in protected operational routes.

4. **Performance hardening**
   - Remove stale mock fallbacks.
   - Audit bundles and dynamic imports for heavy client modules.
   - Eliminate avoidable rerenders in high-frequency workstations.

5. **Deployment and cutover**
   - Execute deployment SOP flow and rollback plan.
   - Conduct staged rollout by role/route if needed.

### Exit criteria

- No mock-driven operational paths remain in integrated scopes.
- Role-based access, auditability, and performance SLOs are met.
- Team has runbooks for support and rollback.

---

## 6) Work Breakdown Structure (Itemized Backlog)

Use this as execution checklist IDs for tickets.

- **INT-001** Add auth groups `doctor`, `recepcion`.
- **INT-002** Protect `/recepcion` under role policy.
- **INT-003** Extend WorkOrder fields for requested exams + referring doctor.
- **INT-004** Extend Sample and Exam status enums.
- **INT-005** Add exam validation metadata fields.
- **INT-006** Add `AuditEvent` model and event taxonomy.
- **INT-007** Implement role-based authorization rules per model.
- **INT-008** Build reception order query repository and filter API.
- **INT-009** Build specimen generation domain service (idempotent).
- **INT-010** Integrate reception UI actions, errors, and retries.
- **INT-011** Build technician dashboard aggregation service.
- **INT-012** Integrate muestras workstation with real transitions.
- **INT-013** Implement scan lookup/reprint/problem mutation endpoints.
- **INT-014** Implement process workspace forms via RHF+Zod.
- **INT-015** Implement result finalize + send-to-validation flow.
- **INT-016** Integrate supervisor dashboard with real metrics.
- **INT-017** Build supervisor validation list/detail routes.
- **INT-018** Implement approval/rejection/incidence audit writes.
- **INT-019** Integrate doctor dashboard with validated results.
- **INT-020** Build doctor result list/detail routes.
- **INT-021** Persist technician settings/profile.
- **INT-022** Add observability dashboards and alert thresholds.
- **INT-023** Run security/performance hardening pass.
- **INT-024** Execute release checklist and staged rollout.

---

## 7) Testing Strategy by Phase

### Contract and domain tests

- Schema/status transition tests for all allowed/forbidden transitions.
- Repository integration tests for key filters/searches.
- Domain service tests for idempotency and audit emission.

### UI integration tests

- Route-level tests for loading/error/success states.
- Scan + transition flows for reception/technician.
- Form validation tests (RHF/Zod) for process workspace and settings.

### End-to-end role tests

- Reception: create/generate/ready.
- Technician: receive/process/send validation.
- Supervisor: approve/reject.
- Doctor: view approved result.

### Non-functional tests

- Authorization matrix tests by role.
- Performance baselines for queue/search/scan paths.
- Accessibility checks for critical forms and dialogs.

---

## 8) Risks and Mitigations

- **Risk:** schema changes break existing dev data.  
  **Mitigation:** migration scripts + seed refresh + backward-compatible adapters during transition.

- **Risk:** transition race conditions in high-concurrency stations.  
  **Mitigation:** optimistic concurrency checks + idempotent commands + conflict UX.

- **Risk:** UI regressions during mock removal.  
  **Mitigation:** route-by-route feature flags and contract tests before cutover.

- **Risk:** inconsistent exam mapping between reception labels and `ExamType.code`.  
  **Mitigation:** central mapping config and validation during order intake.

- **Risk:** missing SOP tool availability for Amplify workflows.  
  **Mitigation:** track SOP-equivalent checklists in tickets/PRs until tool access is available.

---

## 9) Definition of Done (Global)

Integration is complete when:

1. All phase exit criteria (0–6) are met.
2. Frontend-ready routes no longer depend on mock data in operational flows.
3. Auth, domain transitions, and audit events are enforced end to end.
4. Forms follow RHF+Zod+shadcn standards.
5. Performance, accessibility, and security gates pass for critical workflows.
