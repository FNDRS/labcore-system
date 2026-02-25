# Test Cases Results Analysis — Phase 0–3

**Date:** 2026-02-24
**Input:** [test-cases-results.md](../manual-tests/test-cases-results.md), [test-cases.md](../manual-tests/test-cases.md)
**Scope:** Root cause analysis and hypotheses for all issues discovered during Phase 0–3 E2E manual testing.

---

## Summary of Findings

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 3 | Blocking the technician workflow from end-to-end completion |
| **HIGH** | 4 | Significant UX or data integrity risks |
| **MEDIUM** | 5 | UX confusion, missing features, performance |
| **LOW** | 2 | Minor polish or deferred items |

### Critical issues at a glance

1. **Draft save and "Enviar a validación" silently fail** (TC8, TC9) — the entire exam result persistence pipeline is broken
2. **Cannot re-enter an in-progress exam from the muestras queue** (TC11) — technicians are locked out of their work
3. **State changes before labels are printed** (TC2, TC3) — data integrity risk in reception

---

## CRITICAL-1: Exam Result Persistence Pipeline Is Broken

**Test cases:** TC8 (Save Draft), TC9 (Send to Validation)
**Symptom:** "Guardar borrador" and "Enviar a validación" show a loading spinner, then nothing happens. No toast, no redirect, no error. Database `Exam.results` remains null, no audit events are written.

### Files involved

| File | Role |
|------|------|
| `src/app/(protected)/technician/muestras/process/process-workspace-provider.tsx` | Client provider: holds context, calls server actions |
| `src/app/(protected)/technician/muestras/process/actions.ts` | Server actions: auth + delegate to service |
| `src/lib/services/exam-result-service.ts` | Domain service: status guards, Amplify mutations, audit |
| `src/lib/repositories/process-repository.ts` | Loads initial `ProcessContext` including `exam.updatedAt` |
| `src/app/(protected)/technician/muestras/process/[id]/process-sample-workspace.tsx` | Workspace UI: calls `void onSaveDraft(...)` / `void onSendToValidation(...)` |

### Root cause hypothesis: Stale `updatedAt` triggers false concurrency conflict

The persistence failure chain has **two compounding defects** that combine to produce the observed silent failure.

#### Defect A — `markExamStarted` invalidates the optimistic concurrency token

When the technician navigates to the process workspace, the following sequence occurs:

1. **Server-side render:** `getProcessContext(sampleId)` loads the exam from DB. At this point, `exam.status = "pending"` and `exam.updatedAt = T1`. These are passed to the client as `initialContext`.

2. **Client mount:** `ProcessWorkspaceProvider` initializes state:
   ```typescript
   const [context] = useState<ProcessContext | null>(initialContext);
   ```
   `context.exam.updatedAt` is now `T1`.

3. **`useEffect` fires:** The provider detects `context.exam.status === "pending"` and calls `markExamStartedAction(context.exam.id)`. This server action updates the exam in DynamoDB (status → `inprogress`, sets `startedAt`, `performedBy`). Amplify auto-updates `updatedAt` to `T2`.

4. **Context is stale:** `context` is held in a `useState` with no setter — it is **never refreshed**. `context.exam.updatedAt` remains `T1` even though the DB now has `T2`.

5. **User saves:** `onSaveDraft(results)` calls:
   ```typescript
   saveExamDraftAction(context.exam.id, results, context.exam.updatedAt) // passes T1
   ```

6. **Concurrency check fails:** In `saveExamDraft`, the guard compares `expectedUpdatedAt (T1) !== currentUpdatedAt (T2)` → returns `{ ok: false, conflict: true, error: "Otro usuario modificó este examen" }`.

7. **Same failure for "Enviar a validación":** `finalizeExamAction` performs the same concurrency check and also rejects with a conflict.

This explains why **all three tested exam types** (Coproanálisis, Uroanálisis, Hemograma) failed: the `markExamStarted` effect runs for every exam opened from `pending` status, which is always the case when coming from "Procesar" in the muestras queue.

#### Defect B — Missing error handling silences the failure

Even though the service returns a proper `{ ok: false, conflict: true }` status object, the user reports seeing **no toast and no error**. This is explained by a second, independent defect in error propagation:

