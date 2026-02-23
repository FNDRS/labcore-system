"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSimplePdf } from "./pdf";
import type { GenerationModalState, QuickFilter, ReceptionOrder } from "./types";
import { filterAndSortOrders } from "./utils";
import {
	fetchReceptionOrders,
	generateSpecimensAction,
	lookupReceptionOrderByCode,
	markReadyForLabAction,
} from "./actions";

const INITIAL_MODAL_STATE: GenerationModalState = {
	open: false,
	orderId: "",
	displayId: "",
	patientName: "",
	specimens: [],
	printState: "pending",
	printAttempts: 0,
};

export function useReceptionInbox() {
	const [orders, setOrders] = useState<ReceptionOrder[]>([]);
	const [ordersLoading, setOrdersLoading] = useState(true);
	const [ordersError, setOrdersError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [activeFilter, setActiveFilter] = useState<QuickFilter>("Sin muestras");
	const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
	const [highlightedNewIds, setHighlightedNewIds] = useState<string[]>([]);
	const [generationModal, setGenerationModal] = useState<GenerationModalState>(INITIAL_MODAL_STATE);

	const loadOrders = useCallback(async () => {
		setOrdersLoading(true);
		setOrdersError(null);
		try {
			const data = await fetchReceptionOrders({
				quickFilter: activeFilter,
				search: search.trim() || undefined,
			});
			setOrders(data);
		} catch (err) {
			setOrdersError(err instanceof Error ? err.message : "Error al cargar órdenes");
			setOrders([]);
		} finally {
			setOrdersLoading(false);
		}
	}, [activeFilter, search]);

	useEffect(() => {
		loadOrders();
	}, [loadOrders]);

	const pendingCount = useMemo(
		() => orders.filter((order) => order.status === "Sin muestras").length,
		[orders],
	);

	const urgentPendingCount = useMemo(
		() =>
			orders.filter(
				(order) => order.status === "Sin muestras" && order.priority === "Urgente",
			).length,
		[orders],
	);

	const selectedOrder = useMemo(
		() => orders.find((order) => order.id === selectedOrderId) ?? null,
		[orders, selectedOrderId],
	);

	const visibleOrders = useMemo(
		() => filterAndSortOrders(orders, search, activeFilter),
		[activeFilter, orders, search],
	);

	async function findOrderByScannedCode(raw: string): Promise<ReceptionOrder | null> {
		const code = raw.trim();
		if (!code) return null;
		return lookupReceptionOrderByCode(code);
	}

	useEffect(() => {
		if (highlightedNewIds.length === 0) return;
		const timeoutId = window.setTimeout(() => setHighlightedNewIds([]), 1800);
		return () => window.clearTimeout(timeoutId);
	}, [highlightedNewIds]);

	async function runGenerateSpecimens(order: ReceptionOrder) {
		if (order.status !== "Sin muestras") return;

		setGenerationModal({
			open: true,
			orderId: order.id,
			displayId: order.displayId,
			patientName: order.patientName,
			specimens: [],
			printState: "pending",
			printAttempts: 0,
		});

		const result = await generateSpecimensAction(order.id);

		if (!result.ok) {
			setGenerationModal((prev) => ({
				...prev,
				specimens: [],
				printState: "error",
			}));
			return;
		}

		// Map barcodes to specimens for display (tube label from barcode pattern)
		const specimens = result.barcodes.map((barcode, i) => ({
			tubeLabel: `Muestra ${i + 1}`,
			examCount: 1,
			specimenCode: barcode,
		}));

		setGenerationModal((prev) => ({
			...prev,
			specimens,
			printState: "pending",
		}));
	}

	async function downloadSpecimensPdf() {
		if (!generationModal.orderId) return;
		if (generationModal.printState === "generating") return;

		setGenerationModal((prev) => ({
			...prev,
			printState: "generating",
			printAttempts: prev.printAttempts + 1,
		}));

		try {
			await new Promise((resolve) => window.setTimeout(resolve, 300));

			const lines = [
				"LabCore - Etiquetas de muestras",
				`Orden: ${generationModal.displayId}`,
				`Paciente: ${generationModal.patientName}`,
				"",
				...generationModal.specimens.map(
					(specimen) =>
						`${specimen.tubeLabel} | ${specimen.examCount} exámenes | Código: ${specimen.specimenCode}`,
				),
			];

			const pdfBlob = createSimplePdf(lines);
			const url = URL.createObjectURL(pdfBlob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = `etiquetas-${generationModal.displayId.replace(/#/g, "")}.pdf`;
			anchor.click();
			URL.revokeObjectURL(url);

			setGenerationModal((prev) => ({ ...prev, printState: "printed" }));
			setHighlightedNewIds((prev) => [...prev, generationModal.orderId]);
			await loadOrders();
		} catch {
			setGenerationModal((prev) => ({ ...prev, printState: "error" }));
		}
	}

	async function confirmReadyForLab() {
		if (!generationModal.orderId) return;

		const result = await markReadyForLabAction(generationModal.orderId);
		setGenerationModal((prev) => ({ ...prev, open: false }));

		if (result.ok) {
			await loadOrders();
		}
	}

	function setGenerationModalOpen(open: boolean) {
		if (generationModal.printState === "generating" && !open) return;
		setGenerationModal((prev) => ({ ...prev, open }));
	}

	return {
		orders,
		ordersLoading,
		ordersError,
		search,
		activeFilter,
		selectedOrderId,
		highlightedNewIds,
		generationModal,
		pendingCount,
		urgentPendingCount,
		selectedOrder,
		visibleOrders,
		setSearch,
		setActiveFilter,
		setSelectedOrderId,
		runGenerateSpecimens,
		downloadSpecimensPdf,
		confirmReadyForLab,
		setGenerationModalOpen,
		findOrderByScannedCode,
		loadOrders,
	};
}
