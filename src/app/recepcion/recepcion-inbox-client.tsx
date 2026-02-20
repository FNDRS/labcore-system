"use client";

import { Badge } from "@/components/ui/badge";
import { ReceptionGenerationDialog } from "./components/reception-generation-dialog";
import { ReceptionOrderSheet } from "./components/reception-order-sheet";
import { ReceptionOrdersTable } from "./components/reception-orders-table";
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
    visibleOrders,
    setSearch,
    setActiveFilter,
    setSelectedOrderId,
    runGenerateSpecimens,
    downloadSpecimensPdf,
    confirmReadyForLab,
    setGenerationModalOpen,
  } = useReceptionInbox();

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Órdenes entrantes</h1>
            <p className="text-muted-foreground text-sm">
              Convierte órdenes en muestras listas para el flujo técnico.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{pendingCount} pendientes</Badge>
          </div>
        </header>

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
