import type { ExamStatus, WorkOrderStatus } from "@/lib/contracts";
import type { FieldSchema } from "@/lib/process/field-schema-types";

export type ResultsListStatus = "completa" | "parcial";

export interface ResultsListFilters {
  from?: string;
  to?: string;
  status?: ResultsListStatus | "todas";
  search?: string;
  referringDoctor?: string;
}

export interface ResultsListItem {
  workOrderId: string;
  accessionNumber: string | null;
  patientId: string;
  patientName: string;
  requestedAt: string | null;
  priority: "routine" | "urgent" | "stat" | null;
  workOrderStatus: WorkOrderStatus | null;
  referringDoctor: string | null;
  examCount: number;
  terminalExamCount: number;
  status: ResultsListStatus;
  lastValidatedAt: string | null;
}

export interface ConsolidatedExamResult {
  examId: string;
  sampleId: string;
  examTypeId: string;
  examTypeCode: string;
  examTypeName: string;
  sampleType: string | null;
  sampleBarcode: string | null;
  examStatus: ExamStatus | null;
  results: Record<string, unknown> | null;
  fieldSchema: FieldSchema;
  hasReferenceRangeViolation: boolean;
  clinicalFlag: "normal" | "atencion" | "critico";
  startedAt: string | null;
  resultedAt: string | null;
  performedBy: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  validatorComments: string | null;
}

export interface ConsolidatedWorkOrderResult {
  workOrder: {
    id: string;
    accessionNumber: string | null;
    status: WorkOrderStatus | null;
    requestedAt: string | null;
    priority: "routine" | "urgent" | "stat" | null;
    referringDoctor: string | null;
  };
  patient: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    dateOfBirth: string | null;
    gender: string | null;
  };
  exams: ConsolidatedExamResult[];
  summary: {
    totalExams: number;
    approvedExams: number;
    rejectedExams: number;
    pendingExams: number;
    isFullyTerminal: boolean;
    lastValidatedAt: string | null;
  };
}
