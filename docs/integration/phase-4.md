# Phase 4 — Supervisor Validation: Breakdown Plan

**Reference:** [integration-plan.md](./integration-plan.md) Phase 4 (lines 237–262)

**Outcome:** Supervisor can review, approve/reject, and track validation actions on real backend data.

---

## Engineering Principles (from integration plan)

- **Backend-first contracts:** define schema, status machine, and API contracts before UI wiring.
- **Thin UI, rich domain layer:** keep business rules in domain/services, not in components.
- **Composition over boolean complexity:** explicit variants + compound components + provider-based state.
- **Server-driven data fetching:** avoid client waterfalls; parallelize independent requests.
- **Strict form handling:** React Hook Form + Zod + shadcn Field/Form patterns.
- **Incremental migration:** route-by-route replacement of mocks with kill switches and rollback options.

---

## Cross-Cutting Standards

- **Form standards:** Zod + RHF `zodResolver`; `FormField`/`FormItem` or `Controller` + `Field`; `aria-invalid`; validation reason/comments forms.
- **Composition:** Provider for shared validation state; explicit subcomponents over mode booleans.
- **Performance:** Parallel fetches; minimize serialized payloads to client; server-first data hydration.
- **Amplify SOP:** Execute `amplify-backend-implementation` SOP before backend tasks; `amplify-frontend-integration` SOP before wiring tasks.

---

## Current State

| Location | State | Notes |
|----------|-------|-------|
| `/supervisor` (dashboard) | Shell + mock data | `supervisor-dashboard-client.tsx` — `MOCK_STATS` (4 stat cards), `MOCK_RESULTS` (4 rows), "Revisar" links to `/supervisor/validaciones/{id}` |
| `/supervisor/validaciones` | Placeholder | Renders "Próximamente" |
| `/supervisor/validaciones/[id]` | Placeholder | Shows exam ID only |
| `/supervisor/auditoria` | Placeholder | Out of scope for Phase 4 |
| `/supervisor/incidencias` | Placeholder | Incident page; partially in scope (creation flow) |
| Amplify `Exam` model | Ready | `status` includes `ready_for_validation`, `approved`, `rejected`; `validatedBy`, `validatedAt` fields present; `status` indexed |
| Audit contracts | Defined | `EXAM_APPROVED`, `EXAM_REJECTED`, `INCIDENCE_CREATED` in `contracts.ts` |
| `exam-result-service.ts` | Technician side done | `sendToValidation()` sets exam to `ready_for_validation`; no supervisor-side approval/rejection logic |
| Supervisor repository | Missing | No queries for pending-validation exams or dashboard stats |
| Validation service | Missing | No approve/reject/incidence domain logic |

---

## Established Patterns to Follow

Based on the existing technician and reception implementations:

| Concern | Pattern | Reference |
|---------|---------|-----------|
| State management | Context provider with `{ state, actions }` interface | `technician-workstation-context.tsx` |
| Data fetching | Server component fetches via repository → passes to client | `process/[id]/page.tsx` |
| Domain logic | Service functions returning `{ ok, error? }` result types | `exam-result-service.ts`, `sample-status-service.ts` |
| Server actions | Thin wrappers that authenticate + call service + return result | `technician/actions.ts`, `process/actions.ts` |
| Concurrency | `expectedUpdatedAt` for optimistic conflict detection | `exam-result-service.ts` |
| Audit | `emitAudit()` calls within service functions | `sample-status-service.ts` |
| Forms | RHF + Zod + `FormField`/`FormItem` shadcn components | `ExamResultForm.tsx` |
| Navigation | List → detail via dynamic route; back to list on success | `muestras` → `process/[id]` |

---

## Phase 4a — Foundation (Repository + Types)

**Scope:** Data access layer for all supervisor validation queries.

