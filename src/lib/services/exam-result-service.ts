"use server";

import {
	AUDIT_ACTIONS,
	AUDIT_ENTITY_TYPES,
} from "@/lib/contracts";
import type { ResultsRecord } from "@/lib/process/field-schema-types";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

/** Result of exam result service operations. */
export type ExamResultStatus =
	| { ok: true; updatedAt?: string | null }
	| { ok: false; error: string; conflict?: boolean };

function mutationErrorMessage(
	errors: Array<{ message?: string } | null | undefined> | null | undefined,
	fallback: string,
): string {
	return errors?.[0]?.message ?? fallback;
}

function serializeResultsForAwsJson(
	results: ResultsRecord,
): string | null {
	try {
		return JSON.stringify(results ?? {});
	} catch {
		return null;
	}
}

function emitAudit(
	entityType: string,
	entityId: string,
	action: string,
	userId: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	const now = new Date().toISOString();
	const serializedMetadata =
		metadata == null ? undefined : JSON.stringify(metadata);
	return cookieBasedClient.models.AuditEvent.create({
		entityType,
		entityId,
		action,
		userId,
		timestamp: now,
		metadata: serializedMetadata,
	}).then((result) => {
		if (result.errors?.length || !result.data?.id) {
			throw new Error(
				mutationErrorMessage(
					result.errors,
					"No se pudo registrar el evento de auditoría",
				),
			);
		}
	});
}

/**
 * Mark exam as started when technician opens the process workspace.
 * Guard: only from pending.
 * Emits EXAM_STARTED.
 */
export async function markExamStarted(
	examId: string,
	userId: string,
): Promise<ExamResultStatus> {
	const { data: exam } = await cookieBasedClient.models.Exam.get({
		id: examId,
	});
	if (!exam?.id) return { ok: false, error: "Examen no encontrado" };
	if (exam.status !== "pending") {
		return { ok: true }; // Already started, no-op
	}

	const now = new Date().toISOString();
	const startUpdate = await cookieBasedClient.models.Exam.update({
		id: examId,
		status: "inprogress",
		startedAt: now,
		performedBy: userId,
	});
	if (startUpdate.errors?.length || !startUpdate.data?.id) {
		return {
			ok: false,
			error: mutationErrorMessage(
				startUpdate.errors,
				"No se pudo iniciar el examen",
			),
		};
	}
	await emitAudit(
		AUDIT_ENTITY_TYPES.EXAM,
		examId,
		AUDIT_ACTIONS.EXAM_STARTED,
		userId,
		{ sampleId: exam.sampleId },
	);
	const startedUpdatedAt =
		(startUpdate.data as { updatedAt?: string | null } | null)?.updatedAt ?? null;
	return { ok: true, updatedAt: startedUpdatedAt };
}

/**
 * Save exam results as draft. Keeps status inprogress.
 * Guard: only when inprogress.
 * Optimistic concurrency: if expectedUpdatedAt provided and doesn't match, returns conflict.
 * Emits EXAM_RESULTS_SAVED.
 */
export async function saveExamDraft(
	examId: string,
	results: ResultsRecord,
	userId: string,
	expectedUpdatedAt?: string | null,
): Promise<ExamResultStatus> {
	const { data: exam } = await cookieBasedClient.models.Exam.get({
		id: examId,
	});
	if (!exam?.id) return { ok: false, error: "Examen no encontrado" };
	if (exam.status !== "inprogress") {
		return {
			ok: false,
			error: "Solo exámenes en proceso pueden guardar borrador",
		};
	}

	const currentUpdatedAt = (exam as { updatedAt?: string | null }).updatedAt ?? null;
	if (
		expectedUpdatedAt != null &&
		currentUpdatedAt != null &&
		expectedUpdatedAt !== currentUpdatedAt
	) {
		return {
			ok: false,
			error: "Otro usuario modificó este examen",
			conflict: true,
		};
	}

	const serializedResults = serializeResultsForAwsJson(results);
	if (serializedResults == null) {
		return { ok: false, error: "Formato de resultados inválido" };
	}
	const draftUpdate = await cookieBasedClient.models.Exam.update({
		id: examId,
		results: serializedResults,
	});
	if (draftUpdate.errors?.length || !draftUpdate.data?.id) {
		return {
			ok: false,
			error: mutationErrorMessage(
				draftUpdate.errors,
				"No se pudo guardar el borrador",
			),
		};
	}
	await emitAudit(
		AUDIT_ENTITY_TYPES.EXAM,
		examId,
		AUDIT_ACTIONS.EXAM_RESULTS_SAVED,
		userId,
		{ sampleId: exam.sampleId, draft: true },
	);
	const draftUpdatedAt =
		(draftUpdate.data as { updatedAt?: string | null } | null)?.updatedAt ?? null;
	return { ok: true, updatedAt: draftUpdatedAt };
}

