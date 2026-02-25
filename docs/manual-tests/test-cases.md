# Manual Test Cases — Phase 0–3 E2E

**Scope:** New order → reception → technician muestras → technician process (exam result capture).  
**Reference:** [integration-plan.md](../integration/integration-plan.md) (Phase 0–3), [flujo-end-to-end-labcore.md](../flujo-end-to-end-labcore.md)

---

## Execution Checklist


| #   | Test Case                                      | Pass | Fail | Notes |
| --- | ---------------------------------------------- | ---- | ---- | ----- |
| 1   | Reception — List Orders and View Detail        |      |      |       |
| 2   | Reception — Generate Specimens                 |      |      |       |
| 3   | Reception — Mark Order Ready for Lab           |      |      |       |
| 4   | Technician — Dashboard and Muestras Queue      |      |      |       |
| 5   | Technician — Scan Sample (Barcode Lookup)      |      |      |       |
| 6   | Technician — Mark Sample Received              |      |      |       |
| 7   | Technician — Mark In Progress and Open Process |      |      |       |
| 8   | Technician — Save Draft                        |      |      |       |
| 9   | Technician — Send to Validation                |      |      |       |
| 10  | Unsaved Changes Guard                          |      |      |       |
| 11  | Draft Recovery (Local Storage)                 |      |      |       |
| 12  | Concurrency Conflict                           |      |      |       |
| 13  | Reception — Scan Order Lookup                  |      |      |       |
| 14  | Order Without Requested Exams (Edge)           |      |      |       |


**Recommended order for full E2E:** 1 → 2 → 3 → 4 → 6 → 7 → 8 → 9 (covers happy path).

---

## Prerequisites

- Amplify sandbox running (`npx ampx sandbox`)
- Seed executed (`npx ampx sandbox seed`) — creates 10 WorkOrders (no Samples), ExamTypes, Patients
- Authenticated user (technician role for technician flows; reception role for reception flows)
- Access to Amplify Data/AppSync console or local query tools to verify DB records

### Record IDs to Note

Before running tests, capture these for verification:


| Entity    | How to get                                                               |
| --------- | ------------------------------------------------------------------------ |
| WorkOrder | `accessionNumber` (e.g. `ORD-2025-001`), or list from reception          |
| Sample    | Created after "Generar muestras"; `barcode` (e.g. `SMP-ORD-2025-001-01`) |
| Exam      | Created with Sample; linked via `Sample.id` → `Exam.sampleId`            |


---

## Test Case 1: Reception — List Orders and View Detail

**Phases:** 0, 1  
**Flow:** A1 (orders exist from seed), A2 (scan/lookup)

### Preconditions

- Seed has run; WorkOrders exist with `requestedExamTypeCodes`, no Samples

### Steps

1. Navigate to `/recepcion`.
2. Observe the reception inbox.

### UI Verification


| Step         | Expected                                                       |
| ------------ | -------------------------------------------------------------- |
| Page loads   | "Órdenes entrantes" header visible                             |
| Table        | List of orders with patient name, priority, tests, status      |
| Order status | Status "Sin muestras" for orders without samples               |
| Filters      | Quick filters (Todas, Urgentes, Sin muestras, etc.) and search |
| Badge        | "X pendientes" shows count                                     |


### DB Verification


| Entity    | Expected                                                                            |
| --------- | ----------------------------------------------------------------------------------- |
| WorkOrder | `status` = `pending`; `requestedExamTypeCodes` non-empty; `accessionNumber` present |
| Sample    | No records for these WorkOrders yet                                                 |


---

## Test Case 2: Reception — Generate Specimens

**Phases:** 1  
**Flow:** A3 (generar specimens, imprimir stickers)

### Preconditions

- Same as TC1
- Note `accessionNumber` of one order (e.g. `ORD-2025-001`)

### Steps

1. On `/recepcion`, click "Generar muestras" for an order with status "Sin muestras" (from table row or order sheet).
2. Wait for generation to complete.
3. Observe the generation dialog/modal.

### UI Verification


| Step            | Expected                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| Before generate | "Generar" enabled for orders with "Sin muestras"                                |
| During generate | Loading state; modal opens                                                      |
| After success   | Modal shows list of specimens with barcodes (e.g. `SMP-ORD-2025-001-01`, `-02`) |
| No error        | No error toast or message                                                       |


### DB Verification


| Entity     | Expected                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sample     | One record per requested exam type; `workOrderId` = order id; `status` = `labeled`; `barcode` = `SMP-{accession}-01`, etc.; `examTypeId` matches ExamType.code |
| Exam       | One Exam per Sample; `sampleId` = Sample.id; `status` = `pending`; `examTypeId` matches Sample                                                                 |
| AuditEvent | `entityType` = `WorkOrder`, `entityId` = WorkOrder.id, `action` = `SPECIMENS_GENERATED`; also `LABEL_PRINTED`                                                  |


