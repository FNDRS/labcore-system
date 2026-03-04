# Phase 1: Query Optimization — Detailed Execution Plan

> **Scope**: Repository files only. Zero UI changes. Components, actions, and page structure remain untouched.
>
> **Goal**: Collapse N+1 waterfalls into single Amplify `selectionSet` round trips, extract duplicated logic into shared modules, and add error observability to every query.
>
> **Guiding principles** (from referenced skills):
>
> - `async-parallel` — Use `Promise.all()` for independent operations (CRITICAL).
> - `server-cache-react` — `React.cache()` for per-request deduplication.
> - `js-index-maps` — Build Map for repeated lookups instead of `.find()`.
> - `js-combine-iterations` — Combine multiple filter/map into one loop.
> - `js-early-exit` — Return early from functions.

---

## Current State Summary

| Repository | File                       | Lines | Selection Sets                                                    | `errors` Check                                    | Duplicated Logic                                                                                        |
| ---------- | -------------------------- | ----: | ----------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| process    | `process-repository.ts`    |   156 | Yes (Sample) — but re-fetches Exam + ExamType anyway              | No                                                | `parseResults`                                                                                          |
| reception  | `reception-repository.ts`  |   314 | Yes (WO, Sample, Patient, ExamType) — but N+1 on samples/patients | No                                                | Patient name inline, `ageFromDateOfBirth`                                                               |
| technician | `technician-repository.ts` |   316 | Yes (Sample eager) — `listTechnicianSamples` is the gold standard | No (except try/catch in `getCompletedTodayCount`) | Patient name inline                                                                                     |
| supervisor | `supervisor-repository.ts` |   371 | None                                                              | No                                                | `parseResults`, `parseReferenceRange`, `hasReferenceRangeViolation`, `deriveClinicalFlag`, patient name |
| results    | `results-repository.ts`    |   372 | None                                                              | No                                                | Same as supervisor + `buildPatientFullName`                                                             |

---

## Parallelization Analysis

```
                         ┌─────────┐
                         │ Task 1a │  Extract shared utilities
                         │ (FIRST) │  Foundation for everything
                         └────┬────┘
                              │
           ┌──────────────────┼──────────────────────────────┐
           │                  │                              │
     ┌─────┴─────┐     ┌─────┴─────┐                  ┌─────┴─────┐
     │  STREAM A  │     │  STREAM B  │                  │  STREAM C  │
     │            │     │            │                  │            │
     │ 1b process │     │ 1d recep.  │                  │ 1f super.  │
     │ 1c technic.│     │ 1e recep.  │                  │ 1g super.  │
     │            │     │            │                  │ 1h results │
     └────────────┘     └────────────┘                  │ 1i results │
                                                        └────────────┘
                              │
                         ┌────┴────┐
                         │ Task 1j │  Error handling sweep (all repos)
                         │ (LAST)  │  Can be folded into each task above
                         └─────────┘
```

**What can run in parallel** (after Task 1a completes):

| Stream | Tasks          | Files Touched                                       | Independent?                                                                                                           |
| ------ | -------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **A**  | 1b, 1c         | `process-repository.ts`, `technician-repository.ts` | Yes — different files                                                                                                  |
| **B**  | 1d, 1e         | `reception-repository.ts`                           | 1e reuses 1d's selection sets — do 1d first, 1e immediately after                                                      |
| **C**  | 1f, 1g, 1h, 1i | `supervisor-repository.ts`, `results-repository.ts` | 1f→1g (same file, shared selection). 1h→1i (same file, shared selection). But 1f and 1h are independent of each other. |

**Optimal execution order**:

1. **Task 1a** (blocking — every other task imports from it)
2. **Parallel wave**: Tasks 1b + 1d + 1f + 1h (four independent files)
3. **Sequential follow-ups**: 1c after 1b (same stream), 1e after 1d, 1g after 1f, 1i after 1h
4. **Task 1j** integrated into each task above (not a separate pass)

---

## Task 1a: Extract Shared Utilities

### What

Create two new files:

- `src/lib/repositories/shared.ts` — common parsing, name building, error mapping, ExamType cache.
- `src/lib/clinical-flags.ts` — reference range parsing and clinical flag derivation.

### Why

Five functions are duplicated across 3–4 repositories:

| Function                                      | Duplicated In                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `parseResults(value)`                         | process, supervisor, results                                                  |
| `buildPatientFullName(first, last)`           | reception (inline), technician (inline), supervisor (inline), results (named) |
| `parseReferenceRange(range)`                  | supervisor, results                                                           |
| `hasReferenceRangeViolation(results, schema)` | supervisor, results                                                           |
| `deriveClinicalFlag(results, schema)`         | supervisor, results                                                           |

Deduplication is a prerequisite for Tasks 1b–1j because the optimized repositories will import these.

### How

#### File: `src/lib/repositories/shared.ts`

