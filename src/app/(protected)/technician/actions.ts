"use server";

import { getCurrentUser } from "aws-amplify/auth/server";
import { cache } from "react";
import {
	cookieBasedClient,
	runWithAmplifyServerContext,
} from "@/utils/amplifyServerUtils";
import { cookies } from "next/headers";

const MOCK_TECHNICIAN = true;

async function requireAuth() {
	const user = await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => getCurrentUser(ctx),
	});
	console.log(
		"[technician:requireAuth] user:",
		user ? { username: user.username } : null,
	);
	if (!user) throw new Error("Unauthorized");
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

export const fetchPendingWorkOrders = cache(async () => {
	if (MOCK_TECHNICIAN) return MOCK_WORK_ORDERS;
	await requireAuth();
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
	await requireAuth();
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
	await requireAuth();
	const [workOrders, samples] = await Promise.all([
		fetchPendingWorkOrders(),
		fetchPendingSamples(),
	]);
	return { workOrders, samples };
}
