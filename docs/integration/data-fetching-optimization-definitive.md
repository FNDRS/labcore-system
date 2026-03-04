# Data Fetching Architecture — Definitive Guide

A standardized, performance-first data fetching model for `/recepcion`, `/technician`, and `/supervisor` — eliminating query waterfalls, leveraging SSR with streaming Suspense, normalizing action contracts, and unifying patterns across all domains.

---

## 1. Purpose & Scope

This document is the single source of truth for how data flows from Amplify/AppSync through the server to the client across the three core route families. It covers:

1. **SSR-first rendering** with React Server Components (RSC).
2. **Suspense-first loading UX** at route, section, and action levels.
3. **Query waterfall elimination** via Amplify `selectionSet` eager loading.
4. **Normalized server action contracts** with typed results and error mapping.
5. **Repository design** with per-use-case selection sets and domain DTOs.
6. **Component composition** following compound-component and provider patterns.
7. **Caching and revalidation** using `React.cache()`, LRU, and `router.refresh()`.

---

## 2. Problem Statement

The current implementation suffers from three systemic issues:

| Issue | Impact | Where |
|-------|--------|-------|
| **Sequential waterfalls** | 2–4 round trips per page load | Every repository except `listTechnicianSamples` |
| **Inconsistent hydration patterns** | Recepción is client-only; Technician is mixed; Supervisor is mostly RSC | Route-level architecture |
| **Missing error handling** | `errors` from Amplify responses are silently discarded | All repositories |

**The single highest-impact fix** is adopting Amplify's `selectionSet` for relational eager loading — collapsing N+1 query chains into single GraphQL round trips. The technician repository's `listTechnicianSamples` already demonstrates this pattern successfully.

### Additional Pain Points

- **Mixed hydration patterns:** Some routes use RSC; others rely on client `useEffect` fetch on mount.
- **Non-uniform action responses:** Inconsistent `ok/error` vs raw return values across actions.
- **Fragmented loading UX:** Not all route segments leverage `loading.tsx` + nested Suspense.
- **Duplicate fetch logic:** Similar data assembly (patient name building, results parsing, clinical flags) repeated across domains.

---

## 3. Schema Relationship Map

From `amplify/data/resource.ts`, the traversable relationships are:

```
WorkOrder ──belongsTo──▶ Patient
    │
    └──hasMany──▶ Sample ──belongsTo──▶ ExamType
                     │
                     └──hasOne──▶ Exam ──belongsTo──▶ ExamType
```

This means any model can eagerly traverse its relationships via `selectionSet`:

| Root Model | Reachable via Selection Set |
|------------|---------------------------|
| `WorkOrder` | `patient.*`, `samples.*`, `samples.exam.*`, `samples.examType.*` |
| `Sample` | `workOrder.*`, `workOrder.patient.*`, `examType.*`, `exam.*` |
| `Exam` | `sample.*`, `sample.workOrder.*`, `sample.workOrder.patient.*`, `examType.*` |

`AuditEvent` is **not** relationally linked — it uses `entityType`/`entityId` and always requires a separate query.

### Amplify Eager Loading Reference

Amplify Gen 2 supports eager loading through custom selection sets using dot notation:

```typescript
const { data } = await client.models.Team.get(
  { id: "MY_TEAM_ID" },
  { selectionSet: ["id", "members.*"] },
);
```

Key behaviors:
- `"relation.*"` fetches all scalar fields of the related model.
- `"relation.fieldName"` fetches only the specified field.
- `hasMany` relations return arrays; `hasOne`/`belongsTo` return single objects.
- The return type is automatically narrowed by TypeScript when using `as const`.

