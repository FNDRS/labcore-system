"use server";

import { cookieBasedClient } from "@/utils/amplifyServerUtils";
import type { FieldSchema } from "@/lib/process/field-schema-types";
import { parseFieldSchema } from "@/lib/process/field-schema-types";
import type { ExamStatus } from "@/lib/contracts";
import { parseResults } from "@/lib/repositories/shared";

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

const PROCESS_CONTEXT_SELECTION = [
  "id",
  "barcode",
  "workOrderId",
  "examTypeId",
  "status",
  "collectedAt",
  "receivedAt",
  "exam.id",
  "exam.sampleId",
  "exam.examTypeId",
  "exam.status",
  "exam.results",
  "exam.startedAt",
  "exam.resultedAt",
  "exam.performedBy",
  "exam.notes",
  "exam.validatedBy",
  "exam.validatedAt",
  "exam.updatedAt",
  "examType.id",
  "examType.code",
  "examType.name",
  "examType.sampleType",
  "examType.fieldSchema",
] as const;

/**
 * Fetch full process context for the technician workspace.
 * Returns Sample, Exam, ExamType (with parsed fieldSchema), or null if not found.
 *
 * @param sampleId — Sample.id (UUID)
 */
export async function getProcessContext(sampleId: string): Promise<ProcessContext | null> {
  if (!sampleId.trim()) return null;

  const { data: sample, errors } = await cookieBasedClient.models.Sample.get(
    {
      id: sampleId,
    },
    {
      selectionSet: PROCESS_CONTEXT_SELECTION,
    }
  );

  if (errors?.length) {
    console.error("[getProcessContext] Amplify errors:", errors);
    return null;
  }

  if (!sample?.id || !sample.workOrderId || !sample.examTypeId) return null;
  const exam = sample.exam;
  const examType = sample.examType;
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
      updatedAt: exam.updatedAt ?? null,
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
