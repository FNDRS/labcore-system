# Phase 2 — Technician Dashboard + Muestras: Breakdown Plan

**Reference:** [integration-plan.md](./integration-plan.md) Phase 2 (lines 174–204)

**Outcome:** Technician operational queue and sample lifecycle run on real data.

---

## Current State

| Location | Mock Data | Notes |
|----------|-----------|-------|
| `/technician` (dashboard) | `MOCK_QUEUE`, `MOCK_NEXT_SAMPLE`, `MOCK_METRICS` via `fetchOperativeDashboard` | Next sample card, queue table, metrics |
| `/technician/muestras` | `MOCK_MUESTRAS` via `fetchMuestrasWorkstation` | Samples table, status summary |
| `sample-detail-sheet.tsx` | `MOCK_HISTORY` | Event history in sheet |
| Scan flow | Local state only | No backend lookup |
| Actions (Mark received, Process, Report problem, Reprint label) | Local state only | No persistence |

**Schema:** `Sample.status` = `pending | labeled | ready_for_lab | received | inprogress | completed | rejected`. No `assignedToId` or equipment assignment in schema.

---

## Status Mapping (Schema ↔ UI)

| Schema `Sample.status` | UI `SampleWorkstationStatus` |
|------------------------|-----------------------------|
| `ready_for_lab` | Received (available for processing) |
| `received` | Received |
| `inprogress` | Processing |
| `completed` | Completed |
| `rejected` | Flagged |
| — | Waiting Equipment — not in schema; treat as `received` for MVP or defer |

---

## Phase 2a — Foundation (Repository + Types)

**Scope:** Data access and DTOs for technician views.

| # | Task | Deliverables |
|---|------|--------------|
| 2a.1 | **Technician repository** | `src/lib/repositories/technician-repository.ts` with `listTechnicianSamples`, `getTechnicianDashboardMetrics` |
| 2a.2 | **DTOs and mapping** | Map schema → `QueueRow`, `SampleWorkstationRow`, `NextSample`, `DashboardMetrics`, `MuestrasSummary` |
| 2a.3 | **Contracts alignment** | Extend `contracts.ts` with technician status mapping if needed |

**Exit:** Repository returns real data; `MOCK_TECHNICIAN` can be turned off for data reads.

### Phase 2a testing (manual)

Phase 2a is not directly testable in isolation because the repository is used only when the dashboard and muestras pages call `fetchOperativeDashboard` and `fetchMuestrasWorkstation`, and those are wired to the repository when `NEXT_PUBLIC_MOCK_TECHNICIAN=false`.

**How to test:**

1. **Prerequisites:** Sandbox running (`pnpm ampx sandbox`), seed applied (`pnpm seed`). At least one work order must have samples marked `ready_for_lab` (use Reception: generate specimens → mark ready for lab for ORD-2025-003).

2. **Enable real data:** Create or edit `.env.local`:
   ```
   NEXT_PUBLIC_MOCK_TECHNICIAN=false
   ```

3. **Start the app:** `pnpm dev`, then log in as a technician.

4. **Visit** `/technician` (dashboard) and `/technician/muestras` (workstation). You should see real samples instead of mock data.

5. **If no samples appear:** The repository only returns samples with status in `[ready_for_lab, received, inprogress, completed, rejected]`. Seed creates samples as `labeled`. Go to Reception, open an order with specimens, run “Generar muestras” and “Marcar listas para lab” so those samples become `ready_for_lab`.

**Phase 2b** will add explicit loading/error UI and turn off mocks by default when ready.

---

## Phase 2b — Dashboard Integration

**Scope:** Replace mocks on the technician dashboard.

| # | Task | Deliverables |
|---|------|--------------|
| 2b.1 | **Dashboard aggregation** | Single server action/function that runs `Promise.all` for metrics + next sample + queue rows (no waterfalls) |
| 2b.2 | **Replace `fetchOperativeDashboard`** | Use repository; compute `nextSample`, `urgentCount`, `queueRows`, `metrics`, `lastScanned` from backend |
| 2b.3 | **Completed-today metric** | Count samples with `status === "completed"` and `receivedAt`/`collectedAt` today (or use `AuditEvent` if needed) |
| 2b.4 | **Turn off `MOCK_TECHNICIAN`** | Remove or gate mocks for dashboard; add loading/error UI |

**Exit:** Dashboard reads fully from backend.

### Phase 2b implementation (done)