> Reference: [Amplify Custom Selection Sets](https://docs.amplify.aws/nextjs/build-a-backend/data/query-data/#fetch-only-the-data-you-need-with-custom-selection-set) and [Amplify Relationships](https://docs.amplify.aws/nextjs/build-a-backend/data/data-modeling/relationships/)

---

## 4. Standard Route Data Flow

Use this flow for all three domains:

```
page.tsx (Server Component, sync)
  → parse URL / searchParams
  → call domain repository function (typed, cached)
  → render shell + pass initial payload to client component
  → client handles only interaction state + mutations
```

### Rules

1. **Initial page data must be fetched on the server** — never in client `useEffect`.
2. **URL is the source of truth** for filters, sort order, and pagination cursor.
3. **Filter changes trigger navigation** (`router.replace` / `router.push`) to cause a new SSR pass — no client-side data fetching needed for filter changes.
4. **Mutations return typed action results** and then:
   - Optimistic local patch when safe, **or**
   - `router.refresh()` when consistency is required.
5. **Start data promises early in RSC**, await as low as possible behind Suspense boundaries. Do not block the entire page for secondary/expensive panels (analytics, history, audit timelines).

This aligns with:
- **Vercel/async-suspense-boundaries**: Use Suspense to stream content instead of blocking the page.
- **Vercel/server-parallel-fetching**: Restructure components to parallelize fetches.
- **Vercel/async-parallel**: Use `Promise.all()` for independent operations.
- **Next.js data patterns**: Server Components for initial data, Server Actions for mutations.

---

## 5. Suspense & Loading UX Standard

### 5.1 Three Loading Layers

Use three loading layers at every route:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Route-level skeleton** | `loading.tsx` per major segment | Instant navigation feedback; shell renders while RSC tree resolves. |
| **Section-level Suspense** | `<Suspense>` in page layout | Independent streaming for KPI cards, main table/list, detail panel. |
| **Action-level pending UI** | `useTransition` + inline spinners | Non-blocking feedback during filter/tab changes and mutations. |

### 5.2 Loading UX Blueprint (Per Route Family)

For each route family, apply:

1. **`loading.tsx`** for the route skeleton.
2. **Main page** with parallel Suspense boundaries:
   - Suspense boundary for summary/KPI cards.
   - Suspense boundary for primary list/table.
   - Suspense boundary for detail/history side panel.
3. **Client interactions**:
   - `useTransition` for filter/tab/range updates.
   - Deterministic empty/error states per section.

This ensures no blank screens and no full-page jank during refetch.

### 5.3 Strategic Suspense Boundaries

For pages with independent data sections, use **parallel Suspense boundaries** so one slow query never blocks another:

```tsx
export default function SupervisorDashboard() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Suspense fallback={<StatsCardsSkeleton />}>
        <DashboardStats />
      </Suspense>
      <Suspense fallback={<PendingListSkeleton />}>
        <PendingValidationPreview />
      </Suspense>
    </div>
  );
}

async function DashboardStats() {
  const stats = await getDashboardStats();
  return <StatsCards stats={stats} />;
}

async function PendingValidationPreview() {
  const pending = await listPendingValidation({ limit: 5 });
  return <PendingList items={pending} />;
}
```

Both fetches start simultaneously. Stats and pending list stream in independently.

### 5.4 When NOT to Use Suspense Boundaries

Per Vercel guidance:
- **SEO-critical content** above the fold that must be in the initial HTML.
- **Layout-affecting data** where a loading → content transition would cause layout shift.
- **Small, fast queries** where the Suspense overhead isn't justified.

### 5.5 Skeleton Design Principles

- Skeletons should match the final layout geometry to prevent layout shift.
- Use CSS `content-visibility: auto` with `contain-intrinsic-size` on list items for off-screen rendering optimization.
- Skeleton components should be co-located with their data component for maintainability.

---

## 6. Server Action Contract Standard

### 6.1 Normalized Response Shape

All read actions and mutation actions return a normalized shape:

```typescript
type ActionResult<T> =
  | { ok: true; data: T; meta?: { nextToken?: string | null } }
  | { ok: false; error: { code: string; message: string; retryable?: boolean; details?: unknown } };
```

### 6.2 Amplify Error Mapping

`cookieBasedClient` returns GraphQL errors with `GraphQLFormattedError` shape (`message`, `errorType`, `errorInfo`, optional `path`, optional `extensions`). Standardize the mapping:

| ActionResult field | Source |
|-------------------|--------|
| `error.code` | `errorType` (fallback: `UNKNOWN_GRAPHQL_ERROR`) |
| `error.message` | Safe normalized message |
| `error.details` | `{ path, errorInfo, extensions }` (server logs + optional client diagnostics) |

### 6.3 Rules

- **Never throw raw Amplify errors** to client components.
- **Convert Amplify `errors` array** into domain error codes.
- **Log full error server-side**; expose safe message client-side.
- **For reads**, include pagination metadata in `meta`.
- **For mutations**, validate input first, authenticate, authorize, then perform.

### 6.4 Shared Error Mapper

```typescript
type GraphQLErrorLike = {
  message: string;
  errorType?: string;
  errorInfo?: Record<string, unknown> | null;
  path?: ReadonlyArray<string | number>;
  extensions?: Record<string, unknown>;
};

function toRepositoryError(
  fallbackCode: string,
  errors: readonly GraphQLErrorLike[] | undefined,
) {
  const first = errors?.[0];
  return {
    ok: false as const,
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
```

### 6.5 Action Responsibility Matrix

| Responsibility | Implementation |
|---------------|----------------|
| **Initial page data** | RSC async component → repository function |
| **Filter/pagination refetch** | URL searchParams change → RSC re-render |
| **User interaction queries** (scan, search, detail panel) | Server action → repository function |
| **Mutations** (approve, reject, save draft) | Server action with auth check |
| **Post-mutation refresh** | `router.refresh()` to re-run RSC tree |

### 6.6 Auth Standard

Every server action must authenticate and authorize. Server actions are exposed as public endpoints — treat them like API routes:

```typescript
"use server";

export async function someAction(input: SomeInput) {
  const ctx = await runWithAmplifyServerContext();
  await requireAuthWithGroup(ctx, "tecnico");
  const user = await getCurrentUser();
  // ... business logic
}
```

### 6.7 Mutation → Refresh Flow

```tsx
"use client";

function SomeForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await someMutationAction(formData);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit}>
      <button disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
```

Use `useTransition` over manual `useState` loading states — it provides built-in `isPending`, automatic error resilience, and interrupt handling.

---

## 7. Repository Design Standard

### 7.1 Interface Contract

Each domain repository exposes:

- `list*Query(input): Promise<DomainListDTO>`
- `get*DetailQuery(id): Promise<DomainDetailDTO | null>`
- `lookup*Query(code): Promise<DomainRowDTO | null>`

### 7.2 Responsibilities

| Do | Don't |
|----|-------|
| Build optimized Amplify query with minimal `selectionSet` | Fetch in client components for initial render data |
| Parse/validate response + map to domain DTO | Scatter relationship resolution across server actions and components |
| Handle nullability and relation safety | Call `list` then N `get` if relation can be eager-loaded |
| Return typed errors or null; no UI formatting logic | Return raw Amplify response shapes to consumers |
| Define per-use-case `*_SELECTION` constants | Use broad `*` selection in performance-sensitive lists |

### 7.3 Selection Set Rules

- Define per-use-case constants (`*_SELECTION`) in the repository file.
- Include only fields needed by the current screen/DTO.
- Use explicit dotted fields (`"patient.firstName"`) over broad `"patient.*"` in list queries.
- Use nested relations only when actually consumed on initial render.
- Keep detail view selection separate from list selection.
- Use `as const` for full type inference.

### 7.4 Error-Aware Fetching

Always destructure and inspect both `data` and `errors`:

```typescript
const { data, errors } = await client.models.Exam.list({ ... });
if (errors?.length) {
  console.error(`[${functionName}] Amplify errors:`, errors);
  return null;
}
```

**Rules:**
1. Always destructure `errors` alongside `data`.
2. Log errors with the function name for traceability.
3. For queries (reads): log + return null/empty. Let the UI handle empty states.
4. For mutations (writes): log + throw to surface the error to the caller/action.
5. Never swallow errors silently.

### 7.5 Repository Helpers

```typescript
function assertRequiredFields<T>(entity: T, keys: (keyof T)[]): boolean;
function safeParseJson(value: unknown): Record<string, unknown> | null;
function toRepositoryError(code: string, amplifyErrors: GraphQLErrorLike[]): ActionResult<never>;
```

---

## 8. Repository Query Optimization

### 8.1 Optimization Summary

| Repository | Function | Current Round Trips | Optimized | Technique |
|------------|----------|:-------------------:|:---------:|-----------|
| `reception` | `listReceptionOrders` | 3 | **1+1** | WO → patient + samples via selectionSet; ExamType as static cache |
| `reception` | `lookupOrderByCode` | 3 | **1+1** | Same pattern after WO lookup |
| `technician` | `listTechnicianSamples` | 1 | **1** | Already optimized |
| `technician` | `getSampleDetail` | 4+ | **1+1** | Sample → deep selectionSet; AuditEvent separate |
| `process` | `getProcessContext` | 2 | **1** | Sample → exam + examType via selectionSet |
| `supervisor` | `listPendingValidation` | 4 | **1** | Exam → sample.workOrder.patient + examType |
| `supervisor` | `getValidationDetail` | 4 | **1** | Exam → deep selectionSet |
| `results` | `listCompletedWorkOrders` | 4 full scans | **1** | WO → patient + samples.exam via selectionSet |
| `results` | `getWorkOrderConsolidatedResults` | 3 | **1** | WO → deep selectionSet |

### 8.2 Concrete Selection Sets

#### `process-repository.ts` — `getProcessContext`

**Current**: `Sample.get` → `Promise.all([Exam.list, ExamType.get])` = 2 round trips + unused console.logs.

**Target** (1 round trip):

```typescript
const PROCESS_CONTEXT_SELECTION = [
  "id",
  "barcode",
  "workOrderId",
  "examTypeId",
  "status",
  "collectedAt",
  "receivedAt",
  // Exam (hasOne)
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
  // ExamType (belongsTo)
  "examType.id",
  "examType.code",
  "examType.name",
  "examType.sampleType",
  "examType.fieldSchema",
] as const;

export async function getProcessContext(sampleId: string): Promise<ProcessContext | null> {
  if (!sampleId.trim()) return null;

  const { data: sample, errors } = await cookieBasedClient.models.Sample.get(
    { id: sampleId },
    { selectionSet: PROCESS_CONTEXT_SELECTION }
  );

  if (errors?.length) {
    console.error("[getProcessContext] Amplify errors:", errors);
    return null;
  }
  if (!sample?.id || !sample.workOrderId || !sample.examTypeId) return null;

  const exam = sample.exam;
  const examType = sample.examType;
  if (!exam?.id || !examType?.id) return null;

  const fieldSchema = parseFieldSchema(examType.fieldSchema);
  if (!fieldSchema) return null;

  return {
    sample: {
      id: sample.id,
      barcode: sample.barcode ?? null,
      workOrderId: sample.workOrderId,
      examTypeId: sample.examTypeId,
      status: sample.status ?? null,
      collectedAt: sample.collectedAt ?? null,
      receivedAt: sample.receivedAt ?? null,
    },
    exam: {
      id: exam.id,
      sampleId: exam.sampleId,
      examTypeId: exam.examTypeId,
      status: (exam.status as ExamStatus) ?? null,
      results: parseResults(exam.results),
      startedAt: exam.startedAt ?? null,
      resultedAt: exam.resultedAt ?? null,
      performedBy: exam.performedBy ?? null,
      notes: exam.notes ?? null,
      validatedBy: exam.validatedBy ?? null,
      validatedAt: exam.validatedAt ?? null,
      updatedAt: exam.updatedAt ?? null,
    },
    examType: {
      id: examType.id,
      code: examType.code,
      name: examType.name,
      sampleType: examType.sampleType ?? null,
      fieldSchema,
    },
  };
}
```

#### `reception-repository.ts` — `listReceptionOrders`

**Current**: `WO.list` + `ExamType.list` → `Sample.list × N` → `Patient.get × M` = 3 round trips, N+1 on samples.

**Target** (1 main query + 1 static reference):

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
  // Patient (belongsTo) — eliminates Patient.get batch
  "patient.id",
  "patient.firstName",
  "patient.lastName",
  "patient.dateOfBirth",
  // Samples (hasMany) — eliminates N parallel Sample.list calls
  "samples.id",
  "samples.status",
] as const;
```

ExamType is a static reference table (code→name mapping). Cache it with `React.cache()`:

```typescript
const getExamTypeMap = cache(async (): Promise<Map<string, string>> => {
  const { data: examTypes, errors } = await cookieBasedClient.models.ExamType.list({
    selectionSet: ["code", "name"],
  });
  if (errors?.length) console.error("[getExamTypeMap] errors:", errors);
  return new Map((examTypes ?? []).map((et) => [et.code, et.name]));
});
```

Result: **1 query** fetches WorkOrders + Patients + Samples. ExamType is cached and shared across functions via `React.cache()`.

#### `supervisor-repository.ts` — `listPendingValidation`

**Current**: `Exam.list` → (`Sample.get × N` + `ExamType.get × N`) → `WorkOrder.get × M` → `Patient.get × K` = 4 round trips.

**Target** (1 round trip):

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
  // Sample → WorkOrder → Patient (3 levels deep)
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
  // ExamType for fieldSchema
  "examType.id",
  "examType.code",
  "examType.name",
  "examType.sampleType",
  "examType.fieldSchema",
] as const;
```

