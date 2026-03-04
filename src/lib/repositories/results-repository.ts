"use server";

import type { ExamStatus } from "@/lib/contracts";
import { deriveClinicalFlag, hasReferenceRangeViolation } from "@/lib/clinical-flags";
import { parseFieldSchema } from "@/lib/process/field-schema-types";
import type { FieldSchema } from "@/lib/process/field-schema-types";
import { buildPatientFullName, parseResults } from "@/lib/repositories/shared";
import type {
  ConsolidatedExamResult,
  ConsolidatedWorkOrderResult,
  ResultsListFilters,
  ResultsListItem,
} from "@/lib/types/results-types";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

const TERMINAL_EXAM_STATUSES = new Set<ExamStatus>(["approved", "rejected"]);
const EMPTY_FIELD_SCHEMA: FieldSchema = { sections: [] };
const RESULTS_WO_SELECTION = [
  "id",
  "accessionNumber",
  "patientId",
  "requestedAt",
  "priority",
  "status",
  "referringDoctor",
  "patient.id",
  "patient.firstName",
  "patient.lastName",
  "samples.id",
  "samples.examTypeId",
  "samples.exam.id",
  "samples.exam.status",
  "samples.exam.validatedAt",
] as const;
const CONSOLIDATED_WO_SELECTION = [
  "id",
  "accessionNumber",
  "status",
  "requestedAt",
  "priority",
  "referringDoctor",
  "patient.id",
  "patient.firstName",
  "patient.lastName",
  "patient.dateOfBirth",
  "patient.gender",
  "samples.id",
  "samples.barcode",
  "samples.examTypeId",
  "samples.exam.id",
  "samples.exam.sampleId",
  "samples.exam.examTypeId",
  "samples.exam.status",
  "samples.exam.results",
  "samples.exam.startedAt",
  "samples.exam.resultedAt",
  "samples.exam.performedBy",
  "samples.exam.notes",
  "samples.exam.validatedBy",
  "samples.exam.validatedAt",
  "samples.examType.id",
  "samples.examType.code",
  "samples.examType.name",
  "samples.examType.sampleType",
  "samples.examType.fieldSchema",
] as const;

function toTime(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function matchesDateRange(
  requestedAt: string | null | undefined,
  filters: Pick<ResultsListFilters, "from" | "to">
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
  filters: ResultsListFilters = {}
): Promise<ResultsListItem[]> {
  const { data: workOrders, errors } = await cookieBasedClient.models.WorkOrder.list({
    selectionSet: RESULTS_WO_SELECTION,
  });
  if (errors?.length) {
    console.error("[listCompletedWorkOrders] Amplify errors:", errors);
  }

  const items: ResultsListItem[] = [];
  for (const wo of workOrders ?? []) {
    if (!wo?.id || !wo.patientId) continue;

    const exams = (wo.samples ?? []).flatMap((sample) => (sample?.exam ? [sample.exam] : []));
    if (!exams.length) continue;

    const terminalExams = exams.filter(
      (exam) => exam.status != null && TERMINAL_EXAM_STATUSES.has(exam.status as ExamStatus)
    );
    if (!terminalExams.length) continue;

    const status: ResultsListItem["status"] =
      terminalExams.length === exams.length ? "completa" : "parcial";
    const lastValidatedAt =
      terminalExams
        .map((exam) => exam.validatedAt)
        .filter((value): value is string => typeof value === "string")
        .toSorted((a, b) => toTime(b) - toTime(a))[0] ?? null;

    const patientName = buildPatientFullName(wo.patient?.firstName, wo.patient?.lastName);

    const row: ResultsListItem = {
      workOrderId: wo.id,
      accessionNumber: wo.accessionNumber ?? null,
      patientId: wo.patientId,
      patientName,
      requestedAt: wo.requestedAt ?? null,
      priority: wo.priority ?? null,
      workOrderStatus: wo.status ?? null,
      referringDoctor: wo.referringDoctor ?? null,
      examCount: exams.length,
      terminalExamCount: terminalExams.length,
      status,
      lastValidatedAt,
    };

    if (!matchesDateRange(row.requestedAt, filters)) continue;
    if (filters.status && filters.status !== "todas" && row.status !== filters.status) {
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
  workOrderId: string
): Promise<ConsolidatedWorkOrderResult | null> {
  const normalizedId = workOrderId.trim();
  if (!normalizedId) return null;

  const { data: workOrder, errors } = await cookieBasedClient.models.WorkOrder.get(
    { id: normalizedId },
    { selectionSet: CONSOLIDATED_WO_SELECTION }
  );
  if (errors?.length) {
    console.error("[getWorkOrderConsolidatedResults] Amplify errors:", errors);
    return null;
  }
  if (!workOrder?.id) return null;

  const patient = workOrder.patient;
  if (!patient?.id) return null;

  const safeSamples = (workOrder.samples ?? []).filter(
    (sample): sample is NonNullable<typeof sample> =>
      sample != null && typeof sample.id === "string" && typeof sample.examTypeId === "string"
  );
  const examTypesById = new Map(
    safeSamples
      .map((sample) => [sample.examTypeId, sample.examType] as const)
      .filter(
        (
          entry
        ): entry is readonly [string, NonNullable<(typeof safeSamples)[number]["examType"]>] =>
          entry[1] != null && typeof entry[1].id === "string"
      )
  );

  const consolidatedExams: ConsolidatedExamResult[] = [];
  for (const sample of safeSamples) {
    const exam = sample.exam;
    if (!exam?.id || !exam.sampleId || !exam.examTypeId) continue;

    const examType = examTypesById.get(sample.examTypeId) ?? sample.examType;
    if (!examType?.id) continue;

    const fieldSchema = parseFieldSchema(examType.fieldSchema) ?? EMPTY_FIELD_SCHEMA;
    const results = parseResults(exam.results);
    const hasViolation = hasReferenceRangeViolation(results, fieldSchema);

    consolidatedExams.push({
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
    });
  }
  const sortedConsolidatedExams = consolidatedExams.toSorted((a, b) =>
    a.examTypeName.localeCompare(b.examTypeName, "es-CL")
  );

  const approvedExams = sortedConsolidatedExams.filter(
    (exam) => exam.examStatus === "approved"
  ).length;
  const rejectedExams = sortedConsolidatedExams.filter(
    (exam) => exam.examStatus === "rejected"
  ).length;
  const pendingExams = sortedConsolidatedExams.length - approvedExams - rejectedExams;
  const lastValidatedAt =
    sortedConsolidatedExams
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
    exams: sortedConsolidatedExams,
    summary: {
      totalExams: sortedConsolidatedExams.length,
      approvedExams,
      rejectedExams,
      pendingExams,
      isFullyTerminal: pendingExams === 0,
      lastValidatedAt,
    },
  };
}
