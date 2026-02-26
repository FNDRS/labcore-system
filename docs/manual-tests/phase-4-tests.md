# Phase 4 — Supervisor Validation: Manual Test Cases

**Scope:** Supervisor validation workflow — dashboard, validation queue, detail view, approval, rejection, incidence creation, and cascading effects.

**Precondition:** Phases 1–3 are complete. At least one WorkOrder exists with Samples containing Exams in `ready_for_validation` status (i.e., a technician has entered results and sent the exam to validation). The tester is logged in with a user in the `supervisor` Cognito group.

---

## Test Data Setup

Before executing these tests, ensure the following records exist in the database:

| Entity | Requirements |
|--------|-------------|
| **Patient** | At least 2 patients with distinct `firstName`/`lastName` |
| **WorkOrder** | At least 2 work orders, one with `priority: "urgent"`, one with `priority: "routine"`. Each with a valid `accessionNumber` |
| **Sample** | At least 3 samples across the work orders. At least one sample with 2+ exams (to test sample cascade). Status should be `completed` or `inprogress` |
| **ExamType** | At least 2 exam types with `fieldSchema` containing numeric fields with `referenceRange` defined (e.g., `"70–110"`) |
| **Exam (A)** | Status `ready_for_validation`, with `results` containing values **within** reference ranges (normal case) |
| **Exam (B)** | Status `ready_for_validation`, with `results` containing values **outside** reference ranges (to trigger clinical flag) |
| **Exam (C)** | Status `ready_for_validation`, on the same sample as Exam A or B (to test sample cascade) |
| **Exam (D)** | Status `approved` (already validated — to verify "all" filter) |

---

## TC-4.01: Supervisor Dashboard — Stats Cards

**Route:** `/supervisor`

**Steps:**

1. Navigate to `/supervisor`.
2. Wait for dashboard to load (skeleton should appear briefly, then real content).

**Expected — UI:**

| Card | Label | Value source |
|------|-------|-------------|
| 1 | "Pendientes validar" | Count of exams with `status = ready_for_validation` |
| 2 | "Críticos" (red border card) | Count of pending exams where `clinicalFlag !== "normal"` OR `hasReferenceRangeViolation === true` |
| 3 | "Incidencias" (amber border card) | Count of distinct pending exam IDs that have at least one `AuditEvent` with `action = INCIDENCE_CREATED` |
| 4 | "Tiempo prom. (min)" | Average of `(validatedAt - resultedAt)` in minutes across all `approved`/`rejected` exams. `0` if none exist |

**Expected — DB verification:**

- Query `Exam` where `status = "ready_for_validation"` — count should match card 1.
- Query `Exam` where `status IN ("approved", "rejected")` — verify turnaround calculation if any exist.

---

## TC-4.02: Supervisor Dashboard — Pending Results Table

**Route:** `/supervisor`

**Steps:**

1. Navigate to `/supervisor`.
2. Observe the "Resultados pendientes de validación" table below the stats cards.

**Expected — UI:**

- Table columns: Paciente, Prueba, Técnico, Estado, Hora procesado, Flag clínico, Acción.
- Each row corresponds to an `Exam` with `status = ready_for_validation`.
- **Paciente** shows `"{firstName} {lastName}"` from the linked Patient.
- **Prueba** shows `ExamType.name`.
- **Técnico** shows `Exam.performedBy` (or "—" if null).
- **Estado** shows "Pendiente validar" for all rows.
- **Hora procesado** shows `Exam.resultedAt` formatted as `HH:MM` in `es-CL` locale (or "—" if null).
- **Flag clínico** badge: "Normal" (zinc), "Atención" (amber), or "Crítico" (red) based on derived clinical flag.
- **Acción** column: "Revisar" button (outlined, rounded).
- Rows sorted by `resultedAt` ascending (oldest first).

**Expected — Empty state:**

- If no exams have `status = ready_for_validation`, table shows: "No hay resultados pendientes de validación" centered.

---

## TC-4.03: Dashboard "Revisar" Navigation

**Route:** `/supervisor` → `/supervisor/validaciones/{examId}`

**Steps:**

1. On the dashboard, click the "Revisar" button on any pending result row.
2. Observe navigation.

**Expected:**

- Browser navigates to `/supervisor/validaciones/{examId}`.
- The validation detail page loads with the correct exam data.

---

## TC-4.04: Validation Queue List — Default View

**Route:** `/supervisor/validaciones`

**Steps:**

1. Navigate to `/supervisor/validaciones`.
2. Observe the "Cola de validación" card.

**Expected — UI:**