One GraphQL call returns exam + sample + workOrder + patient + examType. All 4 round trips → 1.

#### `supervisor-repository.ts` — `getValidationDetail`

Same selection set as above, targeting `Exam.get` instead of `Exam.list`.

#### `results-repository.ts` — `listCompletedWorkOrders`

**Current**: 4 parallel full table scans (`WorkOrder.list` + `Patient.list` + `Sample.list` + `Exam.list`), then in-memory join.

**Target** (1 query):

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

> Note: This still scans all WorkOrders, but it's a single GraphQL resolver instead of 4 independent DynamoDB scans. For production scale, add `filter: { status: { eq: "completed" } }` or use a secondary index.

#### `results-repository.ts` — `getWorkOrderConsolidatedResults`

**Current**: `WO.get` → (`Patient` + `Samples`) → (`Exam × N` + `ExamType × M`) = 3 round trips.

**Target** (1 round trip):

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

#### `technician-repository.ts` — `getSampleDetail`

**Current**: `Sample.get` → (`WO` + `ExamType` + `AuditEvent` + `Exam.list`) → (`WO audit` + `Exam audits`) → `Patient.get` = 4+ round trips.

**Target** (1 query + 1 AuditEvent batch):

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

AuditEvent queries remain separate (no schema relationship), but are parallelized via `Promise.all`:

```typescript
const { data: sample, errors } = await client.models.Sample.get(
  { id: sampleId },
  { selectionSet: SAMPLE_DETAIL_SELECTION }
);
if (errors?.length || !sample?.id) return null;

const examIds = sample.exam?.id ? [sample.exam.id] : [];
const [sampleAudits, woAudits, ...examAudits] = await Promise.all([
  client.models.AuditEvent.list({ filter: { and: [
    { entityType: { eq: "SAMPLE" } },
    { entityId: { eq: sampleId } },
  ]}}),
  client.models.AuditEvent.list({ filter: { and: [
    { entityType: { eq: "WORK_ORDER" } },
    { entityId: { eq: sample.workOrder.id } },
  ]}}),
  ...examIds.map((id) =>
    client.models.AuditEvent.list({ filter: { and: [
      { entityType: { eq: "EXAM" } },
      { entityId: { eq: id } },
    ]}})
  ),
]);
```

2 round trips instead of 4+. The AuditEvent queries are irreducible without a schema change.

### 8.3 Index and Filter Discipline

Based on `amplify/data/resource.ts`:

- Use indexed fields for heavy filters:
  - `Sample`: `workOrderId`, `examTypeId`, `status`
  - `Exam`: `sampleId`, `examTypeId`, `status`
  - `WorkOrder`: add index for `accessionNumber` if scan lookup is hot-path