The workspace component calls handlers with `void`:
```typescript
const handleSaveDraft = (values) => { void onSaveDraft(values); };
const handleSendToValidation = (values) => { void onSendToValidation(values); };
```

The `void` operator explicitly discards the returned Promise, including any rejections. If any step in the chain **throws** (as opposed to returning a status object), the rejection is silently swallowed.

The provider callbacks use `try { ... } finally { ... }` with **no `catch` block**:
```typescript
const onSaveDraft = useCallback(async (results) => {
    // ...
    try {
        const status = await saveExamDraftAction(...);
        if (status.ok) { toast.success("Borrador guardado"); }
        else if (status.conflict) { setConflict(true); toast.error(status.error); }
        else { toast.error(status.error); }
    } finally {
        setIsSubmitting(false);
    }
}, [...]);
```

If `saveExamDraftAction` returns a `{ ok: false }` status, the toast.error path **should** execute. But if the server action itself throws (network error, serialization issue, Amplify runtime error), the error bypasses all status handling and propagates out of the `try` block. The `finally` clears `isSubmitting`, but no toast or conflict state is set.

**Combined effect:** The most likely scenario is that for some invocations the conflict status is properly returned (and the conflict toast may briefly appear but be missed by the tester), while for others the server action throws a runtime error that is completely silenced. The inconsistency in TC8 results across exam types (Coproanálisis: no toast + button stuck; Uro/Hemo: button re-enabled) supports this — the same code path may behave differently depending on timing of the `markExamStarted` effect vs. the save action.

#### Defect C — Amplify `update` errors are not checked

In `exam-result-service.ts`, all Amplify mutation calls follow this pattern:
```typescript
await cookieBasedClient.models.Exam.update({
    id: examId,
    results: results as Record<string, unknown>,
});
```

Amplify Gen 2's `.update()` returns `{ data, errors }`. **The `errors` array is never destructured or checked.** If the mutation fails at the GraphQL/DynamoDB level (e.g., type mismatch, authorization error, validation failure), the promise resolves successfully with `errors` populated but `data` as null. The service proceeds as if the update succeeded, emits the audit event, and returns `{ ok: true }`.

This means: even if Defect A were fixed, if the Amplify mutation itself has issues (field type mismatches, authorization, etc.), the save would still silently fail.

### Evidence alignment

| Observation | Explained by |
|-------------|-------------|
| No `Exam.results` in DB for any exam | Defect A (concurrency reject) or C (unchecked Amplify errors) |
| No audit events for save/validation | Defect A prevents reaching `emitAudit`; or Defect C allows `emitAudit` to run but AuditEvent.create also silently fails |
| No toast, no error, no redirect (TC9) | Defect B: `void` + no `catch` silences thrown errors |
| Inconsistent behavior across exam types (TC8) | Timing variance in `markExamStarted` effect relative to user interaction |
| `isSubmitting` clears but nothing else happens | `finally` block runs; error swallowed before toast logic |

---

## CRITICAL-2: Cannot Re-Enter In-Progress Exam From Muestras Queue

**Test case:** TC11 (Draft Recovery — navigation back)
**Symptom:** For a sample already in `inprogress`, clicking "Procesar" shows "Solo muestras recibidas pueden marcarse en proceso". Clicking "Continuar" in the detail sheet does nothing. Only browser back button works.

### Files involved

| File | Role |
|------|------|
| `src/app/(protected)/technician/technician-workstation-context.tsx` | `onProcess` handler |
| `src/app/(protected)/technician/muestras/sample-detail-sheet.tsx` | Detail sheet buttons |
| `src/lib/services/sample-status-service.ts` | `markSampleInProgress` status guard |

### Root cause hypothesis: `onProcess` always calls `markInProgressAction` — no "continue" path

The `onProcess` callback (line 193–208 in `technician-workstation-context.tsx`) unconditionally calls `markInProgressAction(id)` before navigating:

```typescript
const onProcess = useCallback(async (id: string) => {
    const result = await markInProgressAction(id);
    if (result.ok) {
        router.push(`/technician/muestras/process/${id}?sampleId=...`);
    } else {
        setActionError(result.error);
    }
}, [samples, router]);
```

The service guard in `markSampleInProgress` rejects any sample not in `received` status. For samples already in `inprogress`, this always fails.

