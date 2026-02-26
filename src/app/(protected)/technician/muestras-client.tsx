"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FilteredQueueView,
  MuestrasFilters,
  SampleDetailSheet,
  ScanBar,
  ScanSampleDialog,
  StatusSummary,
} from "./muestras";
import {
  TechnicianWorkstationProvider,
  useTechnicianWorkstation,
} from "./technician-workstation-context";

const SKELETON_TABLE_ROWS = 6;
const SKELETON_TABLE_COLS = 5;

function MuestrasSkeleton() {
  return (
    <div className="flex h-full flex-col bg-zinc-50">
      <div className="pt-4">
        <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-none">
          <div className="flex flex-wrap items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full max-w-md flex-1 rounded-md sm:max-w-sm" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        </Card>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <div className="w-full space-y-4">
          <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-none">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-center"
                >
                  <Skeleton className="mx-auto h-8 w-12" />
                  <Skeleton className="mx-auto mt-2 h-3 w-20" />
                </div>
              ))}
            </div>
            <div className="mt-8 space-y-3">
              <Skeleton className="h-4 w-36" />
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-11 w-full max-w-sm rounded-full sm:w-72" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    {Array.from({ length: SKELETON_TABLE_COLS }).map((_, i) => (
                      <TableHead key={i} className="h-12 px-4 py-3">
                        <Skeleton className="h-3 w-14" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: SKELETON_TABLE_ROWS }).map((_, rowIndex) => (
                    <TableRow key={rowIndex} className="border-b border-border/40">
                      {Array.from({ length: SKELETON_TABLE_COLS }).map((_, colIndex) => (
                        <TableCell key={colIndex} className="px-4 py-4">
                          <Skeleton
                            className="h-4 w-full"
                            style={{
                              maxWidth:
                                colIndex === 0 ? 200 : colIndex === 1 ? 140 : 100,
                            }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MuestrasContent() {
  const {
    state: {
      samples,
      samplesLoading,
      samplesError,
      scanValue,
      scanModalOpen,
      lastScannedId,
      scannerStatus,
      highlightedId,
      filter,
      searchQuery,
      selectedId,
      panelOpen,
      selectedSample,
      detailLoading,
      actionError,
    },
    actions: {
      setScanValue,
      setScanModalOpen,
      setFilter,
      setSearchQuery,
      setPanelOpen,
      handleScan,
      onProcess,
      onReportProblem,
      onReprintLabel,
    },
  } = useTechnicianWorkstation();

  const tableRef = useRef<HTMLDivElement>(null);
  const rowRefsMap = useRef<Record<string, HTMLTableRowElement | null>>({});

  const rowRefs = (id: string) => (el: HTMLTableRowElement | null) => {
    rowRefsMap.current[id] = el;
  };

  useEffect(() => {
    if (highlightedId && rowRefsMap.current[highlightedId] && tableRef.current) {
      rowRefsMap.current[highlightedId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [highlightedId]);

  const summary = {
    completed: samples.filter((s) => s.status === "Completed").length,
    received: samples.filter((s) => s.status === "Received").length,
    pending: samples.filter(
      (s) => s.status === "Processing" || s.status === "Waiting Equipment",
    ).length,
    urgent: samples.filter((s) => s.priority === "Urgent").length,
    issues: samples.filter((s) => s.status === "Flagged").length,
  };

  const handleScanFromModal = () => {
    handleScan();
    setScanModalOpen(false);
  };

  if (samplesError) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-center text-sm text-muted-foreground">
          {samplesError}
        </p>
      </div>
    );
  }

  if (samplesLoading && samples.length === 0) {
    return <MuestrasSkeleton />;
  }

  return (
    <div className="flex h-full flex-col bg-zinc-50">
      <ScanSampleDialog
        open={scanModalOpen}
        onOpenChange={setScanModalOpen}
        scanValue={scanValue}
        onScanChange={setScanValue}
        onConfirmScan={handleScanFromModal}
      />
      <div className="pt-4">
        <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-none">
          <ScanBar
            scanValue={scanValue}
            onScanChange={setScanValue}
            onScan={handleScan}
            onOpenScanModal={() => setScanModalOpen(true)}
            lastScannedId={lastScannedId}
            scannerStatus={scannerStatus}
          />
        </Card>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <div className="w-full space-y-4">
          <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-none">
            {actionError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {actionError}
              </div>
            )}
            <StatusSummary summary={summary} />
            <div className="mt-8 space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Cola de muestras
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full min-w-0 max-w-sm sm:w-72">
                  <Search className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Buscar por ID, paciente, prueba..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 rounded-full border-border/70 bg-card pl-10 pr-10 text-sm shadow-none transition-colors placeholder:text-muted-foreground/80 focus-visible:border-slate-400/50 focus-visible:ring-0"
                    aria-label="Buscar muestras"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <MuestrasFilters filter={filter} onFilter={setFilter} />
              </div>
            </div>
            <div className="mt-4">
              <FilteredQueueView
                filter={filter}
                tableRef={tableRef}
                rowRefs={rowRefs}
              />
            </div>
          </Card>
        </div>
      </div>
      <SampleDetailSheet
        sample={selectedSample}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onProcess={onProcess}
        onReportIncident={onReportProblem}
        onReprintLabel={onReprintLabel}
        detailLoading={detailLoading}
      />
    </div>
  );
}

export function MuestrasWorkstation({
  initialSampleId,
}: { initialSampleId?: string | null } = {}) {
  return (
    <TechnicianWorkstationProvider initialSampleId={initialSampleId}>
      <div className="flex min-h-0 flex-1 flex-col">
        <MuestrasContent />
      </div>
    </TechnicianWorkstationProvider>
  );
}
