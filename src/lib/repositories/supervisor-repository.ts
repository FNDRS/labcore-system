"use server";

import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/contracts";
import { deriveClinicalFlag, hasReferenceRangeViolation } from "@/lib/clinical-flags";
import { parseFieldSchema } from "@/lib/process/field-schema-types";
import { buildPatientFullName, parseResults } from "@/lib/repositories/shared";
import type {
  SupervisorDashboardStats,
  ValidationDetail,
  ValidationQueueFilters,
  ValidationQueueItem,
} from "@/lib/types/validation-types";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

const VALIDATION_EXAM_SELECTION = [
  "id",
  "sampleId",
  "examTypeId",
  "status",
  "results",
  "startedAt",
  "resultedAt",
  "performedBy",
  "notes",
  "validatedBy",
  "validatedAt",
  "updatedAt",
  "sample.id",
  "sample.barcode",
  "sample.workOrderId",
  "sample.examTypeId",
  "sample.status",
  "sample.collectedAt",
  "sample.receivedAt",
  "sample.workOrder.id",
  "sample.workOrder.accessionNumber",
  "sample.workOrder.priority",
  "sample.workOrder.requestedAt",
  "sample.workOrder.referringDoctor",
  "sample.workOrder.status",
  "sample.workOrder.patientId",
  "sample.workOrder.patient.id",
  "sample.workOrder.patient.firstName",
  "sample.workOrder.patient.lastName",
  "sample.workOrder.patient.dateOfBirth",
  "examType.id",
  "examType.code",
  "examType.name",
  "examType.sampleType",
  "examType.fieldSchema",
] as const;

type ValidationExamListRow = {
  id: string;
  sampleId?: string;
  examTypeId?: string;
  status?: string | null;
  results?: unknown;
  startedAt?: string | null;
  resultedAt?: string | null;
  performedBy?: string | null;
  notes?: string | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
  updatedAt?: string | null;
  sample?: {
    id?: string;
    barcode?: string | null;
    workOrderId?: string;
    examTypeId?: string;
    status?: string | null;
    collectedAt?: string | null;
    receivedAt?: string | null;
    workOrder?: {
      id?: string;
      accessionNumber?: string | null;
      priority?: string | null;
      requestedAt?: string | null;
      referringDoctor?: string | null;
      status?: string | null;
      patient?: {
        id?: string;
        firstName?: string | null;
        lastName?: string | null;
        dateOfBirth?: string | null;
      };
    };
  };
  examType?: {
    id?: string;
    code?: string | null;
    name?: string | null;
    sampleType?: string | null;
    fieldSchema?: unknown;
  };
};

type ValidatedExamRow = {
  id?: string;
  resultedAt?: string | null;
  validatedAt?: string | null;
};

function matchFlagFilter(
  item: Pick<ValidationQueueItem, "clinicalFlag" | "hasReferenceRangeViolation">,
  filter: ValidationQueueFilters["flag"]
): boolean {
  if (!filter) return true;
  if (filter === "abnormal") {
    return item.clinicalFlag !== "normal" || item.hasReferenceRangeViolation;
  }
  return item.clinicalFlag === filter;
}

/**
 * List exams for supervisor validation queue with patient/order/exam context.
 * Supports optional filters: status (pending/all), flag, priority, date range, technician.
 */