```typescript
import { cache } from "react";
import { cookieBasedClient } from "@/lib/amplify-server-client"; // adjust import path

// ── JSON Parsing ─────────────────────────────────────────────

export function parseResults(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      /* invalid JSON */
    }
    return null;
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

// ── Patient Name ─────────────────────────────────────────────

export function buildPatientFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Desconocido";
}

// ── Age from Date of Birth ───────────────────────────────────

export function ageFromDateOfBirth(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// ── ExamType Reference Cache ─────────────────────────────────

export const getExamTypeCodeMap = cache(async (): Promise<Map<string, string>> => {
  const { data, errors } = await cookieBasedClient.models.ExamType.list({
    selectionSet: ["code", "name"] as const,
  });
  if (errors?.length) {
    console.error("[getExamTypeCodeMap] Amplify errors:", errors);
  }
  return new Map((data ?? []).map((et) => [et.code, et.name]));
});

// ── Amplify Error Mapping ────────────────────────────────────

type GraphQLErrorLike = {
  message: string;
  errorType?: string;
  errorInfo?: Record<string, unknown> | null;
  path?: ReadonlyArray<string | number>;
  extensions?: Record<string, unknown>;
};

export type ActionResult<T> =
  | { ok: true; data: T; meta?: { nextToken?: string | null } }
  | { ok: false; error: { code: string; message: string; retryable?: boolean; details?: unknown } };

export function toRepositoryError(
  fallbackCode: string,
  errors: readonly GraphQLErrorLike[] | undefined
): ActionResult<never> {
  const first = errors?.[0];
  return {
    ok: false,
    error: {
      code: first?.errorType ?? fallbackCode,
      message: first?.message ?? "Unexpected data error",
      retryable: false,
      details: first
        ? {
            path: first.path,
            errorInfo: first.errorInfo ?? null,
            extensions: first.extensions ?? null,
          }
        : null,
    },
  };
}

// ── Field Schema Parsing ─────────────────────────────────────

export function parseFieldSchema(value: unknown): Record<string, unknown>[] | null {
  if (value == null) return null;
  const raw =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        })()
      : value;
  if (Array.isArray(raw)) return raw;
  return null;
}
```

#### File: `src/lib/clinical-flags.ts`

```typescript
export type ClinicalFlag = "normal" | "low" | "high" | "critical_low" | "critical_high" | null;

export interface ReferenceRange {
  min?: number;
  max?: number;
  criticalMin?: number;
  criticalMax?: number;
  unit?: string;
}

export function parseReferenceRange(range: unknown): ReferenceRange | null {
  if (!range || typeof range !== "object") return null;
  const r = range as Record<string, unknown>;
  return {
    min: typeof r.min === "number" ? r.min : undefined,
    max: typeof r.max === "number" ? r.max : undefined,
    criticalMin: typeof r.criticalMin === "number" ? r.criticalMin : undefined,
    criticalMax: typeof r.criticalMax === "number" ? r.criticalMax : undefined,
    unit: typeof r.unit === "string" ? r.unit : undefined,
  };
}

export function hasReferenceRangeViolation(
  results: Record<string, unknown> | null,
  fieldSchema: Record<string, unknown>[] | null
): boolean {
  if (!results || !fieldSchema) return false;
  for (const field of fieldSchema) {
    const key = field.key as string | undefined;
    const refRange = field.referenceRange;
    if (!key || !refRange) continue;
    const value = results[key];
    if (typeof value !== "number") continue;
    const range = parseReferenceRange(refRange);
    if (!range) continue;
    if ((range.min != null && value < range.min) || (range.max != null && value > range.max)) {
      return true;
    }
  }
  return false;
}

export function deriveClinicalFlag(
  results: Record<string, unknown> | null,
  fieldSchema: Record<string, unknown>[] | null
): ClinicalFlag {
  if (!results || !fieldSchema) return null;
  let worst: ClinicalFlag = "normal";

  for (const field of fieldSchema) {
    const key = field.key as string | undefined;
    const refRange = field.referenceRange;
    if (!key || !refRange) continue;
    const value = results[key];
    if (typeof value !== "number") continue;
    const range = parseReferenceRange(refRange);
    if (!range) continue;

    if (range.criticalMax != null && value > range.criticalMax) return "critical_high";
    if (range.criticalMin != null && value < range.criticalMin) return "critical_low";
    if (range.max != null && value > range.max) worst = "high";
    else if (range.min != null && value < range.min) worst = worst === "high" ? "high" : "low";
  }

  return worst;
}
```

### Subtasks

| #    | Action                                                                                                                                                                                        | Effort       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1a.1 | Create `src/lib/repositories/shared.ts` with `parseResults`, `buildPatientFullName`, `ageFromDateOfBirth`, `getExamTypeCodeMap`, `toRepositoryError`, `parseFieldSchema`, `ActionResult` type | Small        |
| 1a.2 | Create `src/lib/clinical-flags.ts` with `parseReferenceRange`, `hasReferenceRangeViolation`, `deriveClinicalFlag`                                                                             | Small        |
| 1a.3 | Update imports in `process-repository.ts` — replace local `parseResults` with import from `shared.ts`                                                                                         | Trivial      |
| 1a.4 | Update imports in `supervisor-repository.ts` — replace local `parseResults`, clinical flag functions                                                                                          | Trivial      |
| 1a.5 | Update imports in `results-repository.ts` — replace local `parseResults`, `buildPatientFullName`, clinical flag functions                                                                     | Trivial      |
| 1a.6 | Update imports in `reception-repository.ts` — replace inline patient name with `buildPatientFullName`, `ageFromDateOfBirth`                                                                   | Trivial      |
| 1a.7 | Update imports in `technician-repository.ts` — replace inline patient name with `buildPatientFullName`                                                                                        | Trivial      |
| 1a.8 | Verify: run `npm run build` or `npx tsc --noEmit` — no type errors, all existing page renders unchanged                                                                                       | Verification |

