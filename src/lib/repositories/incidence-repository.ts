"use server";

import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, type ExamStatus } from "@/lib/contracts";
import { parseFieldSchema } from "@/lib/process/field-schema-types";
import type { FieldSchema } from "@/lib/process/field-schema-types";
import type { AnalyticsTimeRange } from "@/lib/types/analytics-types";
import type {
  IncidentFeedFilters,
  IncidentFeedItem,
  IncidentFeedPage,
  IncidentFeedPagination,
  IncidentPattern,
  IncidentSummaryCards,
  IncidentType,
} from "@/lib/types/incidence-types";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

type IncidentAuditAction =
  | typeof AUDIT_ACTIONS.EXAM_REJECTED
  | typeof AUDIT_ACTIONS.SPECIMEN_REJECTED
  | typeof AUDIT_ACTIONS.INCIDENCE_CREATED;

type NormalizedAuditEvent = {
  id: string;
  action: IncidentAuditAction;
  entityType: string | null;
  entityId: string | null;
  userId: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
};

type SampleRecord = {
  id: string;
  workOrderId: string;
  examTypeId: string | null;
  barcode: string | null;
  status: string | null;
};

type ExamRecord = {
  id: string;
  sampleId: string;
  examTypeId: string;
  status: ExamStatus | null;
  performedBy: string | null;
  results: unknown;
  startedAt: string | null;
  resultedAt: string | null;
  validatedAt: string | null;
};

type WorkOrderRecord = {
  id: string;
  patientId: string;
  accessionNumber: string | null;
};

type PatientRecord = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

type ExamTypeRecord = {
  id: string;
  code: string | null;
  name: string | null;
  fieldSchema: unknown;
};

type IncidentContext = {
  samplesById: Map<string, SampleRecord>;
  examsById: Map<string, ExamRecord>;
  workOrdersById: Map<string, WorkOrderRecord>;
  patientsById: Map<string, PatientRecord>;
  examTypesById: Map<string, ExamTypeRecord>;
};

type IncidentAggregation = {
  summary: Omit<IncidentSummaryCards, "criticalResults">;
  reasonDistribution: Map<string, number>;
  rejectionByTechnician: Map<string, { technicianId: string; technicianName: string; count: number }>;
  rejectionByExamType: Map<string, { examTypeId: string; examTypeCode: string; examTypeName: string; count: number }>;
  incidenceTrend: Map<string, number>;
};

const INCIDENT_ACTIONS = new Set<IncidentAuditAction>([
  AUDIT_ACTIONS.EXAM_REJECTED,
  AUDIT_ACTIONS.SPECIMEN_REJECTED,
  AUDIT_ACTIONS.INCIDENCE_CREATED,
]);

const EMPTY_FIELD_SCHEMA: FieldSchema = { sections: [] };

function toEpoch(value: string | null | undefined): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalizeDateString(value: string): string {
  const timestamp = new Date(value).toISOString();
  return timestamp;
}

function toDateKey(value: string): string {
  return normalizeDateString(value).slice(0, 10);
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
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

function isWithinRange(value: string | null | undefined, range: AnalyticsTimeRange): boolean {
  if (!value) return false;
  const at = toEpoch(value);
  if (!at) return false;
  const from = toEpoch(range.from);
  const to = toEpoch(range.to);
  if (from && at < from) return false;
  if (to && at > to) return false;
  return true;
}

function parseReason(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const direct =
    typeof metadata.reason === "string"
      ? metadata.reason
      : typeof metadata.motivo === "string"
        ? metadata.motivo
        : typeof metadata.type === "string"
          ? metadata.type
          : null;
  return direct?.trim() || null;
}

function parseDescription(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const direct =
    typeof metadata.description === "string"
      ? metadata.description
      : typeof metadata.details === "string"
        ? metadata.details
        : null;
  return direct?.trim() || null;
}

function parseAuditEvent(row: unknown): NormalizedAuditEvent | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;

  const id = typeof value.id === "string" ? value.id : null;
  const action = typeof value.action === "string" ? value.action : null;
  const timestamp = typeof value.timestamp === "string" ? value.timestamp : null;
  if (!id || !action || !timestamp) return null;
  if (!INCIDENT_ACTIONS.has(action as IncidentAuditAction)) return null;

  return {
    id,
    action: action as IncidentAuditAction,
    entityType: typeof value.entityType === "string" ? value.entityType : null,
    entityId: typeof value.entityId === "string" ? value.entityId : null,
    userId: typeof value.userId === "string" ? value.userId : null,
    timestamp,
    metadata: parseRecord(value.metadata),
  };
}

