import { useEffect, useMemo, useState } from "react";
import { INITIAL_ORDERS } from "./constants";
import { createSimplePdf } from "./pdf";
import type { GenerationModalState, QuickFilter, ReceptionOrder } from "./types";
import { filterAndSortOrders, generateSpecimens } from "./utils";

const INITIAL_MODAL_STATE: GenerationModalState = {
  open: false,
  orderId: "",
  patientName: "",
  specimens: [],
  printState: "pending",
  printAttempts: 0,
};

export function useReceptionInbox() {
  const [orders, setOrders] = useState<ReceptionOrder[]>(INITIAL_ORDERS);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("Sin muestras");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [highlightedNewIds, setHighlightedNewIds] = useState(
    INITIAL_ORDERS.filter((order) => order.isNew).map((order) => order.id)
  );
  const [generationModal, setGenerationModal] = useState<GenerationModalState>(INITIAL_MODAL_STATE);

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === "Sin muestras").length,
    [orders]
  );

  const urgentPendingCount = useMemo(
    () => orders.filter((order) => order.status === "Sin muestras" && order.priority === "Urgente").length,
    [orders]
  );

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const visibleOrders = useMemo(
    () => filterAndSortOrders(orders, search, activeFilter),
    [activeFilter, orders, search]
  );

  function findOrderByScannedCode(raw: string): ReceptionOrder | null {
    const code = raw.trim();
    if (!code) return null;
    const id = code.startsWith("#") ? code : `#${code}`;
    return orders.find((o) => o.id === id) ?? null;
  }

  useEffect(() => {
    if (highlightedNewIds.length === 0) return;
    const timeoutId = window.setTimeout(() => setHighlightedNewIds([]), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedNewIds]);

  function runGenerateSpecimens(order: ReceptionOrder) {
    if (order.status !== "Sin muestras") return;

    setGenerationModal({
      open: true,
      orderId: order.id,
      patientName: order.patientName,
      specimens: generateSpecimens(order),
      printState: "pending",
      printAttempts: 0,
    });
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
      await new Promise((resolve) => window.setTimeout(resolve, 450));

      const lines = [
        "LabCore - Etiquetas de muestras",
        `Orden: ${generationModal.orderId}`,
        `Paciente: ${generationModal.patientName}`,
        "",
        ...generationModal.specimens.map(
          (specimen) =>
            `${specimen.tubeLabel} | ${specimen.examCount} examenes | Codigo: ${specimen.specimenCode}`
        ),
      ];

      const pdfBlob = createSimplePdf(lines);
      const url = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `etiquetas-${generationModal.orderId.replace("#", "")}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);

      setOrders((prev) =>
        prev.map((current) =>
          current.id === generationModal.orderId
            ? { ...current, status: "Muestras creadas", isNew: false }
            : current
        )
      );

      setGenerationModal((prev) => ({ ...prev, printState: "printed" }));
    } catch {
      setGenerationModal((prev) => ({ ...prev, printState: "error" }));
    }
  }

  function confirmReadyForLab() {
    setGenerationModal((prev) => ({ ...prev, open: false }));
  }

  function setGenerationModalOpen(open: boolean) {
    if (generationModal.printState === "generating" && !open) return;
    setGenerationModal((prev) => ({ ...prev, open }));
  }

  return {
    orders,
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
  };
}