### Acceptance Criteria

- [ ] No function duplication across repositories.
- [ ] `shared.ts` exports are importable from all repositories.
- [ ] `clinical-flags.ts` exports are importable from supervisor and results repos.
- [ ] Existing tests (if any) pass unchanged.
- [ ] Pages render identically (manual spot-check).

---

## Task 1b: Optimize `getProcessContext`

### What

Refactor `getProcessContext` in `process-repository.ts` to use a single `Sample.get` call with a relationship-aware `selectionSet` that eagerly loads `exam.*` and `examType.*`.

### Why

**Current**: 2 round trips.

- Round 1: `Sample.get` (with selection set that includes `exam.*`, `examType.*`).
- Round 2: `Promise.all([Exam.list, ExamType.get])` — redundantly re-fetches the same data.

The current code already requests `exam.*` and `examType.*` in the selection set but ignores the nested data and fetches again. This is the most straightforward fix — just use the data that's already returned.

**Target**: 1 round trip. ~50% latency reduction (~600ms → ~300ms).

### How

1. **Define explicit selection set** (replace broad `"exam.*"` with field-level selection for type safety):

```typescript
const PROCESS_CONTEXT_SELECTION = [
  "id",
  "barcode",
  "workOrderId",
  "examTypeId",
  "status",
  "collectedAt",
  "receivedAt",
  "exam.id",
  "exam.sampleId",
  "exam.examTypeId",
  "exam.status",
  "exam.results",
  "exam.startedAt",
  "exam.resultedAt",
  "exam.performedBy",
  "exam.notes",
  "exam.validatedBy",
  "exam.validatedAt",
  "exam.updatedAt",
  "examType.id",
  "examType.code",
  "examType.name",
  "examType.sampleType",
  "examType.fieldSchema",
] as const;
```

2. **Remove the redundant `Promise.all([Exam.list, ExamType.get])`** — use `sample.exam` and `sample.examType` from the eager-loaded response.

3. **Remove debug `console.log` calls** (lines 88–104 in current file).

4. **Add `errors` checking** after the Amplify call.

5. **Import `parseResults` and `parseFieldSchema` from `shared.ts`** instead of local copies.

### Subtasks

| #    | Action                                                                | Effort       |
| ---- | --------------------------------------------------------------------- | ------------ |
| 1b.1 | Replace broad `"exam.*"` with field-level `PROCESS_CONTEXT_SELECTION` | Small        |
| 1b.2 | Remove the `Promise.all([Exam.list, ExamType.get])` block             | Small        |
| 1b.3 | Map `sample.exam` and `sample.examType` directly to the return DTO    | Small        |
| 1b.4 | Add `errors` destructuring + `console.error` log + early return       | Trivial      |
| 1b.5 | Remove debug `console.log` lines                                      | Trivial      |
| 1b.6 | Import `parseResults`, `parseFieldSchema` from `shared.ts`            | Trivial      |
| 1b.7 | Add Amplify `SelectionSet` type for compile-time safety               | Small        |
| 1b.8 | Verify: process page loads identically, no type errors                | Verification |

### Acceptance Criteria

- [ ] Single `Sample.get` call per invocation (network tab shows 1 GraphQL request).
- [ ] Return shape is identical to current `ProcessContext`.
- [ ] `errors` from Amplify are logged.
- [ ] No debug console.log calls remain.

---

## Task 1c: Optimize `getSampleDetail`

### What

Refactor `getSampleDetail` in `technician-repository.ts` to use a single `Sample.get` with deep `selectionSet` for relational data, plus a parallelized `Promise.all` for AuditEvent queries.

### Why

**Current**: 4+ round trips.

- Round 1: `Sample.get`.
- Round 2: `Promise.all([WorkOrder.get, ExamType.get, AuditEvent.list(SAMPLE), Exam.list])`.
- Round 3: `Promise.all([AuditEvent.list(WORK_ORDER), ...examIds.map(AuditEvent.list(EXAM))])`.
- Round 4: `Patient.get`.

**Target**: 2 round trips.

- Round 1: `Sample.get` with `SAMPLE_DETAIL_SELECTION` (eagerly loads WorkOrder, Patient, ExamType, Exam).
- Round 2: `Promise.all([AuditEvent.list(SAMPLE), AuditEvent.list(WORK_ORDER), ...AuditEvent.list(EXAM)])` — all audit queries in a single parallel batch.

