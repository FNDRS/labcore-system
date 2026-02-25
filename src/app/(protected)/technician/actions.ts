"use server";

import { cache } from "react";
import { getCurrentUser } from "aws-amplify/auth/server";
import {
	cookieBasedClient,
	runWithAmplifyServerContext,
} from "@/utils/amplifyServerUtils";
import { requireAuthWithGroup } from "@/lib/auth-server";
import { cookies } from "next/headers";
import {
	computeDashboardMetrics,
	getCompletedTodayCount,
	listTechnicianSamples,
	computeMuestrasSummary,
	getSampleDetail as getSampleDetailFromRepo,
	lookupSampleByBarcode,
} from "@/lib/repositories/technician-repository";
import {
	markSampleCompleted,
	markSampleReceived,
	markSampleInProgress,
	markSampleRejected,
	reprintSampleLabel,
} from "@/lib/services/sample-status-service";
import type {
	DashboardMetrics,
	MuestrasSummary,
	NextSample,
	QueueRow,
	SampleStatus,
	SampleWorkstationDetail,
	SampleWorkstationRow,
} from "./types";

/** Set to true to use mock data (e.g. when backend unavailable). Phase 2b: default real data. */
const MOCK_TECHNICIAN = process.env.NEXT_PUBLIC_MOCK_TECHNICIAN === "true";

async function requireTechnicianAuth() {
	const { user } = await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => requireAuthWithGroup(ctx, "tecnico"),
	});
	return user;
}

const MOCK_WORK_ORDERS = [
	{ id: "wo-1", accessionNumber: "ORD-2024-001", priority: "routine" as const, status: "pending" as const, patientName: "Juan Pérez", sampleCount: 2 },
	{ id: "wo-2", accessionNumber: "ORD-2024-002", priority: "urgent" as const, status: "inprogress" as const, patientName: "María García", sampleCount: 1 },
	{ id: "wo-3", accessionNumber: "ORD-2024-003", priority: "routine" as const, status: "pending" as const, patientName: "Carlos López", sampleCount: 3 },
];

const MOCK_SAMPLES = [
	{ id: "s-1", barcode: "BC-001", status: "received" as const, examTypeName: "Uroanálisis", patientName: "Juan Pérez" },
	{ id: "s-2", barcode: "BC-002", status: "pending" as const, examTypeName: "Hemograma", patientName: "María García" },
	{ id: "s-3", barcode: "BC-003", status: "received" as const, examTypeName: "Uroanálisis", patientName: "Carlos López" },
];

export type {
	SampleStatus,
	SamplePriority,
	SampleWorkstationPriority,
} from "./types";
export type {
	QueueRow,
	NextSample,
	DashboardMetrics,
	SampleWorkstationStatus,
	SampleWorkstationRow,
	SampleWorkstationDetail,
	MuestrasSummary,
} from "./types";


const MOCK_QUEUE: QueueRow[] = [
	{ id: "1", sampleId: "#LC-9024", patientName: "Sarah Jenkins", testType: "Lipid Panel", priority: "Routine", status: "Processing", waitMins: 4, assignedToMe: true },
	{ id: "2", sampleId: "#LC-9022", patientName: "Michael Ross", testType: "Hemoglobin A1C", priority: "Routine", status: "Processing", waitMins: 12, assignedToMe: false },
	{ id: "3", sampleId: "#LC-9023", patientName: "Eleanor Rigby", testType: "Thyroid Panel", priority: "Urgent", status: "Flagged", waitMins: 8, assignedToMe: true },
	{ id: "4", sampleId: "#LC-9025", patientName: "Jessica Hyde", testType: "Urinalysis", priority: "Routine", status: "Complete", waitMins: 0, assignedToMe: false },
];

const MOCK_NEXT_SAMPLE: NextSample = {
	sampleId: "#LC-9024",
	testType: "Lipid Panel",
	patientName: "Sarah Jenkins",
	priority: "Routine",
	waitMins: 4,
};

const MOCK_METRICS: DashboardMetrics = {
	completedToday: 342,
	inProcess: 86,
	errors: 4,
};

export const fetchPendingWorkOrders = cache(async () => {
	if (MOCK_TECHNICIAN) return MOCK_WORK_ORDERS;
	await requireTechnicianAuth();
	const { data: workOrders } = await cookieBasedClient.models.WorkOrder.list({
		filter: { status: { ne: "completed" } },
	});
	const enriched = await Promise.all(
		workOrders.map(async (wo) => {
			const [{ data: patient }, { data: samples }] = await Promise.all([
				cookieBasedClient.models.Patient.get({ id: wo.patientId }),
				cookieBasedClient.models.Sample.list({
					filter: { workOrderId: { eq: wo.id } },
				}),
			]);
			return {
				id: wo.id,
				accessionNumber: wo.accessionNumber ?? "—",
				priority: wo.priority ?? "routine",
				status: wo.status ?? "pending",
				requestedAt: wo.requestedAt,
				patientName: patient
					? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Unknown"
					: "Unknown",
				sampleCount: samples?.length ?? 0,
			};
		}),
	);
	return enriched;
});

