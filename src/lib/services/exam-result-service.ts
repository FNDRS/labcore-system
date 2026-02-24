"use server";

import {
	AUDIT_ACTIONS,
	AUDIT_ENTITY_TYPES,
} from "@/lib/contracts";
import type { ResultsRecord } from "@/lib/process/field-schema-types";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

/** Result of exam result service operations. */
export type ExamResultStatus =
	| { ok: true }
	| { ok: false; error: string; conflict?: boolean };

function emitAudit(
	entityType: string,
	entityId: string,
	action: string,
	userId: string,
	metadata?: Record<string, unknown>,
): Promise<unknown> {
	const now = new Date().toISOString();
	return cookieBasedClient.models.AuditEvent.create({
		entityType,
		entityId,
		action,
		userId,
		timestamp: now,
		metadata: metadata ?? undefined,
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
	await cookieBasedClient.models.Exam.update({
		id: examId,
		status: "inprogress",
		startedAt: now,
		performedBy: userId,
	});
	await emitAudit(
		AUDIT_ENTITY_TYPES.EXAM,
		examId,
		AUDIT_ACTIONS.EXAM_STARTED,
		userId,
		{ sampleId: exam.sampleId },
	);
	return { ok: true };
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

	await cookieBasedClient.models.Exam.update({
		id: examId,
		results: results as Record<string, unknown>,
	});
	await emitAudit(
		AUDIT_ENTITY_TYPES.EXAM,
		examId,
		AUDIT_ACTIONS.EXAM_RESULTS_SAVED,
		userId,
		{ sampleId: exam.sampleId, draft: true },
	);
	return { ok: true };
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

	const now = new Date().toISOString();
	await cookieBasedClient.models.Exam.update({
		id: examId,
		results: results as Record<string, unknown>,
		status: "completed",
		resultedAt: now,
		performedBy: userId,
	});
	await emitAudit(
		AUDIT_ENTITY_TYPES.EXAM,
		examId,
		AUDIT_ACTIONS.EXAM_RESULTS_SAVED,
		userId,
		{ sampleId: exam.sampleId, finalized: true },
	);
	return { ok: true };
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

	await cookieBasedClient.models.Exam.update({
		id: examId,
		status: "ready_for_validation",
	});
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

	const now = new Date().toISOString();
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
