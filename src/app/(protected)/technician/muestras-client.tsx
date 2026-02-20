"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SampleWorkstationRow } from "./actions";
import {
  type Filter,
  type MuestrasSummaryUI,
  MuestrasFilters,
  MuestrasTable,
  SampleDetailSheet,
  ScanBar,
  ScanSampleDialog,
  StatusSummary,
} from "./muestras";

export function MuestrasWorkstation({
  initialSamples,
}: {
  initialSamples: SampleWorkstationRow[];
  summary?: MuestrasSummaryUI;
}) {
  const [samples, setSamples] = useState(initialSamples);
  const [scanValue, setScanValue] = useState("");
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState<"listo" | "ocupado" | "error">("listo");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const rowRefsMap = useRef<Record<string, HTMLTableRowElement | null>>({});
  const router = useRouter();

  const rowRefs = useCallback(
    (id: string) => (el: HTMLTableRowElement | null) => {
      rowRefsMap.current[id] = el;
    },
    []
  );

  const selectedSample = selectedId ? (samples.find((s) => s.id === selectedId) ?? null) : null;

  const summary: MuestrasSummaryUI = {
    completed: samples.filter((s) => s.status === "Completed").length,
    received: samples.filter((s) => s.status === "Received").length,
    pending: samples.filter((s) => s.status === "Processing" || s.status === "Waiting Equipment")
      .length,
    urgent: samples.filter((s) => s.priority === "Urgent").length,
    issues: samples.filter((s) => s.status === "Flagged").length,
  };

  const openPanel = useCallback((id: string) => {
    setSelectedId(id);
    setPanelOpen(true);
  }, []);

  const handleScan = useCallback(() => {
    const q = scanValue.trim();
    if (!q) return;
    const found = samples.find(
      (s) => s.sampleId.toLowerCase().includes(q.toLowerCase()) || s.id === q
    );
    if (found) {
      setLastScannedId(found.sampleId);
      setHighlightedId(found.id);
      setScannerStatus("listo");
      setScanValue("");
      openPanel(found.id);
      const rowEl = rowRefsMap.current[found.id];
      if (rowEl && tableRef.current) {
        rowEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      setTimeout(() => setHighlightedId(null), 2000);
    } else {
      setScannerStatus("error");
      setTimeout(() => setScannerStatus("listo"), 1500);
    }
  }, [scanValue, samples, openPanel]);

  const handleScanFromModal = () => {
    handleScan();
    setScanModalOpen(false);
  };

  const onMarkReceived = (id: string) => {
    setSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "Received" as const } : s))
    );
  };

  const onProcess = (id: string) => {
    const sample = samples.find((s) => s.id === id);
    setPanelOpen(false);
    router.push(
      `/technician/muestras/process/${id}?sampleId=${encodeURIComponent(sample?.sampleId ?? "")}`
    );
  };

  const onReportProblem = (id: string) => {
    setSamples((prev) => prev.map((s) => (s.id === id ? { ...s, status: "Flagged" as const } : s)));
    setPanelOpen(false);
  };

  const onReprintLabel = (id: string) => {
    void id; // TODO: integración impresora
    setPanelOpen(false);
  };

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
            <StatusSummary summary={summary} />
            <div className="mt-8 space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Cola de muestras</h2>
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
              <MuestrasTable
                rows={samples}
                filter={filter}
                searchQuery={searchQuery}
                selectedId={selectedId}
                highlightedId={highlightedId}
                onSelect={openPanel}
                onMarkReceived={onMarkReceived}
                onProcess={onProcess}
                onReportProblem={onReportProblem}
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
      />
    </div>
  );
}
