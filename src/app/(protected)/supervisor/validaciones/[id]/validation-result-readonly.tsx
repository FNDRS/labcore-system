"use client";

import { ExamResultViewer } from "@/components/exam-result-viewer";
import type { ValidationDetail } from "@/lib/types/validation-types";

export function ValidationResultReadOnly({
  detail,
}: {
  detail: ValidationDetail;
}) {
  return (
    <ExamResultViewer
      fieldSchema={detail.examType.fieldSchema}
      resultValues={detail.exam.results}
    />
  );
}
