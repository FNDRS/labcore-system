# Data fetching analysis

Analysis of how each area of the app fetches data. Intended as a baseline for later refactors or consolidation.

---

## Recepcion (`/recepcion`)

### Entry points

| File                         | Type             | Data fetching                   |
| ---------------------------- | ---------------- | ------------------------------- |
| `page.tsx`                   | Server component | None — renders client tree only |
| `recepcion-inbox-client.tsx` | Client component | Uses `useReceptionInbox` hook   |

### Flow

```
page.tsx → ReceptionInboxClient → useReceptionInbox → actions.ts → reception-repository.ts → Amplify Data
```

### Where data is fetched

All fetching is **client-triggered** via the `useReceptionInbox` hook:

1. **Initial load:** `loadOrders()` runs in `useEffect` on mount
2. **Pagination:** `loadMore()` when user clicks "Cargar más órdenes"
3. **Refetch after mutations:** `loadOrders()` after `markLabelsPrintedAction` or `markReadyForLabAction`
4. **Barcode lookup:** `lookupReceptionOrderByCode()` when a scanned code isn’t in the local list

### Server actions (`actions.ts`)

| Action                                      | Purpose                                             |
| ------------------------------------------- | --------------------------------------------------- |
| `fetchReceptionOrders(filters, pagination)` | List orders with server-side filters and pagination |
| `lookupReceptionOrderByCode(code)`          | Resolve order by accession or id (for scanning)     |
| `generateSpecimensAction(workOrderId)`      | Create specimens for an order                       |
| `markLabelsPrintedAction(workOrderId)`      | Mark labels printed                                 |
| `markReadyForLabAction(workOrderId)`        | Mark order ready for lab                            |

All use `runWithAmplifyServerContext` for auth; mutations use `getCurrentUser()` for `userId`.

### Repository (`reception-repository.ts`)

- **Entry:** `listReceptionOrders(filters, pagination)` and `lookupOrderByCode(code)`
- **Client:** `cookieBasedClient` (Amplify Data)
- **Models:** `WorkOrder`, `Sample`, `Patient`, `ExamType`

#### `listReceptionOrders` sequence

1. **Parallel fetch:** `ExamType.list` + `WorkOrder.list`
   - Work orders: `status !== "completed"`, paginated (limit 50, `nextToken`)
   - Selection sets minimize payload

2. **Samples per work order:** `Sample.list` for each `WorkOrder.id` (N parallel calls)

3. **Filter candidates:** Reception-relevant only (`Sin muestras`, or `Muestras creadas` from today)

4. **Apply quick filter:** `Hoy`, `Urgentes`, `Sin muestras`, `Listas` (server-side)

5. **Batch patients:** `Patient.get` for unique `patientId`s

6. **Enrich + search:** Attach patient names/ages, apply search filter

7. **Sort and return:** `{ orders, nextToken, hasMore }`

#### `lookupOrderByCode` sequence

1. Try `WorkOrder.list` with `accessionNumber = code` (status ≠ completed)
2. If none, try `WorkOrder.get({ id: code })`
3. Fetch `Patient` + `Sample` for that order
4. Fetch `ExamType` for test names
5. Map to `ReceptionOrder` and return

### Client-side filtering

`filterAndSortOrders(orders, debouncedSearch, activeFilter)` in `utils.ts` runs on the fetched `orders` — search and quick filter can be applied both server- and client-side depending on flow.

### Summary

| Aspect             | Notes                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| **Trigger**        | Client-only (no RSC data fetch)                                                             |
| **Pattern**        | Server Actions → repository → Amplify                                                       |
| **Auth**           | Amplify server context (cookies)                                                            |
| **Pagination**     | `nextToken` cursor, page size 50                                                            |
| **Optimizations**  | Selection sets, batch patient fetch, reception-relevance filter                             |
| **Waterfall risk** | WorkOrder → Sample (parallel per WO) → Patient (parallel batch) — multi-round-trip per page |

---

## Technician (`/technician`)

Technician uses a mix of **RSC (server component) data fetch** and **client-triggered server actions**. Subfolders vary widely: some hydrate from RSC, some fetch entirely on the client, and several are placeholders with no data.

### Root: Dashboard (`page.tsx`)

