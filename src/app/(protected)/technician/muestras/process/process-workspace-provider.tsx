"use client";

/**
 * Process workspace provider — holds exam, fieldSchema, form state, dirty flag, action handlers.
 * @see docs/integration/phase-3.md Phase 3d.2
 */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProcessContext } from "@/lib/repositories/process-repository";
import type { ResultsRecord } from "@/lib/process/field-schema-types";
import {
	saveExamDraftAction,
	finalizeExamAction,
	sendToValidationAction,
	markExamStartedAction,
} from "./actions";
import { clearDraft, loadDraft, saveDraft } from "./draft-storage";

export interface ProcessWorkspaceContextValue {
	context: ProcessContext | null;
	loading: boolean;
	error: string | null;
	isDirty: boolean;
	setIsDirty: (dirty: boolean) => void;
	isSubmitting: boolean;
	/** Conflict from last save — show "Otro usuario modificó" + reload offer. */
	conflict: boolean;
	dismissConflict: () => void;
	/** Stored draft available for restore (Phase 3e.4). */
	pendingDraft: ResultsRecord | null;
	restoreDraft: () => ResultsRecord | null;
	clearPendingDraft: () => void;
	onSaveDraft: (results: ResultsRecord) => Promise<void>;
	onSendToValidation: (results: ResultsRecord) => Promise<void>;
	onReload: () => void;
	/** Persist draft to localStorage (Phase 3e.4). */
	persistDraft: (results: ResultsRecord) => void;
}

const ProcessWorkspaceContext =
	createContext<ProcessWorkspaceContextValue | null>(null);

export function useProcessWorkspace(): ProcessWorkspaceContextValue {
	const ctx = useContext(ProcessWorkspaceContext);
	if (!ctx) {
		throw new Error(
			"useProcessWorkspace must be used within ProcessWorkspaceProvider",
		);
	}
	return ctx;
}

type ProcessWorkspaceProviderProps = {
	children: ReactNode;
	initialContext: ProcessContext | null;
	displayId: string;
};

export function ProcessWorkspaceProvider({
	children,
	initialContext,
	displayId: _displayId,
}: ProcessWorkspaceProviderProps) {
	const router = useRouter();
	const [context] = useState<ProcessContext | null>(initialContext);
	const [loading] = useState(false);
	const [error] = useState<string | null>(null);
	const [isDirty, setIsDirty] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [conflict, setConflict] = useState(false);
	const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(
		initialContext?.exam?.updatedAt ?? null,
	);
	const [pendingDraft, setPendingDraft] = useState<ResultsRecord | null>(null);

	// Check for localStorage draft on mount (Phase 3e.4)
	useEffect(() => {
		if (!context?.exam?.id) return;
		const stored = loadDraft(context.exam.id);
		if (stored && Object.keys(stored).length > 0) {
			setPendingDraft(stored);
		}
	}, [context?.exam?.id]);

	const restoreDraft = useCallback((): ResultsRecord | null => {
		if (!context?.exam?.id) return null;
		const stored = loadDraft(context.exam.id);
		if (stored) {
			clearDraft(context.exam.id);
			setPendingDraft(null);
			return stored;
		}
		return null;
	}, [context?.exam?.id]);

	const clearPendingDraft = useCallback(() => {
		if (context?.exam?.id) clearDraft(context.exam.id);
		setPendingDraft(null);
	}, [context?.exam?.id]);

	const persistDraft = useCallback(
		(results: ResultsRecord) => {
			if (context?.exam?.id) saveDraft(context.exam.id, results);
		},
		[context?.exam?.id],
	);

	// Mark exam as started when opening (pending → inprogress)
	useEffect(() => {
		if (!context?.exam?.id || context.exam.status !== "pending") return;
		markExamStartedAction(context.exam.id)
			.then((status) => {
				if (status.ok && status.updatedAt != null) {
					setExpectedUpdatedAt(status.updatedAt);
				}
			})
			.catch(() => {
				// Non-fatal: exam may already be inprogress
			});
	}, [context?.exam?.id, context?.exam?.status, context?.exam?.updatedAt]);

	const onReload = useCallback(() => {
		router.refresh();
	}, [router]);

	const dismissConflict = useCallback(() => setConflict(false), []);

	const onSaveDraft = useCallback(
		async (results: ResultsRecord) => {
			if (!context?.exam?.id) return;
			setConflict(false);
			setIsSubmitting(true);
			try {
				const status = await saveExamDraftAction(
					context.exam.id,
					results,
					expectedUpdatedAt,
				);
				if (status.ok) {
					if (status.updatedAt != null) {
						setExpectedUpdatedAt(status.updatedAt);
					}
					toast.success("Borrador guardado");
					setIsDirty(false);
					saveDraft(context.exam.id, results);
				} else if (status.conflict) {
					setConflict(true);
					toast.error(status.error);
				} else {
					toast.error(status.error);
				}
			} catch {
				toast.error("No se pudo guardar el borrador");
			} finally {
				setIsSubmitting(false);
			}
		},
		[context?.exam?.id, expectedUpdatedAt, isDirty],
	);

	const onSendToValidation = useCallback(
		async (results: ResultsRecord) => {
			if (!context?.exam?.id) return;
			setConflict(false);
			setIsSubmitting(true);
			try {
				const examStatus = context.exam.status;
				if (examStatus === "inprogress" || examStatus === "pending") {
					const finalizeStatus = await finalizeExamAction(
						context.exam.id,
						results,
						expectedUpdatedAt,
					);
					if (!finalizeStatus.ok) {
						if (finalizeStatus.conflict) {
							setConflict(true);
						}
						toast.error(finalizeStatus.error);
						return;
					}
					if (finalizeStatus.updatedAt != null) {
						setExpectedUpdatedAt(finalizeStatus.updatedAt);
					}
				}

				const sendStatus = await sendToValidationAction(context.exam.id);
				if (sendStatus.ok) {
					clearDraft(context.exam.id);
					toast.success("Enviado a validación");
					router.push("/technician/muestras");
				} else {
					toast.error(sendStatus.error);
				}
			} catch {
				toast.error("No se pudo enviar a validación");
			} finally {
				setIsSubmitting(false);
			}
		},
		[context?.exam?.id, context?.exam?.status, expectedUpdatedAt, router],
	);

	const value: ProcessWorkspaceContextValue = {
		context,
		loading,
		error,
		isDirty,
		setIsDirty,
		isSubmitting,
		conflict,
		dismissConflict,
		pendingDraft,
		restoreDraft,
		clearPendingDraft,
		onSaveDraft,
		onSendToValidation,
		onReload,
		persistDraft,
	};

	return (
		<ProcessWorkspaceContext.Provider value={value}>
			{children}
		</ProcessWorkspaceContext.Provider>
	);
}
