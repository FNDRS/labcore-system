"use server";

import { getCurrentUser } from "aws-amplify/auth/server";
import { cache } from "react";
import {
	cookieBasedClient,
	runWithAmplifyServerContext,
} from "@/utils/amplifyServerUtils";
import { cookies } from "next/headers";

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

export const fetchPendingWorkOrders = cache(async () => {
	await requireAuth();

	const { data: workOrders, errors: woErrors } =
		await cookieBasedClient.models.WorkOrder.list({
			filter: { status: { ne: "completed" } },
		});
	console.log("[technician:fetchPendingWorkOrders] raw workOrders:", workOrders);
	console.log("[technician:fetchPendingWorkOrders] workOrder errors:", woErrors);

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
					? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
						"Unknown"
					: "Unknown",
				sampleCount: samples?.length ?? 0,
			};
		}),
	);

	console.log("[technician:fetchPendingWorkOrders] enriched:", enriched);
	return enriched;
});

export const fetchPendingSamples = cache(async () => {
	await requireAuth();

	const [pending, received] = await Promise.all([
		cookieBasedClient.models.Sample.list({
			filter: { status: { eq: "pending" } },
		}),
		cookieBasedClient.models.Sample.list({
			filter: { status: { eq: "received" } },
		}),
	]);
	console.log("[technician:fetchPendingSamples] raw pending:", pending.data);
	console.log("[technician:fetchPendingSamples] raw received:", received.data);
	console.log(
		"[technician:fetchPendingSamples] pending errors:",
		pending.errors,
	);
	console.log(
		"[technician:fetchPendingSamples] received errors:",
		received.errors,
	);

	const enrich = async (s: {
		id: string;
		workOrderId: string;
		examTypeId: string;
		barcode?: string | null;
		status?: string | null;
	}) => {
		const [workOrderRes, examTypeRes] = await Promise.all([
			cookieBasedClient.models.WorkOrder.get({ id: s.workOrderId }),
			cookieBasedClient.models.ExamType.get({ id: s.examTypeId }),
		]);

		const { data: workOrder, errors: woErrors } = workOrderRes;
		const { data: examType, errors: etErrors } = examTypeRes;

		console.log("[technician:fetchPendingSamples] wo:", workOrder);
		console.log("[technician:fetchPendingSamples] et:", examType);
		console.log("[technician:fetchPendingSamples] woErrors:", woErrors);
		console.log("[technician:fetchPendingSamples] etErrors:", etErrors);
		if (!workOrder) return null;
		const { data: patient } = await cookieBasedClient.models.Patient.get({
			id: workOrder.patientId,
		});
		return {
			id: s.id,
			barcode: s.barcode ?? "—",
			status: s.status ?? "pending",
			examTypeName: examType?.name ?? "Unknown",
			patientName: patient
				? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
					"Unknown"
				: "Unknown",
			accessionNumber: workOrder.accessionNumber ?? "—",
		};
	};

	const all = [...(pending.data ?? []), ...(received.data ?? [])];
	const enriched = await Promise.all(all.map(enrich));
	const filtered = enriched.filter(
		(x): x is NonNullable<typeof x> => x !== null,
	);

	console.log("[technician:fetchPendingSamples] enriched:", filtered);
	return filtered;
});

export async function getTechnicianDashboardData() {
	await requireAuth();

	const [workOrders, samples] = await Promise.all([
		fetchPendingWorkOrders(),
		fetchPendingSamples(),
	]);

	console.log("[technician:getTechnicianDashboardData] result:", {
		workOrders,
		samples,
	});
	return { workOrders, samples };
}
