"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Clock, Search, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import type { NextSample, QueueRow, SampleStatus } from "./actions";

const FILTERS = [
  { value: "All", label: "Todos" },
  { value: "Processing", label: "En proceso" },
  { value: "Urgent", label: "Urgentes" },
  { value: "Flagged", label: "Marcadas" },
  { value: "My Queue", label: "Mis muestras" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

function StatusBadge({ status }: { status: SampleStatus }) {
  if (status === "Complete") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <CheckCircle2 className="size-3.5" />
        Complete
      </span>
    );
  }
  if (status === "Flagged") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
        <AlertCircle className="size-3.5" />
        Flagged
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
      <Clock className="size-3.5" />
      Processing
    </span>
  );
}

export function DashboardHeader() {
  return <div className="space-y-1"></div>;
}

export function NextSampleCard({ nextSample }: { nextSample: NextSample | null }) {
  const router = useRouter();

  if (!nextSample) {
    return (
      <div className="rounded-2xl border border-border bg-card px-6 py-8 text-center">
        <p className="text-muted-foreground">No hay muestras pendientes de procesar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-5">
      <p className="text-sm mb-6 font-semibold uppercase tracking-wide text-primary">
        Próxima muestra a procesar
      </p>
      <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2 md:grid-cols-4">
        <span>
          <span className="text-muted-foreground">Sample ID: </span>
          <span className="font-mono font-medium">{nextSample.sampleId}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Prueba: </span>
          {nextSample.testType}
        </span>
        <span>
          <span className="text-muted-foreground">Paciente: </span>
          {nextSample.patientName}
        </span>
        <span>
          <span className="text-muted-foreground">Prioridad: </span>
          {nextSample.priority}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tiempo en espera: {nextSample.waitMins} min
      </p>
      <Button className="mt-4 rounded-full" size="lg" onClick={() => router.push("/technician/muestras")}>
        Procesar ahora
      </Button>
    </div>
  );
}

export function QueueFilters({
  filter,
  onFilter,
}: {
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <Button
          key={f.value}
          variant={filter === f.value ? "default" : "outline"}
          size="sm"
          className="rounded-full"
          onClick={() => onFilter(f.value)}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}

function filterRows(rows: QueueRow[], filter: Filter): QueueRow[] {
  if (filter === "All") return rows;
  if (filter === "Processing") return rows.filter((r) => r.status === "Processing");
  if (filter === "Urgent") return rows.filter((r) => r.priority === "Urgent");
  if (filter === "Flagged") return rows.filter((r) => r.status === "Flagged");
  return rows;
}

function filterBySearch(rows: QueueRow[], query: string): QueueRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      r.sampleId.toLowerCase().includes(q) ||
      r.patientName.toLowerCase().includes(q) ||
      r.testType.toLowerCase().includes(q)
  );
}

export function QueueTable({
  rows,
  filter,
  searchQuery,
  onProcess,
}: {
  rows: QueueRow[];
  filter: Filter;
  searchQuery: string;
  onProcess: (id: string) => void;
}) {
  const filtered = filterBySearch(filterRows(rows, filter), searchQuery);

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader className="bg-zinc-50">
          <TableRow className="border-b border-border/60 hover:bg-transparent">
            <TableHead className="h-12 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sample ID
            </TableHead>
            <TableHead className="h-12 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Paciente
            </TableHead>
            <TableHead className="h-12 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Prueba
            </TableHead>
            <TableHead className="h-12 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Prioridad
            </TableHead>
            <TableHead className="h-12 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estado
            </TableHead>
            <TableHead className="h-12 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Espera
            </TableHead>
            <TableHead className="h-12 w-[120px] px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Acción
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow className="border-b border-border/40 hover:bg-transparent">
              <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                No hay muestras en esta vista.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((row) => (
              <TableRow
                key={row.id}
                className="border-b border-border/40 transition-colors hover:bg-muted/70"
              >
                <TableCell className="px-6 py-4 font-mono text-sm font-semibold text-muted-foreground">
                  {row.sampleId}
                </TableCell>
                <TableCell className="px-6 py-4 text-sm font-semibold">{row.patientName}</TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                  {row.testType}
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                  {row.priority}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                  {row.waitMins > 0 ? `${row.waitMins} min` : "—"}
                </TableCell>
                <TableCell className="px-6 py-4">
                  {row.status !== "Complete" ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-orange-500 underline-offset-4 hover:underline dark:text-orange-400"
                      onClick={() => onProcess(row.id)}
                    >
                      Procesar
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ScanSampleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setValue("");
    onOpenChange(next);
  };

  const handleScan = () => {
    // TODO: integrar con lector/API
    if (value.trim()) {
      handleOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="size-5 text-orange-500" />
            Escanear muestra
          </DialogTitle>
          <DialogDescription>
            Pasa el código de barras por el lector o escribe el ID de la muestra a continuación.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor="scan-input" className="text-muted-foreground text-sm">
            Código o ID de muestra
          </label>
          <Input
            id="scan-input"
            type="text"
            placeholder="Ej. #LC-9024 o código de barras"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            className="font-mono"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2 sm:flex-row sm:gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="rounded-full bg-primary hover:bg-primary/90 focus-visible:ring-primary"
            onClick={handleScan}
          >
            Escanear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DashboardQueueSection({ rows }: { rows: QueueRow[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const router = useRouter();

  const handleProcess = (id: string) => {
    router.push(`/technician/muestras?sample=${id}`);
  };

  return (
    <>
      <ScanSampleDialog open={scanOpen} onOpenChange={setScanOpen} />
      <Card className="rounded-xl border border-zinc-200 shadow-none">
        <div className="space-y-4 px-6">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
            Cola de muestras
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <div className="relative w-full min-w-0 max-w-sm sm:w-56">
                <Search className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Buscar por ID, paciente, prueba..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-full border-border/70 bg-white pl-10 pr-10 text-sm shadow-none transition-colors placeholder:text-muted-foreground/80 focus-visible:border-slate-400/50 focus-visible:ring-0"
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
              <Button
                className="rounded-full bg-primary hover:bg-primary/90 focus-visible:ring-primary"
                onClick={() => setScanOpen(true)}
              >
                Escanear muestra
              </Button>
            </div>
            <QueueFilters filter={filter} onFilter={setFilter} />
          </div>
        </div>
        <div className="px-4 pb-0">
          <QueueTable
            rows={rows}
            filter={filter}
            searchQuery={searchQuery}
            onProcess={handleProcess}
          />
        </div>
      </Card>
    </>
  );
}