AuditEvent has no schema relationship to Sample/WorkOrder/Exam, so it must remain a separate query. But all audit queries can run in parallel in a single `Promise.all`.

### How

1. **Define `SAMPLE_DETAIL_SELECTION`**:

```typescript
const SAMPLE_DETAIL_SELECTION = [
  "id",
  "barcode",
  "workOrderId",
  "examTypeId",
  "status",
  "receivedAt",
  "collectedAt",
  "workOrder.id",
  "workOrder.priority",
  "workOrder.patientId",
  "workOrder.patient.id",
  "workOrder.patient.firstName",
  "workOrder.patient.lastName",
  "examType.id",
  "examType.name",
  "examType.sampleType",
  "exam.id",
] as const;
```

2. **Collapse Rounds 2–4** into usage of the eager-loaded response + one `Promise.all` for all AuditEvent queries.

3. **Add `errors` checking**.

4. **Import `buildPatientFullName` from `shared.ts`**.

### Subtasks

| #    | Action                                                                              | Effort       |
| ---- | ----------------------------------------------------------------------------------- | ------------ |
| 1c.1 | Define `SAMPLE_DETAIL_SELECTION` constant                                           | Small        |
| 1c.2 | Rewrite `getSampleDetail` to use single `Sample.get` with selection set             | Medium       |
| 1c.3 | Build single `Promise.all` for all AuditEvent queries (sample + workOrder + exam[]) | Medium       |
| 1c.4 | Remove separate `WorkOrder.get`, `ExamType.get`, `Patient.get`, `Exam.list` calls   | Small        |
| 1c.5 | Map eager-loaded response to existing return DTO shape                              | Medium       |
| 1c.6 | Add `errors` checking + logging                                                     | Trivial      |
| 1c.7 | Import `buildPatientFullName` from `shared.ts`                                      | Trivial      |
| 1c.8 | Verify: sample detail sheet renders identically                                     | Verification |

### Acceptance Criteria

- [ ] Network tab shows 2 GraphQL requests (1 Sample.get + 1 batched AuditEvent round).
- [ ] Return shape matches current `SampleDetail` type.
- [ ] Patient name derived from eager-loaded `workOrder.patient`.
- [ ] `errors` are logged.

---

## Task 1d: Optimize `listReceptionOrders`

### What

Refactor `listReceptionOrders` in `reception-repository.ts` to use a single `WorkOrder.list` with relationship-aware `selectionSet` that eagerly loads `patient.*` and `samples.*`, plus a cached ExamType lookup.

### Why

**Current**: 3 round trips + N+1 fan-out.

- Round 1: `Promise.all([ExamType.list, WorkOrder.list])`.
- Round 2: `Promise.all(workOrders.map(wo => Sample.list({ workOrderId })))` — **N parallel calls, one per work order**.
- Round 3: `Promise.all(uniquePatientIds.map(Patient.get))` — **M parallel calls, one per unique patient**.

**Target**: 1+1 round trips.

- Round 1: `WorkOrder.list` with `RECEPTION_WO_SELECTION` (eagerly loads `patient.*` and `samples.*`).
- Round 2: `getExamTypeCodeMap()` — cached via `React.cache()`, shared across the request.

This eliminates the N+1 fan-out on both samples and patients.

### How

1. **Define `RECEPTION_WO_SELECTION`**:

```typescript
const RECEPTION_WO_SELECTION = [
  "id",
  "accessionNumber",
  "referringDoctor",
  "requestedExamTypeCodes",
  "priority",
  "notes",
  "requestedAt",
  "status",
  "patient.id",
  "patient.firstName",
  "patient.lastName",
  "patient.dateOfBirth",
  "samples.id",
  "samples.status",
] as const;
```

2. **Replace the 3-step fetch** with:

```typescript
const [{ data: workOrders, errors }, examTypeMap] = await Promise.all([
  cookieBasedClient.models.WorkOrder.list({
    selectionSet: RECEPTION_WO_SELECTION,
    /* existing filter/sort/pagination */
  }),
  getExamTypeCodeMap(),
]);
```

3. **Map from eager-loaded response**:
   - `wo.patient` → patient name + age (no separate fetch).
   - `wo.samples` → sample statuses (no separate fetch).
   - `examTypeMap.get(code)` → exam type display names.

4. **Import `buildPatientFullName`, `ageFromDateOfBirth`, `getExamTypeCodeMap` from `shared.ts`**.

5. **Add `errors` checking**.

### Subtasks

| #    | Action                                                                                       | Effort       |
| ---- | -------------------------------------------------------------------------------------------- | ------------ |
| 1d.1 | Define `RECEPTION_WO_SELECTION` constant                                                     | Small        |
| 1d.2 | Replace multi-step fetch with single `WorkOrder.list` + `getExamTypeCodeMap()`               | Medium       |
| 1d.3 | Remove `Sample.list` fan-out per work order                                                  | Small        |
| 1d.4 | Remove `Patient.get` fan-out per unique patient                                              | Small        |
| 1d.5 | Map eager-loaded `wo.patient` and `wo.samples` to DTO                                        | Medium       |
| 1d.6 | Import shared utilities (`buildPatientFullName`, `ageFromDateOfBirth`, `getExamTypeCodeMap`) | Trivial      |
| 1d.7 | Use `Map` for examType lookup instead of `.find()` (already in `getExamTypeCodeMap`)         | Built-in     |
| 1d.8 | Add `errors` checking + logging                                                              | Trivial      |
| 1d.9 | Verify: reception page renders identically, pagination works                                 | Verification |