| File                   | Type             | Data fetching                                                           |
| ---------------------- | ---------------- | ----------------------------------------------------------------------- |
| `page.tsx`             | Server component | RSC fetch via async `DashboardContent`                                  |
| `dashboard-client.tsx` | Client           | Receives props; also uses `lookupSampleByBarcodeAction` for scan dialog |

**Flow:**

```
page.tsx → Suspense → DashboardContent (async) → fetchOperativeDashboard() → technician-repository
                   → DashboardHeader, NextSampleCard, DashboardQueueSection (props)
```

- **RSC fetch:** `fetchOperativeDashboard()` is called in an async server component, wrapped in `Suspense` with `DashboardSkeleton` fallback.
- **Cached:** Uses `cache()` from React, so repeated requests within the same render are deduplicated.

### Subfolder: `muestras/`

| File                                 | Type             | Data fetching                                       |
| ------------------------------------ | ---------------- | --------------------------------------------------- |
| `page.tsx`                           | Server component | None — passes `searchParams.sample` to client       |
| `muestras-client.tsx`                | Client           | Wraps content in `TechnicianWorkstationProvider`    |
| `technician-workstation-context.tsx` | Client           | All data via server actions on mount + interactions |

**Flow:**

```
muestras/page.tsx → MuestrasWorkstation(initialSampleId) → TechnicianWorkstationProvider
                                                       → loadSamples (useEffect) → fetchMuestrasAction
                                                       → getSampleDetail (when panel opens)
                                                       → lookupSampleByBarcodeAction (on scan)
```

- **Client-triggered:** No RSC fetch. `TechnicianWorkstationProvider` calls `fetchMuestrasAction()` on mount.
- **Detail panel:** When user opens a sample panel, `getSampleDetail(id)` runs (server action).
- **Scan:** `lookupSampleByBarcodeAction(code)` for barcode lookup.

### Subfolder: `muestras/process/[id]/`

| File                             | Type             | Data fetching                                                             |
| -------------------------------- | ---------------- | ------------------------------------------------------------------------- |
| `page.tsx`                       | Server component | RSC fetch via `getProcessContext(sampleId)`                               |
| `process-sample-workspace.tsx`   | Client           | Receives `context` from RSC, passes to provider                           |
| `process-workspace-provider.tsx` | Client           | Hydrates from `initialContext`; uses process actions for mutations        |
| `actions.ts`                     | Server           | Mutations: markExamStarted, saveExamDraft, finalizeExam, sendToValidation |

**Flow:**

```
page.tsx (async) → getProcessContext(id) [process-repository]
                → ProcessSampleWorkspace(context, displayId)
                → ProcessWorkspaceProvider(initialContext)
                → markExamStartedAction (useEffect when pending)
                → saveExamDraftAction, finalizeExamAction, sendToValidationAction (user actions)
```

- **RSC hydration:** `getProcessContext(sampleId)` runs in the async page. The result is passed as `initialContext` to `ProcessWorkspaceProvider`, which stores it in state — no client fetch for initial load.
- **Reload:** `onReload` calls `router.refresh()`, triggering a full RSC re-fetch of the page.

### Subfolder: `ordenes/`, `resultados/`, `settings/`, `personnel/`, `equipment/`, `requests/`, `reports/`

| Subfolder     | Data fetching                                                |
| ------------- | ------------------------------------------------------------ |
| `ordenes/`    | None — placeholder ("Próximamente")                          |
| `resultados/` | None — placeholder                                           |
| `settings/`   | None — `TechnicianSettingsClient` uses local `useState` only |
| `personnel/`  | None — placeholder                                           |
| `equipment/`  | None — placeholder                                           |
| `requests/`   | None — placeholder                                           |
| `reports/`    | None — placeholder                                           |

### Subfolder: `work-order/[workOrderId]/exam/[examId]/`

| File       | Type             | Data fetching                                                       |
| ---------- | ---------------- | ------------------------------------------------------------------- |
| `page.tsx` | Server component | None — placeholder; only renders workOrderId and examId from params |

### Server actions (`technician/actions.ts`)

