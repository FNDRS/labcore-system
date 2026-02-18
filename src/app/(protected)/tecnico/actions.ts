"use server";

import { getCurrentUser } from "aws-amplify/auth/server";
import { cache } from "react";
import {
	cookieBasedClient,
	runWithAmplifyServerContext,
} from "@/utils/amplifyServerUtils";
import { cookies } from "next/headers";

/** Verify auth and throw if unauthenticated. Per server-auth-actions. */
async function requireAuth() {
	const user = await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (ctx) => getCurrentUser(ctx),
	});
	console.log("[tecnico:requireAuth] user:", user ? { username: user.username } : null);
	if (!user) throw new Error("Unauthorized");
	return user;
}

/** Cached per-request: list pending work orders with patient. */
export const fetchPendingWorkOrders = cache(async () => {
	await requireAuth();

	const { data: workOrders, errors: woErrors } = await cookieBasedClient.models.WorkOrder.list({
		filter: { status: { ne: "completed" } },
	});
	console.log("[tecnico:fetchPendingWorkOrders] raw workOrders:", workOrders);
	console.log("[tecnico:fetchPendingWorkOrders] workOrder errors:", woErrors);

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

	console.log("[tecnico:fetchPendingWorkOrders] enriched:", enriched);
	return enriched;
});

/** Cached per-request: list pending/received samples for queue. */
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
	console.log("[tecnico:fetchPendingSamples] raw pending:", pending.data);
	console.log("[tecnico:fetchPendingSamples] raw received:", received.data);
	console.log("[tecnico:fetchPendingSamples] pending errors:", pending.errors);
	console.log("[tecnico:fetchPendingSamples] received errors:", received.errors);

	const enrich = async (
		s: { id: string; workOrderId: string; examTypeId: string; barcode?: string | null; status?: string | null },
	) => {
		const [workOrderRes, examTypeRes] = await Promise.all([
			cookieBasedClient.models.WorkOrder.get({ id: s.workOrderId }),
			cookieBasedClient.models.ExamType.get({ id: s.examTypeId }),
		]);
		const wo = workOrderRes.data;
		const et = examTypeRes.data;
		if (!wo) return null;
		const { data: patient } = await cookieBasedClient.models.Patient.get({
			id: wo.patientId,
		});
		return {
			id: s.id,
			barcode: s.barcode ?? "—",
			status: s.status ?? "pending",
			examTypeName: et?.name ?? "Unknown",
			patientName: patient
				? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
					"Unknown"
				: "Unknown",
			accessionNumber: wo.accessionNumber ?? "—",
		};
	};

	const all = [...(pending.data ?? []), ...(received.data ?? [])];
	const enriched = await Promise.all(all.map(enrich));
	const filtered = enriched.filter((x): x is NonNullable<typeof x> => x !== null);

	console.log("[tecnico:fetchPendingSamples] enriched:", filtered);
	return filtered;
});

/** Server action: fetch dashboard data (for client-triggered refetch). */
export async function getTecnicoDashboardData() {
	await requireAuth();

	const [workOrders, samples] = await Promise.all([
		fetchPendingWorkOrders(),
		fetchPendingSamples(),
	]);

	console.log("[tecnico:getTecnicoDashboardData] result:", { workOrders, samples });
	return { workOrders, samples };
}
