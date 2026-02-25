"use server";

import { cookieBasedClient } from "@/utils/amplifyServerUtils";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  SAMPLE_STATUS_TO_WORKSTATION,
  SAMPLE_TYPE_TO_DISPLAY,
} from "@/lib/contracts";
import type { SampleStatus as BackendSampleStatus } from "@/lib/contracts";
import type {
  DashboardMetrics,
  MuestrasSummary,
  SampleWorkstationDetail,
  SampleWorkstationRow,
} from "@/app/(protected)/technician/types";

/** Technician-relevant sample statuses (post-reception). */
const TECHNICIAN_SAMPLE_STATUSES = [
  "ready_for_lab",
  "received",
  "inprogress",
  "completed",
  "rejected",
] as const;

/** Compute wait time in minutes from a reference datetime to now. */
function waitMinsFrom(receivedAt: string | null | undefined): number {
  if (!receivedAt) return 0;
  const then = new Date(receivedAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 60_000));
}

/** Map schema priority to workstation UI. */
function toWorkstationPriority(
  p: string | null | undefined,
): "Routine" | "Urgent" {
  if (p === "urgent" || p === "stat") return "Urgent";
  return "Routine";
}

/** Map schema Sample.status to SampleWorkstationStatus. */
function toWorkstationStatus(
  s: string | null | undefined,
): SampleWorkstationRow["status"] {
  if (!s) return "Awaiting Receipt";
  return (SAMPLE_STATUS_TO_WORKSTATION[s as keyof typeof SAMPLE_STATUS_TO_WORKSTATION] ??
    "Awaiting Receipt") as SampleWorkstationRow["status"];
}

function toBackendSampleStatus(
  s: string | null | undefined,
): BackendSampleStatus {
  if (!s) return "ready_for_lab";
  if (s === "pending" || s === "labeled") return "ready_for_lab";
  return s as BackendSampleStatus;
}

/** Map ExamType.sampleType to Spanish display. */
function toSampleTypeDisplay(s: string | null | undefined): string {
  if (!s) return "Otro";
  return SAMPLE_TYPE_TO_DISPLAY[s] ?? s;
}

/**
 * Count samples completed today via AuditEvent (SPECIMEN_COMPLETED).
 * Falls back to 0 if query fails (e.g. before Phase 2c writes audits).
 */
export async function getCompletedTodayCount(): Promise<number> {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString();

  try {
    const { data: events } = await cookieBasedClient.models.AuditEvent.list({
      filter: {
        and: [
          { action: { eq: AUDIT_ACTIONS.SPECIMEN_COMPLETED } },
          { entityType: { eq: AUDIT_ENTITY_TYPES.SAMPLE } },
          { timestamp: { ge: startOfToday } },
          { timestamp: { le: endOfToday } },
        ],
      },
    });
    return events?.length ?? 0;
  } catch {
    return 0;
  }
}

/** Compute dashboard metrics from samples. Optionally override completedToday from AuditEvent. */
export async function computeDashboardMetrics(
  samples: SampleWorkstationRow[],
  completedTodayOverride?: number,
): Promise<DashboardMetrics> {
  const completedToday =
    completedTodayOverride ??
    samples.filter((s) => s.status === "Completed").length;

  const inProcess = samples.filter(
    (s) =>
      s.status === "Processing" ||
      s.status === "Awaiting Receipt" ||
      s.status === "Received" ||
      s.status === "Waiting Equipment",
  ).length;

  const errors = samples.filter((s) => s.status === "Flagged").length;

  return {
    completedToday,
    inProcess,
    errors,
  };
}

/** Compute muestras summary from samples. */
export async function computeMuestrasSummary(
  samples: SampleWorkstationRow[],
): Promise<MuestrasSummary> {
  return {
    pending: samples.filter(
      (s) => s.status === "Awaiting Receipt" || s.status === "Received",
    ).length,
    inProcess: samples.filter(
      (s) =>
        s.status === "Processing" || s.status === "Waiting Equipment",
    ).length,
    urgent: samples.filter(
      (s) => s.priority === "Urgent" && s.status !== "Completed",
    ).length,
    incidencias: samples.filter((s) => s.status === "Flagged").length,
  };
}

/** Get technician dashboard metrics. Pure derivation from samples. */
export async function getTechnicianDashboardMetrics(
  samples: SampleWorkstationRow[],
): Promise<DashboardMetrics> {
  return computeDashboardMetrics(samples);
}

/**
 * List samples relevant to technician workflow (ready_for_lab through rejected).
 * Returns enriched SampleWorkstationRow[] for dashboard and muestras.
 */
export async function listTechnicianSamples(): Promise<
  SampleWorkstationRow[]