- Keep paginated list queries bounded (`limit`, `nextToken`).
- Avoid full scans for dashboard metrics where incremental or pre-aggregated reads can be used.

---

## 9. SSR & Suspense Architecture

### 9.1 Target Hydration Pattern (Standardized)

All three routes converge on one composition pattern:

```
page.tsx (RSC, sync layout)
  └── <Suspense fallback={<Skeleton />}>
        └── AsyncDataLoader (RSC, async — fetches data)
              └── ClientInteractiveShell (client — receives props via provider)
```

This follows the **Vercel composition pattern**: the RSC async component owns data fetching, the client component owns interaction state. State is dependency-injected via a provider — the client shell doesn't know or care how data was fetched.

| Route | Current | Target |
|-------|---------|--------|
| `/recepcion` | Client-only (`useEffect`) | RSC with Suspense → client shell |
| `/technician` | RSC (dashboard), client (muestras) | All RSC with Suspense |
| `/technician/muestras` | Client `useEffect` → server action | RSC with Suspense; URL-driven filters |
| `/technician/muestras/process/[id]` | RSC | Already correct — refine selectionSet |
| `/supervisor/*` | RSC | Already correct — refine queries |

### 9.2 Recepción Conversion to RSC

**Largest architectural change.** Current flow:

```
page.tsx → ReceptionInboxClient → useReceptionInbox → useEffect → fetchReceptionOrders
```

Target:

```
page.tsx (RSC)
  └── <Suspense fallback={<ReceptionSkeleton />}>
        └── ReceptionDataLoader (RSC, async)
              ├── fetches: listReceptionOrders(filtersFromSearchParams)
              └── renders: <ReceptionInboxClient initialOrders={orders} initialFilters={filters} />
  </Suspense>
```

**Filter refetch**: Use `router.push` with new searchParams (same pattern as `supervisor/validaciones`). This triggers a full RSC re-render with new filters applied server-side.

**Mutations** (generate specimens, mark printed, mark ready): Continue using server actions. After mutation, call `router.refresh()` to re-run the RSC tree.

**Barcode scan**: Remains a server action (`lookupReceptionOrderByCode`). This is an interaction-triggered lookup, not initial data.

### 9.3 Technician Muestras Conversion to RSC

Current flow:

```
page.tsx → MuestrasWorkstation → TechnicianWorkstationProvider → useEffect → fetchMuestrasAction
```

Target:

```
page.tsx (RSC)
  └── <Suspense fallback={<MuestrasSkeleton />}>
        └── MuestrasDataLoader (RSC, async)
              ├── fetches: listTechnicianSamples(), computeMuestrasSummary()
              └── renders: <MuestrasWorkstation initialSamples={samples} initialSummary={summary} />
  </Suspense>
```

**Detail panel**: When a sample is selected, `getSampleDetail(id)` stays as a server action triggered by user interaction. Wrap the detail panel in its own Suspense boundary to avoid blocking the list.

### 9.4 Minimize Serialization at RSC Boundaries

Per Vercel guidance (`server-serialization`): only pass fields that the client component actually uses. Do not pass the entire raw Amplify response — map to a minimal DTO in the RSC async component.

```tsx
// RSC: map to minimal shape before passing to client
async function ReceptionDataLoader({ searchParams }) {
  const orders = await listReceptionOrders(parseFilters(searchParams));
  return (
    <ReceptionInboxClient
      orders={orders.map(o => ({
        id: o.id,
        accessionNumber: o.accessionNumber,
        patientName: o.patientName,
        status: o.status,
        sampleCount: o.samples.length,
      }))}
    />
  );
}
```

Do not pass the same data in both sorted and unsorted form — do transformations in the client (`server-dedup-props`).

---

## 10. Component Composition Patterns

### 10.1 Provider-Based State Architecture

