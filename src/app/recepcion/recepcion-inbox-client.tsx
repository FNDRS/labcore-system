"use client";

import { useState, useCallback } from "react";
import { ScanBarcode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReceptionGenerationDialog } from "./components/reception-generation-dialog";
import { ReceptionOrderSheet } from "./components/reception-order-sheet";
import { ReceptionOrdersTable } from "./components/reception-orders-table";
import { ReceptionScanOverlay, type ScanStatus } from "./components/reception-scan-overlay";
import { ReceptionSearchFilters } from "./components/reception-search-filters";
import { useReceptionInbox } from "./use-reception-inbox";

export function ReceptionInboxClient() {
  const {
    search,
    activeFilter,
    selectedOrder,
    highlightedNewIds,
    generationModal,
    pendingCount,
    urgentPendingCount,
    visibleOrders,
    setSearch,
    setActiveFilter,
    setSelectedOrderId,
    runGenerateSpecimens,
    downloadSpecimensPdf,
    confirmReadyForLab,
    setGenerationModalOpen,
    findOrderByScannedCode,
  } = useReceptionInbox();

  const [scanModeOpen, setScanModeOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");

  const handleScannedCode = useCallback(
    (code: string) => {
      setScanStatus("searching");
      const order = findOrderByScannedCode(code);
      const delay = order ? 300 : 800;
      window.setTimeout(() => {
        if (order) {
          setSelectedOrderId(order.id);
          setScanModeOpen(false);
          setScanStatus("idle");
        } else {
          setScanStatus("not_found");
        }
      }, delay);
    },
    [findOrderByScannedCode, setSelectedOrderId]
  );

  const openManualEntry = useCallback(() => {
    setScanStatus("manual");
  }, []);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="rounded-xl border border-zinc-200 bg-white p-6 shadow-none">
          <div className="flex flex-col gap-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                  Órdenes entrantes
                </h1>
                <p className="text-muted-foreground text-sm">
                  Convierte órdenes en muestras listas para el flujo técnico.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="rounded-full"
                  size="lg"
                  variant={scanModeOpen ? "secondary" : "default"}
                  onClick={() => {
                    setScanModeOpen(true);
                    setScanStatus("idle");
                  }}
                >
                  <ScanBarcode
                    className={`mr-2 size-4 ${scanModeOpen ? "animate-pulse" : ""}`}
                    aria-hidden
                  />
                  Escanear orden
                </Button>
                <Badge variant="secondary">{pendingCount} pendientes</Badge>
              </div>
            </header>

            {urgentPendingCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-950/30">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  ⚠ {urgentPendingCount}{" "}
                  {urgentPendingCount === 1
                    ? "orden urgente pendiente"
                    : "órdenes urgentes pendientes"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/50"
                  onClick={() => setActiveFilter("Urgentes")}
                >
                  Atender ahora
                </Button>
              </div>
            )}

            <ReceptionSearchFilters
              search={search}
              activeFilter={activeFilter}
              onSearchChange={setSearch}
              onFilterChange={setActiveFilter}
            />

            <ReceptionOrdersTable
              orders={visibleOrders}
              highlightedNewIds={highlightedNewIds}
              onSelectOrder={setSelectedOrderId}
              onGenerateForOrder={(order) => {
                runGenerateSpecimens(order);
                setSelectedOrderId(order.id);
              }}
            />
          </div>
        </Card>
      </div>

      <ReceptionScanOverlay
        open={scanModeOpen}
        status={scanStatus}
        onClose={() => {
          setScanModeOpen(false);
          setScanStatus("idle");
        }}
        onManualEntry={openManualEntry}
        onBackToScan={() => setScanStatus("idle")}
        onRetry={() => setScanStatus("idle")}
        onScannedCode={handleScannedCode}
      />

      <ReceptionOrderSheet
        order={selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
        onGenerate={runGenerateSpecimens}
      />

      <ReceptionGenerationDialog
        state={generationModal}
        onOpenChange={setGenerationModalOpen}
        onDownloadPdf={downloadSpecimensPdf}
        onReady={confirmReadyForLab}
      />
    </main>
  );
}
