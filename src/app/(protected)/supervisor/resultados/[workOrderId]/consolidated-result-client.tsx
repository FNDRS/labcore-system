"use client";

import "./print.css";
import { FileDown, Printer } from "lucide-react";
import { ExamResultViewer } from "@/components/exam-result-viewer";
import type {
  ConsolidatedExamResult,
  ConsolidatedWorkOrderResult,
} from "@/lib/types/results-types";
import { cn } from "@/lib/utils";

export interface ConsolidatedResultClientProps {
  result: ConsolidatedWorkOrderResult;
}

// ─── Formatters ────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function formatGender(gender: string | null): string {
  if (gender === "M") return "Masculino";
  if (gender === "F") return "Femenino";
  return "—";
}

function formatPriority(priority: string | null): string {
  if (priority === "stat") return "STAT";
  if (priority === "urgent") return "Urgente";
  return "Rutina";
}

const SAMPLE_TYPE_MAP: Record<string, string> = {
  urine: "Orina",
  stool: "Heces",
  wholebloodedta: "Sangre EDTA",
  serum: "Suero",
  other: "Otro",
};

function formatSampleType(sampleType: string | null): string {
  if (!sampleType) return "—";
  return SAMPLE_TYPE_MAP[sampleType] ?? sampleType;
}

// ─── Primitive display atoms ────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
        {label}
      </span>
      <span className="text-[13px] text-zinc-800">{value}</span>
    </div>
  );
}

function ExamStatusBadge({ status }: { status: ConsolidatedExamResult["examStatus"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
        Aprobado
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-rose-700 ring-1 ring-inset ring-rose-200">
        Rechazado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-zinc-500 ring-1 ring-inset ring-zinc-200">
      Pendiente
    </span>
  );
}

function ClinicalFlagBadge({ flag }: { flag: ConsolidatedExamResult["clinicalFlag"] }) {
  if (flag === "critico") {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-rose-700">
        Crítico
      </span>
    );
  }
  if (flag === "atencion") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">
        Atención
      </span>
    );
  }
  return null;
}

function PriorityBadge({ priority }: { priority: ConsolidatedWorkOrderResult["workOrder"]["priority"] }) {
  if (priority === "stat") {
    return (
      <span className="rounded-sm bg-rose-600 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
        STAT
      </span>
    );
  }
  if (priority === "urgent") {
    return (
      <span className="rounded-sm bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
        Urgente
      </span>
    );
  }
  return null;
}

// ─── Report sections ────────────────────────────────────────────────────────

