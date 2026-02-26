"use server";

import type { ExamStatus } from "@/lib/contracts";
import { parseFieldSchema } from "@/lib/process/field-schema-types";
import type { FieldSchema } from "@/lib/process/field-schema-types";
import type {
  ConsolidatedExamResult,
  ConsolidatedWorkOrderResult,
  ResultsListFilters,
  ResultsListItem,
} from "@/lib/types/results-types";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

const TERMINAL_EXAM_STATUSES = new Set<ExamStatus>(["approved", "rejected"]);
const EMPTY_FIELD_SCHEMA: FieldSchema = { sections: [] };

function parseResults(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseReferenceRange(
  range: string | undefined,
): { min: number; max: number } | null {
  if (!range || typeof range !== "string") return null;
  const match = range.match(/(\d+(?:\.\d+)?)\s*(?:-|\u2013)\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const min = Number.parseFloat(match[1]);
  const max = Number.parseFloat(match[2]);
  if (Number.isNaN(min) || Number.isNaN(max) || min > max) return null;
  return { min, max };
}

function hasReferenceRangeViolation(
  results: Record<string, unknown> | null,
  fieldSchema: FieldSchema,
): boolean {
  if (!results) return false;
  for (const section of fieldSchema.sections) {
    for (const field of section.fields) {
      if (field.type !== "numeric" || !field.referenceRange) continue;
      const range = parseReferenceRange(field.referenceRange);
      if (!range) continue;

      const rawValue = results[field.key];
      const value =
        typeof rawValue === "number"
          ? rawValue
          : typeof rawValue === "string"
            ? Number.parseFloat(rawValue)
            : Number.NaN;

      if (Number.isNaN(value)) continue;
      if (value < range.min || value > range.max) return true;
    }
  }
  return false;
}

function deriveClinicalFlag(
  results: Record<string, unknown> | null,
  fieldSchema: FieldSchema,
): "normal" | "atencion" | "critico" {
  if (!results) return "normal";

  let isAttention = false;
  for (const [key, rawValue] of Object.entries(results)) {
    if (typeof rawValue !== "string") continue;
    const normalized = rawValue.trim().toLowerCase();
    if (!normalized) continue;

    if (
      normalized.includes("critico") ||
      normalized.includes("critical") ||
      normalized === "high" ||
      normalized === "low"
    ) {
      return "critico";
    }

    if (
      normalized.includes("atencion") ||
      normalized.includes("attention") ||
      (key.toLowerCase().includes("flag") && normalized !== "normal")
    ) {
      isAttention = true;
    }
  }

  if (isAttention || hasReferenceRangeViolation(results, fieldSchema)) {
    return "atencion";
  }

  return "normal";
}

function buildPatientFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Desconocido";
}

function toTime(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function matchesDateRange(
  requestedAt: string | null | undefined,
  filters: Pick<ResultsListFilters, "from" | "to">,
): boolean {
  const requestedTime = toTime(requestedAt);
  if (!requestedTime) return !filters.from && !filters.to;

  const fromTime = toTime(filters.from);
  const toTimeValue = toTime(filters.to);
  if (fromTime && requestedTime < fromTime) return false;
  if (toTimeValue && requestedTime > toTimeValue) return false;
  return true;
}

export async function listCompletedWorkOrders(
  filters: ResultsListFilters = {},
): Promise<ResultsListItem[]> {
  const [workOrderResult, patientResult, sampleResult, examResult] =
    await Promise.all([
      cookieBasedClient.models.WorkOrder.list(),
      cookieBasedClient.models.Patient.list(),
      cookieBasedClient.models.Sample.list(),
      cookieBasedClient.models.Exam.list(),
    ]);

  const workOrders = (workOrderResult.data ?? []).filter(
    (workOrder): workOrder is NonNullable<typeof workOrder> =>
      workOrder != null &&
      typeof workOrder.id === "string" &&
      typeof workOrder.patientId === "string",
  );
  const patientsById = new Map(
    (patientResult.data ?? [])
      .filter(
        (patient): patient is NonNullable<typeof patient> =>
          patient != null && typeof patient.id === "string",
      )
      .map((patient) => [patient.id, patient]),
  );
  const samplesByWorkOrderId = new Map<string, Array<NonNullable<(typeof sampleResult.data)[number]>>>();
  for (const sample of sampleResult.data ?? []) {
    if (!sample?.workOrderId) continue;
    const existing = samplesByWorkOrderId.get(sample.workOrderId) ?? [];
    existing.push(sample);
    samplesByWorkOrderId.set(sample.workOrderId, existing);
  }

  const examsBySampleId = new Map<string, Array<NonNullable<(typeof examResult.data)[number]>>>();
  for (const exam of examResult.data ?? []) {
    if (!exam?.sampleId) continue;
    const existing = examsBySampleId.get(exam.sampleId) ?? [];
    existing.push(exam);
    examsBySampleId.set(exam.sampleId, existing);
  }

  const items: ResultsListItem[] = [];
  for (const workOrder of workOrders) {
    const samples = samplesByWorkOrderId.get(workOrder.id) ?? [];
    const exams = samples.flatMap((sample) => (sample.id ? examsBySampleId.get(sample.id) ?? [] : []));
    if (!exams.length) continue;

    const terminalExams = exams.filter(
      (exam) =>
        exam.status != null &&
        TERMINAL_EXAM_STATUSES.has(exam.status as ExamStatus),
    );
    if (!terminalExams.length) continue;

    const status: ResultsListItem["status"] =
      terminalExams.length === exams.length ? "completa" : "parcial";
    const lastValidatedAt = terminalExams
      .map((exam) => exam.validatedAt)
      .filter((value): value is string => typeof value === "string")
      .toSorted((a, b) => toTime(b) - toTime(a))[0] ?? null;

    const patient = patientsById.get(workOrder.patientId);
    const patientName = buildPatientFullName(patient?.firstName, patient?.lastName);

    const row: ResultsListItem = {
      workOrderId: workOrder.id,
      accessionNumber: workOrder.accessionNumber ?? null,
      patientId: workOrder.patientId,
      patientName,
      requestedAt: workOrder.requestedAt ?? null,
      priority: workOrder.priority ?? null,
      workOrderStatus: workOrder.status ?? null,
      referringDoctor: workOrder.referringDoctor ?? null,
      examCount: exams.length,
      terminalExamCount: terminalExams.length,
      status,
      lastValidatedAt,
    };

    if (!matchesDateRange(row.requestedAt, filters)) continue;
    if (
      filters.status &&
      filters.status !== "todas" &&
      row.status !== filters.status
    ) {
      continue;
    }
    if (filters.referringDoctor?.trim()) {
      const filterDoctor = filters.referringDoctor.trim().toLowerCase();
      const currentDoctor = row.referringDoctor?.toLowerCase() ?? "";
      if (!currentDoctor.includes(filterDoctor)) continue;
    }
    if (filters.search?.trim()) {
      const term = filters.search.trim().toLowerCase();
      const accession = row.accessionNumber?.toLowerCase() ?? "";
      const patient = row.patientName.toLowerCase();
      if (!accession.includes(term) && !patient.includes(term)) continue;
    }

    items.push(row);
  }

  return items.toSorted((a, b) => toTime(b.requestedAt) - toTime(a.requestedAt));
}

export async function getWorkOrderConsolidatedResults(
  workOrderId: string,
): Promise<ConsolidatedWorkOrderResult | null> {
  const normalizedId = workOrderId.trim();
  if (!normalizedId) return null;

  const { data: workOrder } = await cookieBasedClient.models.WorkOrder.get({
    id: normalizedId,
  });
  if (!workOrder?.id || !workOrder.patientId) return null;

  const [{ data: patient }, { data: samples }] = await Promise.all([
    cookieBasedClient.models.Patient.get({ id: workOrder.patientId }),
    cookieBasedClient.models.Sample.list({
      filter: { workOrderId: { eq: workOrder.id } },
    }),
  ]);
  if (!patient?.id) return null;

  const safeSamples = (samples ?? []).filter(
    (sample): sample is NonNullable<typeof sample> =>
      sample != null && typeof sample.id === "string" && typeof sample.examTypeId === "string",
  );
  const [examListResults, examTypeResults] = await Promise.all([
    Promise.all(
      safeSamples.map((sample) =>
        cookieBasedClient.models.Exam.list({
          filter: { sampleId: { eq: sample.id } },
        }),
      ),
    ),
    Promise.all(
      [...new Set(safeSamples.map((sample) => sample.examTypeId))].map((examTypeId) =>
        cookieBasedClient.models.ExamType.get({ id: examTypeId }),
      ),
    ),
  ]);

  const examTypesById = new Map(
    examTypeResults
      .map((result) => result.data)
      .filter(
        (examType): examType is NonNullable<typeof examType> =>
          examType != null && typeof examType.id === "string",
      )
      .map((examType) => [examType.id, examType]),
  );
  const sampleById = new Map(safeSamples.map((sample) => [sample.id, sample]));
  const exams = examListResults.flatMap((result) => result.data ?? []).filter(
    (exam): exam is NonNullable<typeof exam> =>
      exam != null &&
      typeof exam.id === "string" &&
      typeof exam.sampleId === "string" &&
      typeof exam.examTypeId === "string",
  );

  const consolidatedExamCandidates = exams.map((exam) => {
      const sample = sampleById.get(exam.sampleId);
      const examType = examTypesById.get(exam.examTypeId);
      if (!sample || !examType) return null;

      const fieldSchema = parseFieldSchema(examType.fieldSchema) ?? EMPTY_FIELD_SCHEMA;
      const results = parseResults(exam.results);
      const hasViolation = hasReferenceRangeViolation(results, fieldSchema);

      return {
        examId: exam.id,
        sampleId: exam.sampleId,
        examTypeId: exam.examTypeId,
        examTypeCode: examType.code ?? "N/A",
        examTypeName: examType.name ?? "Examen",
        sampleType: examType.sampleType ?? null,
        sampleBarcode: sample.barcode ?? null,
        examStatus: (exam.status as ExamStatus | null) ?? null,
        results,
        fieldSchema,
        hasReferenceRangeViolation: hasViolation,
        clinicalFlag: deriveClinicalFlag(results, fieldSchema),
        startedAt: exam.startedAt ?? null,
        resultedAt: exam.resultedAt ?? null,
        performedBy: exam.performedBy ?? null,
        validatedBy: exam.validatedBy ?? null,
        validatedAt: exam.validatedAt ?? null,
        validatorComments: exam.notes ?? null,
      } satisfies ConsolidatedExamResult;
    });

  const consolidatedExams: ConsolidatedExamResult[] = consolidatedExamCandidates
    .filter((exam): exam is NonNullable<typeof exam> => exam != null)
    .toSorted((a, b) => a.examTypeName.localeCompare(b.examTypeName, "es-CL"));

  const approvedExams = consolidatedExams.filter(
    (exam) => exam.examStatus === "approved",
  ).length;
  const rejectedExams = consolidatedExams.filter(
    (exam) => exam.examStatus === "rejected",
  ).length;
  const pendingExams = consolidatedExams.length - approvedExams - rejectedExams;
  const lastValidatedAt =
    consolidatedExams
      .map((exam) => exam.validatedAt)
      .filter((value): value is string => typeof value === "string")
      .toSorted((a, b) => toTime(b) - toTime(a))[0] ?? null;

  return {
    workOrder: {
      id: workOrder.id,
      accessionNumber: workOrder.accessionNumber ?? null,
      status: workOrder.status ?? null,
      requestedAt: workOrder.requestedAt ?? null,
      priority: workOrder.priority ?? null,
      referringDoctor: workOrder.referringDoctor ?? null,
    },
    patient: {
      id: patient.id,
      firstName: patient.firstName ?? null,
      lastName: patient.lastName ?? null,
      fullName: buildPatientFullName(patient.firstName, patient.lastName),
      dateOfBirth: patient.dateOfBirth ?? null,
      gender: patient.gender ?? null,
    },
    exams: consolidatedExams,
    summary: {
      totalExams: consolidatedExams.length,
      approvedExams,
      rejectedExams,
      pendingExams,
      isFullyTerminal: pendingExams === 0,
      lastValidatedAt,
    },
  };
}