async function listAllIncidentAuditEvents(range: AnalyticsTimeRange): Promise<NormalizedAuditEvent[]> {
  const andFilters: Array<Record<string, unknown>> = [
    {
      or: [
        { action: { eq: AUDIT_ACTIONS.EXAM_REJECTED } },
        { action: { eq: AUDIT_ACTIONS.SPECIMEN_REJECTED } },
        { action: { eq: AUDIT_ACTIONS.INCIDENCE_CREATED } },
      ],
    },
  ];

  if (range.from?.trim()) andFilters.push({ timestamp: { ge: range.from.trim() } });
  if (range.to?.trim()) andFilters.push({ timestamp: { le: range.to.trim() } });

  const rows: NormalizedAuditEvent[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const response = (await cookieBasedClient.models.AuditEvent.list({
      filter: { and: andFilters },
      nextToken: nextToken ?? undefined,
    })) as { data: unknown[] | null; nextToken?: string | null };
    for (const row of response.data ?? []) {
      const parsed = parseAuditEvent(row);
      if (parsed) rows.push(parsed);
    }
    nextToken = response.nextToken;
  } while (nextToken);

  return rows.toSorted((a, b) => {
    const byTime = toEpoch(b.timestamp) - toEpoch(a.timestamp);
    return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
  });
}

function parseSampleRecord(row: unknown): SampleRecord | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id : null;
  const workOrderId = typeof value.workOrderId === "string" ? value.workOrderId : null;
  if (!id || !workOrderId) return null;
  return {
    id,
    workOrderId,
    examTypeId: typeof value.examTypeId === "string" ? value.examTypeId : null,
    barcode: typeof value.barcode === "string" ? value.barcode : null,
    status: typeof value.status === "string" ? value.status : null,
  };
}

function parseExamRecord(row: unknown): ExamRecord | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id : null;
  const sampleId = typeof value.sampleId === "string" ? value.sampleId : null;
  const examTypeId = typeof value.examTypeId === "string" ? value.examTypeId : null;
  if (!id || !sampleId || !examTypeId) return null;
  return {
    id,
    sampleId,
    examTypeId,
    status: typeof value.status === "string" ? (value.status as ExamStatus) : null,
    performedBy: typeof value.performedBy === "string" ? value.performedBy : null,
    results: value.results,
    startedAt: typeof value.startedAt === "string" ? value.startedAt : null,
    resultedAt: typeof value.resultedAt === "string" ? value.resultedAt : null,
    validatedAt: typeof value.validatedAt === "string" ? value.validatedAt : null,
  };
}

function parseWorkOrderRecord(row: unknown): WorkOrderRecord | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id : null;
  const patientId = typeof value.patientId === "string" ? value.patientId : null;
  if (!id || !patientId) return null;
  return {
    id,
    patientId,
    accessionNumber:
      typeof value.accessionNumber === "string" ? value.accessionNumber : null,
  };
}

function parsePatientRecord(row: unknown): PatientRecord | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id : null;
  if (!id) return null;
  return {
    id,
    firstName: typeof value.firstName === "string" ? value.firstName : null,
    lastName: typeof value.lastName === "string" ? value.lastName : null,
  };
}

function parseExamTypeRecord(row: unknown): ExamTypeRecord | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id : null;
  if (!id) return null;
  return {
    id,
    code: typeof value.code === "string" ? value.code : null,
    name: typeof value.name === "string" ? value.name : null,
    fieldSchema: value.fieldSchema,
  };
}