- Card title: "Cola de validación".
- Subtitle shows: "{N} pendiente(s) de validar" — count of `ready_for_validation` items.
- If any critical items exist, subtitle appends: " · {M} crítico(s)" in red.
- Default filter state: Status = "Pendientes", Flag = "Todos", no date range, no search query.
- "Limpiar filtros" link is **not** visible (no active filters).
- Table columns: Paciente, Examen, Técnico, Procesado, Flag clínico, Estado, Acción.
- Only exams with `status = ready_for_validation` are shown (default filter is "pending").
- Rows with `clinicalFlag !== "normal"` OR `hasReferenceRangeViolation === true` have a red-tinted background and left red border.

**Expected — DB verification:**

- Query `Exam` where `status = "ready_for_validation"` — result count matches table row count.

---

## TC-4.05: Validation Queue — Row Content Details

**Route:** `/supervisor/validaciones`

**Steps:**

1. For each row in the validation queue table, verify the following against the database.

**Expected — Per row:**

| Column | Source | Format |
|--------|--------|--------|
| Paciente | `Patient.firstName + " " + Patient.lastName` via Sample → WorkOrder → Patient. Followed by `(accessionNumber)` in muted text if present | `"Juan Pérez (ACC-001)"` |
| Examen | `ExamType.name` | Text |
| Técnico | `Exam.performedBy` or "—" | Text |
| Procesado | `Exam.resultedAt` | `DD/MM/YYYY, HH:MM` in es-CL locale, or "—" |
| Flag clínico | Derived from results vs `ExamType.fieldSchema` reference ranges | Badge: "Normal"(zinc), "Atención"(amber), "Crítico"(red) |
| Estado | `Exam.status` mapped to label | Badge: "Pendiente"(amber), "Aprobado"(green), "Rechazado"(red), "Revisión"(zinc) |
| Acción | "Revisar" button if `ready_for_validation`; "Ver" button otherwise | Outlined button / Ghost button |

---

## TC-4.06: Validation Queue — Status Filter ("Todos")

**Route:** `/supervisor/validaciones`

**Steps:**

1. Change the Status dropdown from "Pendientes" to "Todos".
2. Observe URL and table content.

**Expected:**

- URL updates to include `?status=all`.
- Table now shows exams with `status IN ("ready_for_validation", "approved", "rejected")`.
- Approved rows show "Aprobado" status badge (green) and "Ver" ghost button instead of "Revisar".
- Rejected rows show "Rechazado" status badge (red) and "Ver" ghost button.
- "Limpiar filtros" link appears.

**Expected — DB verification:**

- Query `Exam` where `status IN ("ready_for_validation", "approved", "rejected")` — result count matches displayed rows.

---

## TC-4.07: Validation Queue — Clinical Flag Filter

**Route:** `/supervisor/validaciones`

**Steps:**

1. Change the Flag dropdown to "Crítico".
2. Observe URL and filtered results.
3. Change to "Atención", observe.
4. Change to "Normal", observe.
5. Change to "Anormales", observe.

**Expected:**

- **"Crítico":** URL has `?flag=critico`. Only rows where `clinicalFlag === "critico"` are shown.
- **"Atención":** URL has `?flag=atencion`. Only rows where `clinicalFlag === "atencion"` are shown.
- **"Normal":** URL has `?flag=normal`. Only rows where `clinicalFlag === "normal"` AND no reference range violations are shown.
- **"Anormales":** URL has `?flag=abnormal`. Rows where `clinicalFlag !== "normal"` OR `hasReferenceRangeViolation === true`.

---

## TC-4.08: Validation Queue — Search Filter

**Route:** `/supervisor/validaciones`

**Steps:**

1. Type a patient's first name in the search box.
2. Observe filtered results.
3. Type an accession number instead.
4. Observe filtered results.
5. Click the "X" clear button on the search input.

**Expected:**

- Search filters client-side (no URL change) on `patientName` and `accessionNumber` (case-insensitive, partial match).
- Only matching rows remain visible.
- Clearing search restores all rows.
- Search input has `aria-label="Buscar por paciente o número de acceso"`.
- The "X" clear button appears only when text is present.

---

## TC-4.09: Validation Queue — Date Range Filter

**Route:** `/supervisor/validaciones`

**Steps:**

1. Set "Fecha desde" to yesterday's date.
2. Set "Fecha hasta" to today's date.
3. Observe URL and results.

**Expected:**

