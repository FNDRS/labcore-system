import {
	AUDIT_ACTIONS,
	AUDIT_ENTITY_TYPES,
} from "@/lib/contracts";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

type StatusResult = { ok: true } | { ok: false; error: string };

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
 * Mark sample as received (ready_for_lab -> received).
 * Guard: only from ready_for_lab.
 */
export async function markSampleReceived(
	sampleId: string,
	userId: string,
): Promise<StatusResult> {
	const { data: sample } = await cookieBasedClient.models.Sample.get({
		id: sampleId,
	});
	if (!sample?.id) return { ok: false, error: "Muestra no encontrada" };
	if (sample.status !== "ready_for_lab") {
		return { ok: false, error: "Solo muestras listas para lab pueden marcarse recibidas" };
	}

	const now = new Date().toISOString();
	await cookieBasedClient.models.Sample.update({
		id: sampleId,
		status: "received",
		receivedAt: now,
	});
	await emitAudit(
		AUDIT_ENTITY_TYPES.SAMPLE,
		sampleId,
		AUDIT_ACTIONS.SPECIMEN_RECEIVED,
		userId,
	);
	return { ok: true };
}

/**
 * Mark sample as in progress (received -> inprogress).
 * Guard: only from received.
 */
export async function markSampleInProgress(
	sampleId: string,
	userId: string,
): Promise<StatusResult> {
	const { data: sample } = await cookieBasedClient.models.Sample.get({
		id: sampleId,
	});
	if (!sample?.id) return { ok: false, error: "Muestra no encontrada" };
	if (sample.status !== "received") {
		return { ok: false, error: "Solo muestras recibidas pueden marcarse en proceso" };
	}

	await cookieBasedClient.models.Sample.update({
		id: sampleId,
		status: "inprogress",
	});
	await emitAudit(
		AUDIT_ENTITY_TYPES.SAMPLE,
		sampleId,
		AUDIT_ACTIONS.SPECIMEN_IN_PROGRESS,
		userId,
	);
	return { ok: true };
}

/**
 * Mark sample as completed (inprogress -> completed).
 * Guard: only from inprogress.
 * Emits SPECIMEN_COMPLETED for completed-today metric.
 */
export async function markSampleCompleted(
	sampleId: string,
	userId: string,
): Promise<StatusResult> {
	const { data: sample } = await cookieBasedClient.models.Sample.get({
		id: sampleId,
	});
	if (!sample?.id) return { ok: false, error: "Muestra no encontrada" };
	if (sample.status !== "inprogress") {
		return { ok: false, error: "Solo muestras en proceso pueden marcarse completadas" };
	}

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
	);
	return { ok: true };
}

/**
 * Record label reprint. Emits LABEL_REPRINTED audit; printer integration is optional/placeholder.
 */
export async function reprintSampleLabel(
	sampleId: string,
	userId: string,
): Promise<StatusResult> {
	const { data: sample } = await cookieBasedClient.models.Sample.get({
		id: sampleId,
	});
	if (!sample?.id) return { ok: false, error: "Muestra no encontrada" };

	await emitAudit(
		AUDIT_ENTITY_TYPES.SAMPLE,
		sampleId,
		AUDIT_ACTIONS.LABEL_REPRINTED,
		userId,
	);
	// TODO: integrate with printer when available
	return { ok: true };
}

/**
 * Mark sample as rejected (report problem). From any state.
 */
export async function markSampleRejected(
	sampleId: string,
	userId: string,
): Promise<StatusResult> {
	const { data: sample } = await cookieBasedClient.models.Sample.get({
		id: sampleId,
	});
	if (!sample?.id) return { ok: false, error: "Muestra no encontrada" };

	await cookieBasedClient.models.Sample.update({
		id: sampleId,
		status: "rejected",
	});
	await emitAudit(
		AUDIT_ENTITY_TYPES.SAMPLE,
		sampleId,
		AUDIT_ACTIONS.SPECIMEN_REJECTED,
		userId,
	);
	return { ok: true };
}
