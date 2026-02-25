"use server";

import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/contracts";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

export type ValidationServiceResult =
	| { ok: true; updatedAt?: string | null }
	| { ok: false; error: string; conflict?: boolean };

export type IncidenceResult = { ok: true } | { ok: false; error: string };

function mutationErrorMessage(
	errors: Array<{ message?: string } | null | undefined> | null | undefined,
	fallback: string,
): string {
	return errors?.[0]?.message ?? fallback;
}

async function emitAudit(
	entityType: string,
	entityId: string,
	action: string,
	userId: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	const now = new Date().toISOString();
	const serializedMetadata =
		metadata == null ? undefined : JSON.stringify(metadata);

	const result = await cookieBasedClient.models.AuditEvent.create({
		entityType,
		entityId,
		action,
		userId,
		timestamp: now,
		metadata: serializedMetadata,
	});
	if (result.errors?.length || !result.data?.id) {
		throw new Error(
			mutationErrorMessage(
				result.errors,
				"No se pudo registrar el evento de auditoría",
			),
		);
	}
}

function hasConflict(
	currentUpdatedAt: string | null,
	expectedUpdatedAt?: string | null,
): boolean {
	if (expectedUpdatedAt == null) return false;
	if (currentUpdatedAt == null) return false;
	return expectedUpdatedAt !== currentUpdatedAt;
}

async function syncSampleStatusWhenAllExamsTerminal(
	sampleId: string,
	userId: string,
): Promise<void> {
	const { data: exams } = await cookieBasedClient.models.Exam.list({
		filter: { sampleId: { eq: sampleId } },
	});
	if (!exams?.length) return;

	const allTerminal = exams.every(
		(exam) => exam.status === "approved" || exam.status === "rejected",
	);
	if (!allTerminal) return;

	const { data: sample } = await cookieBasedClient.models.Sample.get({ id: sampleId });
	if (!sample?.id || sample.status === "completed") return;

	const sampleUpdate = await cookieBasedClient.models.Sample.update({
		id: sampleId,
		status: "completed",
	});
	if (sampleUpdate.errors?.length || !sampleUpdate.data?.id) {
		throw new Error(
			mutationErrorMessage(
				sampleUpdate.errors,
				"No se pudo actualizar el estado de la muestra",
			),
		);
	}

	await emitAudit(
		AUDIT_ENTITY_TYPES.SAMPLE,
		sampleId,
		AUDIT_ACTIONS.SPECIMEN_COMPLETED,
		userId,
		{ trigger: "validation_terminal_states" },
	);
}

function shouldMoveExamToReview(incidenceType: string): boolean {
	const normalized = incidenceType.trim().toLowerCase();
	return (
		normalized === "rework" ||
		normalized === "retrabajo" ||
		normalized === "correction" ||
		normalized === "correccion" ||
		normalized === "corrección"
	);
}

/**
 * Approve exam from validation queue.
 * Guard: only ready_for_validation -> approved.
 * Uses optimistic concurrency when expectedUpdatedAt is provided.
 */
export async function approveExam(
	examId: string,
	userId: string,
	comments?: string,
	expectedUpdatedAt?: string | null,
): Promise<ValidationServiceResult> {
	const { data: exam } = await cookieBasedClient.models.Exam.get({ id: examId });
	if (!exam?.id) return { ok: false, error: "Examen no encontrado" };
	if (exam.status !== "ready_for_validation") {
		return {
			ok: false,
			error: "Solo exámenes listos para validación pueden aprobarse",
		};
	}

	const currentUpdatedAt = (exam as { updatedAt?: string | null }).updatedAt ?? null;
	if (hasConflict(currentUpdatedAt, expectedUpdatedAt)) {
		return { ok: false, error: "Otro usuario modificó este examen", conflict: true };
	}

	const now = new Date().toISOString();
	const updateResult = await cookieBasedClient.models.Exam.update({
		id: examId,
		status: "approved",
		validatedBy: userId,
		validatedAt: now,
	});
	if (updateResult.errors?.length || !updateResult.data?.id) {
		return {
			ok: false,
			error: mutationErrorMessage(
				updateResult.errors,
				"No se pudo aprobar el examen",
			),
		};
	}

	await emitAudit(
		AUDIT_ENTITY_TYPES.EXAM,
		examId,
		AUDIT_ACTIONS.EXAM_APPROVED,
		userId,
		{
			sampleId: exam.sampleId,
			comments: comments?.trim() || undefined,
		},
	);
	await syncSampleStatusWhenAllExamsTerminal(exam.sampleId, userId);

	const updatedAt =
		(updateResult.data as { updatedAt?: string | null } | null)?.updatedAt ?? null;
	return { ok: true, updatedAt };
}