| Action                        | Purpose                                            | Used by                                              |
| ----------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| `fetchOperativeDashboard`     | Dashboard: nextSample, queueRows, metrics (cached) | Root page (RSC)                                      |
| `fetchMuestrasAction`         | List samples + summary for muestras workstation    | TechnicianWorkstationProvider                        |
| `getSampleDetail`             | Sample detail + audit history for detail sheet     | TechnicianWorkstationProvider                        |
| `lookupSampleByBarcodeAction` | Barcode/ID lookup for scan                         | Dashboard scan dialog, TechnicianWorkstationProvider |
| `markReceivedAction`          | Mark sample received                               | TechnicianWorkstationProvider                        |
| `markInProgressAction`        | Mark in progress, navigate to process              | TechnicianWorkstationProvider                        |
| `markRejectedAction`          | Reject sample                                      | TechnicianWorkstationProvider                        |
| `markCompletedAction`         | Mark completed                                     | (exported, used elsewhere?)                          |
| `reprintLabelAction`          | Reprint label                                      | TechnicianWorkstationProvider                        |
| `reportProblemAction`         | Alias for markRejectedAction                       | —                                                    |

**Auth:** All require `requireTechnicianAuth()` (group "tecnico"); mutations use `getCurrentUser()` for `userId`.

**Mock mode:** `NEXT_PUBLIC_MOCK_TECHNICIAN=true` returns mock data for dashboard and muestras.

### Server actions (`technician/muestras/process/actions.ts`)

| Action                   | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `markExamStartedAction`  | pending → inprogress (on workspace mount) |
| `saveExamDraftAction`    | Save draft results                        |
| `finalizeExamAction`     | Finalize results before validation        |
| `sendToValidationAction` | Send to supervisor validation             |

All use `requireAuthWithGroup(ctx, "tecnico")` and `getCurrentUser()`.

### Repositories

#### `technician-repository.ts`

- **Entry points:** `listTechnicianSamples`, `getSampleDetail`, `lookupSampleByBarcode`, `getCompletedTodayCount`, `computeDashboardMetrics`, `computeMuestrasSummary`
- **Client:** `cookieBasedClient`
- **Models:** `Sample`, `WorkOrder`, `Patient`, `ExamType`, `AuditEvent`, `Exam`

**`listTechnicianSamples`:** Single `Sample.list` with selection set that eager-loads `workOrder`, `workOrder.patient`, `examType` — one GraphQL call, no N+1.

**`getSampleDetail`:** Sample.get → parallel WorkOrder.get, ExamType.get, AuditEvent.list, Exam.list → optional WorkOrder + Exam audit fetches → Patient.get. Multi-round-trip for detail view.

**`lookupSampleByBarcode`:** Sample.get or Sample.list by barcode → then `getSampleDetail` for the row shape.

**`getCompletedTodayCount`:** AuditEvent.list for SPECIMEN_COMPLETED today.

#### `process-repository.ts`

- **Entry point:** `getProcessContext(sampleId)`
- **Sequence:** Sample.get → parallel Exam.list, ExamType.get → map to ProcessContext
- **Models:** `Sample`, `Exam`, `ExamType`

### Hydration summary

| Route                               | Hydration pattern                                                         |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `/technician`                       | RSC: `fetchOperativeDashboard` in async component; Suspense with skeleton |
| `/technician/muestras`              | Client: `fetchMuestrasAction` on mount; `getSampleDetail` on panel open   |
| `/technician/muestras/process/[id]` | RSC: `getProcessContext` in async page; context passed as props to client |
| `/technician/settings`              | None (local state only)                                                   |
| Other subfolders                    | None (placeholders)                                                       |

### Summary

| Aspect             | Notes                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------- |
| **Trigger**        | Mixed: RSC (dashboard, process) + client (muestras)                                    |
| **Pattern**        | RSC async + Server Actions → repositories → Amplify                                    |
| **Auth**           | `requireAuthWithGroup("tecnico")` + Amplify server context                             |
| **Caching**        | `fetchOperativeDashboard` and `fetchMuestrasWorkstation` use React `cache()`           |
| **Optimizations**  | `listTechnicianSamples` uses selection set for eager load (single call)                |
| **Waterfall risk** | `getSampleDetail` has multiple round-trips (Sample → WO/ExamType/Audit/Exam → Patient) |

---

## Supervisor (`/supervisor`)