### Idempotency Check

1. Click "Generar" again for the same order (or retry).
2. **Expected:** No duplicate Samples; same barcodes returned; no error.

---

## Test Case 3: Reception — Mark Order Ready for Lab

**Phases:** 1  
**Flow:** A4 (recolección física → ready_for_lab)

### Preconditions

- TC2 completed for at least one order (Samples exist with `status` = `labeled`)

### Steps

1. In the generation dialog, click "Descargar PDF" (downloads labels).
2. Observe "Listo" button becomes enabled (after `printState` = `printed`).
3. Click "Listo".
4. Dialog closes; return to reception table.

### UI Verification


| Step                  | Expected                                                             |
| --------------------- | -------------------------------------------------------------------- |
| Before PDF download   | "Listo" disabled; "Descargar PDF" enabled                            |
| After PDF download    | "Listo" enabled; status shows "Etiquetas listas (PDF descargado)"    |
| After "Listo"         | Dialog closes; order status updates; table refreshes                 |
| Order in table        | Status changes from "Muestras creadas" to "Procesando" or equivalent |
| Technician visibility | Samples now appear in technician muestras queue                      |


### DB Verification


| Entity     | Expected                                                     |
| ---------- | ------------------------------------------------------------ |
| Sample     | All Samples for that WorkOrder: `status` = `ready_for_lab`   |
| AuditEvent | `action` = `ORDER_READY_FOR_LAB`; `entityType` = `WorkOrder` |


---

## Test Case 4: Technician — Dashboard and Muestras Queue

**Phases:** 2  
**Flow:** B2 (dashboard), B3 (muestras / scan)

### Preconditions

- TC3 completed; at least one order has Samples with `status` = `ready_for_lab`

### Steps

1. Log in as technician and navigate to `/technician/dashboard`.
2. Observe metrics (completed today, in process, errors).
3. Navigate to `/technician/muestras`.
4. Observe the samples table.
5. Use filters: All, Received, Processing, Completed, Flagged.
6. Use search by patient name or barcode.

### UI Verification


| Step           | Expected                                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| Dashboard      | Metrics reflect real data (or 0 if no completed yet)                                  |
| Muestras table | Lists samples with `ready_for_lab`, `received`, `inprogress`, `completed`, `rejected` |
| Row content    | Patient name, test type, priority, status, wait time                                  |
| Filters        | Filtering updates visible rows correctly                                              |
| Search         | Search narrows results by patient/barcode                                             |


### DB Verification


| Entity | Expected                                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| Sample | Samples with `status` in `ready_for_lab`, `received`, `inprogress`, `completed`, `rejected` appear in queue |


---

## Test Case 5: Technician — Scan Sample (Barcode Lookup)

**Phases:** 2  
**Flow:** B3 (escaneo de sticker)

### Preconditions

- TC3 completed; at least one Sample with `status` = `ready_for_lab` and known `barcode` (e.g. `SMP-ORD-2025-001-01`)

### Steps

1. On `/technician/muestras`, open the scan overlay (e.g. "Escanear muestra").
2. Enter the barcode (or use manual entry if implemented).
3. Submit the scan.

### UI Verification


| Step         | Expected                                                       |
| ------------ | -------------------------------------------------------------- |
| Scan success | Sample is located; detail panel opens or sample is highlighted |
| Scan failure | Error message for invalid/unknown barcode                      |
| No duplicate | Scanning same barcode again does not create duplicate records  |


### DB Verification


| Entity     | Expected                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Sample     | No status change from scan alone; scan is lookup only. (If receive-on-scan is implemented, `status` may transition.) |
| AuditEvent | Optional: `SPECIMEN_SCANNED` if implemented                                                                          |


---

## Test Case 6: Technician — Mark Sample Received

**Phases:** 2  
**Flow:** B3 (received)

### Preconditions

- At least one Sample with `status` = `ready_for_lab` in the queue (UI shows as "Received")

### Steps

1. On `/technician/muestras`, find a sample with status "Received" (these are `ready_for_lab` samples awaiting receipt).
2. Open the row dropdown (⋮) and click "Marcar recibida".

### UI Verification


| Step          | Expected                                                                   |
| ------------- | -------------------------------------------------------------------------- |
| Before action | "Recibir" visible for samples in ready_for_lab state                       |
| After success | Status updates to "Received" (or stays "Received" in UI); panel refreshes |
| Error case    | If sample is not `ready_for_lab`, error message shown                      |


### DB Verification


| Entity     | Expected                                                    |
| ---------- | ----------------------------------------------------------- |
| Sample     | `status` = `received`; `receivedAt` set to current datetime |
| AuditEvent | `entityType` = `Sample`, `action` = `SPECIMEN_RECEIVED`     |