### Acceptance Criteria

- [ ] Network tab shows 2 GraphQL requests (1 WorkOrder.list + 1 ExamType.list).
- [ ] No N+1 Sample.list or Patient.get calls.
- [ ] Return shape matches current `ReceptionListPage`.
- [ ] Pagination (`nextToken`) still works.
- [ ] `errors` are logged.

---

## Task 1e: Optimize `lookupOrderByCode`

### What

Refactor `lookupOrderByCode` in `reception-repository.ts` to reuse the `RECEPTION_WO_SELECTION` set and eliminate separate Patient/Sample/ExamType fetches.

### Why

**Current**: 3 round trips.

- Round 1: `WorkOrder.list` (by accessionNumber) or `WorkOrder.get` (by id).
- Round 2: `Promise.all([Patient.get, Sample.list])`.
- Round 3: `ExamType.list`.

**Target**: 1+1 round trips.

- Round 1: `WorkOrder.list` with `RECEPTION_WO_SELECTION` (patient + samples eager-loaded).
- Round 2: `getExamTypeCodeMap()` (cached, likely already warm from `listReceptionOrders`).

### How

1. **Reuse `RECEPTION_WO_SELECTION`** from Task 1d.
2. **After finding the WorkOrder**, patient and samples are already in the response — no separate fetches.
3. **Import `getExamTypeCodeMap`** from shared.
4. **Add `errors` checking**.

### Subtasks

| #    | Action                                                                            | Effort       |
| ---- | --------------------------------------------------------------------------------- | ------------ |
| 1e.1 | Rewrite `lookupOrderByCode` to use `WorkOrder.list` with `RECEPTION_WO_SELECTION` | Medium       |
| 1e.2 | Remove separate `Patient.get` and `Sample.list` calls                             | Small        |
| 1e.3 | Use `getExamTypeCodeMap()` instead of separate `ExamType.list`                    | Trivial      |
| 1e.4 | Map to existing return DTO shape                                                  | Small        |
| 1e.5 | Add `errors` checking + logging                                                   | Trivial      |
| 1e.6 | Verify: barcode scan lookup works identically                                     | Verification |

### Acceptance Criteria

- [ ] Network tab shows 1–2 GraphQL requests.
- [ ] Return shape matches current lookup result.
- [ ] Barcode scanning still works end-to-end.

---

## Task 1f: Optimize `listPendingValidation`

### What

Refactor `listPendingValidation` in `supervisor-repository.ts` to use a single `Exam.list` with deep `selectionSet` that traverses `sample → workOrder → patient` and `examType`.

### Why

**Current**: 4 round trips + heavy N+1.

- Round 1: `Exam.list` (no selection set — full model).
- Round 2: `Promise.all([Sample.get × N, ExamType.get × N])` — **2N parallel calls**.
- Round 3: `Promise.all(WorkOrder.get × M)`.
- Round 4: `Promise.all(Patient.get × K)`.

This is the worst waterfall in the codebase. For 20 pending exams, it triggers 40+ Amplify calls.

**Target**: 1 round trip.

- Single `Exam.list` with `VALIDATION_EXAM_SELECTION` that traverses `sample.workOrder.patient` and `examType`.

**Expected latency improvement**: ~1200ms → ~300ms (4× faster).

### How

1. **Define `VALIDATION_EXAM_SELECTION`**:

```typescript
const VALIDATION_EXAM_SELECTION = [
  "id",
  "sampleId",
  "examTypeId",
  "status",
  "results",
  "startedAt",
  "resultedAt",
  "performedBy",
  "notes",
  "validatedBy",
  "validatedAt",
  "updatedAt",
  "sample.id",
  "sample.barcode",
  "sample.workOrderId",
  "sample.status",
  "sample.workOrder.id",
  "sample.workOrder.accessionNumber",
  "sample.workOrder.priority",
  "sample.workOrder.patient.id",
  "sample.workOrder.patient.firstName",
  "sample.workOrder.patient.lastName",
  "examType.id",
  "examType.code",
  "examType.name",
  "examType.sampleType",
  "examType.fieldSchema",
] as const;
```

2. **Replace the 4-step fetch** with a single call:

```typescript
const { data: exams, errors } = await cookieBasedClient.models.Exam.list({
  filter: { status: { eq: "resulted" } },
  selectionSet: VALIDATION_EXAM_SELECTION,
});
```

3. **Map from flat response** — all related data is nested in the exam response object.

4. **Import `parseResults` from `shared.ts`**, `deriveClinicalFlag` from `clinical-flags.ts`\*\*.

5. **Import `buildPatientFullName` from `shared.ts`**.