| # | Task | Deliverables |
|---|------|--------------|
| 4a.1 | **Supervisor repository** | `src/lib/repositories/supervisor-repository.ts` — typed read queries for supervisor views |
| 4a.2 | **`listPendingValidation()`** | Query exams with `status: "ready_for_validation"`, joined with Sample → WorkOrder (patient name, accession) and ExamType (exam name). Support optional filters: flag/priority, date range, technician |
| 4a.3 | **`getValidationDetail(examId)`** | Return exam + results + ExamType (with `fieldSchema`) + Sample + WorkOrder context. Enough to render full detail view |
| 4a.4 | **`getDashboardStats()`** | Aggregate: pending count, critical count (by flag or reference-range violations), active incidences, average validation turnaround time |
| 4a.5 | **Validation types** | `src/lib/types/validation-types.ts` — `ValidationQueueItem`, `ValidationDetail`, `SupervisorDashboardStats`, `ValidationAction` types |

**Exit:** Repository returns real supervisor data; typed interfaces available for service and UI layers.

---

## Phase 4b — Validation Service

**Scope:** Domain logic for exam approval, rejection, and incidence creation.

| # | Task | Deliverables |
|---|------|--------------|
| 4b.1 | **Validation service** | `src/lib/services/validation-service.ts` — domain functions for supervisor actions |
| 4b.2 | **`approveExam(examId, userId, comments?)`** | Guard: only `ready_for_validation` → `approved`. Set `validatedBy`, `validatedAt`. Emit `EXAM_APPROVED` audit. Return `{ ok, updatedAt }` |
| 4b.3 | **`rejectExam(examId, userId, reason, comments?)`** | Guard: only `ready_for_validation` → `rejected`. Set `validatedBy`, `validatedAt`. Emit `EXAM_REJECTED` audit with reason in metadata. Return `{ ok, updatedAt }` |
| 4b.4 | **`createIncidence(examId, userId, type, description)`** | Emit `INCIDENCE_CREATED` audit. Optionally set exam to `review` status if re-work is needed. Return `{ ok }` |
| 4b.5 | **Optimistic concurrency** | Accept `expectedUpdatedAt` on approve/reject. On conflict, return `{ ok: false, conflict: true }` |
| 4b.6 | **Sample status cascade** | When all exams for a sample reach terminal state (`approved`/`rejected`), optionally update sample status to `completed` |

**Exit:** Service enforces transition guards; audit trail populated for all validation actions; conflicts detected.

---

## Phase 4c — Server Actions

**Scope:** Thin server action wrappers for supervisor operations.

| # | Task | Deliverables |
|---|------|--------------|
| 4c.1 | **Validation actions file** | `src/app/(protected)/supervisor/actions.ts` — server actions for supervisor flows |
| 4c.2 | **`approveExamAction`** | Authenticate caller, verify supervisor role, call `approveExam()`, return result |
| 4c.3 | **`rejectExamAction`** | Authenticate caller, verify supervisor role, call `rejectExam()`, return result |
| 4c.4 | **`createIncidenceAction`** | Authenticate caller, verify supervisor role, call `createIncidence()`, return result |

**Exit:** All supervisor mutations go through authenticated, role-checked server actions.

---

## Phase 4d — Dashboard Integration

**Scope:** Replace mock data on the supervisor dashboard with real backend queries.

| # | Task | Deliverables |
|---|------|--------------|
| 4d.1 | **Server data fetching** | Convert `supervisor/page.tsx` to fetch `getDashboardStats()` and `listPendingValidation()` server-side, pass to client component |
| 4d.2 | **Replace `MOCK_STATS`** | Render real stats: pending count, critical count, incidence count, avg turnaround. Use Skeleton loading states |
| 4d.3 | **Replace `MOCK_RESULTS`** | Render real pending-validation rows with patient name, exam name, technician, processed time, clinical flag |
| 4d.4 | **Loading and error states** | Skeleton cards during load; error boundary for failed queries; empty state when no pending validations |
| 4d.5 | **Parallel fetches** | `Promise.all` for independent stats and list queries to avoid waterfalls |