The detail sheet shows "Continuar" for `Processing` status samples (line 113–121 in `sample-detail-sheet.tsx`), but the button also calls `onProcess(exam.id)`, which goes through the same `markInProgressAction` → rejection path:

```typescript
{(exam.status === "Received" || exam.status === "Processing") && (
    <Button onClick={() => onProcess(exam.id)}>
        {exam.status === "Processing" ? "Continuar" : "Procesar"}
    </Button>
)}
```

**There is no code path that navigates directly to the process workspace without attempting a status transition.** The "Continuar" button is cosmetically different but functionally identical to "Procesar" — both always try to mark the sample in-progress first.

### Impact

Technicians who leave the process workspace (e.g., to check another sample, accidental navigation, page refresh) cannot return to their in-progress work through the normal UI flow. They must use browser history. This is a workflow-blocking defect.

---

## CRITICAL-3: State Changes Before Labels Are Printed

**Test cases:** TC2 (Generate Specimens), TC3 (Mark Ready for Lab)
**Symptom:** Clicking "Generar muestras" immediately changes order status to "Muestras creadas" before labels are downloaded/printed. Modal can be closed without printing.

### Files involved

| File | Role |
|------|------|
| `src/app/(protected)/recepcion/use-reception-inbox.ts` | `runGenerateSpecimens` function |
| Reception generation dialog (modal component) | Closable via X / click-outside |

### Root cause hypothesis: Premature state transition in the generation flow

The `runGenerateSpecimens` function (line 90–126 in `use-reception-inbox.ts`) calls `generateSpecimensAction(order.id)` which creates Sample and Exam records in the DB immediately. The order transitions to "Muestras creadas" at this point, regardless of whether the user ever downloads the PDF labels.

The modal can be dismissed (X button or click-outside) without reaching the "Descargar PDF" step. Once dismissed, the order shows "Muestras creadas" but there is no reprint path from reception for orders in that intermediate state.

**Compound risk with TC3 finding:** If the user clicks "Descargar PDF" before the barcode list has finished rendering in the modal, the PDF is empty (no label content). The user may believe they've printed labels when they haven't.

### Impact

Physical specimen tubes can exist in the system with no printed labels. In a clinical lab, unlabeled specimens are a patient safety risk.

---

## HIGH-1: Audit Events Not Displayed in UI

**Test case:** TC3
**Symptom:** Audit events table is completely empty even after actions that should produce audit records.

### Files involved

| File | Role |
|------|------|
| `src/lib/repositories/technician-repository.ts` (lines 312–391) | `getSampleDetail` query |
| `src/app/(protected)/technician/muestras/sample-detail-sheet.tsx` | History display |

### Root cause hypothesis: Audit query filters only by `entityType = "Sample"`

The `getSampleDetail` function queries audit events with:
```typescript
cookieBasedClient.models.AuditEvent.list({
    filter: {
        and: [
            { entityType: { eq: AUDIT_ENTITY_TYPES.SAMPLE } },
            { entityId: { eq: sampleId } },
        ],
    },
})
```

This only returns audit events where `entityType === "Sample"`. Events like `SPECIMENS_GENERATED`, `LABEL_PRINTED`, `ORDER_READY_FOR_LAB` are emitted with `entityType === "WorkOrder"`, and exam-level events (`EXAM_STARTED`, `EXAM_RESULTS_SAVED`, etc.) use `entityType === "Exam"`.

Additionally, the `AUDIT_ACTION_LABELS` map (line 298–307) only includes sample-level event labels. WorkOrder and Exam events have no display labels defined.

**Result:** Even if sample-level events exist (e.g., `SPECIMEN_RECEIVED`, `SPECIMEN_IN_PROGRESS`), WorkOrder and Exam events are excluded from the query entirely. Early in the flow (before any sample-level actions), the history appears completely empty.

---

## HIGH-2: `ready_for_lab` and `received` Are Indistinguishable in UI

**Test cases:** TC6, TC7
**Symptom:** Both states show as "Received" in the technician queue. Technicians cannot tell which samples need to be received vs. which have already been received.

### Files involved

| File | Role |
|------|------|
| `src/lib/contracts.ts` (lines 80–91) | `SAMPLE_STATUS_TO_WORKSTATION` mapping |

### Root cause hypothesis: Intentional but problematic status mapping