---

## Test Case 7: Technician — Mark Sample In Progress and Open Process

**Phases:** 2, 3  
**Flow:** B4 (selección de análisis), B5 (workbench)

### Preconditions

- At least one Sample with `status` = `received` (must run TC6 first for ready_for_lab samples)

### Steps

1. On `/technician/muestras`, select a sample with status "Received" (after TC6, or one already received).
2. From the row dropdown (⋮) click "Procesa3r", or open the detail sheet and click "Procesar".
3. Observe navigation and process workspace load.

### UI Verification


| Step          | Expected                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Before action | "Procesar" visible for received samples                                                                       |
| After success | Navigates to `/technician/muestras/process/[sampleId]`                                                        |
| Process page  | Header "Procesando muestra {barcode}"; ExamType name; form with sections/fields from `fieldSchema`            |
| Form fields   | Renders string, numeric, enum fields per ExamType.fieldSchema; reference ranges and units shown where defined |


### DB Verification


| Entity     | Expected                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Sample     | `status` = `inprogress`                                                                                              |
| Exam       | `status` = `inprogress` (or `pending` if markExamStarted not yet run); `startedAt` and `performedBy` set when opened |
| AuditEvent | `SPECIMEN_IN_PROGRESS` for Sample; `EXAM_STARTED` for Exam (when opened with status pending)                         |


---

## Test Case 8: Technician — Save Draft (Process Workspace)

**Phases:** 3  
**Flow:** B5 (captura de resultados)

### Preconditions

- Process workspace open for a sample with Exam in `inprogress`
- Form displays fields from ExamType.fieldSchema

### Steps

1. Enter values in the form (e.g. Uroanálisis: color "Amarillo", pH 5.5, etc.).
2. Click "Guardar borrador".
3. Observe feedback.

### UI Verification


| Step          | Expected                                                              |
| ------------- | --------------------------------------------------------------------- |
| Dirty state   | "Guardar borrador" enabled when form has changes                      |
| During save   | Button shows loading; form remains editable                           |
| After success | Toast "Borrador guardado"; dirty flag clears                          |
| Validation    | Invalid values (if applicable) show `aria-invalid` and error messages |


### DB Verification


| Entity     | Expected                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------- |
| Exam       | `results` JSON updated with entered values; `status` remains `inprogress`                 |
| AuditEvent | `entityType` = `Exam`, `action` = `EXAM_RESULTS_SAVED`, `metadata` includes `draft: true` |


---

## Test Case 9: Technician — Send to Validation (Full Submit)

**Phases:** 3  
**Flow:** B6 (enviar a validación), B7 (muestra completada)

### Preconditions

- Process workspace open; Exam in `inprogress`; form has valid values (draft saved or unsaved)

### Steps

1. Ensure form has required values filled.
2. Click "Enviar a validación".
3. Observe navigation and queue update.

### UI Verification


| Step    | Expected                                                          |
| ------- | ----------------------------------------------------------------- |
| Submit  | "Enviar a validación" submits; loading state during request       |
| Success | Toast "Enviado a validación"; redirects to `/technician/muestras` |
| Queue   | Sample no longer in "Processing" (or appears as "Completed")      |


### DB Verification


| Entity     | Expected                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Exam       | `status` = `ready_for_validation`; `results` = submitted values; `resultedAt` and `performedBy` set |
| Sample     | `status` = `completed` (when all exams for that sample are ready_for_validation/approved/rejected)  |
| AuditEvent | `EXAM_RESULTS_SAVED` (finalized); `EXAM_SENT_TO_VALIDATION`; `SPECIMEN_COMPLETED` for Sample        |


---

## Test Case 10: Unsaved Changes Guard

**Phases:** 3  
**Flow:** Phase 3e (UX hardening)

### Preconditions

- Process workspace open; form has unsaved changes (dirty)

### Steps

1. Make changes in the form without saving.
2. Click "Volver a cola" or "Cancelar y volver".
3. Observe behavior.
4. Repeat: make changes, then navigate away via browser back or external link.

### UI Verification


| Step                | Expected                                                                |
| ------------------- | ----------------------------------------------------------------------- |
| Navigate with dirty | Confirmation dialog: "Tienes cambios sin guardar. ¿Salir?" (or similar) |
| Confirm leave       | Navigates away; changes lost                                            |
| Cancel              | Stays on page; form state preserved                                     |


---

## Test Case 11: Draft Recovery (Local Storage)

**Phases:** 3  
**Flow:** Phase 3e.4 (draft persistence)

### Preconditions

- Process workspace previously had unsaved/draft data; draft was persisted to localStorage

### Steps