> {
  const { data: samples } = await cookieBasedClient.models.Sample.list({
    filter: {
      or: TECHNICIAN_SAMPLE_STATUSES.map((status) => ({
        status: { eq: status },
      })),
    },
  });

  if (!samples?.length) return [];

  // Batch-fetch WorkOrders, Patients, ExamTypes (avoid N+1)
  const woIds = [...new Set(samples.map((s) => s.workOrderId).filter(Boolean))];
  const examTypeIds = [
    ...new Set(samples.map((s) => s.examTypeId).filter(Boolean)),
  ];

  const [workOrderResults, examTypeResults] = await Promise.all([
    Promise.all(
      woIds.map((id) =>
        cookieBasedClient.models.WorkOrder.get({ id: id as string }),
      ),
    ),
    Promise.all(
      examTypeIds.map((id) =>
        cookieBasedClient.models.ExamType.get({ id: id as string }),
      ),
    ),
  ]);

  const workOrders = new Map(
    workOrderResults
      .map((r) => r.data)
      .filter((wo): wo is NonNullable<typeof wo> => wo != null && wo.id != null)
      .map((wo) => [wo.id, wo]),
  );
  const examTypes = new Map(
    examTypeResults
      .map((r) => r.data)
      .filter((e): e is NonNullable<typeof e> => e != null && e.id != null)
      .map((e) => [e.id, e]),
  );

  // Fetch patients for work orders
  const patientIds = [...new Set(workOrders.values())]
    .map((wo) => wo.patientId)
    .filter(Boolean);
  const patientResults = await Promise.all(
    patientIds.map((id) =>
      cookieBasedClient.models.Patient.get({ id: id as string }),
    ),
  );
  const patients = new Map(
    patientResults
      .map((r) => r.data)
      .filter((p): p is NonNullable<typeof p> => p != null && p.id != null)
      .map((p) => [p.id, p]),
  );

  const rows: SampleWorkstationRow[] = [];

  for (const s of samples) {
    if (!s.id || !s.workOrderId || !s.examTypeId) continue;

    const workOrder = workOrders.get(s.workOrderId);
    const examType = examTypes.get(s.examTypeId);
    if (!workOrder || !examType) continue;

    const patient = workOrder.patientId
      ? patients.get(workOrder.patientId)
      : null;
    const patientName = patient
      ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
      "Desconocido"
      : "Desconocido";

    const receivedAt = s.receivedAt ?? s.collectedAt;
    const waitMins = waitMinsFrom(receivedAt);
    const collectedAt = s.collectedAt
      ? new Date(s.collectedAt).toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      })
      : null;

    rows.push({
      id: s.id,
      sampleId: s.barcode ?? `#${s.id.slice(0, 8)}`,
      patientName,
      testType: examType.name ?? "Desconocido",
      sampleType: toSampleTypeDisplay(examType.sampleType),
      priority: toWorkstationPriority(workOrder.priority),
      status: toWorkstationStatus(s.status),
      backendStatus: toBackendSampleStatus(s.status),
      waitMins,
      collectedAt,
      notes: null,
      assignedEquipment: null,
      assignedToMe: false,
    });
  }

  // Sort: urgent first, then by wait time (oldest first), then by status
  return rows.toSorted((a, b) => {
    if (a.priority === "Urgent" && b.priority !== "Urgent") return -1;
    if (a.priority !== "Urgent" && b.priority === "Urgent") return 1;
    if (a.waitMins !== b.waitMins) return b.waitMins - a.waitMins;
    const statusOrder: Record<string, number> = {
      "Awaiting Receipt": 0,
      Received: 1,
      Processing: 2,
      "Waiting Equipment": 3,
      Completed: 4,
      Flagged: 5,
    };
    return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
  });
}

/**
 * Lookup sample by barcode or ID. Returns SampleWorkstationRow for scan flows.
 * Tries get-by-id first, then list-by-barcode.
 */
export async function lookupSampleByBarcode(
	code: string,
): Promise<SampleWorkstationRow | null> {
	const trimmed = code.trim();
	if (!trimmed) return null;

	// Try get by id (UUID or other id format)
	const { data: byId } = await cookieBasedClient.models.Sample.get({
		id: trimmed,
	});
	if (byId?.id) {
		const detail = await getSampleDetail(byId.id);
		return detail;
	}

	// Try list by barcode (exact match)
	const { data: byBarcode } = await cookieBasedClient.models.Sample.list({
		filter: { barcode: { eq: trimmed } },
	});
	const first = byBarcode?.[0];
	if (!first?.id) return null;

	const detail = await getSampleDetail(first.id);
	return detail;
}