6. **Add `errors` checking**.

### Subtasks

| #    | Action                                                                              | Effort       |
| ---- | ----------------------------------------------------------------------------------- | ------------ |
| 1f.1 | Define `VALIDATION_EXAM_SELECTION` constant                                         | Small        |
| 1f.2 | Replace 4-step fetch with single `Exam.list` with selection set                     | Medium       |
| 1f.3 | Remove all N+1 fan-out calls (Sample.get, ExamType.get, WorkOrder.get, Patient.get) | Medium       |
| 1f.4 | Map eager-loaded response to existing DTO shape                                     | Medium       |
| 1f.5 | Replace local `parseResults`, clinical flag functions with shared imports           | Trivial      |
| 1f.6 | Import `buildPatientFullName` from `shared.ts`                                      | Trivial      |
| 1f.7 | Add `errors` checking + logging                                                     | Trivial      |
| 1f.8 | Verify: supervisor validation list renders identically, filter/sort works           | Verification |

### Acceptance Criteria

- [ ] Network tab shows 1 GraphQL request for the validation list.
- [ ] Return shape matches current validation list DTO.
- [ ] Clinical flags (normal/low/high/critical) display correctly.
- [ ] Filters (if any) still work.
- [ ] `errors` are logged.

---

## Task 1g: Optimize `getValidationDetail`

### What

Refactor `getValidationDetail` in `supervisor-repository.ts` to use a single `Exam.get` with the same deep `selectionSet`.

### Why

**Current**: 4 sequential round trips.

- `Exam.get` → `Promise.all([Sample.get, ExamType.get])` → `WorkOrder.get` → `Patient.get`.

**Target**: 1 round trip using `Exam.get` with `VALIDATION_EXAM_SELECTION` (same as Task 1f).

### How

1. **Reuse `VALIDATION_EXAM_SELECTION`** from Task 1f.
2. **Replace the sequential fetch chain** with a single `Exam.get({ id: examId }, { selectionSet: VALIDATION_EXAM_SELECTION })`.
3. **Map from eager-loaded response**.
4. **Add `errors` checking**.

### Subtasks

| #    | Action                                                                           | Effort       |
| ---- | -------------------------------------------------------------------------------- | ------------ |
| 1g.1 | Rewrite `getValidationDetail` to use `Exam.get` with `VALIDATION_EXAM_SELECTION` | Medium       |
| 1g.2 | Remove sequential `Sample.get` → `WorkOrder.get` → `Patient.get` chain           | Small        |
| 1g.3 | Map eager-loaded response to existing detail DTO                                 | Medium       |
| 1g.4 | Add `errors` checking + logging                                                  | Trivial      |
| 1g.5 | Verify: validation detail panel renders identically                              | Verification |

### Acceptance Criteria

- [ ] Network tab shows 1 GraphQL request for validation detail.
- [ ] Return shape matches current validation detail DTO.
- [ ] All fields (exam results, patient info, fieldSchema) display correctly.

---

## Task 1h: Optimize `listCompletedWorkOrders`

### What

Refactor `listCompletedWorkOrders` in `results-repository.ts` to use a single `WorkOrder.list` with relationship-aware `selectionSet` instead of 4 full table scans.

### Why

**Current**: 4 full table scans + in-memory join.

- `Promise.all([WorkOrder.list, Patient.list, Sample.list, Exam.list])` — each fetches the **entire** table, then joins in memory.

This is architecturally wrong — it downloads all records for 4 tables and joins client-side. For production data volumes, this will timeout or OOM.

**Target**: 1 query.

- `WorkOrder.list` with `RESULTS_WO_SELECTION` (eagerly loads `patient.*`, `samples.exam.*`).
- Add `filter: { status: { eq: "completed" } }` to scope the scan.

### How

1. **Define `RESULTS_WO_SELECTION`**:

```typescript
const RESULTS_WO_SELECTION = [
  "id",
  "accessionNumber",
  "patientId",
  "requestedAt",
  "priority",
  "status",
  "referringDoctor",
  "patient.id",
  "patient.firstName",
  "patient.lastName",
  "samples.id",
  "samples.examTypeId",
  "samples.exam.id",
  "samples.exam.status",
  "samples.exam.validatedAt",
] as const;
```

2. **Replace the 4-table scan** with:

```typescript
const { data: workOrders, errors } = await cookieBasedClient.models.WorkOrder.list({
  filter: { status: { eq: "completed" } },
  selectionSet: RESULTS_WO_SELECTION,
});
```

3. **Remove the in-memory join** — all data is already nested.

4. **Import `buildPatientFullName` from `shared.ts`**, clinical flag functions from `clinical-flags.ts`.

5. **Add `errors` checking**.

### Subtasks