/**
 * Reject exam from validation queue.
 * Guard: only ready_for_validation -> rejected.
 * Uses optimistic concurrency when expectedUpdatedAt is provided.
 */
export async function rejectExam(
	examId: string,
	userId: string,
	reason: string,
	comments?: string,
	expectedUpdatedAt?: string | null,
): Promise<ValidationServiceResult> {
	if (!reason.trim()) return { ok: false, error: "Debe indicar un motivo de rechazo" };

	const { data: exam } = await cookieBasedClient.models.Exam.get({ id: examId });
	if (!exam?.id) return { ok: false, error: "Examen no encontrado" };
	if (exam.status !== "ready_for_validation") {
		return {
			ok: false,
			error: "Solo exámenes listos para validación pueden rechazarse",
		};
	}

	const currentUpdatedAt = (exam as { updatedAt?: string | null }).updatedAt ?? null;
	if (hasConflict(currentUpdatedAt, expectedUpdatedAt)) {
		return { ok: false, error: "Otro usuario modificó este examen", conflict: true };
	}

	const now = new Date().toISOString();
	const updateResult = await cookieBasedClient.models.Exam.update({
		id: examId,
		status: "rejected",
		validatedBy: userId,
		validatedAt: now,
	});
	if (updateResult.errors?.length || !updateResult.data?.id) {
		return {
			ok: false,
			error: mutationErrorMessage(
				updateResult.errors,
				"No se pudo rechazar el examen",
			),
		};
	}

	await emitAudit(
		AUDIT_ENTITY_TYPES.EXAM,
		examId,
		AUDIT_ACTIONS.EXAM_REJECTED,
		userId,
		{
			sampleId: exam.sampleId,
			reason: reason.trim(),
			comments: comments?.trim() || undefined,
		},
	);
	await syncSampleStatusWhenAllExamsTerminal(exam.sampleId, userId);

	const updatedAt =
		(updateResult.data as { updatedAt?: string | null } | null)?.updatedAt ?? null;
	return { ok: true, updatedAt };
}

/**
 * Create validation incidence and optionally return exam to review.
 */
export async function createIncidence(
	examId: string,
	userId: string,
	type: string,
	description: string,
): Promise<IncidenceResult> {
	if (!type.trim()) return { ok: false, error: "Debe indicar el tipo de incidencia" };
	if (!description.trim()) {
		return { ok: false, error: "Debe indicar la descripción de la incidencia" };
	}

	const { data: exam } = await cookieBasedClient.models.Exam.get({ id: examId });
	if (!exam?.id) return { ok: false, error: "Examen no encontrado" };

	if (shouldMoveExamToReview(type) && exam.status === "ready_for_validation") {
		const reviewUpdate = await cookieBasedClient.models.Exam.update({
			id: examId,
			status: "review",
		});
		if (reviewUpdate.errors?.length || !reviewUpdate.data?.id) {
			return {
				ok: false,
				error: mutationErrorMessage(
					reviewUpdate.errors,
					"No se pudo mover el examen a revisión",
				),
			};
		}
	}

	await emitAudit(
		AUDIT_ENTITY_TYPES.EXAM,
		examId,
		AUDIT_ACTIONS.INCIDENCE_CREATED,
		userId,
		{
			sampleId: exam.sampleId,
			type: type.trim(),
			description: description.trim(),
		},
	);

	return { ok: true };
}