**Exit:** Dashboard shows real data; no mock constants remain; loading/error states handled.

---

## Phase 4e — Validation List Page (`/supervisor/validaciones`)

**Scope:** Full-featured validation queue with filtering and navigation to detail.

| # | Task | Deliverables |
|---|------|--------------|
| 4e.1 | **Validation provider** | `src/app/(protected)/supervisor/validaciones/validation-provider.tsx` — context provider with `{ state, actions }` pattern for queue state, filters, selection |
| 4e.2 | **Server page loader** | `validaciones/page.tsx` server component fetches initial queue data via repository, passes to client |
| 4e.3 | **Validation queue table** | `ValidationQueueTable` component — columns: patient, exam, technician, processed date/time, clinical flag, status, action. "Revisar" navigates to `validaciones/[id]` |
| 4e.4 | **Filters and search** | Filter by: status (pending/all), clinical flag (critical/attention/normal), date range. Search by patient name or accession number |
| 4e.5 | **Batch awareness** | Show count of pending items; highlight critical-flag rows visually |

**Exit:** Validation list renders real data with functional filters; navigation to detail works.

---

## Phase 4f — Validation Detail Page (`/supervisor/validaciones/[id]`)

**Scope:** Full exam review and approval/rejection workflow.

| # | Task | Deliverables |
|---|------|--------------|
| 4f.1 | **Server data loading** | `validaciones/[id]/page.tsx` fetches `getValidationDetail(examId)` server-side; handles not-found |
| 4f.2 | **Result display (read-only)** | Reuse field rendering logic from `ExamResultFields` in read-only mode — show sections, values, units, reference ranges, out-of-range flags |
| 4f.3 | **Patient and order context** | Header/sidebar showing: patient name, accession number, exam type, technician, processed timestamp, sample info |
| 4f.4 | **Approval form** | "Aprobar" action with optional comments field. RHF + Zod: `{ comments: z.string().optional() }`. Confirmation dialog before submit |
| 4f.5 | **Rejection form** | "Rechazar" action with required reason and optional comments. RHF + Zod: `{ reason: z.string().min(1), comments: z.string().optional() }`. Confirmation dialog |
| 4f.6 | **Incidence creation** | "Reportar incidencia" dialog with type selector and description. RHF + Zod: `{ type: z.enum([...]), description: z.string().min(1) }` |
| 4f.7 | **Post-action navigation** | On approve/reject success → navigate back to `/supervisor/validaciones` with success feedback. On conflict → show conflict message with reload option |
| 4f.8 | **Loading and error states** | Skeleton while loading; "Examen no encontrado" for missing exam; error boundary |

**Exit:** Supervisor can review full exam results and approve/reject with audit trail; forms follow RHF+Zod+shadcn standards.

---

## Phase 4g — Composition, Role Enforcement, and Polish

**Scope:** Cross-cutting quality, composition patterns, and role-based access.

| # | Task | Deliverables |
|---|------|--------------|
| 4g.1 | **Role enforcement** | All supervisor server actions verify caller has supervisor group. Validation detail page returns 403 for non-supervisors |
| 4g.2 | **Provider-based list/detail sync** | Validation provider tracks which item is being reviewed; on return from detail, queue reflects updated status (approved/rejected item removed from pending) |
| 4g.3 | **Shared result viewer component** | Extract read-only result rendering into a shared component reusable by supervisor and doctor phases (`src/components/exam-result-viewer.tsx` or similar) |
| 4g.4 | **Remove mock constants** | Delete `MOCK_STATS`, `MOCK_RESULTS`, `ResultRow` type from `supervisor-dashboard-client.tsx` |
| 4g.5 | **Accessibility audit** | Ensure approval/rejection forms have proper `aria-invalid`, labels, error announcements; confirmation dialogs are keyboard-navigable |
| 4g.6 | **Performance review** | Verify no client fetch waterfalls; lazy-load detail page if heavy; direct imports (no barrel files) |