- URL includes `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- Only exams with `resultedAt` within the specified range are shown.
- Server-side filtering: `from` date is expanded to `T00:00:00.000Z`, `to` date to `T23:59:59.999Z`.

---

## TC-4.10: Validation Queue — Clear Filters

**Route:** `/supervisor/validaciones?status=all&flag=critico&from=2025-01-01`

**Steps:**

1. Navigate to the URL above (or apply multiple filters).
2. Verify "Limpiar filtros" link is visible.
3. Click "Limpiar filtros".

**Expected:**

- All filters reset: Status back to "Pendientes", Flag to "Todos", date range cleared, search cleared.
- URL reverts to `/supervisor/validaciones` (no query params).
- Table shows default pending-only view.

---

## TC-4.11: Validation Queue — Empty State

**Route:** `/supervisor/validaciones`

**Precondition:** No exams exist with `status = ready_for_validation` (or apply a filter that matches nothing).

**Steps:**

1. Navigate to the validation queue page.
2. Observe table area.

**Expected:**

- Instead of a table, the message "No hay resultados que coincidan con los filtros." is displayed centered.
- Subtitle shows "0 pendientes de validar".

---

## TC-4.12: Validation Queue — Navigate to Detail ("Revisar")

**Route:** `/supervisor/validaciones` → `/supervisor/validaciones/{examId}`

**Steps:**

1. Click the "Revisar" button on a pending exam row.
2. Observe the URL and page content.

**Expected:**

- URL navigates to `/supervisor/validaciones/{examId}?from={encodedReturnPath}`.
- The `from` query param preserves the current list URL (including any active filters).
- Validation detail page loads.

---

## TC-4.13: Validation Detail — Page Layout and Context

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Navigate to a validation detail page for a `ready_for_validation` exam.
2. Observe the full page layout.

**Expected — UI layout:**

- **Back button:** "Volver a validaciones" (outlined, with ArrowLeft icon) at the top. Links to the `from` query param or `/supervisor/validaciones` by default.
- **Main area (left column):**
  - Card with `ExamType.name` as title.
  - Subtitle: `"Paciente: {fullName}"` and optionally `" · Orden {accessionNumber}"`.
  - Status badge: "Pendiente" (amber) for `ready_for_validation`.
  - Below: read-only exam results rendered via `ExamResultViewer`.
- **Sidebar (right column):**
  - "Contexto del examen" card with 7 data points.
  - "Aprobar examen" card with form.
  - "Rechazar examen" card with form.
  - "Incidencias" card with "Reportar incidencia" button.

---

## TC-4.14: Validation Detail — Exam Context Card

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Verify each field in the "Contexto del examen" card against the database.

**Expected — Field mapping:**

| UI Label | DB Source | Format |
|----------|----------|--------|
| Paciente | `Patient.firstName + " " + Patient.lastName` | Text |
| N° acceso | `WorkOrder.accessionNumber` | Text or "—" |
| Tipo examen | `ExamType.name` | Text |
| Técnico | `Exam.performedBy` | Text or "—" |
| Procesado | `Exam.resultedAt` | `DD/MM/YYYY, HH:MM` es-CL or "—" |
| Muestra | `Sample.barcode` (or `Sample.id` fallback) | Text |
| Recibida | `Sample.receivedAt` | `DD/MM/YYYY, HH:MM` es-CL or "—" |

---

## TC-4.15: Validation Detail — Read-Only Results Display

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Observe the exam results section rendered by `ExamResultViewer`.
2. Cross-reference with `ExamType.fieldSchema` and `Exam.results`.

**Expected:**

- Results grouped by sections matching `fieldSchema.sections[].label`.
- Each field shows:
  - **Label** (uppercase, small text) from `fieldSchema.sections[].fields[].label`.
  - **Value** from `Exam.results[field.key]` (or "—" if null/missing).
  - **Unit** shown as "Unidad: {unit}" if `field.unit` is defined.
  - **Reference range** shown as "Ref: {referenceRange}" if `field.referenceRange` is defined.
- For numeric fields with values **outside** the reference range:
  - Field card has amber border and amber-tinted background.
  - A flag badge shows "Bajo" (amber) if value < min, or "Alto" (rose) if value > max.
- For values within range or non-numeric fields: standard zinc border, no flag badge.

---

## TC-4.16: Validation Detail — Approve Exam (Happy Path)

**Route:** `/supervisor/validaciones/{examId}`

**Precondition:** Exam has `status = ready_for_validation`.

**Steps:**

1. In the "Aprobar examen" card, optionally type a comment in the "Comentarios (opcional)" textarea.
2. Click the "Aprobar" button.
3. Observe the confirmation dialog.
4. Click "Confirmar aprobación".
5. Observe feedback and navigation.

**Expected — UI flow:**

1. "Aprobar" button is enabled (since `canValidate === true`).
2. Clicking "Aprobar" opens an `AlertDialog`:
   - Title: "Confirmar aprobación".
   - Description: "El examen se marcará como aprobado y quedará auditado."
   - Two buttons: "Cancelar" and "Confirmar aprobación".
3. Clicking "Confirmar aprobación":
   - Spinner appears on the button while submitting.
   - Toast notification: "Examen aprobado".
   - Navigation to `/supervisor/validaciones?feedback=approved&reviewed={examId}` (preserving existing filters if any).

**Expected — DB changes:**

| Field | Before | After |
|-------|--------|-------|
| `Exam.status` | `ready_for_validation` | `approved` |
| `Exam.validatedBy` | `null` | Supervisor's Cognito `userId` |
| `Exam.validatedAt` | `null` | ISO timestamp of approval |
| `AuditEvent` (new) | — | `entityType: "Exam"`, `entityId: {examId}`, `action: "EXAM_APPROVED"`, `userId: {supervisorId}`, `metadata: { sampleId, comments? }` |

---

## TC-4.17: Validation Detail — Approve Without Comments

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Leave the comments field empty.
2. Click "Aprobar" → "Confirmar aprobación".

**Expected:**

- Approval succeeds (comments are optional).
- `AuditEvent.metadata.comments` is `undefined` (not an empty string).

---

## TC-4.18: Validation Detail — Reject Exam (Happy Path)

**Route:** `/supervisor/validaciones/{examId}`

**Precondition:** Exam has `status = ready_for_validation`.

**Steps:**

1. In the "Rechazar examen" card, type a reason in the "Motivo de rechazo" field (e.g., "Muestra hemolizada").
2. Optionally type additional comments.
3. Click the "Rechazar" button.
4. Observe the confirmation dialog.
5. Click "Confirmar rechazo".
6. Observe feedback and navigation.

**Expected — UI flow:**

1. "Rechazar" button is styled as `variant="destructive"` (red).
2. Clicking "Rechazar" opens an `AlertDialog`:
   - Title: "Confirmar rechazo".
   - Description: "El examen se marcará como rechazado y quedará auditado."
   - Two buttons: "Cancelar" and "Confirmar rechazo" (destructive variant).
3. Clicking "Confirmar rechazo":
   - Spinner appears while submitting.
   - Toast notification: "Examen rechazado".
   - Navigation to `/supervisor/validaciones?feedback=rejected&reviewed={examId}`.

**Expected — DB changes:**

| Field | Before | After |
|-------|--------|-------|
| `Exam.status` | `ready_for_validation` | `rejected` |
| `Exam.validatedBy` | `null` | Supervisor's Cognito `userId` |
| `Exam.validatedAt` | `null` | ISO timestamp of rejection |
| `AuditEvent` (new) | — | `entityType: "Exam"`, `entityId: {examId}`, `action: "EXAM_REJECTED"`, `userId: {supervisorId}`, `metadata: { sampleId, reason, comments? }` |

---

## TC-4.19: Rejection — Reason Is Required

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Leave the "Motivo de rechazo" field empty.
2. Click the "Rechazar" button.

**Expected:**

- Form validation fires. Confirmation dialog does **not** open.
- Error message appears below the reason field: "Debe indicar un motivo de rechazo".
- The reason input has `aria-invalid="true"`.

---

## TC-4.20: Rejection — Whitespace-Only Reason

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Type only spaces in the "Motivo de rechazo" field.
2. Click "Rechazar".

**Expected:**

- Zod `trim().min(1)` validation fails.
- Same error as TC-4.19: "Debe indicar un motivo de rechazo".

---

## TC-4.21: Validation Detail — Create Incidence (Non-Rework)

**Route:** `/supervisor/validaciones/{examId}`

**Precondition:** Exam has `status = ready_for_validation`.

**Steps:**

1. Click the "Reportar incidencia" button in the "Incidencias" card.
2. Observe the dialog.
3. In the "Tipo" dropdown, select "Problema de muestra" (value: `sample_issue`).
4. Type a description in the "Descripción" textarea.
5. Click "Guardar incidencia".

**Expected — UI flow:**

1. Dialog opens with:
   - Title: "Reportar incidencia".
   - Description: "Registra la incidencia para dejar trazabilidad de validación."
   - "Tipo" select (pre-filled with "Valor crítico" as default).
   - "Descripción" textarea (required).
   - "Cancelar" and "Guardar incidencia" buttons.
2. On success:
   - Toast notification: "Incidencia reportada".
   - Dialog closes.
   - Form resets (type back to default, description cleared).
   - Page refreshes via `router.refresh()`.

**Expected — DB changes:**

| Field | Before | After |
|-------|--------|-------|
| `Exam.status` | `ready_for_validation` | `ready_for_validation` (unchanged — `sample_issue` does NOT trigger review) |
| `AuditEvent` (new) | — | `entityType: "Exam"`, `entityId: {examId}`, `action: "INCIDENCE_CREATED"`, `userId: {supervisorId}`, `metadata: { sampleId, type: "sample_issue", description }` |

---

## TC-4.22: Create Incidence — Rework Type Moves Exam to Review

**Route:** `/supervisor/validaciones/{examId}`

**Precondition:** Exam has `status = ready_for_validation`.

**Steps:**

1. Click "Reportar incidencia".
2. Select "Retrabajo" (value: `rework`) as the incidence type.
3. Enter a description.
4. Click "Guardar incidencia".

**Expected — DB changes:**

| Field | Before | After |
|-------|--------|-------|
| `Exam.status` | `ready_for_validation` | `review` |
| `AuditEvent` (new) | — | `action: "INCIDENCE_CREATED"`, `metadata: { sampleId, type: "rework", description }` |

**Expected — UI after page refresh:**

- Status badge on the detail page changes to "En revisión" (zinc background).
- The "Aprobar" and "Rechazar" buttons become **disabled** (because `canValidate` is `false` when status is not `ready_for_validation`).

---

## TC-4.23: Create Incidence — Required Description

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Click "Reportar incidencia".
2. Leave the "Descripción" field empty.
3. Click "Guardar incidencia".

**Expected:**

- Form validation fires. Submission does **not** proceed.
- Error message: "Debe indicar la descripción de la incidencia" appears below the textarea.
- The textarea has `aria-invalid="true"`.

---

## TC-4.24: Incidence Type Options

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Click "Reportar incidencia".
2. Open the "Tipo" select dropdown.

**Expected — Options available:**

| Value | Label |
|-------|-------|
| `critical_value` | Valor crítico |
| `sample_issue` | Problema de muestra |
| `instrument_issue` | Problema de equipo |
| `rework` | Retrabajo |
| `other` | Otro |

---

## TC-4.25: Post-Action Feedback on Validation List

**Route:** `/supervisor/validaciones?feedback=approved&reviewed={examId}`

**Precondition:** User just approved or rejected an exam and was redirected back.

**Steps:**

1. After approving an exam, observe the validation list page.

**Expected:**

- A green feedback banner appears at the top of the filter area:
  - For approval: "Examen aprobado correctamente."
  - For rejection: "Examen rechazado correctamente."
- The just-reviewed exam is **removed** from the visible list (filtered out by `reviewedId`).
- The pending count in the subtitle reflects the updated number.

---

## TC-4.26: Validation Detail — Buttons Disabled After Approval

**Route:** `/supervisor/validaciones/{examId}` (exam already `approved`)

**Steps:**

1. Navigate to a detail page for an exam that has already been approved (use "Todos" status filter → "Ver" button).

**Expected:**

- Status badge shows "Aprobado" (green).
- The "Aprobar" button is **disabled**.
- The "Rechazar" button is **disabled**.
- The "Reportar incidencia" button remains **enabled** (incidences can be reported on any exam).
- The `validatedBy` and `validatedAt` values are populated in the exam context (visible only in DB, not shown in UI).

---

## TC-4.27: Validation Detail — Buttons Disabled After Rejection

**Route:** `/supervisor/validaciones/{examId}` (exam already `rejected`)

**Steps:**

1. Navigate to a detail page for an exam that has already been rejected.

**Expected:**

- Status badge shows "Rechazado" (red).
- The "Aprobar" button is **disabled**.
- The "Rechazar" button is **disabled**.

---

## TC-4.28: Optimistic Concurrency — Conflict Detection

**Route:** `/supervisor/validaciones/{examId}`

**Precondition:** Exam has `status = ready_for_validation`.

**Steps (requires two browser sessions or DB manipulation):**

1. Open the validation detail for exam X in browser session A.
2. In browser session B (or directly in the DB), modify exam X (e.g., approve it).
3. Back in session A, try to approve the same exam.

**Expected — UI:**

- An amber conflict banner appears with:
  - Bold text: "Otro usuario modificó este examen".
  - Description: "{error message}. Recarga para revisar la información actualizada."
  - Two buttons: "Recargar" and "Cerrar".
- Toast does **not** show success.
- No navigation occurs.

**Expected — DB:**

- Exam remains in the state set by session B (e.g., `approved`).
- No duplicate audit events created from session A.

**Expected — Recargar button:**

- Clicking "Recargar" calls `router.refresh()` and clears the conflict message.
- Page re-fetches data server-side, showing the current state.

---

## TC-4.29: Approval Confirmation — Cancel

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Click "Aprobar" to open the confirmation dialog.
2. Click "Cancelar" in the dialog.

**Expected:**

- Dialog closes.
- No server action is called.
- No DB changes occur.
- No navigation.

---

## TC-4.30: Rejection Confirmation — Cancel

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Enter a rejection reason.
2. Click "Rechazar" to open the confirmation dialog.
3. Click "Cancelar".

**Expected:**

- Dialog closes.
- The reason and comments fields retain their values (form is not reset).
- No server action, no DB changes.

---

## TC-4.31: Sample Status Cascade — All Exams Terminal

**Precondition:** A Sample has exactly 2 exams, both in `ready_for_validation` status.

**Steps:**

1. Approve Exam A on the sample.
2. Verify DB: `Sample.status` should **not** have changed (still `completed` or `inprogress` from technician phase — Exam B is not yet terminal).
3. Approve Exam B on the same sample.
4. Verify DB after second approval.

**Expected — DB after step 3:**

| Field | Before | After |
|-------|--------|-------|
| `Sample.status` | Previous status (e.g., `inprogress` or `completed`) | `completed` |
| `AuditEvent` (new) | — | `entityType: "Sample"`, `entityId: {sampleId}`, `action: "SPECIMEN_COMPLETED"`, `metadata: { trigger: "validation_terminal_states" }` |

---

## TC-4.32: Sample Status Cascade — Mixed Terminal States

**Precondition:** A Sample has exactly 2 exams in `ready_for_validation` status.

**Steps:**

1. Approve Exam A.
2. Reject Exam B.
3. Verify DB.

**Expected:**

- Both `approved` and `rejected` are terminal states.
- After rejecting Exam B, all exams are terminal → `Sample.status` transitions to `completed`.
- A `SPECIMEN_COMPLETED` audit event is created with `trigger: "validation_terminal_states"`.

---

## TC-4.33: Sample Status Cascade — Non-Terminal Exam Blocks Cascade

**Precondition:** A Sample has 2 exams: one `ready_for_validation`, one `inprogress`.

**Steps:**

1. Approve the `ready_for_validation` exam.
2. Verify DB.

**Expected:**

- The `inprogress` exam is not terminal.
- `Sample.status` does **not** change.
- No `SPECIMEN_COMPLETED` audit event is created.

---

## TC-4.34: Role Enforcement — Non-Supervisor Access to Detail Page

**Precondition:** Logged in as a user in the `tecnico` group (not `supervisor`).

**Steps:**

1. Attempt to navigate directly to `/supervisor/validaciones/{examId}`.

**Expected:**

- Server returns 403 Forbidden.
- The detail page does not render.

---

## TC-4.35: Role Enforcement — Non-Supervisor Server Action

**Precondition:** Logged in as a non-supervisor user.

**Steps:**

1. Attempt to call `approveExamAction` via browser console or modified client.

**Expected:**

- Server action rejects with authentication/authorization error.
- No DB changes occur.

---

## TC-4.36: Validation Detail — Exam Not Found

**Route:** `/supervisor/validaciones/nonexistent-id`

**Steps:**

1. Navigate to a validation detail page with an invalid exam ID.

**Expected:**

- Page renders the "Volver a validaciones" back button.
- Card shows: Title "Examen no encontrado", description: "No pudimos cargar la validación solicitada. Puede haber sido eliminada o no estar disponible."

---

## TC-4.37: Dashboard — Loading State (Skeleton)

**Route:** `/supervisor`

**Steps:**

1. Navigate to `/supervisor` (ideally with throttled network to see loading state).

**Expected:**

- While data is being fetched, `SupervisorDashboardSkeleton` renders (4 skeleton cards + skeleton table).
- Once data loads, skeleton is replaced with real content.

---

## TC-4.38: Detail Page — Loading State (Skeleton)

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Navigate to a validation detail page (ideally with throttled network).

**Expected:**

- While data loads, a loading skeleton is displayed (from `loading.tsx`).
- Once loaded, real content replaces the skeleton.

---

## TC-4.39: Validation Detail — "Volver" Button Navigation

**Route:** `/supervisor/validaciones/{examId}?from=/supervisor/validaciones?status=all&flag=critico`

**Steps:**

1. From the validation list with filters applied, click "Revisar" on an exam.
2. On the detail page, click "Volver a validaciones".

**Expected:**

- Navigation returns to `/supervisor/validaciones?status=all&flag=critico` (preserving the `from` param with the original filters).
- The validation list reloads with the previously active filters.

---

## TC-4.40: Validation Detail — "Volver" Sanitization

**Route:** `/supervisor/validaciones/{examId}?from=https://evil.com`