Supervisor uses **RSC data fetch** as the primary pattern, with **client-triggered server actions** for mutations, search, and progressive loading (analytics detailed charts, incidencias load more, etc.).

### Root: Dashboard (`page.tsx`)

| File                              | Type             | Data fetching                                    |
| --------------------------------- | ---------------- | ------------------------------------------------ |
| `page.tsx`                        | Server component | RSC fetch via async `SupervisorDashboardContent` |
| `supervisor-dashboard-client.tsx` | Client           | Receives `stats` and `pending` as props          |

**Flow:**

```
page.tsx → Suspense → SupervisorDashboardContent (async) → fetchSupervisorDashboard()
                    → supervisor-repository (getDashboardStats, listPendingValidation)
                    → SupervisorDashboardClient(stats, pending)
```

- **RSC fetch:** `fetchSupervisorDashboard()` in async component, wrapped in Suspense.
- **Cached:** Uses React `cache()`.

### Subfolder: `validaciones/`

| File                         | Type             | Data fetching                                                                         |
| ---------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| `page.tsx`                   | Server component | RSC fetch via `listPendingValidation(filters)` from searchParams                      |
| `validation-provider.tsx`    | Client           | Hydrates from `initialItems`; filter changes → `router.push` (URL) → full RSC refetch |
| `validation-list-client.tsx` | Client           | Uses provider state; no direct fetch                                                  |

**Flow:**

```
page.tsx (async) → parseFilters(searchParams) → listPendingValidation(filters)
                → ValidationProvider(initialItems, initialFilters)
                → ValidationListClient
```

- **RSC hydration:** Filters parsed from URL (`status`, `flag`, `from`, `to`); `listPendingValidation` runs server-side.
- **Refetch:** Changing status/flag/dates calls `router.push` with new searchParams → Next.js navigates → page re-renders with new filters → new `listPendingValidation` call.

### Subfolder: `validaciones/[id]/`

| File                           | Type             | Data fetching                                                                                     |
| ------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------- |
| `page.tsx`                     | Server component | RSC fetch via `getValidationDetail(id)`                                                           |
| `validation-detail-client.tsx` | Client           | Receives `detail` as props; uses `approveExamAction`, `rejectExamAction`, `createIncidenceAction` |

**Flow:**

```
page.tsx (async) → requireAuth → getValidationDetail(id) [supervisor-repository]
              → ValidationDetailClient(detail, returnTo)
              → approveExamAction / rejectExamAction / createIncidenceAction (user actions)
```

- **RSC hydration:** Detail loaded server-side; client only performs mutations.

### Subfolder: `resultados/`

| File                        | Type             | Data fetching                                                                                  |
| --------------------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| `page.tsx`                  | Server component | RSC fetch via `fetchResultsListAction(filters)` in `ResultsListLoader`                         |
| `results-list-provider.tsx` | Client           | Hydrates from `initialItems`; `refetch` → `router.replace` with new searchParams → RSC refetch |
| `[workOrderId]/page.tsx`    | Server component | RSC fetch via `fetchConsolidatedResultAction(workOrderId)`                                     |

**Flow:**

```
page.tsx → Suspense → ResultsListLoader (async) → fetchResultsListAction(filters)
                   → results-repository listCompletedWorkOrders
                   → ResultsListProvider(initialItems) → ResultsListClient

[workOrderId]/page.tsx (async) → fetchConsolidatedResultAction(workOrderId)
                             → ConsolidatedResultClient(result)
```

- **List refetch:** `refetch(overrides)` in provider uses `router.replace` with merged filters → page re-renders → new `fetchResultsListAction`.

### Subfolder: `analitica/`

| File                             | Type             | Data fetching                                                                                                                 |
| -------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `page.tsx`                       | Server component | RSC fetch via `fetchAnalyticsDashboardAction(defaultRange)` in `AnalyticsDataLoader`                                          |
| `analytics-dashboard-client.tsx` | Client           | Wraps `AnalyticsProvider(initialData)`                                                                                        |
| `analytics-provider.tsx`         | Client           | Hydrates from `initialData`; `setRange` → `fetchAnalyticsDashboardAction`; `loadDetailedCharts` → `fetchDetailedChartsAction` |

**Flow:**

