# Test Case Notes and Failure Analysis — Phase 0–3 E2E

**Date:** 2026-02-23  
**Scope:** Manual test results from [test-cases-results.md](../manual-tests/test-cases-results.md) and [test-cases.md](../manual-tests/test-cases.md).  
**Reference:** [integration-plan.md](../integration/integration-plan.md), [phase-2.md](../integration/phase-2.md), [phase-3.md](../integration/phase-3.md).

This document provides **root-cause analysis and possible fixes** for the findings. No implementation plan—analysis only.

---

## 1. Executive Summary

| Severity   | Count | Summary |
|-----------|-------|---------|
| **Critical** | 6 | Draft/validation not persisting; audit not visible; send-to-validation broken; state before labels; re-entry to process blocked. |
| **High**     | 4 | Filter/search refetch and clearing bugs; PDF empty if labels not rendered; Procesar shown for non-received; inconsistent draft feedback. |
| **Medium**   | 4 | Modal closable without printing; ready_for_lab vs Received UI; Guardar borrador stays disabled (Copro); no SPECIMEN_SCANNED audit. |

**Blocking issues for technician workflow:** Exam results (draft and finalize) are not persisting to the backend; "Enviar a validación" completes with no error but does not update DB or redirect. Audit trail is not visible where users expect it. These must be fixed for Phase 3 exit criteria.

---

## 2. Critical Findings — Root Cause and Possible Fixes

### 2.1 Draft not persisting to backend (TC8)

**Observed:** "Guardar borrador" shows loading and localStorage is updated, but `Exam.results` in the DB is never updated. No new audit events.

**Root cause (hypotheses):**

1. **Server Action / client context**  
   `exam-result-service.ts` uses `cookieBasedClient` at module level. In Next.js App Router, Server Actions run in a request context; `cookieBasedClient` (from `generateServerClientUsingCookies`) should read `cookies()` at request time. If the client is not receiving the same request’s cookies (e.g. due to how the action is invoked or middleware), updates could run unauthenticated and be rejected by Amplify auth rules without the client surfacing a clear error.

2. **Silent failure in Amplify**  
   `Exam.update()` might fail (e.g. auth rule, validation) and the Amplify Data client might not throw or might return an empty/unsuccessful result that the service does not check. The UI only checks `status.ok` from the action; if the action never rejects and returns `ok: true` only when the service returns, then a failure before the service’s return would need to be a thrown error. If the client swallows errors or returns a failed result that the service doesn’t map to `ok: false`, the UI would show “success” while nothing is persisted.

3. **Payload shape**  
   `results` is passed as `ResultsRecord` (from field-schema-types). If the form or Zod output has a shape that Amplify/AppSync rejects (e.g. type mismatch for JSON, or a field the schema doesn’t expect), the update could fail. No explicit logging or error path in the service makes this hard to see.

**Possible fixes:**

- Run all data operations inside the same `runWithAmplifyServerContext` used for auth, and use a client created within that context (or confirm in docs that `cookieBasedClient` is safe in Server Actions and reads cookies per-request).
- After `Exam.update()` in `saveExamDraft`, check the returned data/errors; if the client exposes errors, map them to `{ ok: false, error: message }` and surface in the UI.
- Add server-side logging (or temporary error toast) on catch and on non-ok client response to confirm whether the failure is auth, validation, or network.
- Validate that the payload passed to `Exam.update({ results })` matches the schema (e.g. plain object, no undefined, JSON-serializable).

---

### 2.2 "Enviar a validación" does nothing (TC9)

**Observed:** Loading state appears, then no toast, no redirect, no error. Exam and Sample remain in progress; no audit events.

**Root cause (hypotheses):**

1. **Same as 2.1**  
   `finalizeExamAction` (and possibly `sendToValidationAction`) use the same `cookieBasedClient` and service pattern. If updates are failing silently (auth or client behavior), then after `finalizeExamAction` the Exam would still be `inprogress`, and `sendToValidation(examId)` would then fail its guard (“Solo exámenes finalizados pueden enviarse a validación”) and return `ok: false`. The provider’s `onSendToValidation` does call `toast.error(sendStatus.error)` when `!sendStatus.ok`, so if the user sees no error toast, either the error is not being returned, or the finalize step is throwing and the catch doesn’t set an error state (the `finally` only sets `isSubmitting(false)`; there is no `setError` or toast in catch for a thrown exception).

