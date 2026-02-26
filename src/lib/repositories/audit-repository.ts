"use server";

import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/contracts";
import type { SampleStatus } from "@/lib/contracts";
import { getAuditActionLabel } from "@/lib/audit-labels";
import { lookupSampleByBarcode } from "@/lib/repositories/technician-repository";
import type {
  AuditSearchResult,
  AuditTimelineEvent,
  RecentAuditActivityItem,
  SampleTimeline,
  TimelineDurations,
  WorkOrderTimeline,
} from "@/lib/types/audit-timeline-types";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

type EntityQuery = {
  entityType: string;
  entityId: string;
};

function toMs(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function toMinutes(start: string | null | undefined, end: string | null | undefined): number | null {
  const startMs = toMs(start);
  const endMs = toMs(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null;
  return Math.round((endMs - startMs) / 60_000);
}

function toPatientName(firstName: string | null | undefined, lastName: string | null | undefined): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Desconocido";
}

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeAuditEvent(raw: unknown): AuditTimelineEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const event = raw as {
    id?: string | null;
    action?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    timestamp?: string | null;
    userId?: string | null;
    metadata?: unknown;
  };
  if (!event.id || !event.entityId || !event.timestamp) return null;

  const action = event.action ?? "UNKNOWN";
  const actionLabel = getAuditActionLabel(action);
  return {
    id: event.id,
    action,
    label: actionLabel.label,
    category: actionLabel.category,
    entityType: event.entityType ?? "Unknown",
    entityId: event.entityId,
    timestamp: event.timestamp,
    actorId: event.userId ?? null,
    actorName: null,
    metadata: parseMetadata(event.metadata),
  };
}

async function listAuditEventsByEntity(entity: EntityQuery): Promise<AuditTimelineEvent[]> {
  const { data } = await cookieBasedClient.models.AuditEvent.list({
    filter: {
      and: [
        { entityType: { eq: entity.entityType } },
        { entityId: { eq: entity.entityId } },
      ],
    },
  });
  return (data ?? [])
    .map((item) => normalizeAuditEvent(item))
    .filter((item): item is AuditTimelineEvent => item != null);
}

function buildSampleDurations(
  orderEvents: AuditTimelineEvent[],
  sampleEvents: AuditTimelineEvent[],
): TimelineDurations {
  const firstOrderCreated =
    orderEvents.find((event) => event.action === AUDIT_ACTIONS.ORDER_CREATED)?.timestamp ?? null;
  const firstSampleReceived =
    sampleEvents.find((event) => event.action === AUDIT_ACTIONS.SPECIMEN_RECEIVED)?.timestamp ?? null;
  const examStarted =
    sampleEvents.find((event) => event.action === AUDIT_ACTIONS.EXAM_STARTED)?.timestamp ?? null;
  const examSentToValidation =
    sampleEvents.find((event) => event.action === AUDIT_ACTIONS.EXAM_SENT_TO_VALIDATION)?.timestamp ?? null;
  const firstValidationOutcome =
    sampleEvents.find(
      (event) =>
        event.action === AUDIT_ACTIONS.EXAM_APPROVED || event.action === AUDIT_ACTIONS.EXAM_REJECTED,
    )?.timestamp ?? null;

  const firstEvent = sampleEvents[0]?.timestamp ?? null;
  const lastEvent = sampleEvents[sampleEvents.length - 1]?.timestamp ?? null;

  return {
    preAnalyticalMinutes: toMinutes(firstOrderCreated, firstSampleReceived),
    analyticalMinutes: toMinutes(examStarted, examSentToValidation),
    postAnalyticalMinutes: toMinutes(examSentToValidation, firstValidationOutcome),
    totalLifecycleMinutes: toMinutes(firstEvent, lastEvent),
  };
}