/**
 * Finalize exam with results. Sets status to completed.
 * Guard: only when inprogress.
 * Optimistic concurrency: if expectedUpdatedAt provided and doesn't match, returns conflict.
 * Emits EXAM_RESULTS_SAVED.
 */
export async function finalizeExam(
	examId: string,
	results: ResultsRecord,
	userId: string,
	expectedUpdatedAt?: string | null,
): Promise<ExamResultStatus> {
	const { data: exam } = await cookieBasedClient.models.Exam.get({
		id: examId,
	});
	if (!exam?.id) return { ok: false, error: "Examen no encontrado" };
	if (exam.status !== "inprogress") {
		return {
			ok: false,
			error: "Solo exámenes en proceso pueden finalizarse",
		};
	}

	const currentUpdatedAt = (exam as { updatedAt?: string | null }).updatedAt ?? null;
	if (
		expectedUpdatedAt != null &&
		currentUpdatedAt != null &&
		expectedUpdatedAt !== currentUpdatedAt
	) {
		return {
			ok: false,
			error: "Otro usuario modificó este examen",
			conflict: true,
		};
	}

	const serializedFinalizeResults = serializeResultsForAwsJson(results);
	if (serializedFinalizeResults == null) {
		return { ok: false, error: "Formato de resultados inválido" };
	}
	const now = new Date().toISOString();
	const finalizeUpdate = await cookieBasedClient.models.Exam.update({
		id: examId,
		results: serializedFinalizeResults,
		status: "completed",
		resultedAt: now,
		performedBy: userId,
	});
	if (finalizeUpdate.errors?.length || !finalizeUpdate.data?.id) {
		return {
			ok: false,
			error: mutationErrorMessage(
				finalizeUpdate.errors,
				"No se pudo finalizar el examen",
			),
		};
	}
	await emitAudit(
		AUDIT_ENTITY_TYPES.EXAM,
		examId,
		AUDIT_ACTIONS.EXAM_RESULTS_SAVED,
		userId,
		{ sampleId: exam.sampleId, finalized: true },
	);
	const finalizeUpdatedAt =
		(finalizeUpdate.data as { updatedAt?: string | null } | null)?.updatedAt ?? null;
	return { ok: true, updatedAt: finalizeUpdatedAt };
}

/**
 * Send exam to validation queue (completed → ready_for_validation).
 * Guard: only when completed.
 * Emits EXAM_SENT_TO_VALIDATION.
 * Optionally syncs Sample to completed when all exams for that sample are ready.
 */
export async function sendToValidation(
	examId: string,
	userId: string,
): Promise<ExamResultStatus> {
	const { data: exam } = await cookieBasedClient.models.Exam.get({
		id: examId,
	});
	if (!exam?.id) return { ok: false, error: "Examen no encontrado" };
	if (exam.status !== "completed") {
		return {
			ok: false,
			error: "Solo exámenes finalizados pueden enviarse a validación",
		};
	}

	const sendUpdate = await cookieBasedClient.models.Exam.update({
		id: examId,
		status: "ready_for_validation",
	});
	if (sendUpdate.errors?.length || !sendUpdate.data?.id) {
		return {
			ok: false,
			error: mutationErrorMessage(
				sendUpdate.errors,
				"No se pudo enviar a validación",
			),
		};
	}
	await emitAudit(
		AUDIT_ENTITY_TYPES.EXAM,
		examId,
		AUDIT_ACTIONS.EXAM_SENT_TO_VALIDATION,
		userId,
		{ sampleId: exam.sampleId },
	);

	// Sample status sync: when exam reaches ready_for_validation, optionally sync Sample to completed
	// (if all exams for that sample are done). Seed uses 1:1 Sample:Exam, so we sync when this exam is sent.
	await syncSampleStatusWhenExamSentToValidation(exam.sampleId, userId);

	return { ok: true };
}

/**
 * When an exam is sent to validation, check if all exams for the sample are done.
 * If so, set Sample.status to completed.
 * Seed creates 1 Exam per Sample; future multi-exam samples will check all exams.
 */
async function syncSampleStatusWhenExamSentToValidation(
	sampleId: string,
	userId: string,
): Promise<void> {
	const { data: exams } = await cookieBasedClient.models.Exam.list({
		filter: { sampleId: { eq: sampleId } },
	});

	if (!exams?.length) return;

	const allReady =
		exams.every(
			(e) =>
				e.status === "ready_for_validation" ||
				e.status === "approved" ||
				e.status === "rejected",
		);

	if (!allReady) return;

	const { data: sample } = await cookieBasedClient.models.Sample.get({
		id: sampleId,
	});
	if (!sample?.id || sample.status === "completed") return;

	await cookieBasedClient.models.Sample.update({
		id: sampleId,
		status: "completed",
	});
	await emitAudit(
		AUDIT_ENTITY_TYPES.SAMPLE,
		sampleId,
		AUDIT_ACTIONS.SPECIMEN_COMPLETED,
		userId,
		{ trigger: "exam_sent_to_validation" },
	);
}