2. **Exception path**  
   If `finalizeExamAction` or `sendToValidationAction` throws (e.g. unhandled rejection from Amplify), the promise rejects. The provider uses `try { ... } finally { setIsSubmitting(false); }` with no `catch`. So a thrown error would not call `toast.error` and would not set any error state—resulting in “loading then nothing.”

**Possible fixes:**

- Add `catch` in `onSendToValidation` (and `onSaveDraft`): on rejection, call `toast.error` with a generic or parsed message and optionally set an error state so the user sees that something failed.
- Ensure the service and client never swallow failures: map client errors and thrown errors to `ExamResultStatus` or to a consistent error path in the UI.
- Verify in order: (1) `finalizeExam` actually updates Exam (status + results) and emits audit; (2) `sendToValidation` runs only after that and updates Exam + Sample + audit. If (1) fails silently, (2) will correctly return an error; the main gap is then surfacing (1)’s failure.

---

### 2.3 Audit events not shown (TC3, TC5, TC8, TC9)

**Observed:** “Audit events table is completely empty”; no visible audit trail for ORDER_READY_FOR_LAB, scan, draft save, or send to validation.

**Root cause (hypotheses):**

1. **No UI for WorkOrder / global audit**  
   Reception has no audit view. `ORDER_READY_FOR_LAB` is written with `entityType: WORK_ORDER` and `entityId: workOrderId`. If the only “audit table” the user sees is the technician sample-detail history, that view only shows events where `entityType === SAMPLE` and `entityId === sampleId` (see `technician-repository.ts` `getSampleDetail`). So WorkOrder events would never appear there.

2. **Audit table implementation**  
   If there is a dedicated audit page (e.g. under `/supervisor/auditoria`), it might not be implemented, might not query `AuditEvent` at all, or might filter by entity type/role such that reception/technician events are excluded.

3. **Events not written**  
   If draft and finalize do not persist (2.1, 2.2), then `EXAM_RESULTS_SAVED` and `EXAM_SENT_TO_VALIDATION` are never written. Similarly, if the scan flow does not call an action that writes `SPECIMEN_SCANNED`, that event will be missing (see 2.6).

**Possible fixes:**

- Add a reception-scoped audit view (or include WorkOrder audit events in an existing view) so ORDER_READY_FOR_LAB and related actions are visible.
- Ensure the technician sample detail sheet’s history is the single place for “per-sample” audit; document that global/order-level events live in a different view.
- Implement or fix the supervisor/auditoría page to list AuditEvent with filters (entity type, date, user) and correct auth so the right roles see the right events.
- For scan: add a `SPECIMEN_SCANNED` (or similar) audit event in the scan lookup path (success and/or failure) so scan activity is traceable.

---

### 2.4 State changes before labels printed (TC2, TC3)

**Observed:** Clicking “Generar muestras” moves the order to “Muestras creadas” even if the user never downloads/prints the PDF. Modal can be closed (X or click-outside) without downloading. Reception can end up with no physical labels and no reprint from this flow.

**Root cause:**

- Business flow and UI are decoupled: the backend and UI treat “specimens generated” as the state transition. The plan (Phase 1) mentions “LABEL_PRINTED” and idempotency but does not tie order/sample state to “labels printed.” The modal is a generic dialog that can be closed without completing the “download PDF” step.

**Possible fixes:**

- Defer the “Muestras creadas” (or equivalent) state until after “labels printed” (e.g. user clicked “Descargar PDF” or “Listo”), or introduce an explicit “labels_printed” step and keep “specimens_created” internal.
- Prevent closing the modal until PDF has been downloaded (or user explicitly cancels and reverts generation), or add a clear “Cancelar” that leaves state as “Sin muestras” and cleans up any created samples if that’s acceptable.
- Add a reprint path for orders in “Muestras creadas” so reception can re-download labels without creating new samples.

---

### 2.5 Cannot re-enter process from muestras queue (TC11)