export async function getAuditTimelineForWorkOrder(
  workOrderId: string,
): Promise<WorkOrderTimeline | null> {
  const normalizedWorkOrderId = workOrderId.trim();
  if (!normalizedWorkOrderId) return null;

  const { data: workOrder } = await cookieBasedClient.models.WorkOrder.get({
    id: normalizedWorkOrderId,
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
      sample != null && typeof sample.id === "string",
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
      [...new Set(safeSamples.map((sample) => sample.examTypeId).filter(Boolean))].map((examTypeId) =>
        cookieBasedClient.models.ExamType.get({ id: examTypeId }),
      ),
    ),
  ]);

  const exams = examListResults.flatMap((result) => result.data ?? []).filter(
    (exam): exam is NonNullable<typeof exam> =>
      exam != null &&
      typeof exam.id === "string" &&
      typeof exam.sampleId === "string",
  );
  const examBySampleId = new Map<string, NonNullable<(typeof exams)[number]>>();
  for (const exam of exams) {
    if (!examBySampleId.has(exam.sampleId)) {
      examBySampleId.set(exam.sampleId, exam);
    }
  }
  const examTypeById = new Map(
    examTypeResults
      .map((result) => result.data)
      .filter(
        (examType): examType is NonNullable<typeof examType> =>
          examType != null && typeof examType.id === "string",
      )
      .map((examType) => [examType.id, examType]),
  );

  const entityQueries: EntityQuery[] = [
    { entityType: AUDIT_ENTITY_TYPES.WORK_ORDER, entityId: workOrder.id },
    ...safeSamples.map((sample) => ({
      entityType: AUDIT_ENTITY_TYPES.SAMPLE,
      entityId: sample.id,
    })),
    ...exams.map((exam) => ({
      entityType: AUDIT_ENTITY_TYPES.EXAM,
      entityId: exam.id,
    })),
  ];

  // DynamoDB has no native IN query; fetch each entityId in parallel and merge.
  const groupedEvents = await Promise.all(entityQueries.map((query) => listAuditEventsByEntity(query)));
  const allEvents = groupedEvents
    .flat()
    .toSorted((a, b) => toMs(a.timestamp) - toMs(b.timestamp));
  const eventsByEntityId = new Map<string, AuditTimelineEvent[]>();
  for (const event of allEvents) {
    const existing = eventsByEntityId.get(event.entityId) ?? [];
    existing.push(event);
    eventsByEntityId.set(event.entityId, existing);
  }

  const orderEvents =
    eventsByEntityId.get(workOrder.id)?.toSorted((a, b) => toMs(a.timestamp) - toMs(b.timestamp)) ?? [];

  const sampleTimelines: SampleTimeline[] = safeSamples
    .map((sample) => {
      const sampleEvents = eventsByEntityId.get(sample.id) ?? [];
      const exam = examBySampleId.get(sample.id) ?? null;
      const examEvents = exam?.id ? (eventsByEntityId.get(exam.id) ?? []) : [];
      const mergedEvents = [...sampleEvents, ...examEvents].toSorted(
        (a, b) => toMs(a.timestamp) - toMs(b.timestamp),
      );
      const examType =
        (sample.examTypeId ? examTypeById.get(sample.examTypeId) : undefined) ??
        (exam?.examTypeId ? examTypeById.get(exam.examTypeId) : undefined);

      const incidenceCount = mergedEvents.filter(
        (event) => event.action === AUDIT_ACTIONS.INCIDENCE_CREATED,
      ).length;
      const rejectionCount = mergedEvents.filter(
        (event) =>
          event.action === AUDIT_ACTIONS.EXAM_REJECTED ||
          event.action === AUDIT_ACTIONS.SPECIMEN_REJECTED,
      ).length;

      return {
        sampleId: sample.id,
        barcode: sample.barcode ?? null,
        sampleStatus: (sample.status as SampleStatus | null) ?? null,
        examId: exam?.id ?? null,
        examTypeId: examType?.id ?? sample.examTypeId ?? null,
        examTypeCode: examType?.code ?? null,
        examTypeName: examType?.name ?? null,
        events: mergedEvents,
        durations: buildSampleDurations(orderEvents, mergedEvents),
        incidenceCount,
        rejectionCount,
      } satisfies SampleTimeline;
    })
    .toSorted((a, b) => (a.barcode ?? a.sampleId).localeCompare(b.barcode ?? b.sampleId, "es-CL"));

  return {
    workOrderId: workOrder.id,
    accessionNumber: workOrder.accessionNumber ?? null,
    requestedAt: workOrder.requestedAt ?? null,
    priority: workOrder.priority ?? null,
    referringDoctor: workOrder.referringDoctor ?? null,
    patient: {
      id: patient.id,
      fullName: toPatientName(patient.firstName, patient.lastName),
    },
    orderEvents,
    sampleTimelines,
    summary: {
      totalEvents: allEvents.length,
      totalSamples: sampleTimelines.length,
      samplesWithIncidence: sampleTimelines.filter((timeline) => timeline.incidenceCount > 0).length,
      samplesWithRejection: sampleTimelines.filter((timeline) => timeline.rejectionCount > 0).length,
      firstEventAt: allEvents[0]?.timestamp ?? null,
      lastEventAt: allEvents[allEvents.length - 1]?.timestamp ?? null,
    },
  };
}