function PatientHeader({ result }: { result: ConsolidatedWorkOrderResult }) {
  const { patient, workOrder, summary } = result;

  const overallStatus = summary.isFullyTerminal
    ? summary.rejectedExams > 0 && summary.approvedExams === 0
      ? "rejected"
      : "approved"
    : "partial";

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white shadow-none",
        overallStatus === "approved" && "border-l-4 border-l-emerald-400",
        overallStatus === "rejected" && "border-l-4 border-l-rose-400",
        overallStatus === "partial" && "border-l-4 border-l-amber-400",
      )}
    >
      {/* Lab branding strip */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          LabCore LIS · Informe de resultados
        </p>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={workOrder.priority} />
          <span className="font-mono text-[11px] text-zinc-400">
            {workOrder.accessionNumber ?? workOrder.id}
          </span>
        </div>
      </div>

      {/* Patient name */}
      <div className="px-6 pt-5 pb-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">
          {patient.fullName}
        </h1>
        <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
          <MetaRow label="Fecha de nacimiento" value={formatDate(patient.dateOfBirth)} />
          <MetaRow label="Género" value={formatGender(patient.gender)} />
          <MetaRow label="Médico solicitante" value={workOrder.referringDoctor ?? "—"} />
          <MetaRow label="Fecha de solicitud" value={formatDate(workOrder.requestedAt)} />
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-zinc-100 px-6 py-3">
        <span className="text-[12px] text-zinc-500">
          <span className="font-semibold text-zinc-900">{summary.totalExams}</span>{" "}
          {summary.totalExams === 1 ? "examen" : "exámenes"} ·{" "}
          <span className="font-semibold text-emerald-700">{summary.approvedExams}</span> aprobado{summary.approvedExams !== 1 ? "s" : ""}
          {summary.rejectedExams > 0 ? (
            <> · <span className="font-semibold text-rose-700">{summary.rejectedExams}</span> rechazado{summary.rejectedExams !== 1 ? "s" : ""}</>
          ) : null}
          {summary.pendingExams > 0 ? (
            <> · <span className="font-semibold text-amber-700">{summary.pendingExams}</span> pendiente{summary.pendingExams !== 1 ? "s" : ""}</>
          ) : null}
        </span>
        {summary.lastValidatedAt ? (
          <span className="text-[12px] text-zinc-400">
            Última validación: {formatDateTime(summary.lastValidatedAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ValidationMeta({ exam }: { exam: ConsolidatedExamResult }) {
  return (
    <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
        Trazabilidad
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        <MetaRow label="Realizado por" value={exam.performedBy ?? "—"} />
        <MetaRow label="Procesado" value={formatDateTime(exam.resultedAt)} />
        <MetaRow label="Muestra" value={exam.sampleBarcode ?? "—"} />
        <MetaRow label="Validado por" value={exam.validatedBy ?? "—"} />
        <MetaRow label="Fecha validación" value={formatDateTime(exam.validatedAt)} />
        <MetaRow label="Tipo de muestra" value={formatSampleType(exam.sampleType)} />
      </div>
      {exam.validatorComments ? (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Comentarios del validador
          </p>
          <p className="mt-1 text-[13px] italic text-zinc-700">{exam.validatorComments}</p>
        </div>
      ) : null}
    </div>
  );
}

function ExamSection({ exam }: { exam: ConsolidatedExamResult }) {
  const isRejected = exam.examStatus === "rejected";

  return (
    <div
      data-exam-section
      className={cn(
        "rounded-xl border border-zinc-200 bg-white shadow-none",
        exam.examStatus === "approved" && !exam.hasReferenceRangeViolation && exam.clinicalFlag === "normal"
          ? "border-l-4 border-l-emerald-300"
          : null,
        exam.examStatus === "rejected"
          ? "border-l-4 border-l-rose-300"
          : null,
        (exam.hasReferenceRangeViolation || exam.clinicalFlag !== "normal") && exam.examStatus !== "rejected"
          ? "border-l-4 border-l-amber-300"
          : null,
      )}
    >
      {/* Exam header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">
              {exam.examTypeName}
            </h2>
            <span className="font-mono text-[11px] text-zinc-400">{exam.examTypeCode}</span>
          </div>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            {formatSampleType(exam.sampleType)}
            {exam.sampleBarcode ? ` · ${exam.sampleBarcode}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClinicalFlagBadge flag={exam.clinicalFlag} />
          <ExamStatusBadge status={exam.examStatus} />
        </div>
      </div>

      {/* Exam results body */}
      <div className="px-6 py-5">
        {isRejected ? (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-[13px] text-rose-700">
              Examen rechazado
              {exam.validatorComments ? `: ${exam.validatorComments}` : "."}
            </p>
          </div>
        ) : exam.fieldSchema.sections.length > 0 ? (
          <ExamResultViewer
            fieldSchema={exam.fieldSchema}
            resultValues={exam.results}
          />
        ) : (
          <p className="text-[13px] text-zinc-400 italic">Sin resultados registrados.</p>
        )}
      </div>

      {/* Validation metadata */}
      <div className="px-6 pb-5">
        <ValidationMeta exam={exam} />
      </div>
    </div>
  );
}

function PrintFooter() {
  return (
    <div
      data-print-footer
      className="mt-8 border-t border-zinc-200 pt-4"
    >
      <div className="flex items-end justify-between text-[11px] text-zinc-400">
        <div className="space-y-0.5">
          <p className="font-bold uppercase tracking-widest text-zinc-500">LabCore LIS</p>
          <p>Sistema de información de laboratorio clínico</p>
          <p>Documento generado electrónicamente — no requiere firma física</p>
        </div>
        <div className="text-right">
          <p>Impreso: {new Date().toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Action bar (screen-only) ───────────────────────────────────────────────

interface ActionBarProps {
  onPrint: () => void;
  onExportPdf: () => void;
}

function ActionBar({ onPrint, onExportPdf }: ActionBarProps) {
  return (
    <div
      data-no-print
      className="flex items-center justify-end gap-2"
    >
      <button
        type="button"
        onClick={onPrint}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      >
        <Printer className="size-3.5" />
        Imprimir
      </button>
      <button
        type="button"
        onClick={onExportPdf}
        title="Abrir diálogo de impresión — use «Guardar como PDF»"
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      >
        <FileDown className="size-3.5" />
        Exportar PDF
      </button>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function ConsolidatedResultClient({ result }: ConsolidatedResultClientProps) {
  function handlePrint() {
    window.print();
  }

  /** Placeholder for future react-pdf integration. Uses browser print dialog → Save as PDF for now. */
  function handleExportPdf() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <ActionBar onPrint={handlePrint} onExportPdf={handleExportPdf} />

      <div data-report-document className="space-y-4">
        <PatientHeader result={result} />

        {result.exams.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-none">
            <p className="text-[13px] text-zinc-400">
              No se encontraron exámenes en esta orden.
            </p>
          </div>
        ) : (
          result.exams.map((exam) => (
            <ExamSection key={exam.examId} exam={exam} />
          ))
        )}

        <PrintFooter />
      </div>
    </div>
  );
}