The mapping explicitly collapses both statuses:
```typescript
ready_for_lab: "Received",
received: "Received",
```

This was likely done as an MVP simplification since the workstation UI only had a small set of display statuses. However, it creates a functional problem: the "Marcar recibida" action is only valid for `ready_for_lab` samples, and "Procesar" is only valid for `received` samples. With both showing as "Received", technicians cannot determine which action is available without trying and potentially getting an error.

### Cascading effect

This status mapping issue is the root cause of TC7's finding ("Procesar shown for non-received samples"). The detail sheet shows "Procesar" for any sample with UI status `"Received"`, which includes `ready_for_lab` samples that haven't been marked received yet. The backend correctly rejects these, but the UI should never offer the action in the first place.

---

## HIGH-3: "Procesar" Button Shown for Samples That Cannot Be Processed

**Test case:** TC7
**Symptom:** "Procesar" visible for `ready_for_lab` samples; clicking it shows backend error.

### Files involved

| File | Role |
|------|------|
| `src/app/(protected)/technician/muestras/sample-detail-sheet.tsx` (line 113) | Button visibility condition |
| `src/lib/contracts.ts` | Status mapping |

### Root cause hypothesis: Button gated on UI status, not backend status

The button condition is:
```typescript
{(exam.status === "Received" || exam.status === "Processing") && (...)}
```

This uses the **mapped UI status** (`"Received"`) which includes both `ready_for_lab` and `received`. The button should check the **actual backend status** to determine which actions are valid. The `SampleWorkstationRow` type does not carry the original backend status, only the mapped UI status, making it impossible for the UI to distinguish the two.

---

## HIGH-4: No Audit Event for Specimen Scan

**Test case:** TC5
**Symptom:** Scanning a sample (success or failed lookup) emits no audit event.

### Files involved

| File | Role |
|------|------|
| `src/app/(protected)/technician/technician-workstation-context.tsx` (lines 153–175) | `handleScan` |
| `src/app/(protected)/technician/actions.ts` | `lookupSampleByBarcodeAction` |

### Root cause hypothesis: Audit emission was not implemented for scan

The `lookupSampleByBarcodeAction` performs a read-only lookup and returns the result. No audit event is created anywhere in the scan flow. The `AUDIT_ACTIONS.SPECIMEN_SCANNED` constant exists in `contracts.ts` (line 50) but is never used in any service or action.

---

## MEDIUM-1: Reception Search Triggers Unthrottled Refetches

**Test case:** TC1
**Symptom:** Each keystroke triggers a full `fetchReceptionOrders` call. Clearing search can leave stale state.

### Files involved

| File | Role |
|------|------|
| `src/app/(protected)/recepcion/use-reception-inbox.ts` (lines 34–53) | `loadOrders` callback and `useEffect` |

### Root cause hypothesis: `search` is a direct dependency of `loadOrders` with no debounce

```typescript
const loadOrders = useCallback(async () => {
    const data = await fetchReceptionOrders({
        quickFilter: activeFilter,
        search: search.trim() || undefined,
    });
    setOrders(data);
}, [activeFilter, search]);

useEffect(() => { loadOrders(); }, [loadOrders]);
```

Every change to `search` creates a new `loadOrders` callback (via `useCallback` dependency array), which triggers the `useEffect`. This means every keystroke dispatches a full server fetch. There is no debounce mechanism.

The "stale state when clearing search" issue is likely a race condition: when the user rapidly clears text, multiple fetch requests are in flight. An earlier request (for a non-empty search) may resolve after the final request (for empty search), overwriting the correct results with stale filtered results. There is no request cancellation or sequencing logic.

**Vercel React Best Practices violation:** `client-swr-dedup` — no request deduplication; `rerender-defer-reads` — subscription to rapidly-changing state directly triggers expensive side effects.

---

## MEDIUM-2: Context Never Refreshed After Mutations (Architecture)

**Test cases:** TC8, TC9, TC12
**Symptom:** After `markExamStarted`, `onSaveDraft`, or any mutation, `context` retains stale values.

### Files involved

| File | Role |
|------|------|
| `src/app/(protected)/technician/muestras/process/process-workspace-provider.tsx` (line 74) | State initialization |

### Root cause hypothesis: `useState` without setter + no refresh mechanism

```typescript
const [context] = useState<ProcessContext | null>(initialContext);
```