**Exit:** Supervisor workflow is role-enforced, accessible, and follows composition patterns. No mock data remains.

---

## Execution Order

```
Phase 4a ─── Foundation (repository + types)         [must complete first]
    │
Phase 4b ─── Validation service (domain logic)       [depends on 4a]
    │
Phase 4c ─── Server actions (auth wrappers)           [depends on 4b]
    │
    ├── Phase 4d ─── Dashboard integration            [depends on 4a; can overlap with 4e]
    │
    └── Phase 4e ─── Validation list page             [depends on 4a, 4c]
            │
        Phase 4f ─── Validation detail page           [depends on 4b, 4c, 4e]
            │
        Phase 4g ─── Composition, roles, polish       [depends on all above]
```

- **4a → 4b → 4c** is the critical path (backend layers).
- **4d** and **4e** can run in parallel once 4a and 4c are ready.
- **4f** requires both the service (4b/4c) and the list page (4e) to be in place.
- **4g** is a final pass across all deliverables.

---

## Deferred / Out of Scope for Phase 4

- Supervisor audit log page (`/supervisor/auditoria`) — Phase 6 or later
- Supervisor reports page (`/supervisor/reportes`) — Phase 6 or later
- Supervisor settings page (`/supervisor/settings`) — Phase 6
- Supervisor muestras view (`/supervisor/muestras`) — not in integration plan
- Doctor-facing result views — Phase 5
- Real-time notifications / live queue updates — future enhancement
- Bulk approve/reject actions — future enhancement

---

## Summary Table

| Phase | Focus | Dependencies | Est. Effort |
|-------|-------|-------------|-------------|
| **4a** | Repository, validation types | None | Small |
| **4b** | Validation service, guards, audit | 4a | Small |
| **4c** | Server actions (auth wrappers) | 4b | Small |
| **4d** | Dashboard real data integration | 4a | Small–Medium |
| **4e** | Validation list page + provider | 4a, 4c | Medium |
| **4f** | Validation detail + approve/reject forms | 4b, 4c, 4e | Medium–Large |
| **4g** | Composition, roles, shared components, polish | All | Small–Medium |

---

## INT Backlog Reference

From integration-plan.md work breakdown:

- **INT-016** → Phase 4d (supervisor dashboard with real metrics)
- **INT-017** → Phase 4e + 4f (supervisor validation list/detail routes)
- **INT-018** → Phase 4b + 4c (approval/rejection/incidence audit writes)

---

## Files to Create / Modify

### New files

| File | Phase | Purpose |
|------|-------|---------|
| `src/lib/repositories/supervisor-repository.ts` | 4a | Supervisor data access |
| `src/lib/types/validation-types.ts` | 4a | Typed interfaces for validation domain |
| `src/lib/services/validation-service.ts` | 4b | Approve/reject/incidence domain logic |
| `src/app/(protected)/supervisor/actions.ts` | 4c | Server actions for supervisor |
| `src/app/(protected)/supervisor/validaciones/validation-provider.tsx` | 4e | Validation queue state provider |
| `src/app/(protected)/supervisor/validaciones/validation-queue-table.tsx` | 4e | Queue table component |
| `src/app/(protected)/supervisor/validaciones/[id]/validation-detail-client.tsx` | 4f | Detail page client component |
| `src/components/exam-result-viewer.tsx` | 4g | Shared read-only result renderer |

### Modified files

| File | Phase | Change |
|------|-------|--------|
| `src/app/(protected)/supervisor/page.tsx` | 4d | Add server-side data fetching |
| `src/app/(protected)/supervisor/supervisor-dashboard-client.tsx` | 4d | Replace mocks with real props; add loading/error |
| `src/app/(protected)/supervisor/validaciones/page.tsx` | 4e | Replace placeholder with real list page |
| `src/app/(protected)/supervisor/validaciones/[id]/page.tsx` | 4f | Replace placeholder with real detail page |
