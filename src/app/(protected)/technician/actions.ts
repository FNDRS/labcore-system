"use server";

import { cache } from "react";
import {
	cookieBasedClient,
	runWithAmplifyServerContext,
} from "@/utils/amplifyServerUtils";
import { requireAuthWithGroup } from "@/lib/auth-server";
import { cookies } from "next/headers";

const MOCK_TECHNICIAN = true;

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

export type SampleStatus = "Complete" | "Processing" | "Flagged";
export type SamplePriority = "Routine" | "Urgent";

export interface QueueRow {
	id: string;
	sampleId: string;
	patientName: string;
	testType: string;
	priority: SamplePriority;
	status: SampleStatus;
	waitMins: number;
}

export interface NextSample {
	sampleId: string;
	testType: string;
	patientName: string;
	priority: SamplePriority;
	waitMins: number;
}

export interface DashboardMetrics {
	completedToday: number;
	inProcess: number;
	errors: number;
}

const MOCK_QUEUE: QueueRow[] = [
	{ id: "1", sampleId: "#LC-9024", patientName: "Sarah Jenkins", testType: "Lipid Panel", priority: "Routine", status: "Processing", waitMins: 4 },
	{ id: "2", sampleId: "#LC-9022", patientName: "Michael Ross", testType: "Hemoglobin A1C", priority: "Routine", status: "Processing", waitMins: 12 },
	{ id: "3", sampleId: "#LC-9023", patientName: "Eleanor Rigby", testType: "Thyroid Panel", priority: "Urgent", status: "Flagged", waitMins: 8 },
	{ id: "4", sampleId: "#LC-9025", patientName: "Jessica Hyde", testType: "Urinalysis", priority: "Routine", status: "Complete", waitMins: 0 },
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

/** Data for the operative dashboard: next sample, urgent count, queue table, metrics, last scanned. */
/** Estados únicos para pantalla Muestras (estación de trabajo). */
export type SampleWorkstationStatus =
	| "Received"
	| "Processing"
	| "Waiting Equipment"
	| "Completed"
	| "Flagged";

export type SampleWorkstationPriority = "Routine" | "Urgent";

export interface SampleWorkstationRow {
	id: string;
	sampleId: string;
	patientName: string;
	testType: string;
	sampleType: string;
	priority: SampleWorkstationPriority;
	status: SampleWorkstationStatus;
	waitMins: number;
	collectedAt: string | null;
	notes: string | null;
	assignedEquipment: string | null;
	assignedToMe: boolean;
}

export interface SampleWorkstationDetail extends SampleWorkstationRow {
	history: { at: string; event: string }[];
}

export interface MuestrasSummary {
	pending: number;
	inProcess: number;
	urgent: number;
	incidencias: number;
}

const MOCK_MUESTRAS: SampleWorkstationRow[] = [
	{ id: "1", sampleId: "#LC-9024", patientName: "Sarah Jenkins", testType: "Lipid Panel", sampleType: "Sangre", priority: "Routine", status: "Processing", waitMins: 4, collectedAt: "08:00", notes: null, assignedEquipment: "AN-01", assignedToMe: true },
	{ id: "2", sampleId: "#LC-9022", patientName: "Michael Ross", testType: "Hemoglobin A1C", sampleType: "Sangre", priority: "Routine", status: "Processing", waitMins: 12, collectedAt: "07:45", notes: null, assignedEquipment: null, assignedToMe: false },
	{ id: "3", sampleId: "#LC-9023", patientName: "Eleanor Rigby", testType: "Thyroid Panel", sampleType: "Sangre", priority: "Urgent", status: "Flagged", waitMins: 8, collectedAt: "08:15", notes: "Muestra hemolizada", assignedEquipment: null, assignedToMe: true },
	{ id: "4", sampleId: "#LC-9025", patientName: "Jessica Hyde", testType: "Urinalysis", sampleType: "Orina", priority: "Routine", status: "Completed", waitMins: 0, collectedAt: "07:30", notes: null, assignedEquipment: "AN-02", assignedToMe: false },
	{ id: "5", sampleId: "#LC-9026", patientName: "James Wilson", testType: "Lipid Panel", sampleType: "Sangre", priority: "Routine", status: "Received", waitMins: 2, collectedAt: "08:20", notes: null, assignedEquipment: null, assignedToMe: false },
	{ id: "6", sampleId: "#LC-9027", patientName: "Anna Bell", testType: "CBC", sampleType: "Sangre", priority: "Urgent", status: "Waiting Equipment", waitMins: 15, collectedAt: "08:10", notes: null, assignedEquipment: null, assignedToMe: true },
];

export const fetchMuestrasWorkstation = cache(async () => {
	// TODO: cuando MOCK_TECHNICIAN sea false, cargar desde API
	const samples = MOCK_MUESTRAS;
	const summary: MuestrasSummary = {
		pending: samples.filter((s) => s.status === "Received").length,
		inProcess: samples.filter((s) => s.status === "Processing" || s.status === "Waiting Equipment").length,
		urgent: samples.filter((s) => s.priority === "Urgent" && s.status !== "Completed").length,
		incidencias: samples.filter((s) => s.status === "Flagged").length,
	};
	return { samples, summary };
});

export async function getSampleDetail(id: string): Promise<SampleWorkstationDetail | null> {
	// TODO: API
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
	const samples = await fetchPendingSamples();
	const workOrders = await fetchPendingWorkOrders();
	const queueRows: QueueRow[] = samples.slice(0, 10).map((s, i) => ({
		id: s.id,
		sampleId: s.barcode,
		patientName: s.patientName,
		testType: s.examTypeName,
		priority: "Routine" as SamplePriority,
		status: (s.status === "received" ? "Processing" : "Processing") as SampleStatus,
		waitMins: i * 2,
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
	return {
		nextSample: next,
		urgentCount: workOrders.filter((wo) => wo.priority === "urgent").length,
		queueRows,
		metrics: { completedToday: 0, inProcess: queueRows.length, errors: 0 },
		lastScanned,
	};
});