**Observed:** For a sample already in progress, from `/technician/muestras`: “Procesar” says state is not ready for lab; “Ver detalle” → “Continuar” does nothing. Only browser back returns to the process page.

**Root cause (hypotheses):**

1. **Procesar**  
   “Procesar” is wired to `markInProgressAction` then `router.push(.../process/${id})`. The backend rejects when the sample is not `received` (“Solo muestras recibidas pueden marcarse en proceso”). For a sample already `inprogress`, calling “Procesar” again tries to mark in progress again; the service may treat it as no-op or error. The UI does not distinguish “open process workspace” from “mark in progress”: both use the same “Procesar” entry point.

2. **Continuar**  
   In `sample-detail-sheet.tsx`, “Continuar” is the same button as “Procesar” (`onProcess(exam.id)`), so it also calls `markInProgressAction`. For an already in-progress sample, the backend may return an error or no-op, and the code might not navigate when the sample is already in progress. So “Continuar” does not translate to “navigate to process page without re-calling mark in progress.”

**Possible fixes:**

- For samples with status `inprogress`, expose a separate action “Continuar” that only navigates to `/technician/muestras/process/{sampleId}` without calling `markInProgressAction`. Use “Procesar” only when the sample is `received`.
- In the technician context, when status is `Processing`, call `router.push(.../process/${id})` directly from the “Continuar”/“Procesar” handler instead of calling `markInProgressAction` first.

---

### 2.6 No audit event for scan (TC5)

**Observed:** Scanning a sample (success or invalid) does not create an audit event.

**Root cause:**

- The scan flow uses `lookupSampleByBarcodeAction` / `lookupSampleByBarcode`, which only performs a read. No call to create an `AuditEvent` (e.g. `SPECIMEN_SCANNED`) exists in that path (phase-2.md 2d.5 does not require it; test case expects it for traceability).

**Possible fixes:**

- After a successful (or attempted) scan in the action, create an `AuditEvent` with action `SPECIMEN_SCANNED` (or similar), with metadata such as `success: true/false`, so “who scanned what and when” is auditable.

---

## 3. High / Medium Findings — Root Cause and Possible Fixes

### 3.1 Filter/search refetch and clearing (TC1)

**Observed:** Changing filters triggers a full refetch and feels sluggish. Search refetches on every keypress. Clearing search sometimes leaves the list in the “last query” state instead of returning to unfiltered.

**Root cause (hypotheses):**

- **Vercel React best practices:** Avoid client-side waterfalls and excessive refetches. If filters and search are controlled state that trigger a server or client fetch on every change, that matches “each keypress triggers full search.” No debounce or search-on-submit.
- **State/URL:** If “no filters” state is not represented in URL or in a single source of truth, clearing the input might leave the previous filter/search in effect so the next fetch still uses the old value.

**Possible fixes:**

- Debounce search input (e.g. 300–400 ms) or use “search on submit” (button or Enter) so refetch is not on every keypress.
- Sync filters and search to URL (e.g. nuqs or query params) so “clear” restores a known state and the next fetch uses empty filters.
- Consider parallel or cached fetches for filter options vs. list data so changing filters doesn’t always refetch everything (server-cache-react / client patterns).

---

### 3.2 PDF empty if labels not rendered (TC2, TC3)

**Observed:** If the user clicks “Descargar PDF” before the barcode list has rendered in the modal, the PDF is empty.

**Root cause:**

- The PDF is likely generated from the same DOM or data that renders the barcode list. If the PDF is generated before the list is painted or before the data is available in the component that feeds the PDF, the PDF content will be empty.

**Possible fixes:**

- Disable “Descargar PDF” until the barcode list is rendered and/or the data for the PDF is available (e.g. a state flag set after first paint or when barcodes are set).
- Generate the PDF from the same data source (e.g. props/state) that renders the list, not from the DOM, so timing of paint doesn’t matter.

---

### 3.3 Procesar shown for non-received samples (TC7)

**Observed:** “Procesar” appears for samples that are still `ready_for_lab`. Backend correctly rejects with “Solo muestras recibidas pueden marcarse en proceso.”

**Root cause:**

