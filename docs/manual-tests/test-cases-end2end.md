# Phase 4 — Supervisor Validation: Manual Test Cases

**Scope:** End-to-end testing from order/sample creation through technician result submission to supervisor validation.
**Reference:** `docs/integration/phase-4.md`, `docs/flujo-end-to-end-labcore.md`

---

## Prerequisites

- Logged-in user accounts for roles: **recepción**, **técnico**, **supervisor**.
- At least one `WorkOrder` in `pending` status with `requestedExamTypeCodes` mapped to existing `ExamType` records (e.g. `["CBC", "GLUCOSE"]`).
- Access to database (Amplify console / DynamoDB) to verify record states.
- Browser DevTools open for network inspection.

---

## Notation

- **[UI]** = verify in the browser.
- **[DB]** = verify in the database (DynamoDB / Amplify console).
- **[AUDIT]** = verify an `AuditEvent` record was created.
- **[TOAST]** = verify a toast/snackbar notification appears.
- **[NAV]** = verify a navigation/redirect occurs.

---

## TC-4.0 — Setup: Create Order and Generate Samples (Reception)

> This section prepares the data needed by the technician. All steps run as the **recepción** role.

### TC-4.0.1 — View orders in reception inbox

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Log in as **recepción** user. Navigate to `/recepcion`. | Reception inbox loads. Order list table is visible. |
| 2 | **[UI]** Verify the table columns. | Columns: Paciente, Orden (accession number), Exámenes, Estado, Prioridad, Fecha, Acciones. |
| 3 | **[UI]** Look for a `WorkOrder` with status **"Sin muestras"**. | At least one order shows "Sin muestras" badge. If none exists, a new `WorkOrder` must be seeded. |
| 4 | **[DB]** Query `WorkOrder` table for the target order. | Record exists with `status: "pending"`, `requestedExamTypeCodes` contains valid codes (e.g. `["CBC"]`), `patientId` links to an existing `Patient`. |

### TC-4.0.2 — Generate specimens for the order

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Click the target order row (or scan its accession number). | Order detail sheet opens showing patient info, requested exams, and "Generar muestras" button. |
| 2 | Click **"Generar muestras"**. | Generation dialog appears showing the number of samples created and their barcodes (format: `SMP-{accession}-01`, `SMP-{accession}-02`, ...). |
| 3 | **[DB]** Query `Sample` table filtered by `workOrderId`. | One `Sample` per requested exam type code exists. Each has: `status: "labeled"`, `barcode` matching the displayed value, `examTypeId` linking to the correct `ExamType`, `workOrderId` linking to the parent order. |
| 4 | **[DB]** Query `Exam` table filtered by each new `sampleId`. | One `Exam` per sample exists. Each has: `status: "pending"`, `sampleId` linking to the sample, `examTypeId` matching the sample's exam type, `results: null`, `performedBy: null`, `validatedBy: null`. |
| 5 | **[AUDIT]** Query `AuditEvent` where `entityId = workOrderId` and `action = "SPECIMENS_GENERATED"`. | Record exists with `entityType: "WorkOrder"`, correct `userId`, `metadata` containing sample IDs and barcodes. |
| 6 | Click **"Descargar PDF"** in the generation dialog. | PDF downloads with barcodes for each sample. |
| 7 | **[AUDIT]** Query `AuditEvent` where `action = "LABEL_PRINTED"`. | New audit event created for label printing. |

### TC-4.0.3 — Mark samples ready for lab

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Click **"Listo"** in the generation dialog. | Dialog closes. Order status in the table changes to **"Muestras creadas"** or similar. |
| 2 | **[DB]** Query all `Sample` records for this work order. | All samples now have `status: "ready_for_lab"`. |
| 3 | **[AUDIT]** Query `AuditEvent` where `action = "ORDER_READY_FOR_LAB"`. | Audit event exists with the work order ID. |

---

## TC-4.1 — Technician: Scan, Process, and Send to Validation

> All steps run as the **técnico** role. This produces exams in `ready_for_validation` status for the supervisor to review.

### TC-4.1.1 — Technician dashboard shows pending samples

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Log in as **técnico** user. Navigate to `/technician`. | Technician dashboard loads. |
| 2 | **[UI]** Verify the "Next Sample" card. | Shows a sample from the work order created in TC-4.0 (or similar pending sample) with patient name, test type, priority, and wait time. |
| 3 | **[UI]** Verify the queue table. | Shows samples with status indicators; the newly created samples appear as "Awaiting Receipt" or equivalent. |