export const fetchPendingSamples = cache(async () => {
	if (MOCK_TECHNICIAN) return MOCK_SAMPLES;
	await requireTechnicianAuth();
	const [pending, received] = await Promise.all([
		cookieBasedClient.models.Sample.list({ filter: { status: { eq: "pending" } } }),
		cookieBasedClient.models.Sample.list({ filter: { status: { eq: "received" } } }),
	]);
	const enrich = async (s: {
		id: string;
		workOrderId: string;
		examTypeId: string;
		barcode?: string | null;
		status?: string | null;
	}) => {
		const { data: workOrder } = await cookieBasedClient.models.WorkOrder.get({ id: s.workOrderId });
		const { data: examType } = await cookieBasedClient.models.ExamType.get({ id: s.examTypeId });
		if (!workOrder) return null;
		const { data: patient } = await cookieBasedClient.models.Patient.get({ id: workOrder.patientId });
		return {
			id: s.id,
			barcode: s.barcode ?? "—",
			status: s.status ?? "pending",
			examTypeName: examType?.name ?? "Unknown",
			patientName: patient ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Unknown" : "Unknown",
			accessionNumber: workOrder.accessionNumber ?? "—",
		};
	};
	const all = [...(pending.data ?? []), ...(received.data ?? [])];
	const enriched = await Promise.all(all.map(enrich));
	return enriched.filter((x): x is NonNullable<typeof x> => x !== null);
});

export async function getTechnicianDashboardData() {
	if (MOCK_TECHNICIAN) {
		return { workOrders: MOCK_WORK_ORDERS, samples: MOCK_SAMPLES };
	}
	await requireTechnicianAuth();
	const [workOrders, samples] = await Promise.all([
		fetchPendingWorkOrders(),
		fetchPendingSamples(),
	]);
	return { workOrders, samples };
}

const MOCK_MUESTRAS: SampleWorkstationRow[] = [
	{ id: "1", sampleId: "#LC-9024", patientName: "Sarah Jenkins", testType: "Lipid Panel", sampleType: "Sangre", priority: "Routine", status: "Processing", backendStatus: "inprogress", waitMins: 4, collectedAt: "08:00", notes: null, assignedEquipment: "AN-01", assignedToMe: true },
	{ id: "2", sampleId: "#LC-9022", patientName: "Michael Ross", testType: "Hemoglobin A1C", sampleType: "Sangre", priority: "Routine", status: "Processing", backendStatus: "inprogress", waitMins: 12, collectedAt: "07:45", notes: null, assignedEquipment: null, assignedToMe: false },
	{ id: "3", sampleId: "#LC-9023", patientName: "Eleanor Rigby", testType: "Thyroid Panel", sampleType: "Sangre", priority: "Urgent", status: "Flagged", backendStatus: "rejected", waitMins: 8, collectedAt: "08:15", notes: "Muestra hemolizada", assignedEquipment: null, assignedToMe: true },
	{ id: "4", sampleId: "#LC-9025", patientName: "Jessica Hyde", testType: "Urinalysis", sampleType: "Orina", priority: "Routine", status: "Completed", backendStatus: "completed", waitMins: 0, collectedAt: "07:30", notes: null, assignedEquipment: "AN-02", assignedToMe: false },
	{ id: "5", sampleId: "#LC-9026", patientName: "James Wilson", testType: "Lipid Panel", sampleType: "Sangre", priority: "Routine", status: "Received", backendStatus: "received", waitMins: 2, collectedAt: "08:20", notes: null, assignedEquipment: null, assignedToMe: false },
	{ id: "6", sampleId: "#LC-9027", patientName: "Anna Bell", testType: "CBC", sampleType: "Sangre", priority: "Urgent", status: "Waiting Equipment", backendStatus: "inprogress", waitMins: 15, collectedAt: "08:10", notes: null, assignedEquipment: null, assignedToMe: true },
];

export const fetchMuestrasWorkstation = cache(async () => {
	if (MOCK_TECHNICIAN) {
		const samples = MOCK_MUESTRAS;
		const summary: MuestrasSummary = {
			pending: samples.filter((s) => s.status === "Received").length,
			inProcess: samples.filter((s) => s.status === "Processing" || s.status === "Waiting Equipment").length,
			urgent: samples.filter((s) => s.priority === "Urgent" && s.status !== "Completed").length,
			incidencias: samples.filter((s) => s.status === "Flagged").length,
		};
		return { samples, summary };
	}
	await requireTechnicianAuth();
	const samples = await listTechnicianSamples();
	const summary = await computeMuestrasSummary(samples);
	return { samples, summary };
});

