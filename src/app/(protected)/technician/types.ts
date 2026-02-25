import type { SampleStatus as BackendSampleStatus } from "@/lib/contracts";

/**
 * Technician DTOs for dashboard and muestras workstation.
 * Aligned with schema and lib/contracts.ts.
 */

export type SampleStatus = "Complete" | "Processing" | "Flagged";
export type SamplePriority = "Routine" | "Urgent";

export interface QueueRow {
	id: string;
	sampleId: string;
	patientName: string;
	testType: string;
	priority: SamplePriority;
	status: SampleStatus;
	waitMins: number;
	assignedToMe?: boolean;
}

export interface NextSample {
	sampleId: string;
	testType: string;
	patientName: string;
	priority: SamplePriority;
	waitMins: number;
}

export interface DashboardMetrics {
	completedToday: number;
	inProcess: number;
	errors: number;
}

export type SampleWorkstationStatus =
	| "Awaiting Receipt"
	| "Received"
	| "Processing"
	| "Waiting Equipment"
	| "Completed"
	| "Flagged";

export type SampleWorkstationPriority = "Routine" | "Urgent";

export interface SampleWorkstationRow {
	id: string;
	sampleId: string;
	patientName: string;
	testType: string;
	sampleType: string;
	priority: SampleWorkstationPriority;
	status: SampleWorkstationStatus;
	backendStatus: BackendSampleStatus;
	waitMins: number;
	collectedAt: string | null;
	notes: string | null;
	assignedEquipment: string | null;
	assignedToMe: boolean;
}

export interface SampleWorkstationDetail extends SampleWorkstationRow {
	history: { at: string; event: string }[];
}

export interface MuestrasSummary {
	pending: number;
	inProcess: number;
	urgent: number;
	incidencias: number;
}