The `context` is initialized from `initialContext` (server-rendered prop) and destructured without a setter. It is never updated during the component's lifecycle. Even `router.refresh()` (called by `onReload`) would re-render the server component with fresh data, but `useState` ignores new `initialContext` values on re-renders — React only uses the initial value on first mount.

**This is an architectural defect.** The provider needs either:
- A state setter that updates `context` after each mutation, or
- A mechanism to sync with server state (e.g., `useEffect` that detects prop changes and resets state)

**Vercel Composition Patterns violation:** `state-decouple-implementation` — the provider should be the single source of truth for state, and it should stay in sync with the backend after mutations.

---

## MEDIUM-3: Inconsistent Toast/Button State After Draft Save

**Test case:** TC8 (Coproanálisis vs. Uroanálisis/Hemograma)
**Symptom:** Coproanálisis: no toast, button stayed disabled. Uroanálisis/Hemograma: button re-enabled.

### Root cause hypothesis: Timing variance in `markExamStarted` effect

This is a downstream symptom of CRITICAL-1. The `markExamStarted` `useEffect` is asynchronous and may complete at different times relative to the user's save action:

- **Fast `markExamStarted` completion:** `updatedAt` is already stale by the time the user saves → conflict returned → toast.error (may be missed) → `isDirty` stays true → button re-enables
- **Slow/concurrent `markExamStarted`:** Race condition where both the mark-started update and the save attempt hit the DB near-simultaneously → possible Amplify runtime error (thrown, not returned as status) → `void` swallows the error → no toast, `isSubmitting` cleared by `finally` but `isDirty` may not re-enable the button properly

The different behaviors across exam types are explained by timing differences in the effect execution and network latency.

---

## MEDIUM-4: PDF Downloads Empty If Clicked Before Barcodes Render

**Test cases:** TC2, TC3
**Symptom:** If "Descargar PDF" is clicked before specimen codes appear in the modal, the PDF has no label content.

### Files involved

| File | Role |
|------|------|
| `src/app/(protected)/recepcion/use-reception-inbox.ts` (lines 128–166) | `downloadSpecimensPdf` |

### Root cause hypothesis: No guard on barcode availability before PDF generation

The `downloadSpecimensPdf` function reads `generationModal.specimens` to build the PDF content. If called before `runGenerateSpecimens` has updated the modal with specimen data (the API call is still in flight), `specimens` is an empty array, producing an empty PDF.

The function has a 300ms artificial delay (`setTimeout(resolve, 300)`) but no check that specimens are actually populated. The "Descargar PDF" button should be disabled until `specimens.length > 0`.

---

## MEDIUM-5: Modal Closable Without Label Download

**Test cases:** TC2, TC3
**Symptom:** Generation modal can be dismissed via X button or click-outside without downloading labels.

### Root cause hypothesis: No close guard based on `printState`

The modal's `onOpenChange` handler (`setGenerationModalOpen`, line 179–182) only blocks closing during `generating` state:
```typescript
if (generationModal.printState === "generating" && !open) return;
```

All other states (`pending`, `printed`, `error`) allow closing. After specimens are generated (`printState = "pending"`), the modal can be dismissed. The order already shows "Muestras creadas" with no way to return to the print step from the reception queue.

---

## LOW-1: Concurrency Conflict Flow Untestable

**Test case:** TC12
**Symptom:** Cannot be tested because TC8/TC9 prerequisite (persisting results) is broken.

### Analysis

This is entirely blocked by CRITICAL-1. Once exam result persistence works correctly, TC12 should be re-run. However, even after the fix, note that MEDIUM-2 (stale context) would cause FALSE conflicts: after any save, `context.exam.updatedAt` would still be stale, causing the next save from the same session to hit a conflict unless the context is refreshed.

---

## LOW-2: Filter Changes Trigger Full Refetch

**Test case:** TC1
**Symptom:** Changing quick filters causes a full data refetch, feeling sluggish.

### Root cause hypothesis: `activeFilter` included in `loadOrders` dependency array

Same mechanism as MEDIUM-1: `activeFilter` is a dependency of `loadOrders`, so changing it creates a new callback and triggers the `useEffect`. Unlike search (where debounce is the main fix), filter changes are intentional user actions and a refetch is expected. The sluggishness likely comes from:
1. No optimistic filtering — the UI waits for the server response before showing filtered results
2. `filterAndSortOrders` runs client-side on the full result set anyway (line 73–76), suggesting the filtering could be done entirely client-side on already-fetched data

