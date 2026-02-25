"use server";

import { cookieBasedClient } from "@/utils/amplifyServerUtils";
import type {
	Priority,
	QuickFilter,
	ReceptionOrder,
	ReceptionStatus,
} from "@/app/(protected)/recepcion/types";

/** Compute reception status from samples. */
function deriveReceptionStatus(
	hasSamples: boolean,
	sampleStatuses: string[],
): ReceptionStatus {
	if (!hasSamples || sampleStatuses.length === 0) return "Sin muestras";
	const anyReady = sampleStatuses.some(
		(s) => s === "ready_for_lab" || s === "received" || s === "inprogress" || s === "completed",
	);
	if (anyReady) return "Procesando";
	return "Muestras creadas";
}

/** Compute age from dateOfBirth (YYYY-MM-DD). */
function ageFromDateOfBirth(dob: string | null | undefined): number {
	if (!dob) return 0;
	const birth = new Date(dob);
	const today = new Date();
	let age = today.getFullYear() - birth.getFullYear();
	const monthDiff = today.getMonth() - birth.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
	return age;
}

/** Map schema priority to UI. */
function toUIPriority(p: string | null | undefined): Priority {
	if (p === "urgent" || p === "stat") return "Urgente";
	return "Rutina";
}

export type ReceptionListFilters = {
	quickFilter?: QuickFilter;
	search?: string;
};

/** List work orders as ReceptionOrder DTOs with filters. */
export async function listReceptionOrders(
	filters: ReceptionListFilters = {},
): Promise<ReceptionOrder[]> {
	const { quickFilter = "Todas", search = "" } = filters;

	const [{ data: workOrders }, { data: examTypes }] = await Promise.all([
		cookieBasedClient.models.WorkOrder.list({
			filter: { status: { ne: "completed" } },
		}),
		cookieBasedClient.models.ExamType.list(),
	]);

	const examTypeByName = new Map(examTypes?.map((e) => [e.code, e.name]) ?? []);

	const enriched: ReceptionOrder[] = [];

	for (const wo of workOrders ?? []) {
		if (!wo.id || !wo.patientId) continue;
		const [{ data: patient }, { data: samples }] = await Promise.all([
			cookieBasedClient.models.Patient.get({ id: wo.patientId }),
			cookieBasedClient.models.Sample.list({
				filter: { workOrderId: { eq: wo.id } },
			}),
		]);

		const patientName = patient
			? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Desconocido"
			: "Desconocido";

		const requestedCodes = (wo.requestedExamTypeCodes ?? []).filter(
			(c): c is string => c != null,
		);
		const testNames = requestedCodes.map(
			(code) => examTypeByName.get(code) ?? code,
		);

		const createdAt = wo.requestedAt ?? new Date().toISOString();
		const sampleStatuses = (samples?.map((s) => s.status).filter(Boolean) ?? []) as string[];
		const status = deriveReceptionStatus((samples?.length ?? 0) > 0, sampleStatuses);

		const displayId = wo.accessionNumber ?? `#${wo.id.slice(0, 8)}`;

		const order: ReceptionOrder = {
			id: wo.id,
			displayId,
			patientName,
			patientAge: ageFromDateOfBirth(patient?.dateOfBirth),
			doctor: wo.referringDoctor ?? "—",
			tests: testNames,
			priority: toUIPriority(wo.priority),
			status,
			notes: wo.notes ?? "",
			createdAt,
		};

		// Apply quick filter
		if (quickFilter === "Hoy") {
			const d = new Date(createdAt);
			const now = new Date();
			if (
				d.getDate() !== now.getDate() ||
				d.getMonth() !== now.getMonth() ||
				d.getFullYear() !== now.getFullYear()
			)
				continue;
		}
		if (quickFilter === "Urgentes" && order.priority !== "Urgente") continue;
		if (quickFilter === "Sin muestras" && order.status !== "Sin muestras") continue;
		if (quickFilter === "Listas" && order.status !== "Muestras creadas") continue;

		// Apply search
		const q = search.trim().toLowerCase();
		if (q) {
			const match =
				order.patientName.toLowerCase().includes(q) ||
				order.displayId.toLowerCase().includes(q) ||
				order.tests.some((t) => t.toLowerCase().includes(q));
			if (!match) continue;
		}

		enriched.push(order);
	}

	// Sort: Sin muestras + urgent first, then Sin muestras, then Muestras creadas, then Procesando
	function sortRank(o: ReceptionOrder): number {
		if (o.status === "Sin muestras" && o.priority === "Urgente") return 0;
		if (o.status === "Sin muestras") return 1;
		if (o.status === "Muestras creadas") return 2;
		return 3;
	}

	return enriched.toSorted((a, b) => {
		const ra = sortRank(a);
		const rb = sortRank(b);
		if (ra !== rb) return ra - rb;
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});
}

/** Lookup order by scanned code (accession or id). */
export async function lookupOrderByCode(
	code: string,
): Promise<ReceptionOrder | null> {
	const raw = code.trim();
	if (!raw) return null;
	const normalized = raw.startsWith("#") ? raw.slice(1) : raw;

	const { data: workOrders } = await cookieBasedClient.models.WorkOrder.list({
		filter: { status: { ne: "completed" } },
	});
	const wo = workOrders?.find(
		(w) =>
			w.accessionNumber === normalized ||
			w.accessionNumber === raw ||
			w.id === normalized,
	);
	if (!wo || !wo.id || !wo.patientId) return null;

	const [{ data: patient }, { data: samples }] = await Promise.all([
		cookieBasedClient.models.Patient.get({ id: wo.patientId }),
		cookieBasedClient.models.Sample.list({
			filter: { workOrderId: { eq: wo.id } },
		}),
	]);

	const examTypes = await cookieBasedClient.models.ExamType.list();
	const examTypeByName = new Map(examTypes.data?.map((e) => [e.code, e.name]) ?? []);

	const requestedCodes = (wo.requestedExamTypeCodes ?? []).filter(
		(c): c is string => c != null,
	);
	const testNames = requestedCodes.map(
		(c) => examTypeByName.get(c) ?? c,
	);

	const sampleStatuses = (samples?.map((s) => s.status).filter(Boolean) ?? []) as string[];
	const status = deriveReceptionStatus((samples?.length ?? 0) > 0, sampleStatuses);

	return {
		id: wo.id,
		displayId: wo.accessionNumber ?? `#${wo.id.slice(0, 8)}`,
		patientName: patient
			? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Desconocido"
			: "Desconocido",
		patientAge: ageFromDateOfBirth(patient?.dateOfBirth),
		doctor: wo.referringDoctor ?? "—",
		tests: testNames,
		priority: toUIPriority(wo.priority),
		status,
		notes: wo.notes ?? "",
		createdAt: wo.requestedAt ?? new Date().toISOString(),
	};
}