export async function listPendingValidation(
  filters: ValidationQueueFilters = {}
): Promise<ValidationQueueItem[]> {
  const statusFilter =
    filters.statusFilter === "all"
      ? {
          or: [
            { status: { eq: "ready_for_validation" } },
            { status: { eq: "approved" } },
            { status: { eq: "rejected" } },
          ],
        }
      : { status: { eq: "ready_for_validation" } };

  const examAndFilters: Array<Record<string, unknown>> = [statusFilter];
  if (filters.technicianId?.trim()) {
    examAndFilters.push({ performedBy: { eq: filters.technicianId.trim() } });
  }
  if (filters.fromResultedAt?.trim()) {
    examAndFilters.push({ resultedAt: { ge: filters.fromResultedAt.trim() } });
  }
  if (filters.toResultedAt?.trim()) {
    examAndFilters.push({ resultedAt: { le: filters.toResultedAt.trim() } });
  }

  // Paginate to fetch all matching exams. Prioritizes data accuracy over latency
  // (AppSync list() returns limited pages; partial results misrepresent the queue).
  const allExamRows: ValidationExamListRow[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const response = (await cookieBasedClient.models.Exam.list({
      filter: { and: examAndFilters },
      selectionSet: VALIDATION_EXAM_SELECTION,
      limit: 100,
      nextToken: nextToken ?? undefined,
    })) as { data?: typeof allExamRows; nextToken?: string | null; errors?: unknown[] };
    if (response.errors?.length) {
      console.error("[listPendingValidation] Amplify errors:", response.errors);
    }
    const page = response.data ?? [];
    allExamRows.push(...page);
    nextToken = response.nextToken;
  } while (nextToken);

  const examRows = allExamRows;
  if (!(examRows ?? []).length) return [];

  const rows: ValidationQueueItem[] = [];
  for (const exam of examRows ?? []) {
    const sample = exam.sample;
    if (!sample?.id || !sample.workOrderId) continue;
    const workOrder = sample.workOrder;
    if (!workOrder?.id) continue;
    if (filters.priority && workOrder.priority !== filters.priority) continue;

    const examType = exam.examType;
    if (!examType?.id || !examType.name) continue;
    const patient = workOrder.patient;
    const patientName = buildPatientFullName(patient?.firstName, patient?.lastName);

    const fieldSchema = parseFieldSchema(examType.fieldSchema);
    if (!fieldSchema) continue;
    const results = parseResults(exam.results);
    const hasViolation = hasReferenceRangeViolation(results, fieldSchema);
    const clinicalFlag = deriveClinicalFlag(results, fieldSchema);
    const priority =
      workOrder.priority === "routine" ||
      workOrder.priority === "urgent" ||
      workOrder.priority === "stat"
        ? workOrder.priority
        : null;

    const row: ValidationQueueItem = {
      examId: exam.id,
      sampleId: sample.id,
      workOrderId: sample.workOrderId,
      patientName,
      accessionNumber: workOrder.accessionNumber ?? null,
      examTypeName: examType.name,
      technicianId: exam.performedBy ?? null,
      status: (exam.status as ValidationQueueItem["status"]) ?? "ready_for_validation",
      processedAt: exam.resultedAt ?? null,
      clinicalFlag,
      hasReferenceRangeViolation: hasViolation,
      priority,
    };
    if (!matchFlagFilter(row, filters.flag)) continue;
    rows.push(row);
  }

  return rows.toSorted((a, b) => {
    const aTime = a.processedAt ? new Date(a.processedAt).getTime() : 0;
    const bTime = b.processedAt ? new Date(b.processedAt).getTime() : 0;
    return aTime - bTime;
  });
}

/**
 * Fetch full validation detail context for one exam.
 * Includes exam, examType(fieldSchema), sample, work order, and patient.
 */
export async function getValidationDetail(examId: string): Promise<ValidationDetail | null> {
  if (!examId.trim()) return null;

  const { data: exam, errors } = await cookieBasedClient.models.Exam.get(
    { id: examId.trim() },
    { selectionSet: VALIDATION_EXAM_SELECTION }
  );
  if (errors?.length) {
    console.error("[getValidationDetail] Amplify errors:", errors);
    return null;
  }
  if (!exam?.id || !exam.sampleId || !exam.examTypeId) return null;

  const sample = exam.sample;
  if (!sample?.id || !sample.workOrderId) return null;

  const workOrder = sample.workOrder;
  if (!workOrder?.id) return null;

  const examType = exam.examType;
  if (!examType?.id) return null;

  const fieldSchema = parseFieldSchema(examType.fieldSchema);
  if (!fieldSchema) return null;

  const patient = workOrder.patient;
  const fullName = buildPatientFullName(patient?.firstName, patient?.lastName);
  const results = parseResults(exam.results);
  const hasViolation = hasReferenceRangeViolation(results, fieldSchema);
  const clinicalFlag = deriveClinicalFlag(results, fieldSchema);

  return {
    exam: {
      id: exam.id,
      sampleId: exam.sampleId,
      examTypeId: exam.examTypeId,
      status: exam.status as ValidationDetail["exam"]["status"],
      results,
      startedAt: exam.startedAt,
      resultedAt: exam.resultedAt,
      performedBy: exam.performedBy,
      notes: exam.notes,
      validatedBy: exam.validatedBy,
      validatedAt: exam.validatedAt,
      updatedAt: exam.updatedAt,
    },
    examType: {
      id: examType.id,
      code: examType.code,
      name: examType.name,
      sampleType: examType.sampleType ?? null,
      fieldSchema,
    },
    sample: {
      id: sample.id,
      barcode: sample.barcode ?? null,
      workOrderId: sample.workOrderId,
      examTypeId: sample.examTypeId ?? exam.examTypeId,
      status: sample.status ?? null,
      collectedAt: sample.collectedAt ?? null,
      receivedAt: sample.receivedAt ?? null,
    },
    workOrder: {
      id: workOrder.id,
      accessionNumber: workOrder.accessionNumber ?? null,
      priority: workOrder.priority ?? null,
      requestedAt: workOrder.requestedAt ?? null,
      referringDoctor: workOrder.referringDoctor ?? null,
      status: workOrder.status ?? null,
    },
    patient: {
      id: patient?.id ?? "",
      firstName: patient?.firstName ?? null,
      lastName: patient?.lastName ?? null,
      fullName,
      dateOfBirth: patient?.dateOfBirth ?? null,
    },
    clinicalFlag,
    hasReferenceRangeViolation: hasViolation,
  };
}

