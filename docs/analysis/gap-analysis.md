# LabCore LIS — Gap Analysis: Backend Integration Readiness

**Date:** 2026-02-21  
**Scope:** `src/app/` — All routes, folders, and UI components

## Executive Summary

This document analyzes the current state of the LabCore LIS UI to identify which screens have **complete designs** (ready for backend integration) vs. **placeholder-only screens** ("Próximamente" or equivalent). Screens are "ready" when they have a full, functional UI design—even if they still use mocked data—and can be connected to real APIs without redesign.

---

## 1. Ready for Backend Integration

These screens have **complete, production-ready UI** and use mocked data. They are the first targets for backend integration.

### 1.1 Authentication (already integrated)

| Route | Status | Data Source | Notes |
|-------|--------|-------------|-------|
| `/login` | ✅ Complete | AWS Amplify Cognito | Sign-in, redirect by role, error handling |
| `/register` | ✅ Complete | AWS Amplify Cognito | Sign-up + confirm code flow |
| `/forgot-password` | ✅ Complete | AWS Amplify Cognito | Request code + confirm new password |
| `/` | Redirect | — | Redirects to `/login` |

### 1.2 Reception (Recepcion)

| Route | Component | Data Source | Backend Work Needed |
|-------|------------|-------------|---------------------|
| `/recepcion` | `ReceptionInboxClient` | `INITIAL_ORDERS` in `constants.ts` | Replace with orders API (list, search, filters) |

**Features implemented:**
- Orders table with filters (Todas, Hoy, Urgentes, Sin muestras, Listas)
- Search by patient/order
- Scan overlay (search by scanned code)
- Order sheet (detail side panel)
- Generation dialog (generate specimens, PDF download, mark ready)
- Urgent pending badge and alerts

**Files:**
- `recepcion/page.tsx`, `recepcion-inbox-client.tsx`
- `recepcion/use-reception-inbox.ts` — main hook (replace `INITIAL_ORDERS` with API)
- `recepcion/constants.ts` — `INITIAL_ORDERS`, `TEST_TO_TUBE`
- Components: `reception-orders-table.tsx`, `reception-order-sheet.tsx`, `reception-generation-dialog.tsx`, `reception-scan-overlay.tsx`, `reception-search-filters.tsx`

---

### 1.3 Technician (Técnico)

| Route | Component | Data Source | Backend Work Needed |
|-------|------------|-------------|---------------------|
| `/technician` (dashboard) | `DashboardContent` | `actions.ts` — `MOCK_QUEUE`, `MOCK_NEXT_SAMPLE`, `MOCK_METRICS` | Replace `fetchOperativeDashboard()` with real API |
| `/technician/muestras` | `MuestrasWorkstation` | `actions.ts` — `MOCK_MUESTRAS`, `fetchMuestrasWorkstation()` | Replace `fetchMuestrasWorkstation()` |
| `/technician/settings` | `TechnicianSettingsClient` | Local state only | Add API to persist user prefs/profile |

**Technician dashboard features:**
- Next sample card (sample ID, test, patient, priority, wait time, "Procesar ahora")
- Queue table with filters (Todos, En proceso, Urgentes, Marcadas, Mis muestras)
- Search by ID, patient, test
- Scan sample dialog (manual entry; TODO: barcode reader integration)
- Link to muestras page

**Muestras workstation features:**
- Scan bar (manual input, modal scan)
- Status summary (completed, received, pending, urgent, issues)
- Samples table with actions (Mark received, Process, Report problem, Reprint label)
- Sample detail sheet with history
- Filter by status, search by ID/patient/test

**Settings features:**
- Profile (name, ID, area, shift, change password/PIN)
- Workflow prefs (urgent first, show only mine, sort order)
- Scan prefs (auto-open, focus, Enter confirm, sounds, highlight)
- Printer/station config
- Security (auto-logout, lock, confirm before send)
- Support actions

**Files:**
- `(protected)/technician/page.tsx`, `dashboard-client.tsx`, `actions.ts`
- `(protected)/technician/muestras/page.tsx`, `muestras-client.tsx`
- `(protected)/technician/muestras/` — table, filters, scan bar, sheet, status summary
- `(protected)/technician/settings/technician-settings-client.tsx`

---

### 1.4 Supervisor

| Route | Component | Data Source | Backend Work Needed |
|-------|------------|-------------|---------------------|
| `/supervisor` (dashboard) | `SupervisorDashboardClient` | `MOCK_STATS`, `MOCK_RESULTS` (inline) | Replace with API for stats + pending validations |