export async function searchAuditByBarcode(barcode: string): Promise<AuditSearchResult | null> {
  const normalizedBarcode = barcode.trim();
  if (!normalizedBarcode) return null;

  const sample = await lookupSampleByBarcode(normalizedBarcode);
  if (!sample?.id) return null;

  const { data: sampleEntity } = await cookieBasedClient.models.Sample.get({ id: sample.id });
  if (!sampleEntity?.workOrderId) return null;

  return {
    workOrderId: sampleEntity.workOrderId,
    matchedBy: "barcode",
  };
}

export async function searchAudit(query: string): Promise<AuditSearchResult | null> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  const [{ data: workOrderById }, barcodeMatch, { data: workOrderByAccession }] = await Promise.all([
    cookieBasedClient.models.WorkOrder.get({ id: normalizedQuery }),
    searchAuditByBarcode(normalizedQuery),
    cookieBasedClient.models.WorkOrder.list({
      filter: { accessionNumber: { eq: normalizedQuery } },
    }),
  ]);

  if (workOrderById?.id) {
    return { workOrderId: workOrderById.id, matchedBy: "workOrderId" };
  }
  if (barcodeMatch?.workOrderId) {
    return barcodeMatch;
  }

  const accessionMatch = (workOrderByAccession ?? [])
    .filter(
      (workOrder): workOrder is NonNullable<typeof workOrder> =>
        workOrder != null && typeof workOrder.id === "string",
    )
    .toSorted((a, b) => toMs(b.requestedAt) - toMs(a.requestedAt))[0];
  if (accessionMatch?.id) {
    return { workOrderId: accessionMatch.id, matchedBy: "accession" };
  }

  const [patientResult, workOrderResult] = await Promise.all([
    cookieBasedClient.models.Patient.list(),
    cookieBasedClient.models.WorkOrder.list(),
  ]);
  const matchingPatientIds = new Set(
    (patientResult.data ?? [])
      .filter(
        (patient): patient is NonNullable<typeof patient> =>
          patient != null && typeof patient.id === "string",
      )
      .filter((patient) =>
        toPatientName(patient.firstName, patient.lastName)
          .toLocaleLowerCase("es-CL")
          .includes(normalizedQuery.toLocaleLowerCase("es-CL")),
      )
      .map((patient) => patient.id),
  );
  if (!matchingPatientIds.size) return null;

  const patientWorkOrder = (workOrderResult.data ?? [])
    .filter(
      (workOrder): workOrder is NonNullable<typeof workOrder> =>
        workOrder != null &&
        typeof workOrder.id === "string" &&
        typeof workOrder.patientId === "string" &&
        matchingPatientIds.has(workOrder.patientId),
    )
    .toSorted((a, b) => toMs(b.requestedAt) - toMs(a.requestedAt))[0];
  if (!patientWorkOrder?.id) return null;

  return {
    workOrderId: patientWorkOrder.id,
    matchedBy: "patient",
  };
}