/** Map audit action to Spanish display label. */
const AUDIT_ACTION_LABELS: Record<string, string> = {
	[AUDIT_ACTIONS.SPECIMENS_GENERATED]: "Muestras creadas",
	[AUDIT_ACTIONS.LABEL_PRINTED]: "Etiqueta impresa",
	[AUDIT_ACTIONS.LABEL_REPRINTED]: "Etiqueta reimpresa",
	[AUDIT_ACTIONS.ORDER_READY_FOR_LAB]: "Lista para lab",
	[AUDIT_ACTIONS.EXAM_STARTED]: "Examen iniciado",
	[AUDIT_ACTIONS.EXAM_RESULTS_SAVED]: "Resultados guardados",
	[AUDIT_ACTIONS.EXAM_SENT_TO_VALIDATION]: "Enviado a validacion",
	[AUDIT_ACTIONS.EXAM_APPROVED]: "Examen aprobado",
	[AUDIT_ACTIONS.EXAM_REJECTED]: "Examen rechazado",
	[AUDIT_ACTIONS.SPECIMEN_RECEIVED]: "Recibida",
	[AUDIT_ACTIONS.SPECIMEN_IN_PROGRESS]: "En proceso",
	[AUDIT_ACTIONS.SPECIMEN_COMPLETED]: "Completada",
	[AUDIT_ACTIONS.SPECIMEN_REJECTED]: "Rechazada",
};

/**
 * Get sample detail with AuditEvent history for the detail sheet.
 */
export async function getSampleDetail(
	sampleId: string,
): Promise<SampleWorkstationDetail | null> {
	const { data: sample } = await cookieBasedClient.models.Sample.get({
		id: sampleId,
	});
	if (!sample?.id || !sample.workOrderId || !sample.examTypeId) return null;

	const [workOrderResult, examTypeResult, auditResult, examListResult] = await Promise.all([
		cookieBasedClient.models.WorkOrder.get({ id: sample.workOrderId }),
		cookieBasedClient.models.ExamType.get({ id: sample.examTypeId }),
		cookieBasedClient.models.AuditEvent.list({
			filter: {
				and: [
					{ entityType: { eq: AUDIT_ENTITY_TYPES.SAMPLE } },
					{ entityId: { eq: sampleId } },
				],
			},
		}),
		cookieBasedClient.models.Exam.list({
			filter: { sampleId: { eq: sampleId } },
		}),
	]);

	const workOrder = workOrderResult.data;
	const examType = examTypeResult.data;
	if (!workOrder || !examType) return null;
	const examIds = (examListResult.data ?? [])
		.map((exam) => exam.id)
		.filter((id): id is string => id != null);
	const [workOrderAuditResult, examAuditResults] = await Promise.all([
		cookieBasedClient.models.AuditEvent.list({
			filter: {
				and: [
					{ entityType: { eq: AUDIT_ENTITY_TYPES.WORK_ORDER } },
					{ entityId: { eq: workOrder.id } },
				],
			},
		}),
		Promise.all(
			examIds.map((examId) =>
				cookieBasedClient.models.AuditEvent.list({
					filter: {
						and: [
							{ entityType: { eq: AUDIT_ENTITY_TYPES.EXAM } },
							{ entityId: { eq: examId } },
						],
					},
				}),
			),
		),
	]);
	const patient = workOrder.patientId
		? (
				await cookieBasedClient.models.Patient.get({
					id: workOrder.patientId,
				})
			).data
		: null;
	const patientName = patient
		? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
			"Desconocido"
		: "Desconocido";

	const receivedAt = sample.receivedAt ?? sample.collectedAt;
	const waitMins = waitMinsFrom(receivedAt);
	const collectedAt = sample.collectedAt
		? new Date(sample.collectedAt).toLocaleTimeString("es-CL", {
				hour: "2-digit",
				minute: "2-digit",
			})
		: null;

	// Merge sample + work order + exam events, then sort newest first.
	const combinedAudits = [
		...(auditResult.data ?? []),
		...(workOrderAuditResult.data ?? []),
		...examAuditResults.flatMap((result) => result.data ?? []),
	];
	const sortedAudits = combinedAudits.filter(
		(e): e is NonNullable<typeof e> & { timestamp: string } =>
			e != null && e.timestamp != null,
	);
	sortedAudits.sort(
		(a, b) =>
			new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	);
	const history = sortedAudits.map((e) => ({
		at: new Date(e.timestamp).toLocaleTimeString("es-CL", {
			hour: "2-digit",
			minute: "2-digit",
		}),
		event: AUDIT_ACTION_LABELS[e.action ?? ""] ?? e.action ?? "—",
	}));

	const row: SampleWorkstationDetail = {
		id: sample.id,
		sampleId: sample.barcode ?? `#${sample.id.slice(0, 8)}`,
		patientName,
		testType: examType.name ?? "Desconocido",
		sampleType: toSampleTypeDisplay(examType.sampleType),
		priority: toWorkstationPriority(workOrder.priority),
		status: toWorkstationStatus(sample.status),
		backendStatus: toBackendSampleStatus(sample.status),
		waitMins,
		collectedAt,
		notes: null,
		assignedEquipment: null,
		assignedToMe: false,
		history,
	};
	return row;
}