**Steps:**

1. Manually set the `from` query param to an external URL.
2. Click "Volver a validaciones".

**Expected:**

- The `sanitizeReturnPath` function rejects the external URL (it doesn't start with `/supervisor/validaciones`).
- Navigation falls back to `/supervisor/validaciones`.

---

## TC-4.41: Dashboard Stats — Incidence Count After Creating Incidence

**Route:** `/supervisor`

**Precondition:** No incidence audit events exist for pending exams.

**Steps:**

1. Navigate to `/supervisor`. Note the "Incidencias" card value (should be 0).
2. Go to a pending exam's detail page, create an incidence (non-rework type to keep it pending).
3. Navigate back to `/supervisor`.

**Expected:**

- "Incidencias" card now shows `1` (or incremented by 1).
- This is because `getDashboardStats` counts distinct pending exam IDs that have `INCIDENCE_CREATED` audit events.

---

## TC-4.42: Dashboard Stats — Turnaround Time Calculation

**Precondition:** At least one exam has been approved/rejected (has both `resultedAt` and `validatedAt`).

**Steps:**

1. Note the `resultedAt` and `validatedAt` of all approved/rejected exams.
2. Calculate: avg((`validatedAt` - `resultedAt`) / 60000) rounded to nearest integer.
3. Navigate to `/supervisor` and check the "Tiempo prom. (min)" card.

**Expected:**

- The displayed value matches the calculated average turnaround in minutes.
- If no exams have been validated yet, the value is `0`.

---

## TC-4.43: Validation Queue — Row Highlighting for Critical Results

**Route:** `/supervisor/validaciones`

**Steps:**

1. Ensure there is a pending exam with results outside reference ranges (e.g., glucose = 250 when range is 70–110).
2. Observe its row in the validation queue.

**Expected:**

- The row has `bg-red-50/50` background tint and a `border-l-2 border-l-red-400` left border.
- The "Flag clínico" badge shows "Atención" (amber) or "Crítico" (red).
- This row stands out visually compared to normal-flag rows.

---

## TC-4.44: Clinical Flag Derivation Logic

**This is a data verification test, not a UI test.**

Verify the clinical flag derivation for different result scenarios:

| Scenario | Result Value Content | Expected Flag |
|----------|---------------------|---------------|
| All numeric values within reference range, no text flags | `{ glucose: 90 }` (range 70–110) | `normal` |
| Numeric value below reference range | `{ glucose: 50 }` (range 70–110) | `atencion` |
| Numeric value above reference range | `{ glucose: 250 }` (range 70–110) | `atencion` |
| Result contains string value with "critico" | `{ flagField: "Valor critico" }` | `critico` |
| Result contains string value "high" | `{ someField: "high" }` | `critico` |
| Result contains string value "low" | `{ someField: "low" }` | `critico` |
| Result contains string with "atencion" | `{ someField: "atencion" }` | `atencion` |
| No results (null) | `null` | `normal` |

---

## TC-4.45: Concurrent Submit Prevention

**Route:** `/supervisor/validaciones/{examId}`

**Steps:**

1. Click "Aprobar" to open the confirmation dialog.
2. Click "Confirmar aprobación".
3. While the spinner is showing (submitting), try to click other action buttons.

**Expected:**

- While `isSubmitting === true`:
  - "Confirmar aprobación" button shows a `Loader2` spinner and is disabled.
  - "Cancelar" button in the dialog is disabled.
  - "Rechazar" button (outside dialog) is disabled.
  - "Reportar incidencia" button is disabled.
- Only one server action is executed.

---

## TC-4.46: Error Handling — Server Action Failure

**Route:** `/supervisor/validaciones/{examId}`

**Steps (simulated, e.g., disconnect network mid-request):**

1. Attempt to approve an exam while the server is unreachable.

**Expected:**

- Toast error: "No se pudo aprobar el examen" (from catch block).
- `isSubmitting` resets to `false`.
- Confirmation dialog closes.
- No DB changes.

---

## TC-4.47: Error Handling — Non-OK Server Response

**Route:** `/supervisor/validaciones/{examId}`

**Precondition:** Exam status is NOT `ready_for_validation` (e.g., already approved, manually changed in DB).

**Steps:**

1. Open the detail page (status badge may show incorrect state if cached).
2. Try to approve.

**Expected:**

- Server returns `{ ok: false, error: "Solo exámenes listos para validación pueden aprobarse" }`.
- Toast error with the error message.
- No status transition.

---

## TC-4.48: Audit Trail Completeness

**After executing TC-4.16, TC-4.18, TC-4.21, and TC-4.22, verify the full audit trail.**

**Steps:**

1. Query `AuditEvent` table for all events related to the tested exam IDs.

**Expected audit events (in chronological order for a fully validated exam):**

| # | Action | Entity Type | Metadata |
|---|--------|-------------|----------|
| 1 | `EXAM_STARTED` | Exam | `{ sampleId }` |
| 2 | `EXAM_RESULTS_SAVED` | Exam | `{ sampleId, draft: true }` (if draft was saved) |
| 3 | `EXAM_RESULTS_SAVED` | Exam | `{ sampleId, finalized: true }` |
| 4 | `EXAM_SENT_TO_VALIDATION` | Exam | `{ sampleId }` |
| 5 | `EXAM_APPROVED` or `EXAM_REJECTED` | Exam | `{ sampleId, comments? }` or `{ sampleId, reason, comments? }` |
| 6 | `SPECIMEN_COMPLETED` (conditional) | Sample | `{ trigger: "validation_terminal_states" }` |

Each event should have: `userId`, `timestamp` (ISO format), `entityId` matching the exam/sample ID.

---

## TC-4.49: Dashboard Pending Table — "Revisar" Links Correct Exam ID

**Route:** `/supervisor`

**Steps:**

1. On the dashboard pending table, inspect the "Revisar" link for each row.

**Expected:**

- Each "Revisar" button links to `/supervisor/validaciones/{examId}` where `{examId}` matches the `Exam.id` for that row.
- The link is rendered via `<Link>` component (client-side navigation, no full page reload).

---

## TC-4.50: Validation Queue — Sort Order

**Route:** `/supervisor/validaciones`

**Steps:**

1. Navigate to the validation queue with multiple pending exams.
2. Note the order of rows.

**Expected:**

- Rows are sorted by `Exam.resultedAt` ascending (oldest processed first).
- Exams with `resultedAt = null` appear at the top (sorted as timestamp 0).

---

## Summary Checklist

| # | Area | Test | Status |
|---|------|------|--------|
| 4.01 | Dashboard | Stats cards values | ☐ |
| 4.02 | Dashboard | Pending table content | ☐ |
| 4.03 | Dashboard | "Revisar" navigation | ☐ |
| 4.04 | Queue | Default view | ☐ |
| 4.05 | Queue | Row content details | ☐ |
| 4.06 | Queue | Status filter "Todos" | ☐ |
| 4.07 | Queue | Clinical flag filter | ☐ |
| 4.08 | Queue | Search filter | ☐ |
| 4.09 | Queue | Date range filter | ☐ |
| 4.10 | Queue | Clear filters | ☐ |
| 4.11 | Queue | Empty state | ☐ |
| 4.12 | Queue | Navigate to detail | ☐ |
| 4.13 | Detail | Page layout and context | ☐ |
| 4.14 | Detail | Exam context card | ☐ |
| 4.15 | Detail | Read-only results display | ☐ |
| 4.16 | Approval | Happy path | ☐ |
| 4.17 | Approval | Without comments | ☐ |
| 4.18 | Rejection | Happy path | ☐ |
| 4.19 | Rejection | Reason required | ☐ |
| 4.20 | Rejection | Whitespace-only reason | ☐ |
| 4.21 | Incidence | Non-rework type | ☐ |
| 4.22 | Incidence | Rework → review status | ☐ |
| 4.23 | Incidence | Required description | ☐ |
| 4.24 | Incidence | Type options | ☐ |
| 4.25 | Navigation | Post-action feedback | ☐ |
| 4.26 | Detail | Buttons disabled after approval | ☐ |
| 4.27 | Detail | Buttons disabled after rejection | ☐ |
| 4.28 | Concurrency | Conflict detection | ☐ |
| 4.29 | Confirmation | Approve cancel | ☐ |
| 4.30 | Confirmation | Reject cancel | ☐ |
| 4.31 | Cascade | All exams terminal (approve+approve) | ☐ |
| 4.32 | Cascade | Mixed terminal (approve+reject) | ☐ |
| 4.33 | Cascade | Non-terminal blocks cascade | ☐ |
| 4.34 | Auth | Non-supervisor detail page | ☐ |
| 4.35 | Auth | Non-supervisor server action | ☐ |
| 4.36 | Detail | Exam not found | ☐ |
| 4.37 | Dashboard | Loading skeleton | ☐ |
| 4.38 | Detail | Loading skeleton | ☐ |
| 4.39 | Navigation | Back button preserves filters | ☐ |
| 4.40 | Navigation | Return path sanitization | ☐ |
| 4.41 | Dashboard | Incidence count update | ☐ |
| 4.42 | Dashboard | Turnaround time calculation | ☐ |
| 4.43 | Queue | Critical row highlighting | ☐ |
| 4.44 | Data | Clinical flag derivation logic | ☐ |
| 4.45 | Detail | Concurrent submit prevention | ☐ |
| 4.46 | Error | Server action failure | ☐ |
| 4.47 | Error | Non-OK server response | ☐ |
| 4.48 | Audit | Audit trail completeness | ☐ |
| 4.49 | Dashboard | Revisar links correct exam ID | ☐ |
| 4.50 | Queue | Sort order | ☐ |