export async function getRecentAuditActivity(
  limit = 10,
): Promise<RecentAuditActivityItem[]> {
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const [auditResult, sampleResult, examResult, workOrderResult, patientResult] =
    await Promise.all([
      cookieBasedClient.models.AuditEvent.list(),
      cookieBasedClient.models.Sample.list(),
      cookieBasedClient.models.Exam.list(),
      cookieBasedClient.models.WorkOrder.list(),
      cookieBasedClient.models.Patient.list(),
    ]);

  const sampleById = new Map(
    (sampleResult.data ?? [])
      .filter(
        (sample): sample is NonNullable<typeof sample> =>
          sample != null &&
          typeof sample.id === "string" &&
          typeof sample.workOrderId === "string",
      )
      .map((sample) => [sample.id, sample]),
  );
  const examById = new Map(
    (examResult.data ?? [])
      .filter(
        (exam): exam is NonNullable<typeof exam> =>
          exam != null &&
          typeof exam.id === "string" &&
          typeof exam.sampleId === "string",
      )
      .map((exam) => [exam.id, exam]),
  );
  const workOrderById = new Map(
    (workOrderResult.data ?? [])
      .filter(
        (workOrder): workOrder is NonNullable<typeof workOrder> =>
          workOrder != null &&
          typeof workOrder.id === "string" &&
          typeof workOrder.patientId === "string",
      )
      .map((workOrder) => [workOrder.id, workOrder]),
  );
  const patientById = new Map(
    (patientResult.data ?? [])
      .filter(
        (patient): patient is NonNullable<typeof patient> =>
          patient != null && typeof patient.id === "string",
      )
      .map((patient) => [patient.id, patient]),
  );

  const events = (auditResult.data ?? [])
    .map((raw) => normalizeAuditEvent(raw))
    .filter((event): event is AuditTimelineEvent => event != null)
    .toSorted((a, b) => toMs(b.timestamp) - toMs(a.timestamp));

  function resolveWorkOrderId(event: AuditTimelineEvent): string | null {
    if (event.entityType === AUDIT_ENTITY_TYPES.WORK_ORDER) {
      return event.entityId;
    }
    if (event.entityType === AUDIT_ENTITY_TYPES.SAMPLE) {
      return sampleById.get(event.entityId)?.workOrderId ?? null;
    }
    if (event.entityType === AUDIT_ENTITY_TYPES.EXAM) {
      const sampleId = examById.get(event.entityId)?.sampleId;
      if (!sampleId) return null;
      return sampleById.get(sampleId)?.workOrderId ?? null;
    }
    return null;
  }

  const groupedByWorkOrder = new Map<string, { lastEventAt: string; eventCount: number }>();
  for (const event of events) {
    const workOrderId = resolveWorkOrderId(event);
    if (!workOrderId) continue;

    const current = groupedByWorkOrder.get(workOrderId);
    if (!current) {
      groupedByWorkOrder.set(workOrderId, { lastEventAt: event.timestamp, eventCount: 1 });
      continue;
    }
    current.eventCount += 1;
  }

  return [...groupedByWorkOrder.entries()]
    .map(([workOrderId, info]) => {
      const workOrder = workOrderById.get(workOrderId);
      if (!workOrder) return null;
      const patient = patientById.get(workOrder.patientId);
      return {
        workOrderId,
        accessionNumber: workOrder.accessionNumber ?? null,
        patientName: toPatientName(patient?.firstName, patient?.lastName),
        lastEventAt: info.lastEventAt,
        eventCount: info.eventCount,
      } satisfies RecentAuditActivityItem;
    })
    .filter((item): item is RecentAuditActivityItem => item != null)
    .toSorted((a, b) => toMs(b.lastEventAt) - toMs(a.lastEventAt))
    .slice(0, safeLimit);
}