```
page.tsx → Suspense → AnalyticsDataLoader (async) → fetchAnalyticsDashboardAction(defaultRange)
                   → analytics-repository (getKPISummary, getThroughputSeries, getExamMixDistribution)
                   → AnalyticsDashboardClient(initialData)
                   → AnalyticsProvider(initialData)
```

- **RSC hydration:** Initial KPIs + throughput + exam mix loaded server-side.
- **Client refetch:** Changing time range triggers `fetchAnalyticsDashboardAction`; "Ver más análisis" triggers `fetchDetailedChartsAction` (TAT, technician workload, rejection analysis, doctor volume).

### Subfolder: `incidencias/`

| File                       | Type             | Data fetching                                                                                                                                                                        |
| -------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `page.tsx`                 | Server component | RSC fetch via `IncidenciasLoader` — `fetchIncidentSummaryAction` + `fetchIncidentFeedAction`                                                                                         |
| `incidencias-provider.tsx` | Client           | Hydrates from `initialSummary`, `initialFeedItems`; `setFilters` → refetch; `loadMore` → `fetchIncidentFeedAction` with cursor; `setTab("patterns")` → `fetchIncidentPatternsAction` |

**Flow:**

```
page.tsx → Suspense → IncidenciasLoader (async) → fetchIncidentSummaryAction + fetchIncidentFeedAction
                  → IncidenciasProvider(initialSummary, initialFeedItems, initialNextCursor)
                  → IncidenciasClient
```

- **Client refetch:** Filter changes call `refreshForFilters` (summary + feed + optional patterns). Load more uses `fetchIncidentFeedAction` with cursor.

### Subfolder: `auditoria/`

| File                      | Type             | Data fetching                                                                                                        |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `page.tsx`                | Server component | RSC fetch via `AuditoriaLoader` — `fetchRecentAuditAction(10)` + conditional `fetchAuditTimelineAction(workOrderId)` |
| `audit-search-client.tsx` | Client           | Receives `recentActivity`, `timeline`; search form → `searchAuditAction(query)`                                      |

**Flow:**

```
page.tsx → Suspense → AuditoriaLoader (async) → fetchRecentAuditAction + fetchAuditTimelineAction(?orden=)
                  → AuditSearchClient(recentActivity, timeline)

User search → searchAuditAction(query) [client-triggered]
```

- **RSC hydration:** Recent activity + optional timeline (when `?orden=` in URL).
- **Client search:** User submits search form → `searchAuditAction` → displays results.

### Subfolder: `muestras/`, `settings/`

| Subfolder   | Data fetching                                                |
| ----------- | ------------------------------------------------------------ |
| `muestras/` | None — placeholder ("Próximamente")                          |
| `settings/` | None — `SupervisorSettingsClient` uses local `useState` only |

### Server actions

#### `supervisor/actions.ts`

| Action                     | Purpose                             | Used by                |
| -------------------------- | ----------------------------------- | ---------------------- |
| `fetchSupervisorDashboard` | Stats + pending validation (cached) | Root page (RSC)        |
| `approveExamAction`        | Approve exam                        | ValidationDetailClient |
| `rejectExamAction`         | Reject exam                         | ValidationDetailClient |
| `createIncidenceAction`    | Create incidence                    | ValidationDetailClient |

#### `supervisor/resultados/actions.ts`

| Action                          | Purpose                        | Used by                     |
| ------------------------------- | ------------------------------ | --------------------------- |
| `fetchResultsListAction`        | List completed work orders     | ResultsListLoader (RSC)     |
| `fetchConsolidatedResultAction` | Consolidated result for one WO | Resultado detail page (RSC) |

#### `supervisor/analitica/actions.ts`

| Action                          | Purpose                                   | Used by                                     |
| ------------------------------- | ----------------------------------------- | ------------------------------------------- |
| `fetchAnalyticsDashboardAction` | KPIs, throughput, exam mix                | Page RSC + AnalyticsProvider (range change) |
| `fetchDetailedChartsAction`     | TAT, technician, rejection, doctor volume | AnalyticsProvider (loadDetailedCharts)      |

#### `supervisor/incidencias/actions.ts`

