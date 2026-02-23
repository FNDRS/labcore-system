# Phase 3 — Technician Process Workspace: Breakdown Plan

**Reference:** [integration-plan.md](./integration-plan.md) Phase 3 (lines 206–235)

**Outcome:** Lab result capture workflow is fully implemented and connected.

---

## Engineering Principles (from integration plan)

- **Backend-first contracts:** define schema, status machine, and API contracts before UI wiring.
- **Thin UI, rich domain layer:** keep business rules in domain/services, not in components.
- **Composition over boolean complexity:** explicit variants + compound components + provider-based state.
- **Server-driven data fetching:** avoid client waterfalls; parallelize independent requests.
- **Strict form handling:** React Hook Form + Zod + shadcn Field/Form patterns.
- **Incremental migration:** route-by-route replacement of mocks with kill switches and rollback options.

---

## Cross-Cutting Standards

- **Form standards:** Zod + RHF `zodResolver`; `FormField`/`FormItem` or `Controller` + `Field`; `aria-invalid`; `useFieldArray` for dynamic arrays.
- **Composition:** Provider for shared form/process state; explicit subcomponents over mode booleans.
- **Performance:** Parallel fetches; lazy-load heavy widgets; minimize serialized payloads.

---

## Current State

| Location | State | Notes |
|----------|-------|-------|
| `/technician/muestras/process/[id]` | Shell + placeholder | `ProcessSampleWorkspace` — header, "Volver a cola", placeholder form area |
| `ExamType.fieldSchema` | Defined in seed | `sections[].fields[]` with `key`, `label`, `type` (`string`/`numeric`/`enum`), optional `unit`, `referenceRange`, `options` |
| `Exam` model | `results` (JSON), `status` | `pending` → `inprogress` → `completed`/`review` → `ready_for_validation` → `approved`/`rejected` |
| Sample → Exam | 1:1 | Seed creates Exam per Sample; technician edits Exam.results |

---

## Field schema structure (from seed)

```ts
interface FieldDef {
  key: string;
  label: string;
  type: "string" | "numeric" | "enum";
  unit?: string;
  referenceRange?: string;
  options?: string[];  // for enum
}

interface Section {
  id: string;
  label: string;
  fields: FieldDef[];
}

interface FieldSchema {
  sections: Section[];
}
```

---

## Phase 3a — Foundation (Repository + Contracts)

**Scope:** Data access and types for the process workspace.

| # | Task | Deliverables |
|---|------|--------------|
| 3a.1 | **Process repository** | `src/lib/repositories/process-repository.ts` — `getProcessContext(sampleId)` returns Sample + Exam + ExamType (with fieldSchema) |
| 3a.2 | **Field schema types** | `src/lib/process/field-schema-types.ts` — typed `FieldDef`, `Section`, `FieldSchema`; optional `resultsSchema` helper for Zod |
| 3a.3 | **Contracts** | Ensure `EXAM_STARTED`, `EXAM_RESULTS_SAVED`, `EXAM_SENT_TO_VALIDATION` in `contracts.ts` (already present) |

**Exit:** Repository returns process context; typed field schema available for form generation.

---

## Phase 3b — Exam Result Service

**Scope:** Domain logic for exam result workflow.

| # | Task | Deliverables |
|---|------|--------------|
| 3b.1 | **Exam result service** | `src/lib/services/exam-result-service.ts` — `saveExamDraft(examId, results, userId)`, `finalizeExam(examId, results, userId)`, `sendToValidation(examId, userId)` |
| 3b.2 | **Status guards** | Only `inprogress` can save draft/finalize; only `completed` can send to validation |
| 3b.3 | **Audit events** | Emit `EXAM_STARTED` when opening; `EXAM_RESULTS_SAVED` on draft; `EXAM_SENT_TO_VALIDATION` on finalize/send |
| 3b.4 | **Sample status sync** | When Exam reaches `ready_for_validation`, optionally sync Sample to `completed` (if all exams done) |

**Exit:** Service enforces transitions; audit trail populated.

---

## Phase 3c — Form Platform (Zod + RHF)

**Scope:** Reusable form architecture driven by `ExamType.fieldSchema`.

