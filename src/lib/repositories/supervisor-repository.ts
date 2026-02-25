"use server";

import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/contracts";
import { parseFieldSchema } from "@/lib/process/field-schema-types";
import type { FieldSchema } from "@/lib/process/field-schema-types";
import type {
	SupervisorDashboardStats,
	ValidationClinicalFlag,
	ValidationDetail,
	ValidationQueueFilters,
	ValidationQueueItem,
} from "@/lib/types/validation-types";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

type ExamListItem = {
	id: string;
	sampleId: string;
	examTypeId: string;
	status: string | null;
	results: unknown;
	startedAt: string | null;
	resultedAt: string | null;
	performedBy: string | null;
	notes: string | null;
	validatedBy: string | null;
	validatedAt: string | null;
	updatedAt: string | null;
};

function parseResults(value: unknown): Record<string, unknown> | null {
	if (value == null) return null;
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

function parseReferenceRange(
	range: string | undefined,
): { min: number; max: number } | null {
	if (!range || typeof range !== "string") return null;
	const match = range.match(
		/(\d+(?:\.\d+)?)\s*(?:-|\u2013)\s*(\d+(?:\.\d+)?)/,
	);
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
): ValidationClinicalFlag {
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

function toExamListItem(
	exam: unknown,
): ExamListItem | null {
	if (!exam || typeof exam !== "object") return null;
	const value = exam as Record<string, unknown>;
	const id = typeof value.id === "string" ? value.id : null;
	const sampleId = typeof value.sampleId === "string" ? value.sampleId : null;
	const examTypeId = typeof value.examTypeId === "string" ? value.examTypeId : null;
	if (!id || !sampleId || !examTypeId) return null;

	return {
		id,
		sampleId,
		examTypeId,
		status: typeof value.status === "string" ? value.status : null,
		results: value.results,
		startedAt: typeof value.startedAt === "string" ? value.startedAt : null,
		resultedAt: typeof value.resultedAt === "string" ? value.resultedAt : null,
		performedBy: typeof value.performedBy === "string" ? value.performedBy : null,
		notes: typeof value.notes === "string" ? value.notes : null,
		validatedBy: typeof value.validatedBy === "string" ? value.validatedBy : null,
		validatedAt: typeof value.validatedAt === "string" ? value.validatedAt : null,
		updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
	};
}

function matchFlagFilter(
	item: Pick<ValidationQueueItem, "clinicalFlag" | "hasReferenceRangeViolation">,
	filter: ValidationQueueFilters["flag"],
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
	filters: ValidationQueueFilters = {},
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

	const { data: examRows } = await cookieBasedClient.models.Exam.list({
		filter: { and: examAndFilters },
	});
	const exams = (examRows ?? [])
		.map(toExamListItem)
		.filter((item): item is ExamListItem => item != null);
	if (!exams.length) return [];

	const [sampleResults, examTypeResults] = await Promise.all([
		Promise.all(
			exams.map((exam) => cookieBasedClient.models.Sample.get({ id: exam.sampleId })),
		),
		Promise.all(
			exams.map((exam) =>
				cookieBasedClient.models.ExamType.get({ id: exam.examTypeId }),
			),
		),
	]);

	const samplesById = new Map(
		sampleResults
			.map((result) => result.data)
			.filter(
				(sample): sample is NonNullable<typeof sample> =>
					sample != null &&
					typeof sample.id === "string" &&
					typeof sample.workOrderId === "string" &&
					typeof sample.examTypeId === "string",
			)
			.map((sample) => [sample.id, sample]),
	);
	const examTypesById = new Map(
		examTypeResults
			.map((result) => result.data)
			.filter(
				(examType): examType is NonNullable<typeof examType> =>
					examType != null &&
					typeof examType.id === "string" &&
					typeof examType.name === "string",
			)
			.map((examType) => [examType.id, examType]),
	);

	const workOrderIds = [
		...new Set(
			exams
				.map((exam) => samplesById.get(exam.sampleId)?.workOrderId)
				.filter((id): id is string => id != null),
		),
	];
	const workOrderResults = await Promise.all(
		workOrderIds.map((id) => cookieBasedClient.models.WorkOrder.get({ id })),
	);
	const workOrdersById = new Map(
		workOrderResults
			.map((result) => result.data)
			.filter(
				(workOrder): workOrder is NonNullable<typeof workOrder> =>
					workOrder != null &&
					typeof workOrder.id === "string" &&
					typeof workOrder.patientId === "string",
			)
			.map((workOrder) => [workOrder.id, workOrder]),
	);

	const patientIds = [
		...new Set(
			[...workOrdersById.values()]
				.map((workOrder) => workOrder.patientId)
				.filter((id): id is string => id != null),
		),
	];
	const patientResults = await Promise.all(
		patientIds.map((id) => cookieBasedClient.models.Patient.get({ id })),
	);
	const patientsById = new Map(
		patientResults
			.map((result) => result.data)
			.filter(
				(patient): patient is NonNullable<typeof patient> =>
					patient != null && typeof patient.id === "string",
			)
			.map((patient) => [patient.id, patient]),
	);

	const rows: ValidationQueueItem[] = [];
	for (const exam of exams) {
		const sample = samplesById.get(exam.sampleId);
		if (!sample) continue;

		const workOrder = workOrdersById.get(sample.workOrderId);
		if (!workOrder) continue;
		if (filters.priority && workOrder.priority !== filters.priority) continue;

		const examType = examTypesById.get(exam.examTypeId);
		if (!examType) continue;

		const patient = patientsById.get(workOrder.patientId);
		const patientName = patient
			? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Desconocido"
			: "Desconocido";

		const fieldSchema = parseFieldSchema(examType.fieldSchema);
		if (!fieldSchema) continue;
		const results = parseResults(exam.results);
		const hasViolation = hasReferenceRangeViolation(results, fieldSchema);
		const clinicalFlag = deriveClinicalFlag(results, fieldSchema);

		const row: ValidationQueueItem = {
			examId: exam.id,
			sampleId: exam.sampleId,
			workOrderId: sample.workOrderId,
			patientName,
			accessionNumber: workOrder.accessionNumber ?? null,
			examTypeName: examType.name,
			technicianId: exam.performedBy,
			status: (exam.status as ValidationQueueItem["status"]) ?? "ready_for_validation",
			processedAt: exam.resultedAt,
			clinicalFlag,
			hasReferenceRangeViolation: hasViolation,
			priority: workOrder.priority ?? null,
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
export async function getValidationDetail(
	examId: string,
): Promise<ValidationDetail | null> {
	if (!examId.trim()) return null;

	const { data: examRaw } = await cookieBasedClient.models.Exam.get({
		id: examId.trim(),
	});
	const exam = toExamListItem(examRaw);
	if (!exam) return null;

	const [sampleResult, examTypeResult] = await Promise.all([
		cookieBasedClient.models.Sample.get({ id: exam.sampleId }),
		cookieBasedClient.models.ExamType.get({ id: exam.examTypeId }),
	]);
	const sample = sampleResult.data;
	const examType = examTypeResult.data;
	if (!sample?.id || !sample.workOrderId || !sample.examTypeId || !examType?.id) {
		return null;
	}

	const fieldSchema = parseFieldSchema(examType.fieldSchema);
	if (!fieldSchema) return null;

	const { data: workOrder } = await cookieBasedClient.models.WorkOrder.get({
		id: sample.workOrderId,
	});
	if (!workOrder?.id || !workOrder.patientId) return null;

	const { data: patient } = await cookieBasedClient.models.Patient.get({
		id: workOrder.patientId,
	});
	if (!patient?.id) return null;

	const results = parseResults(exam.results);
	const hasViolation = hasReferenceRangeViolation(results, fieldSchema);
	const clinicalFlag = deriveClinicalFlag(results, fieldSchema);
	const fullName = patient
		? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Desconocido"
		: "Desconocido";

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
			examTypeId: sample.examTypeId,
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
			id: patient.id,
			firstName: patient.firstName ?? null,
			lastName: patient.lastName ?? null,
			fullName,
			dateOfBirth: patient.dateOfBirth ?? null,
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
		(row) => row.clinicalFlag !== "normal" || row.hasReferenceRangeViolation,
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
				.filter(
					(entityId): entityId is string =>
						entityId != null && pendingExamIds.has(entityId),
				),
		);
		activeIncidences = pendingIncidenceExamIds.size;
	}

	const { data: validatedExamsRaw } = await cookieBasedClient.models.Exam.list({
		filter: {
			or: [{ status: { eq: "approved" } }, { status: { eq: "rejected" } }],
		},
	});
	const validatedExams = (validatedExamsRaw ?? [])
		.map(toExamListItem)
		.filter((exam): exam is ExamListItem => exam != null);

	const turnaroundMinutes: number[] = [];
	for (const exam of validatedExams) {
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
					turnaroundMinutes.reduce((sum, value) => sum + value, 0) /
						turnaroundMinutes.length,
				)
			: 0;

	return {
		pendingCount,
		criticalCount,
		activeIncidences,
		averageValidationTurnaroundMins,
	};
}