### TC-4.1.2 — Scan sample and mark received

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to `/technician/muestras`. | Muestras workstation loads with scan bar, status summary, and queue table. |
| 2 | Enter the sample barcode (e.g. `SMP-1042-01`) in the scan bar and press Enter. | **[UI]** Sample is found, detail panel opens on the right. Sample row is highlighted in the table. Scanner status shows success. |
| 3 | **[UI]** Verify the detail panel content. | Shows: sample barcode, exam type name, patient name, status (`ready_for_lab` / "Awaiting Receipt"), work order accession number. |
| 4 | Click **"Marcar como recibida"** in the detail panel. | **[UI]** Status in the detail panel changes to "Received". Button changes or disappears. |
| 5 | **[DB]** Query the `Sample` record. | `status: "received"`, `receivedAt` populated with a recent ISO timestamp. |
| 6 | **[AUDIT]** Query `AuditEvent` where `entityId = sampleId` and `action = "SPECIMEN_RECEIVED"`. | Audit event exists. Note: verify the stored `action` value — there may be a typo (`"SPECIMEN_RECEIVed"`) in the contracts file. |

### TC-4.1.3 — Navigate to process workspace

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Click **"Procesar"** button in the sample detail panel. | **[NAV]** Redirects to `/technician/muestras/process/{sampleId}`. Process workspace loads with exam form. |
| 2 | **[DB]** Query the `Sample` record. | `status: "inprogress"`. |
| 3 | **[DB]** Query the `Exam` record (by `sampleId`). | `status: "inprogress"`, `startedAt` populated with recent ISO timestamp, `performedBy` set to the technician's user ID. |
| 4 | **[AUDIT]** Query `AuditEvent` where `entityId = examId` and `action = "EXAM_STARTED"`. | Audit event exists. |
| 5 | **[AUDIT]** Query `AuditEvent` where `entityId = sampleId` and `action = "SPECIMEN_IN_PROGRESS"`. | Audit event exists. |
| 6 | **[UI]** Verify the workspace layout. | Shows: exam type name header, sample barcode, dynamic form fields matching the `ExamType.fieldSchema`, "Guardar borrador" button, "Enviar a validación" button, "Cancelar" / back button. |

### TC-4.1.4 — Enter exam results

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | **[UI]** Verify the form fields match the `ExamType.fieldSchema`. | For each section in the field schema: section label visible, all fields rendered with correct type (number input, select dropdown, text input), units shown, reference ranges shown for numeric fields. |
| 2 | Fill in all required fields with **normal** values (within reference ranges). | Form accepts values without validation errors. |
| 3 | Observe the form dirty state. | "Guardar borrador" and "Enviar a validación" buttons become enabled. Browser tab may show unsaved indicator. |

### TC-4.1.5 — Save draft (optional verification)

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Click **"Guardar borrador"**. | **[TOAST]** Success toast appears ("Borrador guardado" or similar). |
| 2 | **[DB]** Query the `Exam` record. | `results` field contains the entered values as JSON. `status` remains `"inprogress"`. |
| 3 | **[AUDIT]** Query `AuditEvent` where `entityId = examId` and `action = "EXAM_RESULTS_SAVED"`. | Audit event exists with `metadata` containing `draft: true`. |
| 4 | Refresh the page. | **[UI]** Draft restoration banner appears offering to restore saved values. Click "Restaurar" and verify values are re-populated. |

### TC-4.1.6 — Send exam to validation

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Click **"Enviar a validación"**. | **[TOAST]** Success toast appears. **[NAV]** Redirects back to `/technician/muestras`. |
| 2 | **[DB]** Query the `Exam` record. | `status: "ready_for_validation"`, `results` contains the final values, `resultedAt` populated with ISO timestamp, `performedBy` set to technician user ID. |
| 3 | **[DB]** Query the `Sample` record. | `status: "completed"` (if this is the only exam for this sample, the sync logic triggers). |
| 4 | **[AUDIT]** Query `AuditEvent` where `entityId = examId` and `action = "EXAM_RESULTS_SAVED"`. | New audit event exists with `metadata` containing `finalized: true`. |
| 5 | **[AUDIT]** Query `AuditEvent` where `entityId = examId` and `action = "EXAM_SENT_TO_VALIDATION"`. | Audit event exists with `metadata` containing `sampleId`. |
| 6 | **[AUDIT]** Query `AuditEvent` where `entityId = sampleId` and `action = "SPECIMEN_COMPLETED"`. | Audit event exists with `metadata` containing `trigger: "exam_sent_to_validation"`. |

### TC-4.1.7 — Send a second exam with out-of-range values (for critical flag testing)

> Repeat TC-4.1.2 through TC-4.1.6 for a **second sample** from the same or different work order, but enter values **outside** the reference range for at least one numeric field (e.g., if reference range is 10–20, enter 35).

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Process a second sample and enter an out-of-range value for a numeric field. | **[UI]** The form shows a "Alto" or "Bajo" flag next to the out-of-range field (amber/rose badge). |
| 2 | Send to validation. | Exam reaches `ready_for_validation` as in TC-4.1.6. |
| 3 | **[DB]** Verify the `Exam.results` JSON contains the out-of-range value. | The value is stored as-is (no clamping). |