---

## Cross-Cutting Architecture Observations

### 1. Error handling pattern gap

Throughout the process workspace, the pattern `void asyncFn(args)` discards promise rejections. Combined with `try/finally` (no `catch`), this creates a systematic silent-failure pattern. Every async handler in the provider is vulnerable to this.

**Affected code:**
- `process-sample-workspace.tsx` lines 134–139: `void onSaveDraft(values)`, `void onSendToValidation(values)`
- `process-workspace-provider.tsx` lines 128–154, 156–191: `try/finally` without `catch`

### 2. Amplify mutation response pattern

None of the Amplify `.update()` or `.create()` calls in `exam-result-service.ts` destructure or check the `{ errors }` response. This pattern is also present in `sample-status-service.ts` and `specimen-generation-service.ts` (though the specimen service does check `examErrors` on line 95).

This is a systemic risk: any Amplify mutation could silently fail at the GraphQL/DynamoDB level while the application proceeds as if it succeeded.

### 3. State freshness in providers

The `ProcessWorkspaceProvider` initializes state from server-rendered props and never refreshes it. The `TechnicianWorkstationProvider` handles this better — it calls `loadSamples()` after mutations. The process workspace should adopt the same pattern: refresh context from the server after save/finalize operations.

### 4. Status type propagation

The `SampleWorkstationRow` type carries only the mapped UI status (`"Received"`, `"Processing"`, etc.), not the original backend status. This makes it impossible for UI components to make decisions based on the actual backend state (e.g., distinguishing `ready_for_lab` from `received`). Either the row type should include the raw status, or the mapping should be expanded to have distinct UI values for each backend state.

---

## Issue Dependency Map

```
CRITICAL-1 (Persistence pipeline broken)
├── Caused by: Defect A (stale updatedAt from markExamStarted)
├── Worsened by: Defect B (void + no catch silences errors)
├── Worsened by: Defect C (Amplify errors not checked)
├── Blocks: TC12 (Concurrency conflict)
└── Causes: MEDIUM-3 (Inconsistent toast/button)

CRITICAL-2 (Cannot re-enter in-progress exam)
├── Caused by: onProcess always calls markInProgressAction
└── Related to: HIGH-2 (status mapping ambiguity)

CRITICAL-3 (State before labels printed)
├── Caused by: Premature state transition in runGenerateSpecimens
├── Related to: MEDIUM-4 (Empty PDF timing)
└── Related to: MEDIUM-5 (Modal closable)

HIGH-2 (ready_for_lab ≡ received in UI)
├── Caused by: SAMPLE_STATUS_TO_WORKSTATION mapping
├── Causes: HIGH-3 (Procesar shown for wrong status)
└── Related to: CRITICAL-2 (onProcess guard failure)
```

---

## Appendix: Raw Status of All Test Cases

| TC | Name | Result | Severity of Findings |
|----|------|--------|---------------------|
| 1 | Reception — List Orders | Pass | MEDIUM (search perf) |
| 2 | Reception — Generate Specimens | Pass | CRITICAL (state before print), MEDIUM (PDF timing) |
| 3 | Reception — Mark Ready for Lab | Pass | HIGH (audit not shown), MEDIUM (modal closable) |
| 4 | Technician — Dashboard/Muestras | Pass | None |
| 5 | Technician — Scan Sample | Pass | HIGH (no scan audit) |
| 6 | Technician — Mark Received | Pass | HIGH (status ambiguity) |
| 7 | Technician — Mark In Progress | Pass | HIGH (button visibility) |
| 8 | Technician — Save Draft | **Fail** | **CRITICAL** (persistence broken) |
| 9 | Technician — Send to Validation | **Fail** | **CRITICAL** (persistence broken) |
| 10 | Unsaved Changes Guard | Pass | None |
| 11 | Draft Recovery | Partial | **CRITICAL** (cannot re-enter) |
| 12 | Concurrency Conflict | Blocked | Blocked by TC8/TC9 |
| 13 | Reception — Scan Order | Pass | None |
| 14 | Order Without Exams | N/A | Out of scope |
