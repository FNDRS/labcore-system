import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	CheckCircle2,
	ClipboardList,
	FlaskConical,
	Inbox,
	Info,
	Loader2,
	Package,
	Pencil,
	Printer,
	ScanBarcode,
	Send,
	FileDown,
	Truck,
	XCircle,
} from "lucide-react";
import { AUDIT_ACTIONS } from "@/lib/contracts";
import type { AuditAction } from "@/lib/contracts";

export type AuditActionCategory =
	| "creation"
	| "processing"
	| "validation"
	| "rejection"
	| "incidence"
	| "info";

export interface AuditActionLabel {
	label: string;
	category: AuditActionCategory;
	icon: LucideIcon;
}

/**
 * Canonical map from AuditEvent.action to Spanish label, category, and icon.
 * Used by Auditoría timeline and Incidencias feed.
 */
export const AUDIT_ACTION_LABELS: Record<AuditAction, AuditActionLabel> = {
	[AUDIT_ACTIONS.ORDER_CREATED]: {
		label: "Orden creada",
		category: "creation",
		icon: ClipboardList,
	},
	[AUDIT_ACTIONS.ORDER_UPDATED]: {
		label: "Orden actualizada",
		category: "info",
		icon: Pencil,
	},
	[AUDIT_ACTIONS.SPECIMENS_GENERATED]: {
		label: "Muestras generadas",
		category: "creation",
		icon: Package,
	},
	[AUDIT_ACTIONS.LABEL_PRINTED]: {
		label: "Etiqueta impresa",
		category: "creation",
		icon: Printer,
	},
	[AUDIT_ACTIONS.LABEL_REPRINTED]: {
		label: "Etiqueta reimpresa",
		category: "info",
		icon: Printer,
	},
	[AUDIT_ACTIONS.ORDER_READY_FOR_LAB]: {
		label: "Orden lista para laboratorio",
		category: "creation",
		icon: Truck,
	},
	[AUDIT_ACTIONS.SPECIMEN_SCANNED]: {
		label: "Muestra escaneada",
		category: "processing",
		icon: ScanBarcode,
	},
	[AUDIT_ACTIONS.SPECIMEN_RECEIVED]: {
		label: "Muestra recibida",
		category: "processing",
		icon: Inbox,
	},
	[AUDIT_ACTIONS.SPECIMEN_IN_PROGRESS]: {
		label: "Muestra en proceso",
		category: "processing",
		icon: Loader2,
	},
	[AUDIT_ACTIONS.SPECIMEN_COMPLETED]: {
		label: "Muestra completada",
		category: "processing",
		icon: CheckCircle2,
	},
	[AUDIT_ACTIONS.SPECIMEN_REJECTED]: {
		label: "Muestra rechazada",
		category: "rejection",
		icon: XCircle,
	},
	[AUDIT_ACTIONS.EXAM_STARTED]: {
		label: "Examen iniciado",
		category: "processing",
		icon: FlaskConical,
	},
	[AUDIT_ACTIONS.EXAM_RESULTS_SAVED]: {
		label: "Resultados guardados",
		category: "processing",
		icon: FileDown,
	},
	[AUDIT_ACTIONS.EXAM_SENT_TO_VALIDATION]: {
		label: "Enviado a validación",
		category: "validation",
		icon: Send,
	},
	[AUDIT_ACTIONS.EXAM_APPROVED]: {
		label: "Examen aprobado",
		category: "validation",
		icon: CheckCircle2,
	},
	[AUDIT_ACTIONS.EXAM_REJECTED]: {
		label: "Examen rechazado",
		category: "rejection",
		icon: XCircle,
	},
	[AUDIT_ACTIONS.INCIDENCE_CREATED]: {
		label: "Incidencia creada",
		category: "incidence",
		icon: AlertTriangle,
	},
};

/**
 * Get label, category, and icon for an audit action string.
 * Returns a fallback for unknown actions (e.g. from future schema changes).
 */
export function getAuditActionLabel(
	action: string,
): AuditActionLabel {
	const known = AUDIT_ACTION_LABELS[action as AuditAction];
	if (known) return known;
	return {
		label: action.replace(/_/g, " ").toLowerCase(),
		category: "info",
		icon: Info,
	};
}