1. Open process workspace for an exam that has a stored draft (e.g. after refresh or revisit).
2. Observe the draft recovery banner.

### UI Verification


| Step      | Expected                                                               |
| --------- | ---------------------------------------------------------------------- |
| Banner    | "Hay un borrador guardado localmente" with "Recuperar" and "Descartar" |
| Recuperar | Restores draft values into form; banner dismisses; form dirty          |
| Descartar | Clears draft from storage; banner dismisses; form uses server values   |


---

## Test Case 12: Concurrency Conflict

**Phases:** 3  
**Flow:** Phase 3e (optimistic concurrency)

### Preconditions

- Same Exam open in two browser tabs/windows (different users or same user)

### Steps

1. Tab A: Make changes and click "Guardar borrador" or "Enviar a validación" — wait for success.
2. Tab B: Make different changes and click "Guardar borrador" or "Enviar a validación".
3. Observe Tab B behavior.

### UI Verification


| Step            | Expected                                              |
| --------------- | ----------------------------------------------------- |
| Tab B submit    | Conflict message: "Otro usuario modificó este examen" |
| Conflict banner | "Recargar" and "Cerrar" options                       |
| Recargar        | Refreshes page with server state                      |
| Cerrar          | Dismisses banner; user can retry or leave             |


### DB Verification


| Entity | Expected                                                                             |
| ------ | ------------------------------------------------------------------------------------ |
| Exam   | Only the first successful update persisted; second fails due to `updatedAt` mismatch |


---

## Test Case 13: Reception — Scan Order Lookup

**Phases:** 1  
**Flow:** A2 (scan orden de trabajo)

### Preconditions

- Seed run; WorkOrders exist with `accessionNumber` (e.g. `ORD-2025-001`)

### Steps

1. On `/recepcion`, open scan overlay ("Escanear orden").
2. Enter accession number or work order code.
3. Submit.

### UI Verification


| Step         | Expected                                            |
| ------------ | --------------------------------------------------- |
| Match found  | Order is selected; sheet opens or order highlighted |
| No match     | "No encontrada" or similar message                  |
| Manual entry | If supported, same behavior as scan                 |


---

## Test Case 14: Order Without Requested Exams

**Phases:** 1  
**Flow:** Edge case

### Preconditions

- WorkOrder with `requestedExamTypeCodes` = [] or null (requires manual DB edit or special seed)

### Steps

1. Attempt to generate specimens for such an order.

### UI Verification


| Step     | Expected                                                           |
| -------- | ------------------------------------------------------------------ |
| Generate | Error message: "La orden no tiene exámenes solicitados" or similar |


### DB Verification


| Entity | Expected               |
| ------ | ---------------------- |
| Sample | No new Samples created |


---

## Status Transition Summary

Use this as a quick reference when verifying DB state:


| Stage                           | Sample.status   | Exam.status                                        |
| ------------------------------- | --------------- | -------------------------------------------------- |
| After seed                      | (no samples)    | —                                                  |
| After generate                  | `labeled`       | `pending`                                          |
| After "Lista para lab"          | `ready_for_lab` | `pending`                                          |
| After "Recibir"                 | `received`      | `pending`                                          |
| After "Procesar" (open process) | `inprogress`    | `inprogress` (or `pending` → `inprogress` on load) |
| After "Guardar borrador"        | `inprogress`    | `inprogress`                                       |
| After "Enviar a validación"     | `completed`     | `ready_for_validation`                             |


---

## Audit Event Reference


| Action                    | EntityType | When                                |
| ------------------------- | ---------- | ----------------------------------- |
| `SPECIMENS_GENERATED`     | WorkOrder  | Generate specimens                  |
| `LABEL_PRINTED`           | WorkOrder  | After generate                      |
| `ORDER_READY_FOR_LAB`     | WorkOrder  | Mark ready for lab                  |
| `SPECIMEN_RECEIVED`       | Sample     | Mark received                       |
| `SPECIMEN_IN_PROGRESS`    | Sample     | Mark in progress                    |
| `EXAM_STARTED`            | Exam       | Open process (pending → inprogress) |
| `EXAM_RESULTS_SAVED`      | Exam       | Save draft or finalize              |
| `EXAM_SENT_TO_VALIDATION` | Exam       | Send to validation                  |
| `SPECIMEN_COMPLETED`      | Sample     | All exams ready → Sample completed  |


---

## Notes

- **Order creation:** Phase 0–3 manual tests assume orders come from seed. "Nueva Orden" UI (A1 in flujo) is out of scope for this checkpoint.
- **Multi-exam samples:** Seed creates 1 Exam per Sample. Multi-exam samples would require "all exams ready" logic for Sample completion.
- **Supervisor/Doctor:** Phase 4–5; not covered in this document.

