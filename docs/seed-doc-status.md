# Seed DB Status — Mar 3, 2026

Analysis of what exists in DynamoDB (`*-iwxkyxztx5cudp7drfybj4nsgq-NONE`) vs what the seed intended.
Data window: **Jan 17 → Feb 25, 2026** (seed ran with `daysBack: 40`, fixed seed `20260225`).

---

## Tables & Record Counts

| Table | Records | Notes |
|---|---|---|
| Patient | 140 | Exactly as configured |
| ExamType | 4 | URO, COP, HEM, QS |
| WorkOrder | 220 | Exactly as configured |
| Sample | 436 | 1–3 per order (skipped for `reception_only`) |
| Exam | 436 | 1:1 with samples |
| AuditEvent | 3,068 | Full lifecycle trail |

---

## WorkOrder Breakdown (220 total)

| Status | Count | Scenario |
|---|---|---|
| `pending` | 10 | `reception_only` — no samples created |
| `inprogress` | 117 | `ready_for_lab` (35) + `processing` (40) + `validation_queue` (42) |
| `completed` | 93 | `terminal` — all exams validated |

Priority distribution: 132 routine / 68 urgent / 20 stat.

---

## Sample Breakdown (436 total)

| Status | Count | Meaning |
|---|---|---|
| `labeled` | 33 | Labels printed, not yet sent to lab |
| `ready_for_lab` | 57 | At lab door, waiting to be scanned in |
| `inprogress` | 58 | Being processed on bench |
| `completed` | 273 | Analysis finished |
| `rejected` | 15 | Rejected — quality failure |

---

## Exam Breakdown (436 total)

| Status | Count | Where it surfaces |
|---|---|---|
| `pending` | 100 | Technician queue — not started |
| `inprogress` | 32 | Technician — currently being worked |
| `completed` | 26 | Technician — results entered, not yet sent to validation |
| `ready_for_validation` | 61 | Supervisor validation queue |
| `review` | 2 | Supervisor — flagged for rework |
| `approved` | 172 | Supervisor resultados / terminal |
| `rejected` | 43 | Supervisor resultados / terminal |

---

## AuditEvent Action Breakdown (3,068 total)

| Action | Count |
|---|---|
| ORDER_CREATED | 220 |
| SPECIMENS_GENERATED | 217 |
| LABEL_PRINTED | 213 |
| LABEL_REPRINTED | 34 |
| ORDER_READY_FOR_LAB | 179 |
| SPECIMEN_SCANNED | 400 |
| SPECIMEN_RECEIVED | 346 |
| SPECIMEN_IN_PROGRESS | 346 |
| SPECIMEN_COMPLETED | 273 |
| SPECIMEN_REJECTED | 15 |
| EXAM_STARTED | 336 |
| EXAM_RESULTS_SAVED | 638 |
| EXAM_SENT_TO_VALIDATION | 278 |
| EXAM_APPROVED | 172 |
| EXAM_REJECTED | 43 |
| INCIDENCE_CREATED | 52 |

---

## What Each Role Sees

### Recepcion

The reception repository fetches WorkOrders where `status != completed`, then derives a UI status:

- **"Sin muestras"** (no samples) → always shown
- **"Muestras creadas"** (all samples still `labeled`) → shown **only if created today**
- **"Procesando"** (any sample at `ready_for_lab` or beyond) → never shown to reception

**Result:** Reception inbox shows **10 orders** — all "Sin muestras", all Routine priority, spread from Jan 18 to Feb 25. No urgent orders in the pending queue. The 117 `inprogress` orders are invisible to reception.

> The "Muestras creadas" tab shows **0 orders** because the newest seed date is Feb 25 and today is Mar 3 — no labeled-only orders qualify as "today".

---

### Technician (muestras page)

Technician sees samples with statuses `ready_for_lab`, `inprogress`, `completed`, `rejected`:

| Workstation label | Count |
|---|---|
| Awaiting Receipt (`ready_for_lab`) | 57 |
| In Progress (`inprogress`) | 58 |
| Completed (`completed`) | 273 |
| Rejected (`rejected`) | 15 |
| **Total** | **403** |

Dashboard KPIs:
- Active (awaiting + in progress): **115 samples**
- Completed today: **0** (seed ends Feb 25; no `SPECIMEN_COMPLETED` audit events from Mar 3)
- Rejected: **15**

---

### Supervisor — Validaciones

- **Default view** (`ready_for_validation` only): **61 exams**
- **"All" filter**: 61 ready + 172 approved + 43 rejected = **276 exams**
- **"Review"** tab: **2 exams** flagged for rework

---

### Supervisor — Resultados

- **93 completed WorkOrders** (all exams in `approved` or `rejected`)

---

### Supervisor — Auditoria

- **3,068 audit events** searchable, spanning Jan 17 → Feb 25, 2026

---

### Supervisor — Incidencias

- **52 `INCIDENCE_CREATED`** events (mix of `critical_value`, `delay`, `quality_alert`, `rework`)

---

### Supervisor — Analitica

- Full **40-day window** of BI data (Jan 17 → Feb 25, 2026)
- 220 orders / 436 exams / 172 approved / 43 rejected feeding all charts

---

## Known Gaps / Issues

| # | Issue | Impact |
|---|---|---|
| 1 | **No today activity** — newest seed timestamp is Feb 25 | Technician "completed today" = 0; reception "Muestras creadas" = 0 |
| 2 | **Reception has no urgent pending orders** — all 10 pending are Routine | Urgentes filter in reception shows 0 |
| 3 | **Large completed backlog for technician** — 273 completed samples in view | Active work is only the 115 (57 awaiting + 58 in progress) |
| 4 | **`review` exams are very rare** — only 2 | Hard to test rework flow without manually promoting an exam |