For interactive client components that receive SSR data, use the **compound component + provider** pattern:

```tsx
// Provider isolates state management from UI
function ReceptionProvider({
  initialOrders,
  initialFilters,
  children,
}: {
  initialOrders: ReceptionOrder[];
  initialFilters: ReceptionFilters;
  children: React.ReactNode;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [filters, setFilters] = useState(initialFilters);
  const router = useRouter();

  const actions = useMemo(() => ({
    updateFilter: (key: string, value: string) => {
      const params = new URLSearchParams(window.location.search);
      params.set(key, value);
      router.push(`?${params.toString()}`);
    },
    refreshOrders: () => router.refresh(),
  }), [router]);

  return (
    <ReceptionContext value={{ state: { orders, filters }, actions }}>
      {children}
    </ReceptionContext>
  );
}
```

### 10.2 Context Interface Contract

Define a generic interface with `state`, `actions`, and `meta` for dependency injection:

```typescript
interface ReceptionContextValue {
  state: {
    orders: ReceptionOrder[];
    filters: ReceptionFilters;
  };
  actions: {
    updateFilter: (key: string, value: string) => void;
    refreshOrders: () => void;
  };
  meta?: {
    isPending: boolean;
  };
}
```

UI components consume the interface, not the implementation. The same table/list component can work with different providers (e.g., a testing provider, a storybook provider).

### 10.3 Explicit Variants Over Boolean Props

Instead of one component with `isThread`, `isEditing`, `isDMThread` booleans, create explicit variant components. Each variant composes the pieces it needs:

```tsx
// Explicit variants for different reception views
function ReceptionInboxView() { /* queue list */ }
function ReceptionScanView() { /* barcode scanner */ }
function ReceptionDetailView({ orderId }: { orderId: string }) { /* order detail */ }
```

---

## 11. Caching & Revalidation Model

### 11.1 `React.cache()` for Per-Request Deduplication

Wrap repository functions called multiple times within a single RSC render:

```typescript
import { cache } from "react";

export const getProcessContext = cache(
  async (sampleId: string): Promise<ProcessContext | null> => {
    // ... implementation
  }
);

export const getDashboardStats = cache(
  async (): Promise<SupervisorDashboardStats> => {
    // ... implementation
  }
);
```

This ensures that if `getDashboardStats` is called from both a stats component and a notification badge in the same render, only one Amplify query executes.

**Important**: `React.cache()` uses `Object.is` for argument comparison. Avoid passing inline objects as arguments — pass primitives or the same object reference.

### 11.2 ExamType Reference Cache

ExamType is a small, slowly-changing reference table. Cache it per-request:

```typescript
import { cache } from "react";

export const getExamTypeCodeMap = cache(async (): Promise<Map<string, string>> => {
  const { data, errors } = await cookieBasedClient.models.ExamType.list({
    selectionSet: ["code", "name"],
  });
  if (errors?.length) console.error("[getExamTypeCodeMap]", errors);
  return new Map((data ?? []).map((et) => [et.code, et.name]));
});
```

### 11.3 Cross-Request Caching (LRU)

`React.cache()` only deduplicates within a single request. For data shared across sequential requests (e.g., ExamType lookup table that rarely changes), consider an LRU cache:

```typescript
import { LRUCache } from "lru-cache";

const examTypeCache = new LRUCache<string, Map<string, string>>({
  max: 10,
  ttl: 5 * 60 * 1000, // 5 minutes
});
```

### 11.4 Revalidation Rules

| Trigger | Strategy |
|---------|----------|
| Mutation completes | `router.refresh()` from client (re-runs RSC tree) |
| Broad invalidation needed | `revalidatePath(route)` in server action |
| Cache keys | Must include normalized filter input |
| Mutation actions | Never cache |
| Rapidly changing operational views | Request-level dedupe only (no long TTL) |

---

## 12. Shared Utilities

### 12.1 `parseResults`

Currently duplicated in `process-repository.ts`, `supervisor-repository.ts`, and `results-repository.ts`. Extract to shared:

```typescript
// src/lib/repositories/shared.ts
export function parseResults(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch { /* invalid JSON */ }
    return null;
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}
```

### 12.2 `buildPatientFullName`

```typescript
export function buildPatientFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Desconocido";
}
```

### 12.3 Clinical Flags

`parseReferenceRange`, `hasReferenceRangeViolation`, `deriveClinicalFlag` — duplicated in `supervisor-repository.ts` and `results-repository.ts`. Move to:

```
src/lib/repositories/shared.ts    — parseResults, buildPatientFullName, getExamTypeCodeMap
src/lib/clinical-flags.ts         — parseReferenceRange, hasReferenceRangeViolation, deriveClinicalFlag
```

---

## 13. Type Safety with Selection Sets

When using `selectionSet`, Amplify narrows the return type. Use the `SelectionSet` helper for full type safety:

```typescript
import type { SelectionSet } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const PROCESS_CONTEXT_SELECTION = [/* ... */] as const;

type ProcessSampleData = SelectionSet<
  Schema["Sample"]["type"],
  typeof PROCESS_CONTEXT_SELECTION
>;
```

This gives full type safety on the returned object — `sample.exam.status` is typed, `sample.exam.nonexistent` is a compile error. Combined with `as const` on the selection array, the TypeScript compiler can validate that every field access in your mapping code corresponds to a field in the selection set.

---

## 14. Domain-by-Domain Conversion Plan

### 14.1 `/recepcion`

**Target state:**
- Move initial list fetch to RSC page loader (`page.tsx` async + Suspense).
- Client provider receives `initialOrders` + `initialNextToken`.
- Scanning and mutations remain server actions, using standardized action result contract.
- Filters driven by URL searchParams.

**Query improvements:**
- 1 main query with `RECEPTION_WO_SELECTION` (WO + patient + samples).
- ExamType cached via `React.cache()`.
- Eliminate per-order `Sample.list` fan-out.

### 14.2 `/technician`

**Target state:**
- `/technician` dashboard already close to desired model (RSC + Suspense + cache).
- `/technician/muestras` moves from client-on-mount to SSR initial hydration.
- Client provider handles only interactive workstation state.

**Query improvements:**
- Preserve optimized `listTechnicianSamples` selection strategy.
- Refactor `getSampleDetail` using `SAMPLE_DETAIL_SELECTION` + parallel AuditEvent queries.
- Refactor `getProcessContext` to one `Sample.get` with relationship selection.

### 14.3 `/supervisor`

**Target state:**
- Maintain RSC-first baseline across dashboard, validaciones, resultados, analitica, incidencias, auditoria.
- Enforce shared filter parser + cache key normalization for all URL-driven lists.
- Parallel Suspense boundaries for dashboard sections.

**Query improvements:**
- `listPendingValidation`: single query with `VALIDATION_EXAM_SELECTION`.
- `getValidationDetail`: single query via `Exam.get` with same selection.
- `listCompletedWorkOrders`: single query with `RESULTS_WO_SELECTION`.
- `getWorkOrderConsolidatedResults`: single query with `CONSOLIDATED_WO_SELECTION`.
- Separate heavy analytics sections into deferred Suspense blocks.

---

## 15. Implementation Plan

### Phase 1: Query Optimization (Zero UI changes)

Refactor repository files only. No changes to components, actions, or page structure.

| Task | File | Impact |
|------|------|--------|
| 1a. Extract shared utilities | New `shared.ts`, `clinical-flags.ts` | Deduplication |
| 1b. Fix `getProcessContext` | `process-repository.ts` | 2 → 1 round trip |
| 1c. Optimize `getSampleDetail` | `technician-repository.ts` | 4+ → 2 round trips |
| 1d. Optimize `listReceptionOrders` | `reception-repository.ts` | 3 → 1+1 round trips |
| 1e. Optimize `lookupOrderByCode` | `reception-repository.ts` | 3 → 1+1 round trips |
| 1f. Optimize `listPendingValidation` | `supervisor-repository.ts` | 4 → 1 round trip |
| 1g. Optimize `getValidationDetail` | `supervisor-repository.ts` | 4 → 1 round trip |
| 1h. Optimize `listCompletedWorkOrders` | `results-repository.ts` | 4 scans → 1 query |
| 1i. Optimize `getWorkOrderConsolidatedResults` | `results-repository.ts` | 3 → 1 round trip |
| 1j. Add error handling to all queries | All repositories | Observability |

**Validation**: Run existing pages. Since repositories return the same shapes, UI should be unchanged. Compare response times before/after.

### Phase 2: SSR Conversion (Recepción)

| Task | File | Impact |
|------|------|--------|
| 2a. Create `ReceptionDataLoader` async RSC | New component | SSR initial data |
| 2b. Convert `page.tsx` to use Suspense + loader | `recepcion/page.tsx` | Server-rendered list |
| 2c. Adapt `ReceptionInboxClient` to accept `initialOrders` prop | Existing component | Hydrate from RSC |
| 2d. Convert filter changes to `router.push` with searchParams | Client component | URL-driven refetch |
| 2e. Remove `useEffect` data fetching from `useReceptionInbox` | Hook | Eliminate client fetch |

### Phase 3: SSR Conversion (Technician Muestras)

| Task | File | Impact |
|------|------|--------|
| 3a. Create `MuestrasDataLoader` async RSC | New component | SSR initial data |
| 3b. Convert `page.tsx` to use Suspense + loader | `muestras/page.tsx` | Server-rendered list |
| 3c. Adapt `TechnicianWorkstationProvider` to accept `initialSamples` | Provider | Hydrate from RSC |
| 3d. Keep `getSampleDetail` as server action for panel | Action | Interaction-triggered |