function resolveLinkedIds(event: NormalizedAuditEvent): {
  sampleId: string | null;
  examId: string | null;
  workOrderId: string | null;
} {
  const metadata = event.metadata;
  const metadataSampleId =
    metadata && typeof metadata.sampleId === "string" ? metadata.sampleId : null;
  const metadataExamId =
    metadata && typeof metadata.examId === "string" ? metadata.examId : null;
  const metadataWorkOrderId =
    metadata && typeof metadata.workOrderId === "string" ? metadata.workOrderId : null;

  if (event.entityType === AUDIT_ENTITY_TYPES.SAMPLE) {
    return {
      sampleId: event.entityId ?? metadataSampleId,
      examId: metadataExamId,
      workOrderId: metadataWorkOrderId,
    };
  }
  if (event.entityType === AUDIT_ENTITY_TYPES.EXAM) {
    return {
      sampleId: metadataSampleId,
      examId: event.entityId ?? metadataExamId,
      workOrderId: metadataWorkOrderId,
    };
  }
  return {
    sampleId: metadataSampleId,
    examId: metadataExamId,
    workOrderId: metadataWorkOrderId,
  };
}

async function buildIncidentContext(events: NormalizedAuditEvent[]): Promise<IncidentContext> {
  const sampleIds = new Set<string>();
  const examIds = new Set<string>();
  const workOrderIds = new Set<string>();

  for (const event of events) {
    const linked = resolveLinkedIds(event);
    if (linked.sampleId) sampleIds.add(linked.sampleId);
    if (linked.examId) examIds.add(linked.examId);
    if (linked.workOrderId) workOrderIds.add(linked.workOrderId);
  }

  const examResults = await Promise.all(
    [...examIds].map((id) => cookieBasedClient.models.Exam.get({ id })),
  );
  const examsById = new Map<string, ExamRecord>();
  for (const result of examResults) {
    const exam = parseExamRecord(result.data);
    if (!exam) continue;
    examsById.set(exam.id, exam);
    sampleIds.add(exam.sampleId);
  }

  const sampleResults = await Promise.all(
    [...sampleIds].map((id) => cookieBasedClient.models.Sample.get({ id })),
  );
  const samplesById = new Map<string, SampleRecord>();
  for (const result of sampleResults) {
    const sample = parseSampleRecord(result.data);
    if (!sample) continue;
    samplesById.set(sample.id, sample);
    workOrderIds.add(sample.workOrderId);
  }

  const workOrderResults = await Promise.all(
    [...workOrderIds].map((id) => cookieBasedClient.models.WorkOrder.get({ id })),
  );
  const workOrdersById = new Map<string, WorkOrderRecord>();
  const patientIds = new Set<string>();
  for (const result of workOrderResults) {
    const workOrder = parseWorkOrderRecord(result.data);
    if (!workOrder) continue;
    workOrdersById.set(workOrder.id, workOrder);
    patientIds.add(workOrder.patientId);
  }

  const patientResults = await Promise.all(
    [...patientIds].map((id) => cookieBasedClient.models.Patient.get({ id })),
  );
  const patientsById = new Map<string, PatientRecord>();
  for (const result of patientResults) {
    const patient = parsePatientRecord(result.data);
    if (!patient) continue;
    patientsById.set(patient.id, patient);
  }

  const examTypeIds = new Set<string>();
  for (const exam of examsById.values()) examTypeIds.add(exam.examTypeId);
  for (const sample of samplesById.values()) {
    if (sample.examTypeId) examTypeIds.add(sample.examTypeId);
  }

  const examTypeResults = await Promise.all(
    [...examTypeIds].map((id) => cookieBasedClient.models.ExamType.get({ id })),
  );
  const examTypesById = new Map<string, ExamTypeRecord>();
  for (const result of examTypeResults) {
    const examType = parseExamTypeRecord(result.data);
    if (!examType) continue;
    examTypesById.set(examType.id, examType);
  }

  return {
    samplesById,
    examsById,
    workOrdersById,
    patientsById,
    examTypesById,
  };
}

