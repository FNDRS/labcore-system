/**
 * Type-safe contracts and canonical values for domain/UI.
 * Aligned with amplify/data/resource.ts schema.
 * Use these for status transitions, audit events, and domain logic.
 */

/** WorkOrder.status — matches schema enum. */
export const WORK_ORDER_STATUS = [
	"pending",
	"inprogress",
	"completed",
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUS)[number];

/** Sample.status — matches schema enum. Includes labeled, ready_for_lab for reception flow. */
export const SAMPLE_STATUS = [
	"pending",
	"labeled",
	"ready_for_lab",
	"received",
	"inprogress",
	"completed",
	"rejected",
] as const;
export type SampleStatus = (typeof SAMPLE_STATUS)[number];

/** Exam.status — matches schema enum. Includes validation states. */
export const EXAM_STATUS = [
	"pending",
	"inprogress",
	"completed",
	"review",
	"ready_for_validation",
	"approved",
	"rejected",
] as const;
export type ExamStatus = (typeof EXAM_STATUS)[number];

/** Canonical AuditEvent.action names for order/specimen/exam/validation transitions. */
export const AUDIT_ACTIONS = {
	// Order lifecycle
	ORDER_CREATED: "ORDER_CREATED",
	ORDER_UPDATED: "ORDER_UPDATED",

	// Specimen lifecycle
	SPECIMENS_GENERATED: "SPECIMENS_GENERATED",
	LABEL_PRINTED: "LABEL_PRINTED",
	ORDER_READY_FOR_LAB: "ORDER_READY_FOR_LAB",
	SPECIMEN_SCANNED: "SPECIMEN_SCANNED",
	SPECIMEN_RECEIVED: "SPECIMEN_RECEIVED",
	SPECIMEN_IN_PROGRESS: "SPECIMEN_IN_PROGRESS",
	SPECIMEN_COMPLETED: "SPECIMEN_COMPLETED",
	SPECIMEN_REJECTED: "SPECIMEN_REJECTED",

	// Exam lifecycle
	EXAM_STARTED: "EXAM_STARTED",
	EXAM_RESULTS_SAVED: "EXAM_RESULTS_SAVED",
	EXAM_SENT_TO_VALIDATION: "EXAM_SENT_TO_VALIDATION",

	// Validation
	EXAM_APPROVED: "EXAM_APPROVED",
	EXAM_REJECTED: "EXAM_REJECTED",
	INCIDENCE_CREATED: "INCIDENCE_CREATED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/** AuditEvent.entityType values. */
export const AUDIT_ENTITY_TYPES = {
	WORK_ORDER: "WorkOrder",
	SAMPLE: "Sample",
	EXAM: "Exam",
	PATIENT: "Patient",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES];