---

## TC-4.2 — Supervisor Dashboard (Phase 4d)

> All steps run as the **supervisor** role.

### TC-4.2.1 — Dashboard displays real statistics

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Log in as **supervisor** user. Navigate to `/supervisor`. | Supervisor dashboard loads. |
| 2 | **[UI]** Verify the 4 stat cards are visible. | Cards: **Pendientes validar**, **Críticos**, **Incidencias**, **Tiempo prom. (min)**. |
| 3 | **[UI]** Verify "Pendientes validar" count. | Matches the number of `Exam` records with `status: "ready_for_validation"` in the database. Should include the exams sent in TC-4.1. |
| 4 | **[UI]** Verify "Críticos" count. | Matches the count of pending exams with clinical flag `critico` or `atencion`, or with reference range violations. Should be ≥ 1 if TC-4.1.7 was executed. |
| 5 | **[UI]** Verify "Incidencias" count. | Shows `0` if no incidences have been created yet. |
| 6 | **[UI]** Verify "Tiempo prom." value. | Shows `0` min if no exams have been approved/rejected yet. After approvals, shows average turnaround (resultedAt to validatedAt) in minutes. |
| 7 | **[UI]** Verify no `MOCK_STATS` or `MOCK_RESULTS` constants are rendered. | All data is real, sourced from the repository. Compare displayed data with DB queries. |

### TC-4.2.2 — Dashboard pending validation table

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | **[UI]** Verify the pending validation table below the stat cards. | Table shows rows for exams with `status: "ready_for_validation"`. |
| 2 | **[UI]** Verify table columns. | Columns: Paciente, Examen, Técnico, Fecha procesado, Bandera clínica, Estado, Acción. |
| 3 | **[UI]** Verify the exam from TC-4.1.6 appears. | Row shows: correct patient name, exam type name, technician ID (or name), processed timestamp matching `resultedAt`, clinical flag badge (Normal), status "Pendiente". |
| 4 | **[UI]** Verify the out-of-range exam from TC-4.1.7 appears. | Row shows clinical flag badge as "Atención" (amber) or "Crítico" (red), depending on how far out of range the value is. |
| 5 | **[UI]** Verify the critical row is visually highlighted. | Row has red/amber left border or background highlight. |
| 6 | **[UI]** Verify the "Revisar" button in the action column. | Each pending row has a "Revisar" link/button. |
| 7 | Click **"Revisar"** on a pending exam row. | **[NAV]** Navigates to `/supervisor/validaciones/{examId}`. |

### TC-4.2.3 — Dashboard loading and error states

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Hard-refresh `/supervisor` with network throttling (Slow 3G). | **[UI]** Skeleton loading cards appear during data fetch. Skeleton table rows shown. |
| 2 | After data loads, skeleton is replaced with real content. | No flash of mock data. Smooth transition from skeleton to content. |

### TC-4.2.4 — Dashboard empty state

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | When no exams are in `ready_for_validation` status (all approved/rejected). | **[UI]** Dashboard shows "Pendientes validar: 0". Table shows empty state message (no rows). |

---

## TC-4.3 — Validation List Page (Phase 4e)

### TC-4.3.1 — Validation list loads with real data

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to `/supervisor/validaciones`. | Page loads with filter controls and validation queue table. |
| 2 | **[UI]** Verify header shows counts. | Header displays pending count and critical count badges matching dashboard values. |
| 3 | **[UI]** Verify the queue table content. | Lists all exams with `status: "ready_for_validation"`. Each row shows: patient name, exam type, technician, processed date/time, clinical flag badge, status badge ("Pendiente"), "Revisar" button. |
| 4 | **[UI]** Verify sort order. | Rows sorted by `processedAt` ascending (oldest first — FIFO). |

### TC-4.3.2 — Filter by status

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Status filter defaults to **"Pendientes"**. | Only exams with `status: "ready_for_validation"` shown. |
| 2 | Change status filter to **"Todos"**. | Table includes previously approved and rejected exams alongside pending ones. Approved show "Aprobado" badge; rejected show "Rechazado" badge. |
| 3 | **[UI]** Verify URL updates. | URL includes `?status=all` query parameter. |
| 4 | Reload the page. | Filter persists from URL — "Todos" is selected and all statuses shown. |

### TC-4.3.3 — Filter by clinical flag

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Select flag filter **"Crítico"**. | Only exams with `clinicalFlag: "critico"` shown. |
| 2 | Select flag filter **"Atención"**. | Only exams with `clinicalFlag: "atencion"` shown. |
| 3 | Select flag filter **"Anormales"**. | Shows exams with `clinicalFlag !== "normal"` OR `hasReferenceRangeViolation: true`. |
| 4 | Select flag filter **"Normal"**. | Only exams with `clinicalFlag: "normal"` and no reference range violations shown. |
| 5 | Select flag filter **"Todos"**. | All exams shown regardless of clinical flag. |
| 6 | **[UI]** Verify URL updates with `?flag=critico` or similar. | URL reflects applied filter. |