**Features implemented:**
- Stats cards: Pendientes validar, Críticos, Incidencias, Tiempo prom. (min)
- Results table: Paciente, Prueba, Técnico, Estado, Hora procesado, Flag clínico
- "Revisar" button → links to `/supervisor/validaciones/[id]`

**Files:**
- `(protected)/supervisor/page.tsx`, `supervisor-dashboard-client.tsx`

---

### 1.5 Doctor

| Route | Component | Data Source | Backend Work Needed |
|-------|------------|-------------|---------------------|
| `/doctor` (dashboard) | `DoctorDashboardClient` | `MOCK_STATS`, `MOCK_PATIENTS` in `page.tsx` | Replace with API for stats + patient results list |

**Features implemented:**
- Search (patient or study)
- Stats cards: Resultados nuevos, Críticos, Pendientes
- Patients table: Paciente, Estudio, Estado, Fecha
- "Ver resultado" → links to `/doctor/resultados/[id]`

**Files:**
- `(protected)/doctor/page.tsx`, `doctor-dashboard-client.tsx`

---

## 2. Partially Complete (Shell Only)

These have a page/route structure and some UI, but core content is still placeholder.

| Route | What Exists | What's Missing |
|-------|-------------|----------------|
| `/technician/muestras/process/[id]` | Workspace shell, header, back button | Exam form (values, units, notes) — says "Próximamente" |
| `/technician/work-order/[workOrderId]/exam/[examId]` | Bare page with IDs only | Full exam workspace UI |

---

## 3. Placeholder Only (Not Ready)

These show a card with title, description, and "Próximamente." No functional UI to integrate.

### Technician

| Route | Description |
|-------|-------------|
| `/technician/ordenes` | Vista de órdenes asignadas, pruebas y muestras |
| `/technician/requests` | Solicitudes |
| `/technician/resultados` | Ingreso de analitos, edición, guardado, marcar listo |
| `/technician/reports` | Reportes |
| `/technician/personnel` | Personal |
| `/technician/equipment` | Equipos |

### Supervisor

| Route | Description |
|-------|-------------|
| `/supervisor/validaciones` | Lista de resultados listos para validar |
| `/supervisor/validaciones/[id]` | Vista de validación (aprobar/rechazar/incidencia) |
| `/supervisor/reportes` | Exportar, informes de validación |
| `/supervisor/muestras` | Visión supervisor de muestras |
| `/supervisor/incidencias` | Críticos, inconsistentes, retrasos |
| `/supervisor/auditoria` | Timeline por muestra |
| `/supervisor/settings` | Configuración del panel |

### Doctor

| Route | Description |
|-------|-------------|
| `/doctor/pacientes` | Expediente clínico, historial |
| `/doctor/resultados` | Lista de resultados |
| `/doctor/resultados/[id]` | Detalle de resultado |
| `/doctor/notificaciones` | Alertas clínicas |
| `/doctor/settings` | Configuración del panel |

### Admin

| Route | Description |
|-------|-------------|
| `/admin` | Admin panel |

---

## 4. Mock Data Inventory

| Location | Data | Type |
|----------|------|------|
| `recepcion/constants.ts` | `INITIAL_ORDERS` | ReceptionOrder[] |
| `technician/actions.ts` | `MOCK_TECHNICIAN`, `MOCK_QUEUE`, `MOCK_NEXT_SAMPLE`, `MOCK_METRICS`, `MOCK_MUESTRAS`, `MOCK_WORK_ORDERS`, `MOCK_SAMPLES` | Various |
| `technician/muestras/sample-detail-sheet.tsx` | `MOCK_HISTORY` | Event history |
| `supervisor/supervisor-dashboard-client.tsx` | `MOCK_STATS`, `MOCK_RESULTS` | Inline |
| `doctor/page.tsx` | `MOCK_STATS`, `MOCK_PATIENTS` | Inline |

---

## 5. Recommended Integration Order

1. **Reception** — Orders API, specimen generation, mark ready for lab  
2. **Technician dashboard + Muestras** — Samples/work-orders API, sample detail, status updates  
3. **Technician process workspace** — Complete exam form, then connect to results API  
4. **Supervisor dashboard** — Pending validations API  
5. **Doctor dashboard** — Patient results API  
6. **Supervisor validaciones (list + detail)** — Validation workflow API  
7. **Doctor resultados (list + detail)** — Results display API  
8. **Technician settings** — User preferences API  
9. **Remaining placeholders** — Design and implement UI before integration  

---

## 6. Summary Table