- `fetchOperativeDashboard` uses `Promise.all([listTechnicianSamples(), getCompletedTodayCount()])` for parallel fetch
- `getCompletedTodayCount()` queries `AuditEvent` for `SPECIMEN_COMPLETED` today (falls back to 0 if no audits yet)
- `MOCK_TECHNICIAN` defaults to `false`; set `NEXT_PUBLIC_MOCK_TECHNICIAN=true` to use mocks
- `error.tsx` added for technician route with retry button
- Loading via existing `Suspense` + `DashboardSkeleton`

### Phase 2b testing (manual)

1. **Prerequisites:** Sandbox running, seed applied. At least one order with samples in `ready_for_lab` (use Reception flow).
2. **Ensure real data:** Remove or do not set `NEXT_PUBLIC_MOCK_TECHNICIAN` (default is real data). To use mocks, set `NEXT_PUBLIC_MOCK_TECHNICIAN=true`.
3. **Visit** `/technician` as a technician. Dashboard should show real queue and next sample.
4. **Completed-today:** Will be 0 until Phase 2c implements status transitions that emit `SPECIMEN_COMPLETED` audit events.
5. **Error handling:** Temporarily break the backend (e.g. wrong `amplify_outputs`) to trigger `error.tsx`; click "Reintentar" to retry.

---

## Phase 2c — Muestras Workstation Integration

**Scope:** Replace mocks on the muestras page and wire status transitions.

| # | Task | Deliverables |
|---|------|--------------|
| 2c.1 | **Replace `fetchMuestrasWorkstation`** | Use repository; return real samples and summary |
| 2c.2 | **Sample detail from backend** | Replace `getSampleDetail` with repository/service; load Sample + Exam(s) + AuditEvent history |
| 2c.3 | **Sample status service** | `src/lib/services/sample-status-service.ts`: `markSampleReceived`, `markSampleInProgress`, `markSampleCompleted`, `markSampleRejected` with guards and AuditEvent |
| 2c.4 | **Server actions for muestras** | `fetchMuestrasWorkstationAction`, `getSampleDetailAction`, `markReceivedAction`, `markInProgressAction`, `markCompletedAction`, `markRejectedAction` |
| 2c.5 | **Wire UI to actions** | `onMarkReceived`, `onProcess`, `onReportProblem` call server actions and refetch |

**Exit:** Muestras table, detail sheet, and status changes use backend; transitions are auditable.

### Phase 2c implementation (done)

- `fetchMuestrasAction` — client-callable server action; `getSampleDetail` uses repository with AuditEvent history
- `sample-status-service.ts` — `markSampleReceived`, `markSampleInProgress`, `markSampleCompleted`, `markSampleRejected` with guards + AuditEvent
- `markReceivedAction`, `markInProgressAction`, `markRejectedAction` — server actions with auth
- `TechnicianWorkstationProvider` + `useTechnicianWorkstation` — provider holds state/actions; fetches via `fetchMuestrasAction`, loads detail on sheet open, wires mutations to actions + refetch
- `MuestrasWorkstation` — uses hook; loading/error UI; `SampleDetailSheet` shows AuditEvent history
- "Marcar recibida" shown for `Received` status; "Procesar" calls `markInProgressAction` before navigate; "Reportar problema" calls `markRejectedAction`

### Phase 2c testing (manual)

1. **Prerequisites:** Sandbox + seed; at least one order with samples in `ready_for_lab`.
2. **Visit** `/technician/muestras` as technician.
3. **Mark received:** Open dropdown on a `ready_for_lab` sample (shows "Received"), click "Marcar recibida". Sample should update; refetch shows new status.
4. **Process:** Click "Procesar" → navigates to process workspace (Phase 3 shell). Sample status becomes `inprogress`.
5. **Report problem:** Click "Reportar problema" → sample becomes `rejected` (Flagged).
6. **Detail sheet:** Open a sample → history loads from AuditEvent (may be empty until actions have run).
7. **Errors:** Invalid transitions (e.g. "Marcar recibida" on already-received) show `actionError` banner.

---

## Phase 2d — Scan-First Operations

**Scope:** Barcode lookup and scan flows backed by the API.