### TC-4.3.4 — Filter by date range

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Set "Desde" date to today. | Only exams with `resultedAt >= today` shown. |
| 2 | Set "Hasta" date to yesterday. | No exams shown (since exams were processed today). |
| 3 | Clear dates. | All pending exams shown again. |

### TC-4.3.5 — Client-side search

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Type a patient name in the search input. | Table filters instantly (client-side) to show only matching rows. |
| 2 | Type an accession number. | Rows matching the accession number are shown. |
| 3 | Type a non-existent string (e.g. "ZZZZZZ"). | Table shows empty state — no matching rows. |
| 4 | Clear search input. | All filtered items reappear. |

### TC-4.3.6 — Clear all filters

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Apply multiple filters (status, flag, date, search). | Table is filtered accordingly. |
| 2 | Click **"Limpiar filtros"** (clear filters). | All filters reset to defaults: status "Pendientes", flag "Todos", dates empty, search empty. URL query params cleared. |

### TC-4.3.7 — Navigate to detail

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Click **"Revisar"** on a pending exam row. | **[NAV]** Navigates to `/supervisor/validaciones/{examId}`. URL includes `?from=/supervisor/validaciones` (or similar return URL). |
| 2 | Click **"Ver"** on an already-approved/rejected exam (when "Todos" filter is active). | **[NAV]** Navigates to detail page. Approve/reject actions should be disabled or hidden since exam is not in `ready_for_validation`. |

---

## TC-4.4 — Validation Detail Page — Read-Only Result View (Phase 4f)

### TC-4.4.1 — Detail page loads exam data

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to `/supervisor/validaciones/{examId}` (from queue or direct URL). | Page loads with two-column layout: main content and sidebar. |
| 2 | **[UI]** Verify the main content area. | Shows exam type name as title, patient name, accession number, status badge ("Pendiente" for `ready_for_validation`). |
| 3 | **[UI]** Verify the result viewer (`ExamResultViewer`). | Shows all sections from `ExamType.fieldSchema`. Each field displays: label, entered value, unit, reference range. |
| 4 | **[UI]** Verify out-of-range field highlighting. | Fields with values outside reference range have amber/rose border, show "Bajo" or "Alto" badge. |
| 5 | **[UI]** Verify normal fields have no flag. | Fields within range show standard styling, no flag badge. |

### TC-4.4.2 — Patient and order context sidebar

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | **[UI]** Verify the context card in the sidebar. | Shows: Patient name, Accession number, Exam type name, Technician (performedBy), Processed date/time (resultedAt), Sample barcode, Sample status. |
| 2 | **[DB]** Cross-reference displayed data with database records. | Patient name matches `Patient.firstName + lastName`. Accession matches `WorkOrder.accessionNumber`. Exam type matches `ExamType.name`. Technician matches `Exam.performedBy`. Processed time matches `Exam.resultedAt`. |

### TC-4.4.3 — Detail page for non-existent exam

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to `/supervisor/validaciones/nonexistent-id-12345`. | **[UI]** Shows "Examen no encontrado" message (or similar not-found state). No crash or blank page. |

### TC-4.4.4 — Detail page loading state

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Hard-refresh the detail page with slow network. | **[UI]** Shows skeleton loading UI (cards, placeholders) during data fetch. |

---

## TC-4.5 — Approve Exam (Phase 4f + 4b)

### TC-4.5.1 — Approve with comments

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | On the validation detail page for a **pending** exam (`status: "ready_for_validation"`). | **[UI]** "Aprobar" card visible in the sidebar with optional comments textarea and "Aprobar examen" button. |
| 2 | Type a comment in the comments field (e.g. "Resultados dentro de parámetros normales"). | Comment text appears in the field. |
| 3 | Click **"Aprobar examen"**. | **[UI]** Confirmation dialog appears asking to confirm the approval action. |
| 4 | Click **"Confirmar"** in the dialog. | **[TOAST]** Success toast: "Examen aprobado" or similar. **[NAV]** Redirects to `/supervisor/validaciones` with feedback indicator. |
| 5 | **[DB]** Query the `Exam` record by ID. | `status: "approved"`. `validatedBy` set to the supervisor's user ID. `validatedAt` set to a recent ISO timestamp. `results` unchanged from technician's submission. |
| 6 | **[AUDIT]** Query `AuditEvent` where `entityId = examId` and `action = "EXAM_APPROVED"`. | Record exists with: `entityType: "Exam"`, `userId` = supervisor ID, `metadata` contains `sampleId` and `comments` (the text entered in step 2). |
| 7 | **[UI]** Back on the validation list. | Feedback message displayed (e.g. "Examen aprobado exitosamente"). The approved exam is no longer in the pending list (if status filter is "Pendientes"). |
| 8 | **[UI]** Verify dashboard stats updated. | Navigate to `/supervisor`. "Pendientes validar" count decreased by 1. "Tiempo prom." may now show a non-zero value. |