| Action                        | Purpose           | Used by                                                       |
| ----------------------------- | ----------------- | ------------------------------------------------------------- |
| `fetchIncidentSummaryAction`  | Summary cards     | IncidenciasLoader (RSC) + IncidenciasProvider (filter change) |
| `fetchIncidentFeedAction`     | Paginated feed    | IncidenciasLoader + IncidenciasProvider (loadMore, filter)    |
| `fetchIncidentPatternsAction` | Patterns tab data | IncidenciasProvider (setTab patterns)                         |

#### `supervisor/auditoria/actions.ts`

| Action                     | Purpose                 | Used by                             |
| -------------------------- | ----------------------- | ----------------------------------- |
| `fetchRecentAuditAction`   | Recent activity list    | AuditoriaLoader (RSC)               |
| `fetchAuditTimelineAction` | Timeline for work order | AuditoriaLoader (RSC, when ?orden=) |
| `searchAuditAction`        | Search by query         | AuditSearchClient (form submit)     |

**Auth:** All use `requireAuthWithGroup(ctx, "supervisor")` via Amplify server context.

### Repositories

#### `supervisor-repository.ts`

- **Entry points:** `getDashboardStats`, `listPendingValidation`, `getValidationDetail`
- **Client:** `cookieBasedClient`
- **Models:** `Exam`, `Sample`, `ExamType`, `WorkOrder`, `Patient`, `AuditEvent`

**`listPendingValidation`:** Exam.list → parallel Sample.get, ExamType.get per exam → WorkOrder.get (batch) → Patient.get (batch) — multi-round-trip.

**`getValidationDetail`:** Exam.get → Sample, ExamType, WorkOrder, Patient in parallel.

#### `results-repository.ts`

- **Entry points:** `listCompletedWorkOrders`, `getWorkOrderConsolidatedResults`
- **Models:** `WorkOrder`, `Sample`, `Exam`, `ExamType`, `Patient`

#### `analytics-repository.ts`

- **Entry points:** `getKPISummary`, `getThroughputSeries`, `getExamMixDistribution`, `getTATDistribution`, `getTechnicianWorkload`, `getRejectionAnalysis`, `getDoctorVolume`
- **Models:** `Exam`, `AuditEvent`, `WorkOrder`, etc.

#### `incidence-repository.ts`

- **Entry points:** `getIncidentSummaryCards`, `listIncidentFeed`, `getIncidentPatterns`
- **Models:** `Incidence`, `Exam`, `Sample`, etc.

#### `audit-repository.ts`

- **Entry points:** `getRecentAuditActivity`, `getAuditTimelineForWorkOrder`, `searchAudit`
- **Models:** `AuditEvent`, `Sample`, `WorkOrder`, etc.

### Hydration summary

| Route                                  | Hydration pattern                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `/supervisor`                          | RSC: `fetchSupervisorDashboard`                                                         |
| `/supervisor/validaciones`             | RSC: `listPendingValidation` with URL filters; refetch via navigation                   |
| `/supervisor/validaciones/[id]`        | RSC: `getValidationDetail`; mutations via actions                                       |
| `/supervisor/resultados`               | RSC: `fetchResultsListAction`; refetch via `router.replace`                             |
| `/supervisor/resultados/[workOrderId]` | RSC: `fetchConsolidatedResultAction`                                                    |
| `/supervisor/analitica`                | RSC: `fetchAnalyticsDashboardAction`; range change + detailed charts via client actions |
| `/supervisor/incidencias`              | RSC: summary + feed; filters/load more/patterns via client actions                      |
| `/supervisor/auditoria`                | RSC: recent + timeline; search via client action                                        |
| `/supervisor/muestras`                 | None (placeholder)                                                                      |
| `/supervisor/settings`                 | None (local state only)                                                                 |

### Summary

| Aspect             | Notes                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| **Trigger**        | Primarily RSC; client actions for mutations, search, progressive loading                                  |
| **Pattern**        | RSC async + Server Actions → repositories → Amplify                                                       |
| **Auth**           | `requireAuthWithGroup("supervisor")`                                                                      |
| **Caching**        | Most fetch actions use React `cache()` with normalized cache keys                                         |
| **Refetch**        | URL-driven (validaciones, resultados) or explicit client calls (analitica, incidencias, auditoria search) |
| **Waterfall risk** | `listPendingValidation`: Exam → Sample/ExamType (N each) → WorkOrder (batch) → Patient (batch)            |
