# Manual Test Results — Phase 0–3 E2E

Results and notes from executing [test-cases.md](./test-cases.md).

---

## Test Case 1: Reception — List Orders and View Detail

**Result:** Pass  
**Date:** (fill in when run)

### Verification

| Check | Result |
|-------|--------|
| Page loads | Pass — "Órdenes entrantes" header visible |
| Table | Pass — List of orders with patient name, priority, tests, status |
| Order status | Pass — All statuses show "Sin muestras" |
| Filters | Pass — Quick filters work |
| Search | Pass — Search works |
| Badge | Pass — "X pendientes" shows correct count |

### Notes / Findings (do not fix in this pass — document only)

1. **Filter changes trigger full refetch**  
   Changing filters causes a full data refetch. The experience feels sluggish.

2. **Search refetches on every keypress**  
   Each key press in the search field triggers a full search/refetch. This behaves like unintentional load (DDOS-style) and should be improved (e.g. debounced search or search-on-submit).

3. **Clearing search can leave wrong state**  
   When deleting the text in the search filter, the list sometimes does not return to the “no filters” state and keeps showing the result of the last query instead of the full list.

---

## Test Case 2: Reception — Generate Specimens

**Result:** Pass  
**Date:** (fill in when run)

### Verification

| Check | Result |
|-------|--------|
| "Generar muestras" enabled for "Sin muestras" | Pass |
| During generate: loading state, modal opens | Pass |
| After success: modal shows specimens with barcodes | Pass — note: it takes a while to render the muestra codes in the modal |
| No error | Pass |
| Download PDF | Pass — download succeeds with correct codes |

### Notes / Findings (do not fix in this pass — document only)

1. **Modal barcode render delay**  
   It takes a while for the specimen codes to appear in the modal after generation completes.

2. **Critical: State changes before labels are printed**  
   Clicking "Generar muestras" alone changes the order state from "Sin muestras" to "Muestras creadas" even if the user never downloads/prints the labels. Reception could end up with specimens created in the system but no physical labels printed, and currently there is no way to reprint from this flow. This is critical — consider tying state to "labels printed" or providing a reprint path from reception for orders in "Muestras creadas" before they are marked "Listo".

---

## Test Case 3: Reception — Mark Order Ready for Lab

**Result:** Pass  
**Date:** (fill in when run)

### Verification

| Check | Result |
|-------|--------|
| Before PDF download: "Listo" disabled, "Descargar PDF" enabled | Pass |
| After PDF download: "Listo" becomes enabled | Pass — note: if "Descargar" is clicked before labels are rendered in the modal, the PDF prints nothing |
| After "Listo": dialog closes; order status updates; table refreshes | Pass |
| Samples appear in technician muestras queue | Pass — samples and work order show properly |
| Reimprimir | Pass — works properly |
| DB: All samples for WorkOrder `status` = `ready_for_lab` | Pass |

### Notes / Findings (do not fix in this pass — document only)

1. **PDF with empty content**  
   If the user clicks "Descargar PDF" before the specimen codes have rendered in the modal, the downloaded PDF contains nothing. Wait for barcode list to appear before downloading.

2. **Modal is closable without printing**  
   The generation/ready modal can be closed via the X or by clicking outside. Users can dismiss it without ever downloading/printing labels, so again they can end up with "Muestras creadas" (or "Listo" not clicked) and no physical labels — same class of risk as TC2.

3. **CRITICAL: Audit events not shown**  
   The audit events table (wherever it is displayed in the app) is completely empty at this point. No audit events are visible to the user, so ORDER_READY_FOR_LAB and other actions are not reflected in the UI even if they are written to the backend. This needs to be fixed so that audit trail is visible.

---

## Test Case 4: Technician — Dashboard and Muestras Queue

**Result:** Pass  
**Date:** (fill in when run)

### Verification

| Check | Result |
|-------|--------|
| Login as technician → navigates to technician dashboard | Pass |
| Dashboard metrics reflect real data | Pass — 0 Completadas, 8 Recibidas, 0 Pendientes, 0 Urgentes (at time of test) |
| Muestras table | Pass — samples listed; for this run only "Received" estado shown in UI |
| Row content | Pass — patient name, test type, priority, status, wait time set up properly |
| Filters | Pass — work properly |
| Search bar | Pass — works properly |

**Context:** Samples that exist in DB with only `labeled` status (e.g. from flows where the reception modal was closed without "Listo") do not appear in the technician queue, which is expected — the queue shows only `ready_for_lab`, `received`, `inprogress`, `completed`, `rejected`.

### Notes / Findings

None. State management for dashboard and muestras queue appears to be handled properly.

---

## Test Case 5: Technician — Scan Sample (Barcode Lookup)

**Result:** Pass  
**Date:** (fill in when run)

### Verification

| Check | Result |
|-------|--------|
| Scan success: sample is located | Pass — detail panel opens or sample is highlighted |
| Scan failure: invalid/unknown barcode | Pass — random input (e.g. "ASDFA") shows error message |
| No duplicate | Pass — (meaning: scanning the same barcode again does not create duplicate Sample/Exam records; scan is lookup-only, no extra DB writes) |
| DB: No status change from scan alone | Pass — scan does not change Sample status |
| Audit event for scan | **Fail** — no audit event is written when a sample is scanned |