### Phase 4: Suspense Boundary Refinement (All Routes)

| Task | Impact |
|------|--------|
| 4a. Add parallel Suspense boundaries to supervisor dashboard | Independent streaming |
| 4b. Add Suspense boundary for technician detail panel | Non-blocking detail load |
| 4c. Add Suspense boundary for analytics detailed charts | Progressive loading |
| 4d. Create domain-specific skeleton components | Polished loading states |
| 4e. Add `loading.tsx` to all major route segments | Route-level instant feedback |

---

## 16. Performance Expectations

| Metric | Current (worst case) | After Phase 1 | After Phase 2–4 |
|--------|---------------------|---------------|-----------------|
| `getProcessContext` latency | ~600ms (2 sequential calls) | ~300ms (1 call) | ~300ms |
| `listPendingValidation` latency | ~1200ms (4 sequential rounds) | ~300ms (1 call) | ~300ms |
| `listReceptionOrders` latency | ~900ms (3 rounds, N+1) | ~400ms (1+1 calls) | TTFB ~400ms, streams via Suspense |
| `listCompletedWorkOrders` | ~800ms (4 full scans) | ~400ms (1 scan) | ~400ms, streams via Suspense |
| Recepción Time to Interactive | ~1.5s (client fetch after hydration) | ~1.5s (unchanged) | ~600ms (SSR, no client fetch) |
| Technician Muestras TTI | ~1.2s (client fetch after hydration) | ~1.2s (unchanged) | ~500ms (SSR) |

Latency estimates assume ~300ms per Amplify/AppSync round trip. Actual gains depend on payload size and DynamoDB read units.

---

## 17. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Deep selection sets may return large payloads | Use field-level selection (`"patient.firstName"`) instead of `"patient.*"` where possible |
| `hasMany` in selection sets returns unbounded lists | Amplify's GraphQL resolvers apply default limits; monitor payload sizes |
| Recepción SSR conversion is a significant refactor | Phase 2 is isolated — the `ReceptionInboxClient` interface stays the same, only the data source changes |
| `React.cache()` only deduplicates within a single request | Sufficient for SSR; for cross-request caching, consider LRU on ExamType |
| AuditEvent queries remain multi-round-trip | No schema relationship exists; consider adding a `sampleId` index on AuditEvent or a dedicated audit relationship in a future schema revision |
| RSC boundary serialization overhead on large datasets | Map to minimal DTOs before passing to client components; use pagination to bound result sets |
| Filter-driven URL navigation causes full RSC re-render | This is intentional — it ensures data consistency. Use `useTransition` to keep the UI responsive during the re-render |

---

## 18. Acceptance Criteria

- [ ] All three domains use SSR for initial data payload.
- [ ] No initial client `useEffect` fetch for critical page data.
- [ ] Repository reads handle Amplify `errors` explicitly.
- [ ] Waterfall hotspots replaced with relationship `selectionSet` queries where schema allows.
- [ ] Uniform `ActionResult<T>` contract across read/mutation operations.
- [ ] Route-level `loading.tsx` and section-level Suspense boundaries present for every route family.
- [ ] Shared utilities extracted (`parseResults`, `buildPatientFullName`, `getExamTypeCodeMap`, clinical flags).
- [ ] Type-safe selection sets using `as const` + `SelectionSet<>` helper.
- [ ] Mutations use `useTransition` for pending state and `router.refresh()` for data consistency.
- [ ] Skeleton components match final layout geometry (no layout shift).

---

## 19. References

### Amplify
- [Custom Selection Sets](https://docs.amplify.aws/nextjs/build-a-backend/data/query-data/#fetch-only-the-data-you-need-with-custom-selection-set)
- [Relationship Modeling](https://docs.amplify.aws/nextjs/build-a-backend/data/data-modeling/relationships/)

### Next.js / React
- [Next.js Data Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Server Actions Authentication](https://nextjs.org/docs/app/guides/authentication)
- [React.cache()](https://react.dev/reference/react/cache)
- [React useTransition](https://react.dev/reference/react/useTransition)
- [React `use()` API](https://react.dev/reference/react/use)

### Vercel Engineering Guidelines
- **Eliminating Waterfalls**: `async-parallel`, `async-suspense-boundaries`, `async-defer-await`
- **Server Performance**: `server-cache-react`, `server-parallel-fetching`, `server-serialization`, `server-dedup-props`, `server-auth-actions`
- **Bundle Optimization**: `bundle-dynamic-imports`, `bundle-defer-third-party`
- **Re-render Optimization**: `rerender-transitions`, `rerender-functional-setstate`, `rerender-derived-state-no-effect`
- **Composition Patterns**: `architecture-compound-components`, `state-context-interface`, `patterns-explicit-variants`