export async function getSampleDetail(
	id: string,
): Promise<SampleWorkstationDetail | null> {
	if (MOCK_TECHNICIAN) {
		const row = MOCK_MUESTRAS.find((s) => s.id === id);
		if (!row) return null;
		return {
			...row,
			history: [
				{ at: "08:24", event: "En proceso" },
				{ at: "08:20", event: "Recibida" },
				{ at: "08:00", event: "Recolección" },
			],
		};
	}
	await requireTechnicianAuth();
	return getSampleDetailFromRepo(id);
}

async function getUserId(): Promise<string> {
	await requireTechnicianAuth();
	const { userId } = await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => getCurrentUser(ctx),
	});
	return userId ?? "unknown";
}

export async function markReceivedAction(
	sampleId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (MOCK_TECHNICIAN) return { ok: true };
	await requireTechnicianAuth();
	const userId = await getUserId();
	return markSampleReceived(sampleId, userId);
}

export async function markInProgressAction(
	sampleId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (MOCK_TECHNICIAN) return { ok: true };
	await requireTechnicianAuth();
	const userId = await getUserId();
	return markSampleInProgress(sampleId, userId);
}

export async function markRejectedAction(
	sampleId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (MOCK_TECHNICIAN) return { ok: true };
	await requireTechnicianAuth();
	const userId = await getUserId();
	return markSampleRejected(sampleId, userId);
}

export async function markCompletedAction(
	sampleId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (MOCK_TECHNICIAN) return { ok: true };
	await requireTechnicianAuth();
	const userId = await getUserId();
	return markSampleCompleted(sampleId, userId);
}

export async function lookupSampleByBarcodeAction(
	code: string,
): Promise<{ ok: true; sample: SampleWorkstationRow } | { ok: false; error: string }> {
	if (MOCK_TECHNICIAN) {
		const mock = MOCK_MUESTRAS.find(
			(s) =>
				s.sampleId.toLowerCase().includes(code.trim().toLowerCase()) ||
				s.id === code.trim(),
		);
		if (mock) return { ok: true, sample: mock };
		return { ok: false, error: "Muestra no encontrada" };
	}
	await requireTechnicianAuth();
	const sample = await lookupSampleByBarcode(code);
	if (sample) return { ok: true, sample };
	return { ok: false, error: "Muestra no encontrada" };
}

export async function reprintLabelAction(
	sampleId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (MOCK_TECHNICIAN) return { ok: true };
	await requireTechnicianAuth();
	const userId = await getUserId();
	return reprintSampleLabel(sampleId, userId);
}

/** Alias for markRejectedAction; sets Sample.status = "rejected" and audits SPECIMEN_REJECTED. */
export async function reportProblemAction(
	sampleId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	return markRejectedAction(sampleId);
}

export async function fetchMuestrasAction(): Promise<{
	samples: SampleWorkstationRow[];
	summary: MuestrasSummary;
}> {
	if (MOCK_TECHNICIAN) {
		const { samples, summary } = await fetchMuestrasWorkstation();
		return { samples, summary };
	}
	await requireTechnicianAuth();
	const samples = await listTechnicianSamples();
	const summary = await computeMuestrasSummary(samples);
	return { samples, summary };
}

export const fetchOperativeDashboard = cache(async () => {
	if (MOCK_TECHNICIAN) {
		const queue = MOCK_QUEUE;
		const nextSample = MOCK_NEXT_SAMPLE;
		const urgentCount = queue.filter((r) => r.priority === "Urgent" && r.status !== "Complete").length;
		const lastScanned = queue[0]
			? { sampleId: queue[0].sampleId, status: queue[0].status }
			: null;
		return {
			nextSample,
			urgentCount,
			queueRows: queue,
			metrics: MOCK_METRICS,
			lastScanned,
		};
	}
	await requireTechnicianAuth();
	const [samples, completedToday] = await Promise.all([
		listTechnicianSamples(),
		getCompletedTodayCount(),
	]);
	const metrics = await computeDashboardMetrics(samples, completedToday);
	const queueRows: QueueRow[] = samples.map((s) => ({
		id: s.id,
		sampleId: s.sampleId,
		patientName: s.patientName,
		testType: s.testType,
		priority: s.priority,
		status: (s.status === "Completed" ? "Complete" : s.status === "Flagged" ? "Flagged" : "Processing") as SampleStatus,
		waitMins: s.waitMins,
		assignedToMe: s.assignedToMe,
	}));
	const next = queueRows[0]
		? {
			sampleId: queueRows[0].sampleId,
			testType: queueRows[0].testType,
			patientName: queueRows[0].patientName,
			priority: queueRows[0].priority,
			waitMins: queueRows[0].waitMins,
		}
		: null;
	const lastScanned = queueRows[0]
		? { sampleId: queueRows[0].sampleId, status: queueRows[0].status }
		: null;
	const urgentCount = samples.filter((s) => s.priority === "Urgent" && s.status !== "Completed").length;
	return {
		nextSample: next,
		urgentCount,
		queueRows,
		metrics,
		lastScanned,
	};
});