### TC-4.5.2 — Approve without comments

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open a pending exam detail page. Leave comments field empty. | Comments field is blank. |
| 2 | Click **"Aprobar examen"** → **"Confirmar"**. | Approval succeeds. No validation error for empty comments (comments are optional). |
| 3 | **[AUDIT]** Check the audit event metadata. | `comments` field is `undefined` or absent in metadata (not an empty string). |

### TC-4.5.3 — Sample status cascade on approval

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Approve the **last remaining** `ready_for_validation` exam for a given sample. | Approval succeeds as normal. |
| 2 | **[DB]** Query the parent `Sample` record. | `status: "completed"` (cascade triggered because all exams for this sample are now in terminal states: approved or rejected). |
| 3 | **[AUDIT]** Query `AuditEvent` where `entityId = sampleId` and `action = "SPECIMEN_COMPLETED"`. | Audit event exists with `metadata` containing `trigger: "validation_terminal_states"`. |

---

## TC-4.6 — Reject Exam (Phase 4f + 4b)

### TC-4.6.1 — Reject with reason and comments

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | On the validation detail page for a **pending** exam. | **[UI]** "Rechazar" card visible in the sidebar with: required reason field, optional comments textarea, "Rechazar examen" button. |
| 2 | Leave reason field empty and click **"Rechazar examen"**. | **[UI]** Validation error appears: reason is required. Form does not submit. `aria-invalid` attribute set on the reason field. |
| 3 | Enter a reason (e.g. "Valores inconsistentes con cuadro clínico"). Optionally enter comments. | Fields accept input. |
| 4 | Click **"Rechazar examen"**. | **[UI]** Confirmation dialog appears asking to confirm the rejection. |
| 5 | Click **"Confirmar"** in the dialog. | **[TOAST]** Success toast: "Examen rechazado" or similar. **[NAV]** Redirects to `/supervisor/validaciones` with feedback indicator. |
| 6 | **[DB]** Query the `Exam` record. | `status: "rejected"`. `validatedBy` set to supervisor user ID. `validatedAt` set to recent ISO timestamp. |
| 7 | **[AUDIT]** Query `AuditEvent` where `entityId = examId` and `action` matches the rejection constant. | Record exists with: `entityType: "Exam"`, `metadata` contains `reason` (the text entered), `comments` (if provided), `sampleId`. **Note:** Verify the actual stored action string — there is a potential typo in contracts.ts where `EXAM_REJECTED` maps to `"EXIM_REJECTED"` instead of `"EXAM_REJECTED"`. Document the actual value found. |
| 8 | **[UI]** Back on the validation list. | Rejected exam no longer appears in "Pendientes" filter view. Appears in "Todos" view with "Rechazado" status badge. |

### TC-4.6.2 — Reject with empty reason (validation guard)

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | On detail page, leave the reason field empty. | Field is blank. |
| 2 | Click **"Rechazar examen"**. | **[UI]** Form validation error displayed on the reason field. Submission is blocked. No network request sent. |

---

## TC-4.7 — Create Incidence (Phase 4f + 4b)

### TC-4.7.1 — Create incidence without rework

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | On the validation detail page for a pending exam. | **[UI]** "Reportar incidencia" button or card visible. |
| 2 | Click **"Reportar incidencia"**. | **[UI]** Dialog opens with: incidence type dropdown, description textarea (required), submit button. |
| 3 | Leave description empty and try to submit. | **[UI]** Validation error: description is required. |
| 4 | Select a type that is NOT rework/correction (e.g. "observacion", "contaminacion"). Enter a description. | Fields populated. |
| 5 | Click submit. | **[TOAST]** Success toast: incidence created. Dialog closes. |
| 6 | **[DB]** Query the `Exam` record. | `status` remains `"ready_for_validation"` (no status change for non-rework incidences). |
| 7 | **[AUDIT]** Query `AuditEvent` where `entityId = examId` and `action = "INCIDENCE_CREATED"`. | Record exists with `metadata` containing `type` and `description` entered by the supervisor. |