- Phase-2 status mapping: `ready_for_lab` and `received` both map to UI status `"Received"` (`SAMPLE_STATUS_TO_WORKSTATION` in contracts and technician-repository). The muestras table shows “Procesar” for any row with `status === "Received"` (and not Completed/Flagged). So both `ready_for_lab` and `received` show “Procesar,” but only `received` is valid for marking in progress.

**Possible fixes:**

- **Explicit variants (composition):** Use a distinct UI status for `ready_for_lab` (e.g. “Lista para lab” or “Pendiente de recibir”) so the table can show “Procesar” only when schema status is `received` (or `inprogress` for “Continuar”). This aligns with phase-2 “Replace boolean mode flags with explicit components” and avoids offering an action that will always fail for `ready_for_lab`.

---

### 3.4 Inconsistent draft success feedback (TC8 – Coproanálisis)

**Observed:** After “Guardar borrador,” Coproanálisis: no toast, button stayed disabled. Uroanálisis/Hemograma: button re-enabled, clearer success.

**Root cause (hypotheses):**

- Different form structures (e.g. sections, default values) might affect when `isDirty` is cleared or when the button’s `disabled` condition is re-evaluated. If the provider sets `setIsDirty(false)` only on `status.ok`, and for Coproanálisis the action never returns (e.g. hangs or throws), then isDirty would stay true and the button could remain disabled. Alternatively, one exam type might have a validation or serialization difference that causes the action to fail without surfacing an error.
- If the backend save fails for Coproanálisis only (e.g. field schema or payload shape), the action would return `ok: false` and the toast would show the error; the user said “no toast,” so either the action is not returning or is throwing. Again, an unhandled rejection would explain “no toast” and no state update.

**Possible fixes:**

- Ensure a single code path for “after save attempt”: always call `setIsSubmitting(false)`, and either show success toast + clear dirty or show error toast. Add catch so any thrown error results in an error toast.
- Normalize form → payload for all exam types (same ResultsRecord shape, same validation) so no type-specific path fails silently.

---

### 3.5 ready_for_lab vs Received UI (TC6)

**Observed:** Both `ready_for_lab` and `received` display as “Received,” which is confusing.

**Root cause:**

- Same as 3.3: `SAMPLE_STATUS_TO_WORKSTATION` maps both to `"Received"`. Phase-2 status mapping table shows `ready_for_lab` → “Received (available for processing)” and `received` → “Received,” which collapses two distinct states in the UI.

**Possible fixes:**

- Add a distinct UI label for `ready_for_lab` (e.g. “Lista para lab” or “Pendiente de recibir”) and keep “Received” for `received` only. Update status badge and any filters that use “Received.”

---

### 3.6 Guardar borrador stays disabled after save (TC8 – Coproanálisis)

**Observed:** After saving, new edits in the form don’t re-enable “Guardar borrador” even though localStorage updates.

**Root cause (hypotheses):**

- Parent uses `isDirty` from the provider to enable the button. If after save the form’s `formState.isDirty` is not reset correctly (e.g. default values are updated from context so the form no longer considers the current values “dirty”), or if the key/remount behavior differs for Coproanálisis, the button could stay disabled. Alternatively, if `setIsDirty(false)` is called on success and the form doesn’t set dirty again on change (e.g. `onDirtyChange` not firing), the button would stay disabled.

**Possible fixes:**

- Ensure “Guardar borrador” is enabled when `isDirty || formState.isDirty` (or a single source of truth that becomes true whenever the user changes any field after load/save).
- After a successful save, do not reset form default values from server if the user is expected to keep editing; or ensure that any update of default values still allows the form to report dirty when the user types again.

---

### 3.7 Modal barcode render delay (TC2)

**Observed:** Specimen codes take a while to appear in the modal after generation.

**Root cause (hypotheses):**

- List is rendered after an async state update or after the modal opens; or the modal content is heavy and blocks paint. Could be a single render that includes many items or a waterfall (e.g. open modal then fetch barcodes).

**Possible fixes:**

- Show a loading state inside the modal until barcodes are available, and disable “Descargar PDF” until then (helps 3.2 as well).
- Ensure barcodes are part of the generation response and set in one state update so one paint shows the list.

---

## 4. Alignment with Standards and Plans

### 4.1 Integration plan and phases

