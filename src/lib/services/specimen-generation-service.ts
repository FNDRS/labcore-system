"use server";

import {
	AUDIT_ACTIONS,
	AUDIT_ENTITY_TYPES,
} from "@/lib/contracts";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

export type GenerateSpecimensResult =
	| { ok: true; sampleIds: string[]; barcodes: string[] }
	| { ok: false; error: string };

function serializeJsonForAwsJson(
	value: Record<string, unknown> | undefined,
): string | undefined {
	if (value == null) return undefined;
	try {
		return JSON.stringify(value);
	} catch {
		return undefined;
	}
}

/**
 * Generate specimens for a work order. Idempotent: if samples already exist,
 * returns them without creating duplicates.
 */
export async function generateSpecimensForOrder(
	workOrderId: string,
	userId: string,
): Promise<GenerateSpecimensResult> {
	const { data: workOrder } = await cookieBasedClient.models.WorkOrder.get({
		id: workOrderId,
	});
	if (!workOrder?.id) {
		return { ok: false, error: "Orden no encontrada" };
	}

	const requestedCodes = (workOrder.requestedExamTypeCodes ?? []).filter(
		(c): c is string => c != null,
	);
	if (requestedCodes.length === 0) {
		return { ok: false, error: "La orden no tiene exámenes solicitados" };
	}

	const { data: existingSamples } = await cookieBasedClient.models.Sample.list({
		filter: { workOrderId: { eq: workOrderId } },
	});

	if (existingSamples && existingSamples.length > 0) {
		// Idempotent: already generated
		return {
			ok: true,
			sampleIds: existingSamples.map((s) => s.id),
			barcodes: existingSamples.map((s) => s.barcode ?? "").filter(Boolean),
		};
	}

	// Resolve ExamType ids by code
	const { data: examTypes } = await cookieBasedClient.models.ExamType.list();
	const codeToId = new Map(
		examTypes?.filter((e) => e.id != null).map((e) => [e.code, e.id!]) ?? [],
	);

	const samplesToCreate: { examTypeCode: string; examTypeId: string }[] = [];
	for (const code of requestedCodes) {
		const examTypeId = codeToId.get(code);
		if (examTypeId) samplesToCreate.push({ examTypeCode: code, examTypeId });
	}

	if (samplesToCreate.length === 0) {
		return { ok: false, error: "No se encontraron tipos de examen válidos" };
	}

	const now = new Date().toISOString();
	const prefix = workOrder.accessionNumber ?? workOrder.id.slice(0, 8);
	const createdSampleIds: string[] = [];
	const createdBarcodes: string[] = [];

	for (let i = 0; i < samplesToCreate.length; i++) {
		const { examTypeId } = samplesToCreate[i];
		const barcode = `SMP-${prefix.replace(/^#/, "")}-${String(i + 1).padStart(2, "0")}`;

		const { data: sample, errors: sampleErrors } =
			await cookieBasedClient.models.Sample.create({
				workOrderId,
				examTypeId,
				barcode,
				status: "labeled",
			});

		if (sampleErrors?.length || !sample?.id) {
			// Rollback: delete any created samples (best-effort)
			for (const sid of createdSampleIds) {
				await cookieBasedClient.models.Sample.delete({ id: sid });
			}
			return {
				ok: false,
				error: sampleErrors?.[0]?.message ?? "Error al crear muestra",
			};
		}

		createdSampleIds.push(sample.id);
		createdBarcodes.push(barcode);

		const { errors: examErrors } = await cookieBasedClient.models.Exam.create({
			sampleId: sample.id,
			examTypeId,
			status: "pending",
		});

		if (examErrors?.length) {
			// Rollback samples (and any exams)
			await cookieBasedClient.models.Sample.delete({ id: sample.id });
			for (const sid of createdSampleIds) {
				if (sid !== sample.id) {
					await cookieBasedClient.models.Sample.delete({ id: sid });
				}
			}
			return {
				ok: false,
				error: examErrors[0]?.message ?? "Error al crear examen",
			};
		}
	}

	// Emit audit events
	await cookieBasedClient.models.AuditEvent.create({
		entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
		entityId: workOrderId,
		action: AUDIT_ACTIONS.SPECIMENS_GENERATED,
		userId,
		timestamp: now,
		metadata: serializeJsonForAwsJson({
			sampleIds: createdSampleIds,
			barcodes: createdBarcodes,
			examTypeCodes: samplesToCreate.map((s) => s.examTypeCode),
		}),
	});

	return {
		ok: true,
		sampleIds: createdSampleIds,
		barcodes: createdBarcodes,
	};
}

export async function markLabelsPrintedForOrder(
	workOrderId: string,
	userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const { data: samples } = await cookieBasedClient.models.Sample.list({
		filter: { workOrderId: { eq: workOrderId } },
	});
	if (!samples || samples.length === 0) {
		return { ok: false, error: "No hay muestras para esta orden" };
	}
	const barcodes = samples
		.map((sample) => sample.barcode)
		.filter((barcode): barcode is string => Boolean(barcode));
	await cookieBasedClient.models.AuditEvent.create({
		entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
		entityId: workOrderId,
		action: AUDIT_ACTIONS.LABEL_PRINTED,
		userId,
		timestamp: new Date().toISOString(),
		metadata: serializeJsonForAwsJson({ barcodes }),
	});
	return { ok: true };
}

/**
 * Mark order as ready for lab: update all samples from labeled → ready_for_lab.
 */
export async function markOrderReadyForLab(
	workOrderId: string,
	userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const { data: samples } = await cookieBasedClient.models.Sample.list({
		filter: { workOrderId: { eq: workOrderId } },
	});

	if (!samples || samples.length === 0) {
		return { ok: false, error: "No hay muestras para esta orden" };
	}

	for (const s of samples) {
		if (s.status === "labeled") {
			await cookieBasedClient.models.Sample.update({
				id: s.id,
				status: "ready_for_lab",
			});
		}
	}

	const now = new Date().toISOString();
	await cookieBasedClient.models.AuditEvent.create({
		entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
		entityId: workOrderId,
		action: AUDIT_ACTIONS.ORDER_READY_FOR_LAB,
		userId,
		timestamp: now,
		metadata: serializeJsonForAwsJson({ sampleIds: samples.map((s) => s.id) }),
	});

	return { ok: true };
}