| Area | Ready | Partial | Placeholder |
|------|-------|---------|-------------|
| Auth | 4 routes | 0 | 0 |
| Reception | 1 | 0 | 0 |
| Technician | 3 (dashboard, muestras, settings) | 2 (process workspace, work-order/exam) | 6 |
| Supervisor | 1 (dashboard) | 0 | 7 |
| Doctor | 1 (dashboard) | 0 | 5 |
| Admin | 0 | 0 | 1 |

**Total ready for backend integration:** 10 pages/routes (excluding auth, which is already integrated)

---

# Appendix: Backend–Frontend Gap Analysis

**Purpose:** Compare the proposed end-to-end flow (`docs/flujo-end-to-end-labcore.md`), the frontend-ready screens, and the current Amplify backend (`amplify/`) to identify what the backend provides, what it lacks, and what changes are needed to support the frontend design.

**Reference:** AWS Amplify backend implementation SOP (`retrieve_agent_sop` → `amplify-backend-implementation`).

---

## 7. Flow vs. Backend Alignment

### 7.1 Auth Roles

| Flow Role | Frontend Route | Amplify Auth (`auth/resource.ts`) | Status |
|-----------|----------------|-----------------------------------|--------|
| Recepción | `/recepcion` | — | ❌ **Missing** — `recepcion` group not defined |
| Técnico | `/technician` | `tecnico` | ✅ |
| Supervisor | `/supervisor` | `supervisor` | ✅ |
| Doctor | `/doctor` | — | ❌ **Missing** — `doctor` group not defined (frontend `lib/auth.ts` expects it) |
| Admin | `/admin` | `admin` | ✅ |

**Current `amplify/auth/resource.ts`:**
```ts
groups: ["tecnico", "supervisor", "admin"]
```

**Frontend `lib/auth.ts` expects:** `tecnico`, `supervisor`, `admin`, `doctor`

**Required change:** Add `doctor` and `recepcion` to `amplify/auth/resource.ts`:
```ts
groups: ["tecnico", "supervisor", "admin", "doctor", "recepcion"]
```

**Note:** `/recepcion` is currently outside the protected layout and uses "Demo sin auth". When production auth is enabled, it should be protected for the `recepcion` group.

---

### 7.2 Data Model vs. Flow

The flow document uses terminology: `orders`, `order_tests`, `specimens`, `results`. The schema maps as follows:

| Flow Term | Schema Model | Alignment |
|-----------|--------------|-----------|
| orders | `WorkOrder` | ✅ |
| order_tests (requested exams) | — | ⚠️ **Gap** — no storage for requested exams before specimen generation |
| specimens | `Sample` | ✅ |
| results | `Exam.results` (JSON) | ✅ |

#### Flow A1–A4: Order creation and specimen generation

| Flow Step | Schema Support | Gap |
|-----------|----------------|-----|
| A1. Create order (patient, doctor, priority, exams, notes) | WorkOrder has patientId, priority, notes | Missing: `requestedExams` (or similar), `referringDoctor` |
| A2. Scan order | WorkOrder accessible by accessionNumber | ✅ Can query by accessionNumber |
| A3. Generate specimens, print stickers | Sample created per exam type | ⚠️ Need `requestedExams` on WorkOrder to know what to create; Sample.status needs `labeled` |
| A4. Confirm ready for lab | Update specimen status | Sample.status needs `ready_for_lab` |

**WorkOrder fields to add:**
- `requestedExamTypeCodes` or `requestedExams` — `a.json()` — array of exam type codes (e.g. `["URO","HEM"]`) so "generate specimens" knows what Samples to create
- `referringDoctor` — `a.string()` — optional, as in the flow

**Sample.status enum — extend with:**
- `labeled` — stickers printed, not yet physically collected
- `ready_for_lab` — physical collection done, ready for technician

Current: `pending`, `received`, `inprogress`, `completed`, `rejected`

---

#### Flow B: Technician workflow

| Flow Step | Schema Support | Gap |
|-----------|----------------|-----|
| B1. Login | Cognito | ✅ |
| B2. Dashboard (pending, urgent) | WorkOrder, Sample, Exam | ✅ Query by status |
| B3. Scan specimen | Sample by barcode | ✅ |
| B4. Open exam form | Exam + ExamType.fieldSchema | ✅ |
| B5. Enter results | Exam.results, Exam.status | ✅ |
| B6. Send to validation | Exam.status = `ready_for_validation` | ⚠️ Need status value and validation fields |
| B7. Complete specimen | Sample.status = completed | ✅ |

**Exam.status enum — extend with:**
- `ready_for_validation` — technician finished, awaiting supervisor
- `approved` — supervisor approved
- `rejected` — supervisor rejected

Current: `pending`, `inprogress`, `completed`, `review`