### TC-4.7.2 — Create incidence with rework type (exam moves to review)

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | On the detail page, click **"Reportar incidencia"**. | Dialog opens. |
| 2 | Select incidence type **"rework"**, **"retrabajo"**, **"correction"**, or **"corrección"**. Enter a description. | Fields populated. |
| 3 | Submit the incidence. | **[TOAST]** Success toast. |
| 4 | **[DB]** Query the `Exam` record. | `status: "review"` (the service moves the exam out of `ready_for_validation` to `review` for rework-type incidences). |
| 5 | **[AUDIT]** Verify the incidence audit event. | `INCIDENCE_CREATED` event exists with `type` = the rework variant selected. |
| 6 | **[UI]** Navigate back to the validation list. | The exam no longer appears in the pending queue (it's now in `review` status). |

### TC-4.7.3 — Dashboard incidence count updates

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | After creating an incidence on a pending exam (non-rework, so exam stays pending). | Navigate to `/supervisor`. |
| 2 | **[UI]** Verify the "Incidencias" stat card. | Count increased by 1 (counts unique pending exams that have `INCIDENCE_CREATED` audit events). |

---

## TC-4.8 — Optimistic Concurrency / Conflict Handling (Phase 4b)

### TC-4.8.1 — Concurrent modification conflict on approval

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open a pending exam detail in **browser tab A** (supervisor). | Page loads with exam data. `expectedUpdatedAt` captured from initial load. |
| 2 | In **browser tab B** (or via DB), modify the same `Exam` record (e.g. update a field directly, or approve it from another session). | Exam's `updatedAt` changes in the database. |
| 3 | Go back to **tab A** and click **"Aprobar examen"** → **"Confirmar"**. | **[UI]** Error message: "Otro usuario modificó este examen". Conflict warning banner appears at the top of the page with a "Recargar" (reload) button. Exam is **not** approved. |
| 4 | **[DB]** Verify the exam record. | Status reflects whatever tab B did, not the attempted approval from tab A. |
| 5 | Click **"Recargar"** in the conflict banner. | Page reloads with fresh data. If exam was already approved by tab B, the approve/reject forms are disabled/hidden. |

### TC-4.8.2 — Concurrent modification conflict on rejection

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Same scenario as TC-4.8.1 but attempt rejection instead of approval. | Same conflict detection behavior: "Otro usuario modificó este examen". Rejection blocked. |

---

## TC-4.9 — State Machine Guards (Phase 4b)

### TC-4.9.1 — Cannot approve a non-pending exam

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate directly to a detail page for an **already approved** exam. | **[UI]** Page loads showing exam data. Status badge shows "Aprobado". Approve/reject action cards are hidden or disabled. |
| 2 | If somehow the approve action is triggered (e.g. via API manipulation). | Service returns `{ ok: false, error: "Solo exámenes listos para validación pueden aprobarse" }`. No status change. |

### TC-4.9.2 — Cannot reject a non-pending exam

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to detail for an **already rejected** exam. | **[UI]** Status badge shows "Rechazado". Action cards hidden/disabled. |
| 2 | Service guard prevents rejection of non `ready_for_validation` exams. | No status change possible. |

### TC-4.9.3 — Verify exam status enum integrity

| # | Verification | Expected Result |
|---|--------------|-----------------|
| 1 | **[DB]** Query all `Exam` records involved in testing. | Every record has a `status` value from the allowed enum: `pending`, `inprogress`, `completed`, `review`, `ready_for_validation`, `approved`, `rejected`. No null or unexpected values. |

---

## TC-4.10 — Role Enforcement (Phase 4g)

### TC-4.10.1 — Non-supervisor cannot access validation pages

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Log in as **técnico** user. Navigate to `/supervisor/validaciones`. | **[UI]** Access denied / redirect to unauthorized page / 403 response. The page content is not rendered. |
| 2 | Navigate to `/supervisor/validaciones/{examId}`. | Same as above: access denied. |
| 3 | Navigate to `/supervisor`. | Access denied. Supervisor dashboard not rendered for non-supervisor roles. |

### TC-4.10.2 — Non-supervisor cannot invoke validation server actions

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Attempt to call `approveExamAction` from a non-supervisor session (e.g. via browser DevTools fetch). | Server action returns auth error. Exam status unchanged. |
| 2 | Attempt to call `rejectExamAction` from a non-supervisor session. | Same: auth error. |
| 3 | Attempt to call `createIncidenceAction` from a non-supervisor session. | Same: auth error. |

---

## TC-4.11 — List/Detail Synchronization (Phase 4g)

### TC-4.11.1 — Return from detail updates the list

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | From the validation list, click "Revisar" on an exam. | **[NAV]** Navigates to detail page. Return URL preserved in query params. |
| 2 | Approve the exam on the detail page. | **[NAV]** Redirected back to the validation list. |
| 3 | **[UI]** Verify the validation list. | The just-approved exam is **removed** from the pending list (filtered out). Feedback message is displayed (e.g. "Examen aprobado exitosamente"). Pending count decremented. |
| 4 | Switch status filter to "Todos". | The approved exam now appears with "Aprobado" status badge and "Ver" button (instead of "Revisar"). |

### TC-4.11.2 — Return URL safety

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Manually craft a URL: `/supervisor/validaciones/{id}?from=/some/malicious/path`. | The return navigation ignores the malicious path and falls back to `/supervisor/validaciones` (sanitization — return path must start with `/supervisor/validaciones`). |

---

## TC-4.12 — Shared ExamResultViewer Component (Phase 4g)

### TC-4.12.1 — Result viewer renders all field types

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open a detail page for an exam whose `fieldSchema` contains numeric, enum, and string fields. | **[UI]** All field types render correctly: numeric shows value with unit and reference range; enum shows selected option label; string shows text value. |
| 2 | **[UI]** Verify section grouping. | Fields are grouped by their section label from the field schema. Section labels visible as subheadings. |
| 3 | **[UI]** Verify empty/null values. | Fields without values show "—" (em-dash) placeholder. |

### TC-4.12.2 — Reference range flags

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Exam has a numeric field with value below the reference range minimum. | **[UI]** Field card has amber border. Shows "Bajo" badge in amber. |
| 2 | Exam has a numeric field with value above the reference range maximum. | **[UI]** Field card has rose border. Shows "Alto" badge in rose. |
| 3 | Exam has all numeric values within range. | **[UI]** No flag badges. Standard card styling. |

---

## TC-4.13 — Accessibility (Phase 4g)

### TC-4.13.1 — Approval/rejection form accessibility

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Tab through the approval form. | Focus moves logically: comments textarea → approve button. Focus visible on each element. |
| 2 | Tab through the rejection form. | Focus moves logically: reason input → comments textarea → reject button. |
| 3 | Submit the rejection form with empty reason. | **[UI]** `aria-invalid="true"` is set on the reason field. Error message is associated via `aria-describedby` or similar. Screen reader would announce the error. |
| 4 | Open confirmation dialog via keyboard (Enter/Space on button). | Dialog opens, focus trapped inside dialog. Escape closes dialog. |
| 5 | Navigate the confirmation dialog with keyboard. | Tab cycles between "Cancelar" and "Confirmar" buttons. Enter activates the focused button. |

### TC-4.13.2 — Incidence dialog accessibility

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open incidence dialog via keyboard. | Dialog opens with focus on first interactive element. |
| 2 | Tab through: type selector → description → submit. | Logical focus order. |
| 3 | Press Escape. | Dialog closes without creating an incidence. |

---

## TC-4.14 — Performance (Phase 4g)

### TC-4.14.1 — No client fetch waterfalls

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open DevTools Network tab. Navigate to `/supervisor`. | **[Network]** Dashboard stats and pending list are fetched server-side (no separate client-side fetch calls for initial data). Data arrives in the initial HTML/RSC payload. |
| 2 | Navigate to `/supervisor/validaciones`. | **[Network]** Queue data is fetched server-side. No sequential client fetches for list data. |
| 3 | Navigate to `/supervisor/validaciones/{id}`. | **[Network]** Detail data is fetched server-side in a single request (parallel sub-queries for exam, sample, workOrder, patient). |

### TC-4.14.2 — Dashboard parallel fetch

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Observe server logs or network timing for `/supervisor` page load. | `getDashboardStats()` and `listPendingValidation()` run in parallel (via `Promise.all`), not sequentially. Total load time should be ≤ max of the two queries, not the sum. |

---

## TC-4.15 — Edge Cases

### TC-4.15.1 — Exam with no results

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | If an exam reaches `ready_for_validation` with `results: null` (edge case or data issue). | **[UI]** Detail page renders without crash. `ExamResultViewer` shows "—" for all fields. Supervisor can still approve or reject. |

### TC-4.15.2 — Exam with malformed results JSON

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | If `Exam.results` contains unparseable JSON. | **[UI]** Page renders gracefully. Results section shows empty/fallback state. No JS crash or blank page. |

### TC-4.15.3 — Multiple exams for one sample (cascade test)

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Create a work order with 2+ requested exam type codes. Generate specimens. | Two samples and two exams created. |
| 2 | Technician processes and sends **both** exams to validation. | Both exams in `ready_for_validation`. |
| 3 | Supervisor approves the **first** exam. | **[DB]** First exam: `status: "approved"`. Sample status: **not yet** `"completed"` (one exam still pending). |
| 4 | Supervisor approves (or rejects) the **second** exam. | **[DB]** Second exam: `status: "approved"` or `"rejected"`. Sample status: `"completed"` (all exams now terminal). |
| 5 | **[AUDIT]** Verify `SPECIMEN_COMPLETED` audit. | Created only after the second exam's validation, not after the first. |

---

## TC-4.16 — Audit Trail Integrity

### TC-4.16.1 — Full audit chain for approved exam

| # | Verification | Expected `AuditEvent` |
|---|--------------|----------------------|
| 1 | Specimen generation | `action: "SPECIMENS_GENERATED"`, `entityType: "WorkOrder"` |
| 2 | Label printed | `action: "LABEL_PRINTED"`, `entityType: "WorkOrder"` |
| 3 | Ready for lab | `action: "ORDER_READY_FOR_LAB"`, `entityType: "WorkOrder"` |
| 4 | Sample received | `action` matches `SPECIMEN_RECEIVED` constant value, `entityType: "Sample"` |
| 5 | Sample in progress | `action: "SPECIMEN_IN_PROGRESS"`, `entityType: "Sample"` |
| 6 | Exam started | `action: "EXAM_STARTED"`, `entityType: "Exam"` |
| 7 | Exam results saved (draft) | `action: "EXAM_RESULTS_SAVED"`, `entityType: "Exam"`, `metadata.draft: true` |
| 8 | Exam results saved (finalized) | `action: "EXAM_RESULTS_SAVED"`, `entityType: "Exam"`, `metadata.finalized: true` |
| 9 | Exam sent to validation | `action: "EXAM_SENT_TO_VALIDATION"`, `entityType: "Exam"` |
| 10 | Exam approved | `action: "EXAM_APPROVED"`, `entityType: "Exam"`, `metadata.comments` present if provided |
| 11 | Sample completed (cascade) | `action: "SPECIMEN_COMPLETED"`, `entityType: "Sample"`, `metadata.trigger` present |

### TC-4.16.2 — Full audit chain for rejected exam

| # | Verification | Expected `AuditEvent` |
|---|--------------|----------------------|
| 1–9 | Same as TC-4.16.1 steps 1–9. | Same audit events through the technician flow. |
| 10 | Exam rejected | `action` matches `EXAM_REJECTED` constant value, `entityType: "Exam"`, `metadata.reason` present, `metadata.comments` present if provided |

---

## TC-4.17 — Known Issues to Verify

> During code review, the following potential issues were identified in `src/lib/contracts.ts`. These should be verified during testing.

### TC-4.17.1 — Audit action typo: EXAM_REJECTED

| # | Verification | Expected |
|---|--------------|----------|
| 1 | **[Code]** Check `AUDIT_ACTIONS.EXAM_REJECTED` in `src/lib/contracts.ts`. | The constant maps to `"EXIM_REJECTED"` (typo: "EXIM" instead of "EXAM"). |
| 2 | **[DB]** After rejecting an exam, query `AuditEvent` where `action = "EXIM_REJECTED"`. | The audit event uses the typo value. This is a **bug** — the action string should be `"EXAM_REJECTED"`. |
| 3 | **Impact:** Any downstream system querying for `"EXAM_REJECTED"` will miss these events. The dashboard incidence count query and any future reporting may be affected. | Document as bug and decide whether to fix now or defer. |

### TC-4.17.2 — Audit action typo: SPECIMEN_RECEIVED

| # | Verification | Expected |
|---|--------------|----------|
| 1 | **[Code]** Check `AUDIT_ACTIONS.SPECIMEN_RECEIVED` in `src/lib/contracts.ts`. | The constant maps to `"SPECIMEN_RECEIVed"` (mixed case typo: lowercase "ed"). |
| 2 | **[DB]** After marking a sample as received, query `AuditEvent`. | Stored `action` value is `"SPECIMEN_RECEIVed"`. This is a **bug** — should be `"SPECIMEN_RECEIVED"`. |

---

## Summary Checklist

| Area | Test Cases | Status |
|------|-----------|--------|
| Reception setup | TC-4.0.1 – TC-4.0.3 | ☐ |
| Technician scan & receive | TC-4.1.1 – TC-4.1.3 | ☐ |
| Technician process & submit | TC-4.1.4 – TC-4.1.7 | ☐ |
| Supervisor dashboard | TC-4.2.1 – TC-4.2.4 | ☐ |
| Validation list page | TC-4.3.1 – TC-4.3.7 | ☐ |
| Validation detail (read-only) | TC-4.4.1 – TC-4.4.4 | ☐ |
| Approve exam | TC-4.5.1 – TC-4.5.3 | ☐ |
| Reject exam | TC-4.6.1 – TC-4.6.2 | ☐ |
| Create incidence | TC-4.7.1 – TC-4.7.3 | ☐ |
| Optimistic concurrency | TC-4.8.1 – TC-4.8.2 | ☐ |
| State machine guards | TC-4.9.1 – TC-4.9.3 | ☐ |
| Role enforcement | TC-4.10.1 – TC-4.10.2 | ☐ |
| List/detail sync | TC-4.11.1 – TC-4.11.2 | ☐ |
| ExamResultViewer | TC-4.12.1 – TC-4.12.2 | ☐ |
| Accessibility | TC-4.13.1 – TC-4.13.2 | ☐ |
| Performance | TC-4.14.1 – TC-4.14.2 | ☐ |
| Edge cases | TC-4.15.1 – TC-4.15.3 | ☐ |
| Audit trail integrity | TC-4.16.1 – TC-4.16.2 | ☐ |
| Known issues | TC-4.17.1 – TC-4.17.2 | ☐ |
