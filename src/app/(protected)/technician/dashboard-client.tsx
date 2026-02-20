"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Bell,
  ScanLine,
  X,
  CheckCheck,
} from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
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

// Mock: reemplazar por datos reales / API
const INITIAL_NOTIFICATIONS = [
  {
    id: "1",
    title: "Muestra urgente en cola",
    message: "#LC-9023 (Eleanor Rigby) — Thyroid Panel marcada como urgente.",
    time: "Hace 8 min",
    read: false,
  },
  {
    id: "2",
    title: "Resultado listo para validar",
    message: "#LC-9025 — Urinalysis completado. Pendiente de revisión.",
    time: "Hace 12 min",
    read: false,
  },
  {
    id: "3",
    title: "Nueva muestra recibida",
    message: "#LC-9026 — Lipid Panel añadida a la cola.",
    time: "Hace 25 min",
    read: true,
  },
];

export function DashboardHeader() {
  const { state: authState } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
      <h1 className="text-xl font-semibold tracking-tight">Panel Técnico</h1>
      <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ""}`}
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white"
                  aria-hidden
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-80 max-w-[calc(100vw-1rem)] translate-x-4 p-0"
          >
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">Notificaciones</h3>
                  <p className="text-muted-foreground text-xs">
                    {unreadCount > 0 ? `${unreadCount} sin leer` : "Al día"}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-orange-500 hover:text-orange-600"
                    onClick={markAllAsRead}
                    title="Marcar todas como leídas"
                    aria-label="Marcar todas como leídas"
                  >
                    <CheckCheck className="size-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                  No hay notificaciones nuevas.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <div
                        className={`group px-4 py-3 text-left transition-colors hover:bg-muted/50 ${!n.read ? "bg-orange-50/80 dark:bg-orange-950/20" : ""}`}
                      >
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                          {n.message}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-muted-foreground shrink-0 text-xs">{n.time}</span>
                          {!n.read && (
                            <button
                              type="button"
                              className="text-orange-500 hover:text-orange-600 shrink-0 text-[10px] font-medium underline-offset-2 hover:underline"
                              onClick={() => markAsRead(n.id)}
                            >
                              Marcar como leída
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <span>{timeStr}</span>
        <span className="font-medium text-foreground">{authState.userName ?? "Técnico"}</span>
      </div>
    </header>
  );
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
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
      <Button className="mt-4" size="lg" onClick={() => router.push("/technician/muestras")}>
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
          className="rounded-xl"
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 focus-visible:ring-primary"
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
    <div className="space-y-4">
      <ScanSampleDialog open={scanOpen} onOpenChange={setScanOpen} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="relative w-full min-w-0 max-w-sm sm:w-56">
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
          <Button
            className="bg-primary hover:bg-primary/90 focus-visible:ring-primary"
            onClick={() => setScanOpen(true)}
          >
            Escanear muestra
          </Button>
        </div>
        <QueueFilters filter={filter} onFilter={setFilter} />
      </div>
      <QueueTable rows={rows} filter={filter} searchQuery={searchQuery} onProcess={handleProcess} />
    </div>
  );
}
