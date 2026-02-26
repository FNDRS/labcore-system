"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSimplePdf } from "./pdf";
import type { GenerationModalState, QuickFilter, ReceptionOrder } from "./types";
import { filterAndSortOrders } from "./utils";
import {
	fetchReceptionOrders,
	generateSpecimensAction,
	markLabelsPrintedAction,
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
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [activeFilter, setActiveFilter] = useState<QuickFilter>("Sin muestras");
	const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
	const [highlightedNewIds, setHighlightedNewIds] = useState<string[]>([]);
	const [generationModal, setGenerationModal] = useState<GenerationModalState>(INITIAL_MODAL_STATE);
	const latestLoadIdRef = useRef(0);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setDebouncedSearch(search);
		}, 250);
		return () => window.clearTimeout(timeoutId);
	}, [search]);

	const nextTokenRef = useRef<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [loadMoreLoading, setLoadMoreLoading] = useState(false);

	const loadOrders = useCallback(async () => {
		const loadId = ++latestLoadIdRef.current;
		setOrdersLoading(true);
		setOrdersError(null);
		try {
			const { orders: data, nextToken: nt, hasMore: more } = await fetchReceptionOrders({});
			if (latestLoadIdRef.current !== loadId) return;
			setOrders(data);
			nextTokenRef.current = nt;
			setHasMore(more ?? false);
		} catch (err) {
			if (latestLoadIdRef.current !== loadId) return;
			setOrdersError(err instanceof Error ? err.message : "Error al cargar órdenes");
			setOrders([]);
		} finally {
			if (latestLoadIdRef.current !== loadId) return;
			setOrdersLoading(false);
		}
	}, []);

	const loadMore = useCallback(async () => {
		const token = nextTokenRef.current;
		if (!token || loadMoreLoading || ordersLoading) return;
		const loadId = ++latestLoadIdRef.current;
		setLoadMoreLoading(true);
		try {
			const { orders: data, nextToken: nt, hasMore: more } = await fetchReceptionOrders(
				{},
				{ nextToken: token }
			);
			if (latestLoadIdRef.current !== loadId) return;
			setOrders((prev) => [...prev, ...data]);
			nextTokenRef.current = nt;
			setHasMore(more ?? false);
		} catch (err) {
			if (latestLoadIdRef.current !== loadId) return;
			setOrdersError(err instanceof Error ? err.message : "Error al cargar órdenes");
		} finally {
			if (latestLoadIdRef.current !== loadId) return;
			setLoadMoreLoading(false);
		}
	}, [loadMoreLoading, ordersLoading]);

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
		() => filterAndSortOrders(orders, debouncedSearch, activeFilter),
		[activeFilter, orders, debouncedSearch],
	);

	async function findOrderByScannedCode(raw: string): Promise<ReceptionOrder | null> {
		const code = raw.trim();
		if (!code) return null;
		const normalized = code.startsWith("#") ? code.slice(1) : code;
		// Check local fetched orders first (instant when order is in view)
		const local = orders.find(
			(o) =>
				o.displayId === code ||
				o.displayId === normalized ||
				o.id === normalized ||
				o.displayId.replace("#", "") === normalized
		);
		if (local) return local;
		// Fall back to API lookup (for orders not yet loaded)
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
		if (generationModal.specimens.length === 0) {
			setGenerationModal((prev) => ({ ...prev, printState: "error" }));
			return;
		}

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

			const markPrintedResult = await markLabelsPrintedAction(generationModal.orderId);
			if (!markPrintedResult.ok) {
				setGenerationModal((prev) => ({ ...prev, printState: "error" }));
				return;
			}

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
		hasMore,
		loadMoreLoading,
		setSearch,
		setActiveFilter,
		setSelectedOrderId,
		runGenerateSpecimens,
		downloadSpecimensPdf,
		confirmReadyForLab,
		setGenerationModalOpen,
		findOrderByScannedCode,
		loadOrders,
		loadMore,
	};
}