| # | Task | Deliverables |
|---|------|--------------|
| 3c.1 | **Zod schema generator** | `src/lib/process/field-schema-to-zod.ts` — `fieldSchemaToZod(schema)` returns Zod schema for `results` object |
| 3c.2 | **Dynamic field renderer** | `src/app/(protected)/technician/muestras/process/ExamResultFields.tsx` — renders sections/fields from fieldSchema; maps `string`→Input, `numeric`→Input number, `enum`→Select |
| 3c.3 | **Form integration** | RHF + `zodResolver`; `Controller` for complex/dynamic fields; `useFieldArray` if needed for repeatable groups |
| 3c.4 | **Accessibility** | `aria-invalid`, `FormMessage`/`FieldError`; consistent labels and error display |
| 3c.5 | **Reference range display** | Show `referenceRange` and `unit` next to fields; optional flag (high/low) for numeric out-of-range |

**Exit:** Form renders from any fieldSchema; validation and a11y compliant.

---

## Phase 3d — Process Workspace Integration

**Scope:** Replace placeholder in process route with full UI.

| # | Task | Deliverables |
|---|------|--------------|
| 3d.1 | **Server data loading** | Page/workspace fetches `getProcessContext(sampleId)` (or by rowId→sampleId); pass Exam, ExamType, Sample to client |
| 3d.2 | **Process provider** | `ProcessWorkspaceProvider` — holds exam, fieldSchema, form state, dirty flag, action handlers |
| 3d.3 | **Wire form to service** | "Guardar borrador" → `saveExamDraft`; "Enviar a validación" / "Finalizar" → `finalizeExam` + `sendToValidation` |
| 3d.4 | **Loading / error UI** | Skeleton while loading; error boundary; "Muestra no encontrada" when context is null |
| 3d.5 | **Post-submit navigation** | On success → navigate to `/technician/muestras`; `markCompletedAction` for Sample if applicable |

**Exit:** Process route fully functional; results persist; transitions to supervisor queue.

---

## Phase 3e — Concurrency and UX Hardening

**Scope:** Stale edits, multi-user conflicts, and UX polish.

| # | Task | Deliverables |
|---|------|--------------|
| 3e.1 | **Optimistic concurrency** | Pass Exam `version` or `updatedAt`; on conflict, show "Otro usuario modificó este examen" and offer reload |
| 3e.2 | **Unsaved changes guard** | Warn on navigate away if form dirty |
| 3e.3 | **Lazy-load heavy widgets** | If result form has large sections, use `next/dynamic` or code-split for non-critical parts |
| 3e.4 | **Transient disruption** | Optional: persist draft to `localStorage` keyed by examId for recovery after refresh (document in PR) |

**Exit:** Safer multi-user experience; no accidental data loss.

---

## Execution Order

1. **Phase 3a** — Foundation (must complete first)
2. **Phase 3b** — Exam result service (depends on 3a)
3. **Phase 3c** — Form platform (can overlap with 3b; needs 3a types)
4. **Phase 3d** — Process workspace integration (depends on 3a, 3b, 3c)
5. **Phase 3e** — Concurrency and UX (follows 3d)

---

## Deferred / Out of Scope for Phase 3

- Per-exam custom UIs (e.g. flow cytometry, images) — keep generic form for now
- Multi-exam samples (one sample, multiple exams) — seed creates 1 Exam per Sample; extend later
- Offline-first draft persistence — optional 3e.4; not mandatory
- Supervisor validation UI — Phase 4

---

## Summary Table

| Phase | Focus | Est. Effort |
|-------|-------|-------------|
| **3a** | Repository, field schema types | Small |
| **3b** | Exam result service, guards, audit | Small |
| **3c** | Zod + RHF form platform, dynamic fields | Medium |
| **3d** | Process workspace UI integration | Medium |
| **3e** | Concurrency, unsaved guard, UX | Small |

---

## Manual Testing (high level)

- **3a:** Verify `getProcessContext` returns correct structure for a sample with exam.
- **3b:** Call service actions; check Exam.status and AuditEvent records.
- **3c:** Render form for Uroanálisis, Hemograma; submit and validate.
- **3d:** Full flow: open process from muestras → fill form → save draft → finalize → back to muestras; verify supervisor queue sees exam.
- **3e:** Open same exam in two tabs; edit in one, save in other; verify conflict handling.
