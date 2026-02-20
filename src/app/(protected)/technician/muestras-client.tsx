"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Package,
  Printer,
  Search,
  ScanLine,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MuestrasSummary, SampleWorkstationRow, SampleWorkstationStatus } from "./actions";

const FILTERS = [
  { value: "All", label: "Todos" },
  { value: "Processing", label: "En proceso" },
  { value: "Received", label: "Recibidas" },
  { value: "Urgent", label: "Urgentes" },
  { value: "Flagged", label: "Marcadas" },
  { value: "Mine", label: "Mis muestras" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

function StatusBadge({ status }: { status: SampleWorkstationStatus }) {
  const config: Record<
    SampleWorkstationStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    Received: {
      label: "Received",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      icon: <Package className="size-3.5" />,
    },
    Processing: {
      label: "Processing",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
      icon: <Loader2 className="size-3.5 animate-spin" />,
    },
    "Waiting Equipment": {
      label: "Waiting Eq.",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
      icon: <Wrench className="size-3.5" />,
    },
    Completed: {
      label: "Completed",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
      icon: <CheckCircle2 className="size-3.5" />,
    },
    Flagged: {
      label: "Flagged",
      className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
      icon: <AlertCircle className="size-3.5" />,
    },
  };
  const { label, className, icon } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

function filterRows(rows: SampleWorkstationRow[], filter: Filter): SampleWorkstationRow[] {
  if (filter === "All") return rows;
  if (filter === "Processing")
    return rows.filter((r) => r.status === "Processing" || r.status === "Waiting Equipment");
  if (filter === "Received") return rows.filter((r) => r.status === "Received");
  if (filter === "Urgent") return rows.filter((r) => r.priority === "Urgent");
  if (filter === "Flagged") return rows.filter((r) => r.status === "Flagged");
  if (filter === "Mine") return rows.filter((r) => r.assignedToMe);
  return rows;
}

// —— Scan bar (sticky) ———————————————————————————————————————————————————————
export function ScanBar({
  scanValue,
  onScanChange,
  onScan,
  onOpenScanModal,
  lastScannedId,
  scannerStatus,
}: {
  scanValue: string;
  onScanChange: (v: string) => void;
  onScan: () => void;
  onOpenScanModal: () => void;
  lastScannedId: string | null;
  scannerStatus: "listo" | "ocupado" | "error";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <label htmlFor="scan-input" className="text-muted-foreground text-sm font-medium">
            Escanear muestra:
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
            <Input
              ref={inputRef}
              id="scan-input"
              type="text"
              placeholder="Código o ID (#LC-9024)"
              value={scanValue}
              onChange={(e) => onScanChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onScan()}
              className="font-mono"
              autoFocus
            />
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 focus-visible:ring-primary"
              onClick={onOpenScanModal}
            >
              <ScanLine className="size-4 sm:mr-1" />
              <span className="hidden sm:inline">Escanear</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanSampleDialog({
  open,
  onOpenChange,
  scanValue,
  onScanChange,
  onConfirmScan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanValue: string;
  onScanChange: (v: string) => void;
  onConfirmScan: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="size-5 text-orange-500" />
            Escanear muestra
          </DialogTitle>
          <DialogDescription>
            Pasa el código por el lector o escribe el ID manualmente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <label htmlFor="scan-modal-input" className="text-muted-foreground text-sm">
            Código o ID de muestra
          </label>
          <Input
            id="scan-modal-input"
            type="text"
            placeholder="Ej. #LC-9024"
            value={scanValue}
            onChange={(e) => onScanChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onConfirmScan()}
            className="font-mono"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 focus-visible:ring-primary"
            onClick={onConfirmScan}
          >
            Escanear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// —— Status summary (mini cards) —————————————————————————————————————————————
export function StatusSummary({ summary }: { summary: MuestrasSummary }) {
  const cards = [
    { label: "Completadas", value: summary.completed, key: "completed" },
    { label: "Recibidas", value: summary.received, key: "received" },
    { label: "Pendientes", value: summary.pending, key: "pending" },
    { label: "Urgentes", value: summary.urgent, key: "urgent" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(({ label, value, key }) => (
        <div key={key} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
        </div>
      ))}
    </div>
  );
}

// —— Filters (keyboard 1–6) ———————————————————————————————————————————————————
export function MuestrasFilters({
  filter,
  onFilter,
}: {
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input") || target.closest("textarea")) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const i = parseInt(e.key, 10);
      if (i >= 1 && i <= FILTERS.length) {
        e.preventDefault();
        onFilter(FILTERS[i - 1].value);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onFilter]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((f, i) => (
        <Button
          key={f.value}
          variant={filter === f.value ? "default" : "outline"}
          size="sm"
          className={
            filter === f.value
              ? "rounded-xl bg-primary hover:bg-primary/90 focus-visible:ring-primary"
              : "rounded-xl"
          }
          onClick={() => onFilter(f.value)}
        >
          {f.label}
          <span className="text-muted-foreground ml-1.5 text-[10px]">({i + 1})</span>
        </Button>
      ))}
    </div>
  );
}

// —— Table with quick actions ———————————————————————————————————————————————
export function MuestrasTable({
  rows,
  filter,
  searchQuery,
  selectedId,
  highlightedId,
  onSelect,
  onMarkReceived,
  onProcess,
  onReportProblem,
  tableRef,
  rowRefs,
}: {
  rows: SampleWorkstationRow[];
  filter: Filter;
  searchQuery: string;
  selectedId: string | null;
  highlightedId: string | null;
  onSelect: (id: string) => void;
  onMarkReceived: (id: string) => void;
  onProcess: (id: string) => void;
  onReportProblem: (id: string) => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
  rowRefs: (id: string) => (el: HTMLTableRowElement | null) => void;
}) {
  const filtered = filterRows(rows, filter).filter((row) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      row.sampleId.toLowerCase().includes(q) ||
      row.patientName.toLowerCase().includes(q) ||
      row.testType.toLowerCase().includes(q)
    );
  });

  return (
    <div ref={tableRef} className="overflow-hidden rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/60 hover:bg-transparent">
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              ID
            </TableHead>
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Paciente
            </TableHead>
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Prueba
            </TableHead>
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estado
            </TableHead>
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Prioridad
            </TableHead>
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Espera
            </TableHead>
            <TableHead className="h-12 w-[220px] px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Acción
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                No hay muestras en esta vista.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((row) => (
              <TableRow
                key={row.id}
                ref={rowRefs(row.id)}
                className={`border-b border-border/40 transition-colors hover:bg-muted/70 ${
                  highlightedId === row.id
                    ? "bg-orange-100/80 dark:bg-orange-950/30"
                    : selectedId === row.id
                      ? "bg-muted/50"
                      : ""
                }`}
              >
                <TableCell className="px-4 py-3 font-mono text-sm font-semibold text-muted-foreground">
                  {row.sampleId}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm font-semibold">{row.patientName}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  {row.testType}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  {row.priority}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  {row.waitMins > 0 ? `${row.waitMins} min` : "—"}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      className="text-orange-500 hover:text-orange-600 text-xs font-medium underline-offset-2 hover:underline"
                      onClick={() => onSelect(row.id)}
                    >
                      Ver
                    </button>
                    <span className="text-muted-foreground">·</span>
                    {row.status !== "Received" &&
                      row.status !== "Completed" &&
                      row.status !== "Flagged" && (
                        <>
                          <button
                            type="button"
                            className="text-orange-500 hover:text-orange-600 text-xs font-medium underline-offset-2 hover:underline"
                            onClick={() => onMarkReceived(row.id)}
                          >
                            Marcar recibida
                          </button>
                          <span className="text-muted-foreground">·</span>
                        </>
                      )}
                    {row.status !== "Completed" && row.status !== "Flagged" && (
                      <>
                        <button
                          type="button"
                          className="text-orange-500 hover:text-orange-600 text-xs font-medium underline-offset-2 hover:underline"
                          onClick={() => onProcess(row.id)}
                        >
                          Procesar
                        </button>
                        <span className="text-muted-foreground">·</span>
                      </>
                    )}
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium underline-offset-2 hover:underline"
                      onClick={() => onReportProblem(row.id)}
                    >
                      Reportar problema
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground ml-1 inline-flex size-7 items-center justify-center rounded-md transition-colors"
                          aria-label="Más opciones"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onSelect(row.id)}>
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onProcess(row.id)}>
                          Procesar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMarkReceived(row.id)}>
                          Marcar recibida
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onReportProblem(row.id)}
                        >
                          Reportar problema
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// —— Side panel (detail + actions) —————————————————————————————————────────——
const MOCK_HISTORY = [
  { at: "08:24", event: "En proceso" },
  { at: "08:20", event: "Recibida" },
  { at: "08:00", event: "Recolección" },
];

export function SampleDetailSheet({
  sample,
  open,
  onOpenChange,
  onProcess,
  onReportIncident,
  onReprintLabel,
}: {
  sample: SampleWorkstationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcess: (id: string) => void;
  onReportIncident: (id: string) => void;
  onReprintLabel: (id: string) => void;
}) {
  if (!sample) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle className="font-mono text-lg">{sample.sampleId}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-1">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Paciente: </span>
              <span className="font-medium">{sample.patientName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Pruebas: </span>
              {sample.testType}
            </p>
            <p>
              <span className="text-muted-foreground">Tipo de muestra: </span>
              {sample.sampleType}
            </p>
            <p>
              <span className="text-muted-foreground">Hora recolección: </span>
              {sample.collectedAt ?? "—"}
            </p>
            {sample.notes && (
              <p>
                <span className="text-muted-foreground">Notas: </span>
                {sample.notes}
              </p>
            )}
          </div>
          <div>
            <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
              Historial
            </h4>
            <ul className="space-y-1.5 text-sm">
              {(sample.notes ? MOCK_HISTORY : MOCK_HISTORY).map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">{h.at}</span>
                  <span>{h.event}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <SheetFooter className="flex flex-col gap-2 sm:flex-col">
          {sample.status !== "Completed" && sample.status !== "Flagged" && (
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500"
              onClick={() => onProcess(sample.id)}
            >
              Procesar
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => onReportIncident(sample.id)}>
            Marcar incidencia
          </Button>
          <Button variant="outline" className="w-full" onClick={() => onReprintLabel(sample.id)}>
            <Printer className="size-4 mr-2" />
            Reimprimir etiqueta
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// —— Main workstation ————————————————————————————————————————————————————————
export function MuestrasWorkstation({
  initialSamples,
}: {
  initialSamples: SampleWorkstationRow[];
  summary?: MuestrasSummary;
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

  const rowRefs = useCallback(
    (id: string) => (el: HTMLTableRowElement | null) => {
      rowRefsMap.current[id] = el;
    },
    []
  );

  const selectedSample = selectedId ? (samples.find((s) => s.id === selectedId) ?? null) : null;

  const summary: MuestrasSummary = {
    completed: samples.filter((s) => s.status === "Completed").length,
    received: samples.filter((s) => s.status === "Received").length,
    pending: samples.filter((s) => s.status === "Processing" || s.status === "Waiting Equipment")
      .length,
    urgent: samples.filter((s) => s.priority === "Urgent").length,
    issues: samples.filter((s) => s.status === "Flagged").length,
  };

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
      // Scroll to row
      const rowEl = rowRefsMap.current[found.id];
      if (rowEl && tableRef.current) {
        rowEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      // Clear highlight after a short time
      setTimeout(() => setHighlightedId(null), 2000);
    } else {
      setScannerStatus("error");
      setTimeout(() => setScannerStatus("listo"), 1500);
    }
  }, [scanValue, samples]);

  const handleScanFromModal = () => {
    handleScan();
    setScanModalOpen(false);
  };

  const openPanel = (id: string) => {
    setSelectedId(id);
    setPanelOpen(true);
  };

  const onMarkReceived = (id: string) => {
    setSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "Received" as const } : s))
    );
  };

  const onProcess = (id: string) => {
    setSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "Processing" as const } : s))
    );
    setPanelOpen(false);
  };

  const onReportProblem = (id: string) => {
    setSamples((prev) => prev.map((s) => (s.id === id ? { ...s, status: "Flagged" as const } : s)));
    setPanelOpen(false);
  };

  const onReprintLabel = (_id: string) => {
    // TODO: integración impresora
    setPanelOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      <ScanSampleDialog
        open={scanModalOpen}
        onOpenChange={setScanModalOpen}
        scanValue={scanValue}
        onScanChange={setScanValue}
        onConfirmScan={handleScanFromModal}
      />
      <ScanBar
        scanValue={scanValue}
        onScanChange={setScanValue}
        onScan={handleScan}
        onOpenScanModal={() => setScanModalOpen(true)}
        lastScannedId={lastScannedId}
        scannerStatus={scannerStatus}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-6xl space-y-4">
          <StatusSummary summary={summary} />
          <div className="flex flex-wrap items-center justify-between gap-3 mt-8">
            <h2 className="text-sm font-medium text-muted-foreground">Cola de muestras</h2>
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
