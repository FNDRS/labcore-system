import type { ExamStatus } from "@/lib/contracts";
import type { WorkOrderStatus } from "@/lib/contracts";
import type { FieldSchema } from "@/lib/process/field-schema-types";

export type ValidationClinicalFlag = "normal" | "atencion" | "critico";

export type ValidationQueueFilterFlag =
	| ValidationClinicalFlag
	| "abnormal";

export type ValidationQueueStatusFilter = "pending" | "all";

export interface ValidationQueueFilters {
	statusFilter?: ValidationQueueStatusFilter;
	flag?: ValidationQueueFilterFlag;
	priority?: "routine" | "urgent" | "stat" | null;
	fromResultedAt?: string;
	toResultedAt?: string;
	technicianId?: string;
}

export interface ValidationQueueItem {
	examId: string;
	sampleId: string;
	workOrderId: string;
	patientName: string;
	accessionNumber: string | null;
	examTypeName: string;
	technicianId: string | null;
	status: ExamStatus;
	processedAt: string | null;
	clinicalFlag: ValidationClinicalFlag;
	hasReferenceRangeViolation: boolean;
	priority: "routine" | "urgent" | "stat" | null;
}

export interface ValidationDetail {
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
		updatedAt: string | null;
	};
	examType: {
		id: string;
		code: string;
		name: string;
		sampleType: string | null;
		fieldSchema: FieldSchema;
	};
	sample: {
		id: string;
		barcode: string | null;
		workOrderId: string;
		examTypeId: string;
		status: string | null;
		collectedAt: string | null;
		receivedAt: string | null;
	};
	workOrder: {
		id: string;
		accessionNumber: string | null;
		priority: "routine" | "urgent" | "stat" | null;
		requestedAt: string | null;
		referringDoctor: string | null;
		status: WorkOrderStatus | null;
	};
	patient: {
		id: string;
		firstName: string | null;
		lastName: string | null;
		fullName: string;
		dateOfBirth: string | null;
	};
	clinicalFlag: ValidationClinicalFlag;
	hasReferenceRangeViolation: boolean;
}

export interface SupervisorDashboardStats {
	pendingCount: number;
	criticalCount: number;
	activeIncidences: number;
	averageValidationTurnaroundMins: number;
}

export type ValidationAction =
	| {
			type: "approve";
			examId: string;
			comments?: string;
			expectedUpdatedAt?: string | null;
	  }
	| {
			type: "reject";
			examId: string;
			reason: string;
			comments?: string;
			expectedUpdatedAt?: string | null;
	  }
	| {
			type: "mark_incidence";
			examId: string;
			incidenceType: string;
			description: string;
	  };
