"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSimplePdf } from "./pdf";
import type { GenerationModalState, ReceptionOrder } from "./types";
import type { ReceptionListFilters } from "@/lib/repositories/reception-repository";
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

type UseReceptionInboxOptions = {
  initialOrders: ReceptionOrder[];
  initialHasMore: boolean;
  initialNextToken: string | null;
  filters: ReceptionListFilters;
};

export function useReceptionInbox({
  initialOrders,
  initialHasMore,
  initialNextToken,
  filters,
}: UseReceptionInboxOptions) {
  const router = useRouter();
  const [orders, setOrders] = useState<ReceptionOrder[]>(initialOrders);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [highlightedNewIds, setHighlightedNewIds] = useState<string[]>([]);
  const [generationModal, setGenerationModal] = useState<GenerationModalState>(INITIAL_MODAL_STATE);

  const nextTokenRef = useRef<string | null>(initialNextToken);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);

  const loadMore = useCallback(async () => {
    const token = nextTokenRef.current;
    if (!token || loadMoreLoading) return;
    setLoadMoreLoading(true);
    try {
      const {
        orders: data,
        nextToken: nt,
        hasMore: more,
      } = await fetchReceptionOrders(filters, { nextToken: token });
      setOrders((prev) => [...prev, ...data]);
      nextTokenRef.current = nt;
      setHasMore(more ?? false);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : "Error al cargar órdenes");
    } finally {
      setLoadMoreLoading(false);
    }
  }, [filters, loadMoreLoading]);

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === "Sin muestras").length,
    [orders]
  );

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
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
            `${specimen.tubeLabel} | ${specimen.examCount} exámenes | Código: ${specimen.specimenCode}`
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
      router.refresh();
    } catch {
      setGenerationModal((prev) => ({ ...prev, printState: "error" }));
    }
  }

  async function confirmReadyForLab() {
    if (!generationModal.orderId) return;

    const result = await markReadyForLabAction(generationModal.orderId);
    setGenerationModal((prev) => ({ ...prev, open: false }));

    if (result.ok) {
      router.refresh();
    }
  }

  function setGenerationModalOpen(open: boolean) {
    setGenerationModal((prev) => ({ ...prev, open }));
  }

  return {
    orders,
    ordersError,
    highlightedNewIds,
    generationModal,
    pendingCount,
    selectedOrder,
    hasMore,
    loadMoreLoading,
    setSelectedOrderId,
    runGenerateSpecimens,
    downloadSpecimensPdf,
    confirmReadyForLab,
    setGenerationModalOpen,
    findOrderByScannedCode,
    loadMore,
  };
}