- **Phase 1 (Reception):** State-before-labels and audit visibility gaps conflict with “audit trail” and clear state transitions. Reprint path is called out in the plan.
- **Phase 2 (Technician dashboard + muestras):** Status mapping and “Procesar”/“Continuar” behavior should be aligned with “Replace boolean mode flags with explicit components” and with a single source of truth for queue state (provider). Scan audit (SPECIMEN_SCANNED) is a traceability gap.
- **Phase 3 (Process workspace):** “No placeholder in process route” and “Results persist and transition cleanly” are not met until draft and send-to-validation persist and show clear success/error. Concurrency (TC12) is blocked by persistence.

### 4.2 Amplify

- Per `.cursor/rules/amplify.mdc`, backend and frontend integration should follow the relevant SOPs. The analysis above assumes schema and auth are correct; the main risks are (1) use of `cookieBasedClient` inside Server Actions and (2) auth rules causing silent rejections of Exam updates. Verifying with the Amplify frontend/backend SOPs for Server Actions and data client usage is recommended.

### 4.3 Vercel composition patterns

- **Explicit variants:** `ready_for_lab` vs `received` should be two distinct UI states (or explicit components), not one “Received” with a hidden backend difference. “Procesar” vs “Continuar” should be explicit actions (navigate vs mark in progress) rather than one button that does both.
- **State in provider:** Process workspace provider already holds form state and actions; the gap is ensuring success/error and persistence are reflected there and that re-entry from the queue uses the same context (e.g. “Continuar” = navigate to process route).

### 4.4 Vercel React best practices

- **Async/waterfalls:** Reception filter/search should avoid refetch-on-every-keystroke (debounce or search-on-submit); consider parallel/cached fetches.
- **Error handling:** Server Actions should catch rejections and surface errors (toast or state); avoid “loading then nothing” when the backend or client fails.

### 4.5 Web interface guidelines

- **Forms:** Submit button stays enabled until request starts; spinner during request. Error messages inline and after submit. Our case: loading state is shown but success/error feedback is missing when the request fails or throws.
- **Navigation:** Warn before navigation with unsaved changes—already implemented (TC10 pass). Deep-link stateful UI: re-entry to process workspace via “Continuar” should be a direct link to the process URL.
- **Async updates:** Toasts and validation need `aria-live="polite"` where applicable; ensuring toasts fire on both success and failure meets the “async updates” guideline.

---

## 5. Summary Table

| ID | Finding | Likely cause | Fix direction |
|----|--------|--------------|----------------|
| 2.1 | Draft not in DB | Client/auth in Server Action; silent failure; payload | Request-scoped client; check update result; log/catch errors; validate payload |
| 2.2 | Enviar a validación does nothing | Same as 2.1; unhandled rejection in provider | Catch in onSendToValidation; surface errors; verify finalize + send order |
| 2.3 | Audit table empty | No UI for WorkOrder/global; or events not written | Audit UI for reception/global; scan audit; fix persistence so exam events exist |
| 2.4 | State before labels | Flow not tied to “labels printed” | Defer state or add step; reprint path; modal not closable until download/cancel |
| 2.5 | Can’t re-enter process | Procesar/Continuar both call markInProgress | “Continuar” = navigate only when status is inprogress |
| 2.6 | No scan audit | Scan path has no audit write | Emit SPECIMEN_SCANNED in scan action |
| 3.1 | Filter/search refetch/clear | No debounce; state not synced to URL | Debounce or submit; URL state for filters |
| 3.2 | PDF empty | PDF generated before list/data ready | Disable download until data ready; generate from data not DOM |
| 3.3 | Procesar for non-received | ready_for_lab and received both “Received” | Distinct UI status; show Procesar only for received |
| 3.4 | Inconsistent draft feedback | Thrown error or type-specific failure | Single success/error path; catch and toast |
| 3.5 | ready_for_lab vs Received | Same mapping to “Received” | Separate label for ready_for_lab |
| 3.6 | Button stays disabled | isDirty not updated after save/edit | Single dirty source; ensure onDirtyChange fires |
| 3.7 | Modal render delay | Async or heavy render | Loading state; one state update for barcodes |

---

*End of analysis. No implementation plan in this document.*