| #    | Action                                                                        | Effort       |
| ---- | ----------------------------------------------------------------------------- | ------------ |
| 1h.1 | Define `RESULTS_WO_SELECTION` constant                                        | Small        |
| 1h.2 | Replace 4-table `Promise.all` with single `WorkOrder.list` with selection set | Medium       |
| 1h.3 | Add `filter: { status: { eq: "completed" } }` to scope results                | Trivial      |
| 1h.4 | Remove in-memory join logic                                                   | Medium       |
| 1h.5 | Map eager-loaded response to existing DTO shape                               | Medium       |
| 1h.6 | Import shared utilities + clinical flags                                      | Trivial      |
| 1h.7 | Add `errors` checking + logging                                               | Trivial      |
| 1h.8 | Verify: results list renders identically, filters work                        | Verification |

### Acceptance Criteria

- [ ] Network tab shows 1 GraphQL request (not 4).
- [ ] Return shape matches current completed work orders DTO.
- [ ] Filter by date/status/doctor/search still works.
- [ ] No full table scans remain.

---

## Task 1i: Optimize `getWorkOrderConsolidatedResults`

### What

Refactor `getWorkOrderConsolidatedResults` in `results-repository.ts` to use a single `WorkOrder.get` with deep `selectionSet` that eagerly loads patient, samples, exams, and examTypes.

### Why

**Current**: 3 round trips.

- Round 1: `WorkOrder.get`.
- Round 2: `Promise.all([Patient.get, Sample.list])`.
- Round 3: `Promise.all([Exam.list per sample, ExamType.get per unique examTypeId])`.

**Target**: 1 round trip.

### How

1. **Define `CONSOLIDATED_WO_SELECTION`**:

```typescript
const CONSOLIDATED_WO_SELECTION = [
  "id",
  "accessionNumber",
  "status",
  "requestedAt",
  "priority",
  "referringDoctor",
  "patient.id",
  "patient.firstName",
  "patient.lastName",
  "patient.dateOfBirth",
  "patient.gender",
  "samples.id",
  "samples.barcode",
  "samples.examTypeId",
  "samples.exam.id",
  "samples.exam.sampleId",
  "samples.exam.examTypeId",
  "samples.exam.status",
  "samples.exam.results",
  "samples.exam.startedAt",
  "samples.exam.resultedAt",
  "samples.exam.performedBy",
  "samples.exam.notes",
  "samples.exam.validatedBy",
  "samples.exam.validatedAt",
  "samples.examType.id",
  "samples.examType.code",
  "samples.examType.name",
  "samples.examType.sampleType",
  "samples.examType.fieldSchema",
] as const;
```

2. **Replace the 3-step fetch** with a single `WorkOrder.get`.

3. **Map from eager-loaded response** — exams, examTypes, patient all nested.

4. **Use `js-index-maps` pattern**: build a `Map<examTypeId, ExamType>` from `samples.examType` for O(1) lookups when assembling results.

5. **Add `errors` checking**.

### Subtasks

| #    | Action                                                                       | Effort       |
| ---- | ---------------------------------------------------------------------------- | ------------ |
| 1i.1 | Define `CONSOLIDATED_WO_SELECTION` constant                                  | Small        |
| 1i.2 | Replace 3-step fetch with single `WorkOrder.get` with selection set          | Medium       |
| 1i.3 | Build `Map<examTypeId, ExamType>` from eager-loaded samples for O(1) lookups | Small        |
| 1i.4 | Map eager-loaded response to existing consolidated results DTO               | Medium       |
| 1i.5 | Import shared utilities + clinical flags                                     | Trivial      |
| 1i.6 | Add `errors` checking + logging                                              | Trivial      |
| 1i.7 | Verify: consolidated results page renders identically                        | Verification |

### Acceptance Criteria

- [ ] Network tab shows 1 GraphQL request.
- [ ] Return shape matches current consolidated results DTO.
- [ ] Clinical flags display correctly.
- [ ] ExamType fieldSchema parsed correctly for result rendering.

---

## Task 1j: Error Handling Sweep

### What

Ensure every Amplify call across all repositories destructures and inspects `errors`, logs with function context, and returns gracefully.

### Why

**Current**: Zero repositories check `errors` from Amplify responses. GraphQL partial errors are silently discarded, making production debugging impossible.

**Impact**: Observability — when queries return partial data or fail, we'll know immediately from server logs.

### How

This task is **integrated into each task above** rather than being a separate pass. Each task's "Add `errors` checking + logging" subtask covers this. However, a final sweep ensures nothing was missed.

**Standard pattern for every Amplify call**:

```typescript
const { data, errors } = await cookieBasedClient.models.SomeModel.list({ ... });
if (errors?.length) {
  console.error("[functionName] Amplify errors:", errors);
  return null; // or empty array, or toRepositoryError(...)
}
```

**Rules** (from the optimization document Section 7.4):

1. Always destructure `errors` alongside `data`.
2. Log errors with the function name for traceability.
3. For queries (reads): log + return null/empty.
4. For mutations (writes): log + throw to surface the error.
5. Never swallow errors silently.

### Subtasks

