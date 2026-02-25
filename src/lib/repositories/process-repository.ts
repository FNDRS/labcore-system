"use server";

import { cookieBasedClient } from "@/utils/amplifyServerUtils";
import type { FieldSchema } from "@/lib/process/field-schema-types";
import { parseFieldSchema } from "@/lib/process/field-schema-types";
import type { ExamStatus } from "@/lib/contracts";

function parseResults(
	value: unknown,
): Record<string, unknown> | null {
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

/** Process workspace context: Sample + Exam + ExamType with parsed fieldSchema. */
export interface ProcessContext {
  sample: {
    id: string;
    barcode: string | null;
    workOrderId: string;
    examTypeId: string;
    status: string | null;
    collectedAt: string | null;
    receivedAt: string | null;
  };
  exam: {
    id: string;
    sampleId: string;
    examTypeId: string;
    status: ExamStatus | null;
    results: Record<string, unknown> | null;
    startedAt: string | null;
    resultedAt: string | null;
    performedBy: string | null;
    notes: string | null;
    validatedBy: string | null;
    validatedAt: string | null;
    /** For optimistic concurrency — compare before save/finalize. */
    updatedAt: string | null;
  };
  examType: {
    id: string;
    code: string;
    name: string;
    sampleType: string | null;
    fieldSchema: FieldSchema;
  };
}

/**
 * Fetch full process context for the technician workspace.
 * Returns Sample, Exam, ExamType (with parsed fieldSchema), or null if not found.
 *
 * @param sampleId — Sample.id (UUID)
 */
export async function getProcessContext(sampleId: string): Promise<ProcessContext | null> {
  if (!sampleId.trim()) return null;

  const { data: sample } = await cookieBasedClient.models.Sample.get({
    id: sampleId,
  });
  if (!sample?.id || !sample.workOrderId || !sample.examTypeId) return null;

  const [examResult, examTypeResult] = await Promise.all([
    cookieBasedClient.models.Exam.list({
      filter: { sampleId: { eq: sampleId } },
    }),
    cookieBasedClient.models.ExamType.get({ id: sample.examTypeId }),
  ]);

  const exam = examResult.data?.[0];
  const examType = examTypeResult.data;
  if (!exam?.id || !examType?.id) return null;

  const fieldSchema = parseFieldSchema(examType.fieldSchema);
  if (!fieldSchema) return null;

  return {
    sample: {
      id: sample.id,
      barcode: sample.barcode ?? null,
      workOrderId: sample.workOrderId,
      examTypeId: sample.examTypeId,
      status: sample.status ?? null,
      collectedAt: sample.collectedAt ?? null,
      receivedAt: sample.receivedAt ?? null,
    },
    exam: {
      id: exam.id,
      sampleId: exam.sampleId,
      examTypeId: exam.examTypeId,
      status: (exam.status as ExamStatus) ?? null,
      results: parseResults(exam.results),
      startedAt: exam.startedAt ?? null,
      resultedAt: exam.resultedAt ?? null,
      performedBy: exam.performedBy ?? null,
      notes: exam.notes ?? null,
      validatedBy: exam.validatedBy ?? null,
      validatedAt: exam.validatedAt ?? null,
      updatedAt:
        (exam as { updatedAt?: string | null }).updatedAt ?? null,
    },
    examType: {
      id: examType.id,
      code: examType.code,
      name: examType.name,
      sampleType: examType.sampleType ?? null,
      fieldSchema,
    },
  };
}