function buildPatientName(patient: PatientRecord | undefined): string {
  if (!patient) return "Desconocido";
  return `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Desconocido";
}

function mapActionToIncidentType(action: IncidentAuditAction): IncidentType {
  switch (action) {
    case AUDIT_ACTIONS.EXAM_REJECTED:
      return "exam_rejected";
    case AUDIT_ACTIONS.SPECIMEN_REJECTED:
      return "specimen_rejected";
    default:
      return "incidence_created";
  }
}

function mapActionToTitle(action: IncidentAuditAction): string {
  switch (action) {
    case AUDIT_ACTIONS.EXAM_REJECTED:
      return "Examen rechazado";
    case AUDIT_ACTIONS.SPECIMEN_REJECTED:
      return "Muestra rechazada";
    default:
      return "Incidencia registrada";
  }
}

function mapActionToSeverity(action: IncidentAuditAction): IncidentFeedItem["severity"] {
  switch (action) {
    case AUDIT_ACTIONS.EXAM_REJECTED:
    case AUDIT_ACTIONS.SPECIMEN_REJECTED:
      return "high";
    default:
      return "medium";
  }
}

function resolveEventContext(
  event: NormalizedAuditEvent,
  context: IncidentContext,
): {
  sampleId: string | null;
  examId: string | null;
  workOrderId: string | null;
  sample: SampleRecord | null;
  exam: ExamRecord | null;
  workOrder: WorkOrderRecord | null;
  patient: PatientRecord | null;
  examTypeId: string | null;
  examTypeName: string | null;
  examTypeCode: string | null;
} {
  const linked = resolveLinkedIds(event);
  const exam = linked.examId ? context.examsById.get(linked.examId) ?? null : null;
  const sampleId = linked.sampleId ?? exam?.sampleId ?? null;
  const sample = sampleId ? context.samplesById.get(sampleId) ?? null : null;
  const workOrderId = linked.workOrderId ?? sample?.workOrderId ?? null;
  const workOrder = workOrderId ? context.workOrdersById.get(workOrderId) ?? null : null;
  const patient = workOrder ? context.patientsById.get(workOrder.patientId) ?? null : null;

  const examTypeId = exam?.examTypeId ?? sample?.examTypeId ?? null;
  const examType = examTypeId ? context.examTypesById.get(examTypeId) ?? null : null;

  return {
    sampleId,
    examId: exam?.id ?? linked.examId ?? null,
    workOrderId,
    sample,
    exam,
    workOrder,
    patient,
    examTypeId,
    examTypeName: examType?.name ?? null,
    examTypeCode: examType?.code ?? null,
  };
}

function createIncidentItem(
  event: NormalizedAuditEvent,
  context: IncidentContext,
): IncidentFeedItem {
  const resolved = resolveEventContext(event, context);
  const reason = parseReason(event.metadata);
  const description = parseDescription(event.metadata);

  const status: IncidentFeedItem["status"] =
    event.action === AUDIT_ACTIONS.EXAM_REJECTED
      ? resolved.exam?.status === "approved"
        ? "resolved"
        : "open"
      : event.action === AUDIT_ACTIONS.SPECIMEN_REJECTED
        ? resolved.sample?.status === "completed"
          ? "resolved"
          : "open"
        : resolved.exam?.status === "approved"
          ? "resolved"
          : "open";

  const enrichedMetadata: Record<string, unknown> = {
    ...(event.metadata ?? {}),
    technicianId: resolved.exam?.performedBy ?? null,
  };

  return {
    id: `incident-${event.id}`,
    eventId: event.id,
    workOrderId: resolved.workOrderId ?? "unknown",
    sampleId: resolved.sampleId,
    examId: resolved.examId,
    accessionNumber: resolved.workOrder?.accessionNumber ?? null,
    patientName: buildPatientName(resolved.patient ?? undefined),
    examTypeId: resolved.examTypeId,
    examTypeName: resolved.examTypeName,
    sampleBarcode: resolved.sample?.barcode ?? null,
    incidentType: mapActionToIncidentType(event.action),
    severity: mapActionToSeverity(event.action),
    title: mapActionToTitle(event.action),
    description,
    reason,
    status,
    timestamp: event.timestamp,
    actorId: event.userId,
    actorName: event.userId,
    metadata: enrichedMetadata,
  };
}

function matchesFeedFilters(item: IncidentFeedItem, filters: IncidentFeedFilters): boolean {
  if (filters.type && filters.type !== "all" && item.incidentType !== filters.type) return false;
  if (filters.examTypeId && item.examTypeId !== filters.examTypeId) return false;
  if (filters.technicianId) {
    const metadataTechnicianId =
      item.metadata && typeof item.metadata.technicianId === "string"
        ? item.metadata.technicianId
        : null;
    if (metadataTechnicianId !== filters.technicianId && item.actorId !== filters.technicianId) {
      return false;
    }
  }

  const term = filters.search?.trim().toLowerCase();
  if (term) {
    const searchable = [
      item.patientName,
      item.accessionNumber ?? "",
      item.sampleBarcode ?? "",
      item.examTypeName ?? "",
      item.reason ?? "",
      item.description ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!searchable.includes(term)) return false;
  }

  return true;
}

function decodeCursor(cursor: string | null | undefined): { timestamp: string; eventId: string } | null {
  if (!cursor) return null;
  const [timestamp, eventId] = cursor.split("::");
  if (!timestamp || !eventId) return null;
  return { timestamp, eventId };
}

function encodeCursor(item: IncidentFeedItem): string {
  return `${item.timestamp}::${item.eventId}`;
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

async function listApprovedExamsInRange(range: AnalyticsTimeRange): Promise<ExamRecord[]> {
  const andFilters: Array<Record<string, unknown>> = [{ status: { eq: "approved" } }];
  if (range.from?.trim()) andFilters.push({ validatedAt: { ge: range.from.trim() } });
  if (range.to?.trim()) andFilters.push({ validatedAt: { le: range.to.trim() } });

  const exams: ExamRecord[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const response = (await cookieBasedClient.models.Exam.list({
      filter: { and: andFilters },
      nextToken: nextToken ?? undefined,
    })) as { data: unknown[] | null; nextToken?: string | null };
    for (const row of response.data ?? []) {
      const exam = parseExamRecord(row);
      if (exam) exams.push(exam);
    }
    nextToken = response.nextToken;
  } while (nextToken);

  return exams;
}

async function countCriticalResults(range: AnalyticsTimeRange): Promise<number> {
  const exams = await listApprovedExamsInRange(range);
  if (!exams.length) return 0;

  const examTypeIds = [...new Set(exams.map((exam) => exam.examTypeId))];
  const examTypeResults = await Promise.all(
    examTypeIds.map((id) => cookieBasedClient.models.ExamType.get({ id })),
  );
  const examTypesById = new Map<string, ExamTypeRecord>();
  for (const result of examTypeResults) {
    const examType = parseExamTypeRecord(result.data);
    if (examType) examTypesById.set(examType.id, examType);
  }

  let criticalCount = 0;
  for (const exam of exams) {
    const examType = examTypesById.get(exam.examTypeId);
    if (!examType) continue;
    const fieldSchema = parseFieldSchema(examType.fieldSchema) ?? EMPTY_FIELD_SCHEMA;
    const results = parseRecord(exam.results);
    if (deriveClinicalFlag(results, fieldSchema) === "critico") {
      criticalCount += 1;
    }
  }
  return criticalCount;
}

async function aggregateIncidentData(
  range: AnalyticsTimeRange,
): Promise<IncidentAggregation> {
  const events = await listAllIncidentAuditEvents(range);
  const context = await buildIncidentContext(events);

  const summary = {
    activeIncidences: 0,
    rejectedExams: 0,
    rejectedSamples: 0,
  };
  const reasonDistribution = new Map<string, number>();
  const rejectionByTechnician = new Map<
    string,
    { technicianId: string; technicianName: string; count: number }
  >();
  const rejectionByExamType = new Map<
    string,
    { examTypeId: string; examTypeCode: string; examTypeName: string; count: number }
  >();
  const incidenceTrend = new Map<string, number>();

  // Single aggregation pass: summary + all pattern maps.
  for (const event of events) {
    if (!isWithinRange(event.timestamp, range)) continue;

    const resolved = resolveEventContext(event, context);
    const dateKey = toDateKey(event.timestamp);
    incidenceTrend.set(dateKey, (incidenceTrend.get(dateKey) ?? 0) + 1);

    if (event.action === AUDIT_ACTIONS.INCIDENCE_CREATED) {
      const isResolved = resolved.exam?.status === "approved";
      if (!isResolved) summary.activeIncidences += 1;
      continue;
    }

    if (event.action === AUDIT_ACTIONS.EXAM_REJECTED) summary.rejectedExams += 1;
    if (event.action === AUDIT_ACTIONS.SPECIMEN_REJECTED) summary.rejectedSamples += 1;

    const reason = parseReason(event.metadata) ?? "Sin motivo especificado";
    reasonDistribution.set(reason, (reasonDistribution.get(reason) ?? 0) + 1);

    const technicianId = resolved.exam?.performedBy;
    if (technicianId) {
      const current = rejectionByTechnician.get(technicianId);
      if (current) {
        current.count += 1;
      } else {
        rejectionByTechnician.set(technicianId, {
          technicianId,
          technicianName: technicianId,
          count: 1,
        });
      }
    }

    if (resolved.examTypeId) {
      const current = rejectionByExamType.get(resolved.examTypeId);
      if (current) {
        current.count += 1;
      } else {
        rejectionByExamType.set(resolved.examTypeId, {
          examTypeId: resolved.examTypeId,
          examTypeCode: resolved.examTypeCode ?? resolved.examTypeId,
          examTypeName: resolved.examTypeName ?? "Examen",
          count: 1,
        });
      }
    }
  }

  return {
    summary,
    reasonDistribution,
    rejectionByTechnician,
    rejectionByExamType,
    incidenceTrend,
  };
}

export async function listIncidentFeed(
  filters: IncidentFeedFilters,
  pagination: IncidentFeedPagination,
): Promise<IncidentFeedPage> {
  const effectiveLimit =
    Number.isFinite(pagination.limit) && pagination.limit > 0
      ? Math.min(Math.floor(pagination.limit), 100)
      : 20;

  const events = await listAllIncidentAuditEvents(filters.range);
  const context = await buildIncidentContext(events);
  const items = events
    .filter((event) => isWithinRange(event.timestamp, filters.range))
    .map((event) => createIncidentItem(event, context))
    .filter((item) => matchesFeedFilters(item, filters));

  let startIndex = 0;
  const decodedCursor = decodeCursor(pagination.cursor);
  if (decodedCursor) {
    const cursorIndex = items.findIndex(
      (item) =>
        item.timestamp === decodedCursor.timestamp && item.eventId === decodedCursor.eventId,
    );
    if (cursorIndex >= 0) startIndex = cursorIndex + 1;
  }

  const pageItems = items.slice(startIndex, startIndex + effectiveLimit);
  const hasMore = startIndex + effectiveLimit < items.length;
  return {
    items: pageItems,
    nextCursor: hasMore && pageItems.length > 0 ? encodeCursor(pageItems[pageItems.length - 1]) : null,
  };
}

export async function getIncidentSummaryCards(
  range: AnalyticsTimeRange,
): Promise<IncidentSummaryCards> {
  const [aggregation, criticalResults] = await Promise.all([
    aggregateIncidentData(range),
    countCriticalResults(range),
  ]);

  return {
    activeIncidences: aggregation.summary.activeIncidences,
    rejectedExams: aggregation.summary.rejectedExams,
    rejectedSamples: aggregation.summary.rejectedSamples,
    criticalResults,
  };
}

export async function getIncidentPatterns(
  range: AnalyticsTimeRange,
): Promise<IncidentPattern> {
  const aggregation = await aggregateIncidentData(range);

  const reasonDistribution = [...aggregation.reasonDistribution.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .toSorted((a, b) => b.count - a.count);

  const rejectionByTechnician = [...aggregation.rejectionByTechnician.values()].toSorted(
    (a, b) => b.count - a.count,
  );

  const rejectionByExamType = [...aggregation.rejectionByExamType.values()].toSorted(
    (a, b) => b.count - a.count,
  );

  const incidenceTrend = [...aggregation.incidenceTrend.entries()]
    .map(([date, count]) => ({ date, count }))
    .toSorted((a, b) => toEpoch(a.date) - toEpoch(b.date));

  return {
    reasonDistribution,
    rejectionByTechnician,
    rejectionByExamType,
    incidenceTrend,
  };
}