**Exam model — add validation audit fields:**
- `validatedBy` — `a.string()` — Cognito user ID of supervisor
- `validatedAt` — `a.datetime()` — timestamp of validation

**Technician "My Queue" / assignment:**
- Frontend uses `assignedToMe`, `assignedEquipment`
- Schema has `Exam.performedBy` (who resulted it) but no assignment
- Optional: `Sample.assignedToId` — `a.string()` — technician user ID for queue assignment

---

#### Flow C: Supervisor validation and reports

| Flow Step | Schema Support | Gap |
|-----------|----------------|-----|
| C1. Validate (approve/reject) | Exam.status, validatedBy, validatedAt | ✅ After adding validation fields |
| C2. Report PDF | WorkOrder, Patient, Sample, Exam, ExamType | ✅ Data available; report generation is app-layer |

---

### 7.3 Audit / Traceability

The flow requires audit events (ORDER_CREATED, SPECIMENS_GENERATED, SPECIMEN_SCANNED, etc.). The current schema has **no audit model**.

| Option | Effort | Recommendation |
|--------|--------|----------------|
| Add `AuditEvent` model | Medium | Recommended for MVP: `entityType`, `entityId`, `action`, `userId`, `timestamp`, `metadata` (json) |
| CloudWatch / logging only | Low | Acceptable short-term; no queryable audit trail |
| Defer | — | Not aligned with flow's traceability requirements |

---

### 7.4 Additional Gaps

#### Technician settings

- UI: Profile (name, ID, area, shift), workflow prefs, scan prefs, printer config
- Options:
  1. Cognito custom attributes
  2. New `UserProfile` or `TechnicianProfile` model linked to user ID

#### Reception ↔ ExamType mapping

- Reception uses test names: `Glucosa`, `Hemograma completo`, `Perfil lipídico`
- Schema uses `ExamType.code` (URO, HEM, QS) and `ExamType.name`
- Need mapping layer (e.g. constant or config) or consistent naming between reception and ExamType

#### ExamType.fieldSchema storage

- Seed uses `JSON.stringify(spec.fieldSchema)` — may store a string instead of JSON
- `a.json()` expects a JSON-serializable object; verify seed passes object, not string

---

## 8. Backend Changes Summary

| Priority | Change | Location |
|----------|--------|----------|
| P0 | Add auth groups `doctor`, `recepcion` | `amplify/auth/resource.ts` |
| P0 | Add WorkOrder.requestedExamTypeCodes (or requestedExams) | `amplify/data/resource.ts` |
| P0 | Add WorkOrder.referringDoctor | `amplify/data/resource.ts` |
| P0 | Extend Sample.status: `labeled`, `ready_for_lab` | `amplify/data/resource.ts` |
| P0 | Extend Exam.status: `ready_for_validation`, `approved`, `rejected` | `amplify/data/resource.ts` |
| P0 | Add Exam.validatedBy, Exam.validatedAt | `amplify/data/resource.ts` |
| P1 | Add Sample.assignedToId (optional, for "My Queue") | `amplify/data/resource.ts` |
| P1 | Add AuditEvent model (or equivalent) | `amplify/data/resource.ts` |
| P2 | Add UserProfile/TechnicianProfile for settings | `amplify/data/resource.ts` |

---

## 9. What the Backend Already Provides

| Capability | Status |
|------------|--------|
| Patient CRUD | ✅ |
| WorkOrder with patient, priority, accessionNumber, status | ✅ |
| ExamType with code, name, sampleType, fieldSchema | ✅ |
| Sample linked to WorkOrder + ExamType, barcode, status | ✅ |
| Exam linked to Sample + ExamType, results (JSON), performedBy | ✅ |
| Seed with Uroanálisis, Coproanálisis, Hemograma, Química Sanguínea | ✅ |
| Auth with groups (tecnico, supervisor, admin) | ✅ |
| Authorization: guest + authenticated on all models | ⚠️ Consider group-based rules for production |

---

## 10. Recommended Backend Work Order

1. **Auth** — Add `doctor` and `recepcion` groups.
2. **WorkOrder** — Add `requestedExamTypeCodes` (or `requestedExams`), `referringDoctor`.
3. **Sample** — Extend status with `labeled`, `ready_for_lab`.
4. **Exam** — Extend status with `ready_for_validation`, `approved`, `rejected`; add `validatedBy`, `validatedAt`.
5. **Reception integration** — Implement order creation and "generate specimens" using the new fields.
6. **Technician integration** — Wire dashboard, muestras, and process workspace to real data.
7. **Supervisor integration** — Wire validation list and detail to Exam status and validation fields.
8. **Optional** — Add `Sample.assignedToId`, `AuditEvent`, `UserProfile`.