| # | Task | Deliverables |
|---|------|--------------|
| 2d.1 | **Barcode lookup service** | `lookupSampleByBarcode(code)` — query by `Sample.barcode` or ID; return `SampleWorkstationRow | null` |
| 2d.2 | **Scan server action** | `lookupSampleByBarcodeAction(code)` for dashboard and muestras |
| 2d.3 | **Wire scan to lookup** | Dashboard and muestras scan flows call action instead of local search |
| 2d.4 | **Reprint label action** | `reprintLabelAction(sampleId)` — audit `LABEL_REPRINTED`; printer integration optional/placeholder |
| 2d.5 | **Report problem action** | `reportProblemAction(sampleId)` — set `Sample.status = "rejected"` (or incidence) + audit `SPECIMEN_REJECTED` |

**Exit:** Scan uses backend lookup; reprint and report problem are first-class mutations with audit.

### Manual testing (Phase 2d)

1. **Barcode lookup:** With `NEXT_PUBLIC_MOCK_TECHNICIAN=false`, ensure Amplify sandbox is running and data is seeded.
2. **Dashboard scan:** Go to `/technician`. Click "Escanear muestra". Enter a barcode (e.g. from seed: `SMP-WO1-01` or a sample ID). Confirm → should navigate to `/technician/muestras?sample=<id>` with the detail sheet open. Invalid codes show "Muestra no encontrada".
3. **Muestras scan:** Go to `/technician/muestras`. Use the scan bar or modal. Enter barcode or sample ID → should open the detail sheet and highlight the row. Invalid codes show the actionError banner.
4. **Reprint label:** Open a sample detail sheet. Click "Reimprimir etiqueta" → should emit `LABEL_REPRINTED` audit and close the sheet. Reopen sample → history should include "Etiqueta reimpresa".
5. **Report problem:** Already wired in Phase 2c via `markRejectedAction`. `reportProblemAction` is an alias for the same flow.

---

## Phase 2e — State Architecture Refactor (Composition)

**Scope:** Provider-based state and simpler components, per integration plan and Vercel patterns.

| # | Task | Deliverables |
|---|------|--------------|
| 2e.1 | **Workstation provider** | `TechnicianWorkstationProvider` with queue/filter/search/sheet/scan state |
| 2e.2 | **Split dashboard vs muestras** | Shared provider for muestras; dashboard uses lighter state or direct server data |
| 2e.3 | **Replace boolean flags** | Use explicit subcomponents (e.g. `PendingQueue`, `UrgentQueue`) instead of `filter === "X"` branches where beneficial |
| 2e.4 | **Compose table + sheet + dialogs** | Keep `MuestrasTable`, `SampleDetailSheet`, `ScanBar`, `ScanSampleDialog` as composed children |

**Note:** Can be done incrementally after 2c/2d to avoid blocking core functionality.

### Manual testing (Phase 2e)

1. **Provider:** Muestras page wraps content in `TechnicianWorkstationProvider`. State (samples, filter, scan, sheet) is available via `useTechnicianWorkstation()`.
2. **Explicit queue views:** `AllQueueView`, `ProcessingQueueView`, `ReceivedQueueView`, `UrgentQueueView`, `FlaggedQueueView`, `MineQueueView` — each renders the table with its filter. `FilteredQueueView` delegates to the appropriate view.
3. **Dashboard:** Unchanged; uses direct server data (`fetchOperativeDashboard`) + local filter/search/scan state. No provider (lighter).
4. **Composition:** `MuestrasTable`, `SampleDetailSheet`, `ScanBar`, `ScanSampleDialog` remain composed children receiving state/actions from context or props.

---

## Execution Order

1. **Phase 2a** — Foundation (must complete first)
2. **Phase 2b** — Dashboard (independent of muestras)
3. **Phase 2c** — Muestras (core workflow)
4. **Phase 2d** — Scan + reprint + report problem
5. **Phase 2e** — State refactor (can overlap with 2d or follow)

---

## Deferred / Out of Scope for Phase 2

- `Sample.assignedToId` / "Mis muestras" — keep `assignedToMe: false` for now
- `assignedEquipment` — keep `null` unless schema extended
- "Waiting Equipment" — not in schema; map to `received` or skip
- Technician settings persistence — separate phase
- Process workspace (`/technician/muestras/process/[id]`) — Phase 3

---

## Summary Table

| Phase | Focus | Est. Effort |
|-------|-------|-------------|
| **2a** | Repository, DTOs | Small |
| **2b** | Dashboard backend integration | Small |
| **2c** | Muestras backend + status transitions | Medium |
| **2d** | Scan, reprint, report problem | Medium |
| **2e** | State architecture refactor | Medium |