| #    | Action                                                                                                                                 | Effort       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1j.1 | Audit `process-repository.ts` — verify all Amplify calls have error checks                                                             | Trivial      |
| 1j.2 | Audit `reception-repository.ts` — verify all Amplify calls have error checks                                                           | Trivial      |
| 1j.3 | Audit `technician-repository.ts` — verify all Amplify calls have error checks (incl. `listTechnicianSamples`, `lookupSampleByBarcode`) | Small        |
| 1j.4 | Audit `supervisor-repository.ts` — verify all Amplify calls have error checks                                                          | Trivial      |
| 1j.5 | Audit `results-repository.ts` — verify all Amplify calls have error checks                                                             | Trivial      |
| 1j.6 | Final `npx tsc --noEmit` — no type errors                                                                                              | Verification |

---

## Execution Schedule

Recommended execution in **4 waves** to maximize parallelism while respecting dependencies:

| Wave       | Tasks                           | Duration Estimate | Notes                                                             |
| ---------- | ------------------------------- | :---------------: | ----------------------------------------------------------------- |
| **Wave 0** | 1a (shared utilities)           |      ~30 min      | Blocking — all others depend on this                              |
| **Wave 1** | 1b + 1d + 1f + 1h (in parallel) |       ~2 hr       | Four independent files, four independent optimizations            |
| **Wave 2** | 1c + 1e + 1g + 1i (in parallel) |       ~2 hr       | Follow-ups within same files / dependent on Wave 1 selection sets |
| **Wave 3** | 1j (error sweep)                |      ~30 min      | Final audit — verify nothing was missed                           |

**Total estimated effort**: ~5 hours of focused work.

### Per-wave verification checkpoints

| After Wave | Verification                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| Wave 0     | `npx tsc --noEmit` passes. All pages render unchanged.                                                                    |
| Wave 1     | Process page, reception list, supervisor validation list, results list all render. Network tab shows reduced round trips. |
| Wave 2     | Sample detail, barcode scan, validation detail, consolidated results all render.                                          |
| Wave 3     | Full regression: all pages, all interactions, all filters. Compare response times before/after.                           |

---

## Performance Expectations (Phase 1 only)

| Function                          |      Current Latency       |  After Phase 1   | Improvement |
| --------------------------------- | :------------------------: | :--------------: | ----------- |
| `getProcessContext`               |   ~600ms (2 round trips)   |  ~300ms (1 RT)   | **2×**      |
| `getSampleDetail`                 |      ~1200ms (4+ RTs)      |  ~600ms (2 RTs)  | **2×**      |
| `listReceptionOrders`             |    ~900ms (3 RTs + N+1)    | ~400ms (1+1 RTs) | **2.25×**   |
| `lookupOrderByCode`               |       ~900ms (3 RTs)       | ~400ms (1+1 RTs) | **2.25×**   |
| `listPendingValidation`           |   ~1200ms (4 RTs + N+1)    |  ~300ms (1 RT)   | **4×**      |
| `getValidationDetail`             | ~1200ms (4 sequential RTs) |  ~300ms (1 RT)   | **4×**      |
| `listCompletedWorkOrders`         |   ~800ms (4 full scans)    | ~400ms (1 scan)  | **2×**      |
| `getWorkOrderConsolidatedResults` |       ~900ms (3 RTs)       |  ~300ms (1 RT)   | **3×**      |

_Latency estimates assume ~300ms per Amplify/AppSync round trip._

---

## Risk Mitigation

| Risk                                                                  | Mitigation                                                                                                           |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Deep selection sets may return larger individual payloads             | Use field-level selection (`"patient.firstName"`) not `"patient.*"`. Monitor response sizes.                         |
| `hasMany` relations (samples) return unbounded arrays                 | Amplify applies default limits. For production, monitor payload sizes and add explicit `limit` if needed.            |
| Eager-loaded shape differs from current hand-assembled shape          | Map carefully in each task. Type-check with `SelectionSet<Schema[Model]["type"], typeof SELECTION>`.                 |
| Breaking existing return contracts                                    | Every task's acceptance criteria includes "return shape matches current DTO." Run existing pages as regression test. |
| `React.cache()` on `getExamTypeCodeMap` only deduplicates per-request | Sufficient for SSR. If needed later, add LRU cache (documented in optimization doc Section 11.3).                    |
| AuditEvent queries remain multi-round-trip (Task 1c)                  | No schema relationship exists. Parallelizing with `Promise.all` is the best we can do without a schema change.       |

---

## Files Changed Summary

| File                                            | Action   | Tasks          |
| ----------------------------------------------- | -------- | -------------- |
| `src/lib/repositories/shared.ts`                | **New**  | 1a             |
| `src/lib/clinical-flags.ts`                     | **New**  | 1a             |
| `src/lib/repositories/process-repository.ts`    | Modified | 1a, 1b, 1j     |
| `src/lib/repositories/reception-repository.ts`  | Modified | 1a, 1d, 1e, 1j |
| `src/lib/repositories/technician-repository.ts` | Modified | 1a, 1c, 1j     |
| `src/lib/repositories/supervisor-repository.ts` | Modified | 1a, 1f, 1g, 1j |
| `src/lib/repositories/results-repository.ts`    | Modified | 1a, 1h, 1i, 1j |

**7 files total** (2 new, 5 modified). No component, action, or page files are touched.