### Notes / Findings (do not fix in this pass — document only)

1. **Clarification — "No duplicate"**  
   The test case intends: scanning the same barcode multiple times does not create duplicate records in the DB; the scan is a lookup only and does not insert new rows. Verified as such.

2. **CRITICAL: No audit event for scan**  
   Scanning a sample (success or attempted lookup) does not emit an audit event. We need an audit event (e.g. `SPECIMEN_SCANNED`) so that scan activity is traceable — who scanned what and when.

---

## Test Case 6: Technician — Mark Sample Received

**Result:** Pass  
**Date:** (fill in when run)

### Verification

| Check | Result |
|-------|--------|
| Samples in DB with `ready_for_lab` show in queue | Pass |
| "Recibir" visible for samples in ready_for_lab state | Pass |
| After success: DB status changes to `received` | Pass |
| UI state after "Recibir" | Pass — UI label stays "Received" (same before and after; consider checking if a visible transition is needed) |
| Error case: already-received sample | Pass — clicking "Recibir" again shows "Solo muestras listas para lab pueden marcarse recibidas" |
| Audit event `SPECIMEN_RECEIVED` in DB | Pass — shows properly in the database |

### Notes / Findings (do not fix in this pass — document only)

1. **Distinct UI state for ready_for_lab**  
   Currently both `ready_for_lab` and `received` map to the same UI label "Received". It is confusing that a sample that is only ready_for_lab (not yet received in lab) looks the same as one that has already been marked received. Consider a separate visible state for ready_for_lab (e.g. "Lista para lab" or "Pendiente de recibir") so the technician can tell them apart.

---

## Test Case 7: Technician — Mark Sample In Progress and Open Process

**Result:** Pass  
**Date:** (fill in when run)

### Verification

| Check | Result |
|-------|--------|
| "Procesar" visible for received samples | Pass |
| "Procesar" shown only for received | **Fail** — "Procesar" is also available for samples not yet received; should be changed so only received samples can be processed |
| Error when "Procesar" on non-received sample | Pass — "Solo muestras recibidas pueden marcarse en proceso" shown |
| Navigates to `/technician/muestras/process/[sampleId]` | Pass |
| Process page: header, exam type name, form sections from fieldSchema | Pass |
| Form fields: string, numeric, enum render properly | Pass |
| DB: Sample `status` = `inprogress` | Pass |
| DB: Exam `status` = `inprogress`, `performedBy` set | Pass |
| Audit: `SPECIMEN_IN_PROGRESS` for sample | Pass |

**Exam types opened during test:** Hemograma (SMP-ORD-2025-001-02), Uroanálisis (SMP-ORD-2025-001-01), Coproanálisis (SMP-ORD-2025-003-02 — Macroscópico). Everything rendered and behaved as expected.

### Notes / Findings (do not fix in this pass — document only)

1. **"Procesar" should be gated by received status in UI**  
   Backend correctly rejects non-received samples with "Solo muestras recibidas pueden marcarse en proceso", but the UI still shows "Procesar" for samples that are not yet received (e.g. ready_for_lab). We should hide or disable "Procesar" until the sample is in `received` status so users are not prompted to take an action that will always fail.

---

## Test Case 8: Technician — Save Draft (Process Workspace)

**Result:** Pass (UI/UX) / **Fail (backend persistence)**  
**Date:** (fill in when run)

Tests run on three exam types: **Coproanálisis** (SMP-ORD-2025-003-02), **Uroanálisis** (SMP-ORD-2025-001-01), **Hemograma** (SMP-ORD-2025-001-02).

### Verification

| Check | Result |
|-------|--------|
| Dirty state: "Guardar borrador" enabled when form has changes | Pass |
| During save: loading; both "Enviar a validación" and "Guardar borrador" disabled | Pass |
| Form remains editable after save | Pass |
| After success: toast "Borrador guardado"; dirty clears; button re-enables | **Inconsistent** — Coproanálisis: no toast, unclear if saved, button stayed disabled; Uroanálisis & Hemograma: button re-enabled after load, clearer |
| Local storage / autosave | Pass — values persist to localStorage; editing updates localStorage; autosave works |
| DB: Exam `results` JSON updated | **Fail** — no JSON updated in DB for the entered values across all three tests |
| Audit: `EXAM_RESULTS_SAVED` (draft) | **Fail** — audit shows nothing new for any of the three draft-save attempts |

### Notes / Findings (do not fix in this pass — document only)

1. **Inconsistent success feedback (Coproanálisis)**  
   On Coproanálisis, after "Guardar borrador": no toast, no clear success, no validation messages. Button stayed disabled so it was unclear whether the save succeeded. On Uroanálisis and Hemograma the button went from disabled to enabled after loading, which made success clearer. We should ensure consistent toast and button state after draft save.

2. **"Guardar borrador" stays disabled after save (Coproanálisis)**  
   After saving, editing the form again and expecting "Guardar borrador" to enable: on Coproanálisis it stayed disabled even with new values (though localStorage did update with the new values). Suggests dirty flag or button enable logic may not be consistent across exam types or form states.

