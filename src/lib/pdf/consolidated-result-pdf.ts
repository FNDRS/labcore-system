import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ConsolidatedExamResult, ConsolidatedWorkOrderResult } from "@/lib/types/results-types";
import type { FieldDef, FieldSchema } from "@/lib/process/field-schema-types";

function toAscii(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function safeText(value: string) {
  return escapePdfText(toAscii(value));
}

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

function formatExamStatus(status: ConsolidatedExamResult["examStatus"]): string {
  if (status === "approved") return "Aprobado";
  if (status === "rejected") return "Rechazado";
  return "Pendiente";
}

function formatPriority(priority: ConsolidatedWorkOrderResult["workOrder"]["priority"]): string {
  if (priority === "stat") return "STAT";
  if (priority === "urgent") return "Urgente";
  return "Rutina";
}

function parseReferenceRange(range: string | undefined): { min: number; max: number } | null {
  if (!range || typeof range !== "string") return null;
  const match = range.match(/(\d+(?:\.\d+)?)\s*[–\-]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const min = Number.parseFloat(match[1]);
  const max = Number.parseFloat(match[2]);
  if (Number.isNaN(min) || Number.isNaN(max) || min > max) return null;
  return { min, max };
}

function getRangeFlag(field: FieldDef, value: unknown): "low" | "high" | null {
  if (field.type !== "numeric") return null;
  const range = parseReferenceRange(field.referenceRange);
  if (!range) return null;
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (Number.isNaN(parsedValue)) return null;
  if (parsedValue < range.min) return "low";
  if (parsedValue > range.max) return "high";
  return null;
}

function formatResultValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "string") return value.trim() || "—";
  return String(value);
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const LINE_HEIGHT = 14;
const SECTION_GAP = 20;

/** Create a pure text PDF for the consolidated lab results report. */
export async function createConsolidatedResultPdf(
  result: ConsolidatedWorkOrderResult
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.5, 0.5, 0.5);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function drawText(text: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> }) {
    const { size = 10, bold = false, color = black } = opts;
    const f = bold ? fontBold : font;
    const safe = safeText(text);
    if (y < MARGIN + LINE_HEIGHT) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    page.drawText(safe, { x: MARGIN, y, size, font: f, color });
    y -= size + 2;
  }

  function drawLine() {
    if (y < MARGIN + LINE_HEIGHT) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.5,
      color: lightGray,
    });
    y -= SECTION_GAP;
  }

  // Header
  drawText("LumaCore LIS - Informe de resultados", { size: 14, bold: true });
  drawText(
    `Orden: ${result.workOrder.accessionNumber ?? result.workOrder.id} | Prioridad: ${formatPriority(result.workOrder.priority)}`,
    { size: 9, color: gray }
  );
  y -= 8;

  // Patient
  drawText("Paciente", { size: 11, bold: true });
  drawText(`Nombre: ${result.patient.fullName}`);
  drawText(`Fecha de nacimiento: ${formatDate(result.patient.dateOfBirth)}`);
  drawText(`Genero: ${formatGender(result.patient.gender)}`);
  y -= 4;

  // Work order
  drawText("Orden de trabajo", { size: 11, bold: true });
  drawText(`Numero de acceso: ${result.workOrder.accessionNumber ?? result.workOrder.id}`);
  drawText(`Medico solicitante: ${result.workOrder.referringDoctor ?? "—"}`);
  drawText(`Fecha de solicitud: ${formatDate(result.workOrder.requestedAt)}`);
  drawText(`Prioridad: ${formatPriority(result.workOrder.priority)}`);
  y -= SECTION_GAP;

  // Exams
  for (const exam of result.exams) {
    if (y < MARGIN + 80) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }

    drawLine();
    drawText(exam.examTypeName, { size: 12, bold: true });
    drawText(`Codigo: ${exam.examTypeCode} | Tipo de muestra: ${formatSampleType(exam.sampleType)} | Estado: ${formatExamStatus(exam.examStatus)}`);
    if (exam.sampleBarcode) drawText(`Muestra: ${exam.sampleBarcode}`);

    if (exam.examStatus === "rejected") {
      drawText("Examen rechazado" + (exam.validatorComments ? `: ${exam.validatorComments}` : "."), {
        color: gray,
      });
    } else if (exam.fieldSchema.sections.length > 0) {
      const values = exam.results ?? {};
      for (const section of exam.fieldSchema.sections) {
        drawText(section.label, { size: 10, bold: true });
        for (const field of section.fields) {
          const value = values[field.key];
          const formatted = formatResultValue(value);
          const flag = getRangeFlag(field, value);
          const flagSuffix = flag ? ` [${flag === "low" ? "Bajo" : "Alto"}]` : "";
          let line = `  ${field.label}: ${formatted}`;
          if (field.unit) line += ` (${field.unit})`;
          if (field.referenceRange) line += ` Ref: ${field.referenceRange}`;
          line += flagSuffix;
          drawText(line, { size: 9 });
        }
        y -= 4;
      }
    } else {
      drawText("Sin resultados registrados.", { size: 9, color: gray });
    }

    // Validation metadata
    drawText("Trazabilidad", { size: 9, bold: true });
    drawText(`  Realizado por: ${exam.performedBy ?? "—"}`, { size: 8, color: gray });
    drawText(`  Procesado: ${formatDateTime(exam.resultedAt)}`, { size: 8, color: gray });
    drawText(`  Validado por: ${exam.validatedBy ?? "—"}`, { size: 8, color: gray });
    drawText(`  Fecha validacion: ${formatDateTime(exam.validatedAt)}`, { size: 8, color: gray });
    if (exam.validatorComments) {
      drawText(`  Comentarios: ${exam.validatorComments}`, { size: 8, color: gray });
    }
    y -= 8;
  }

  // Footer
  drawLine();
  drawText("Documento generado electronicamente", { size: 9, color: gray });
  drawText(`Generado: ${formatDateTime(new Date().toISOString())}`, { size: 8, color: gray });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}