/**
 * Aggregate supervisor dashboard stats from live data.
 * - pending count: exams ready_for_validation
 * - critical count: pending rows with explicit critical/attention or range violations
 * - active incidences: unique pending exams with INCIDENCE_CREATED audit events
 * - average turnaround: avg(resultedAt to validatedAt) for approved/rejected exams
 */
export async function getDashboardStats(): Promise<SupervisorDashboardStats> {
  const pendingRows = await listPendingValidation();
  const pendingCount = pendingRows.length;
  const criticalCount = pendingRows.filter(
    (row) => row.clinicalFlag !== "normal" || row.hasReferenceRangeViolation
  ).length;

  const pendingExamIds = new Set(pendingRows.map((row) => row.examId));
  let activeIncidences = 0;
  if (pendingExamIds.size > 0) {
    const { data: incidenceEvents } = await cookieBasedClient.models.AuditEvent.list({
      filter: {
        and: [
          { entityType: { eq: AUDIT_ENTITY_TYPES.EXAM } },
          { action: { eq: AUDIT_ACTIONS.INCIDENCE_CREATED } },
        ],
      },
    });
    const pendingIncidenceExamIds = new Set(
      (incidenceEvents ?? [])
        .map((event) => event.entityId)
        .filter((entityId): entityId is string => entityId != null && pendingExamIds.has(entityId))
    );
    activeIncidences = pendingIncidenceExamIds.size;
  }

  // Paginate to include all validated exams for accurate turnaround average.
  const validatedExamsRaw: ValidatedExamRow[] = [];
  let validatedNextToken: string | null | undefined = undefined;
  do {
    const validatedResponse = (await cookieBasedClient.models.Exam.list({
      filter: {
        or: [{ status: { eq: "approved" } }, { status: { eq: "rejected" } }],
      },
      limit: 100,
      nextToken: validatedNextToken ?? undefined,
    })) as { data?: typeof validatedExamsRaw; nextToken?: string | null };
    validatedExamsRaw.push(...(validatedResponse.data ?? []));
    validatedNextToken = validatedResponse.nextToken;
  } while (validatedNextToken);

  const turnaroundMinutes: number[] = [];
  for (const exam of validatedExamsRaw) {
    if (!exam?.id) continue;
    if (!exam.resultedAt || !exam.validatedAt) continue;
    const resultedMs = new Date(exam.resultedAt).getTime();
    const validatedMs = new Date(exam.validatedAt).getTime();
    if (Number.isNaN(resultedMs) || Number.isNaN(validatedMs)) continue;
    if (validatedMs < resultedMs) continue;
    turnaroundMinutes.push(Math.round((validatedMs - resultedMs) / 60_000));
  }

  const averageValidationTurnaroundMins =
    turnaroundMinutes.length > 0
      ? Math.round(
          turnaroundMinutes.reduce((sum, value) => sum + value, 0) / turnaroundMinutes.length
        )
      : 0;

  return {
    pendingCount,
    criticalCount,
    activeIncidences,
    averageValidationTurnaroundMins,
  };
}