3. **CRITICAL: Draft not persisting to backend**  
   For all three tests, the Exam record in the DB did not get its `results` JSON updated. Values appear only in localStorage. So "Guardar borrador" is either not calling the backend save, or the backend save is failing silently. Draft must persist to Exam.results so data is not lost and other users/views can see it.

4. **CRITICAL: No audit events for draft save**  
   No new audit events appeared for any of the three "Guardar borrador" attempts. EXAM_RESULTS_SAVED (with draft: true) should be written when a draft is saved; either the event is not being emitted or the audit table is not showing it.

---

## Test Case 9: Technician — Send to Validation (Full Submit)

**Result:** **Fail** — "Enviar a validación" does not appear to be working.  
**Date:** (fill in when run)

### Verification

| Check | Result |
|-------|--------|
| Form has required values filled | Pass (precondition) |
| "Enviar a validación" submits; loading state during request | Pass |
| Success: toast "Enviado a validación"; redirect to `/technician/muestras` | **Fail** — no toast, no redirect at all |
| Error feedback | **Fail** — no error on dev server, no error state in UI; silent failure |
| DB: Exam `status` = `ready_for_validation` | **Fail** — still in progress |
| DB: Exam `results` = submitted values | **Fail** — results do not show submitted values |
| DB: Exam `resultedAt` set | **Fail** — not set (performedBy was already set from earlier steps) |
| DB: Sample `status` = `completed` (when all exams sent) | **Fail** — Sample still inprogress |
| Audit: EXAM_RESULTS_SAVED (finalized), EXAM_SENT_TO_VALIDATION, SPECIMEN_COMPLETED | **Fail** — no audit events |

### Notes / Findings (do not fix in this pass — document only)

**CRITICAL: "Enviar a validación" flow is not working.**  
Submit shows loading then nothing: no success toast, no redirect to muestras, no error in console or UI. In the database, Exam remains inprogress, results are not updated, resultedAt is not set, and Sample stays inprogress. No audit events are written. The entire finalize + send-to-validation path appears to be failing silently and must be fixed for the technician workflow to be usable.

---

## Test Case 10: Unsaved Changes Guard

**Result:** Pass  
**Date:** (fill in when run)

**Sample used:** SMP-ORD-2025-001-01

### Verification

| Check | Result |
|-------|--------|
| Navigate with dirty: confirmation dialog shows | Pass |
| Confirm leave (accept): redirects away from page | Pass |
| Cancel: stays on page; form state preserved | Pass |

### Notes / Findings

None.

---

## Test Case 11: Draft Recovery (Local Storage)

**Result:** Pass (banner/actions) / **Fail (navigation back to process)**  
**Date:** (fill in when run)

### Verification

| Check | Result |
|-------|--------|
| Banner: "Hay un borrador guardado localmente" with Recuperar / Descartar | Pass |
| Recuperar: restores draft into form; banner dismisses; form dirty | Pass |
| Descartar: clears draft; banner dismisses; form uses server values | Pass |
| Navigating back to in-progress exam from `/technician/muestras` | **Fail** — see notes below |

### Notes / Findings (do not fix in this pass — document only)

1. **Cannot re-enter process from muestras queue**  
   On `/technician/muestras`, for a sample that is already in progress (has draft or was being edited): clicking **Procesar** shows an error that processing cannot start because state is not ready for lab (incorrect or confusing — sample is already in progress). Clicking **Ver detalle** then **Continuar** does nothing (unclear why). The only way to get back to the process workspace is to use the browser’s back button. We need a reliable way to reopen an in-progress exam from the muestras queue (e.g. "Continuar" should navigate to the process page for that sample).

---

## Test Case 12: Concurrency Conflict

**Result:** **Cannot verify** (blocked by TC8/TC9)  
**Date:** (fill in when run)

### Verification

| Check | Result |
|-------|--------|
| Tab B submit shows conflict message "Otro usuario modificó este examen" | **Not testable** |
| Conflict banner: Recargar / Cerrar | **Not testable** |

### Notes / Findings (do not fix in this pass — document only)

**Blocked by save/validation not persisting.**  
Because exam results are not being saved to the backend (Exam.results JSON not updated — see TC8, TC9), there is no persisted "other user" change to detect. The concurrency conflict flow (updatedAt mismatch, conflict message, Recargar/Cerrar) could not be tested. Once draft save and "Enviar a validación" persist correctly to the DB, re-run this test to verify conflict detection and UI.

---

## Test Case 13: Reception — Scan Order Lookup

**Result:** Pass  
**Date:** (fill in when run)

### Verification

Match found, no match, and manual entry (if used) all behave as expected. No issues.

### Notes / Findings

None.

---

## Test Case 14: Order Without Requested Exams (Edge)

**Result:** N/A (out of scope for production)  
**Date:** (fill in when run)

### Verification

Not run. This edge case is not expected in the real flow: orders will be created programmatically in a batched way, and any failed attempts will be sent to a DLQ with all proper values. The scenario "order with no requested exams" is therefore out of scope for manual testing in this context.
