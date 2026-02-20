"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

type Priority = "Urgente" | "Rutina";
type ReceptionStatus = "Sin muestras" | "Muestras creadas" | "Procesando";
type QuickFilter = "Todas" | "Hoy" | "Urgentes" | "Sin muestras" | "Listas";

type ReceptionOrder = {
  id: string;
  patientName: string;
  patientAge: number;
  doctor: string;
  tests: string[];
  priority: Priority;
  status: ReceptionStatus;
  notes: string;
  createdAt: string;
  isNew?: boolean;
};

type GeneratedSpecimen = {
  tubeLabel: string;
  examCount: number;
  specimenCode: string;
};

const QUICK_FILTERS: QuickFilter[] = ["Todas", "Hoy", "Urgentes", "Sin muestras", "Listas"];

const TEST_TO_TUBE: Record<string, string> = {
  Glucosa: "Tubo rojo",
  "Perfil lipídico": "Tubo rojo",
  "Hemograma completo": "Tubo morado",
  Creatinina: "Tubo rojo",
  Uroanálisis: "Frasco estéril",
  "Heces completo": "Frasco heces",
  TSH: "Tubo rojo",
  "BHCG cualitativa": "Tubo rojo",
  Plaquetas: "Tubo morado",
  "Dengue NS1": "Tubo amarillo",
};

const INITIAL_ORDERS: ReceptionOrder[] = [
  {
    id: "#1042",
    patientName: "Ana López",
    patientAge: 36,
    doctor: "Dr. Hernández",
    tests: ["Glucosa", "Perfil lipídico", "Hemograma completo"],
    priority: "Urgente",
    status: "Sin muestras",
    notes: "Paciente en ayunas desde las 6:00 AM.",
    createdAt: "2026-02-20T12:25:00-06:00",
    isNew: true,
  },
  {
    id: "#1043",
    patientName: "Carlos Mejía",
    patientAge: 51,
    doctor: "Dra. Ruiz",
    tests: ["Creatinina", "Uroanálisis"],
    priority: "Rutina",
    status: "Sin muestras",
    notes: "Orden externa enviada por clínica aliada.",
    createdAt: "2026-02-20T12:13:00-06:00",
  },
  {
    id: "#1044",
    patientName: "María Bonilla",
    patientAge: 28,
    doctor: "Dr. Suazo",
    tests: ["TSH", "BHCG cualitativa"],
    priority: "Urgente",
    status: "Muestras creadas",
    notes: "Esperando toma de muestra en sala 2.",
    createdAt: "2026-02-20T11:45:00-06:00",
  },
  {
    id: "#1045",
    patientName: "Josefina Reyes",
    patientAge: 44,
    doctor: "Dr. Turcios",
    tests: ["Heces completo"],
    priority: "Rutina",
    status: "Procesando",
    notes: "Muestra ya entregada al área técnica.",
    createdAt: "2026-02-20T10:55:00-06:00",
  },
  {
    id: "#1046",
    patientName: "Ernesto Aguilar",
    patientAge: 62,
    doctor: "Dra. Flores",
    tests: ["Plaquetas", "Dengue NS1"],
    priority: "Urgente",
    status: "Sin muestras",
    notes: "Prioridad alta por criterio médico.",
    createdAt: "2026-02-20T12:22:00-06:00",
    isNew: true,
  },
];

function formatDateTime(dateIso: string) {
  return new Intl.DateTimeFormat("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Tegucigalpa",
  }).format(new Date(dateIso));
}

function isToday(dateIso: string) {
  const d = new Date(dateIso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function statusPillClass(status: ReceptionStatus) {
  if (status === "Sin muestras") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300";
  }
  if (status === "Muestras creadas") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-300";
}

function priorityPillClass(priority: Priority) {
  if (priority === "Urgente") {
    return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function generateSpecimens(order: ReceptionOrder): GeneratedSpecimen[] {
  const grouped = new Map<string, number>();

  for (const test of order.tests) {
    const tube = TEST_TO_TUBE[test] ?? "Tubo adicional";
    grouped.set(tube, (grouped.get(tube) ?? 0) + 1);
  }

  return Array.from(grouped.entries()).map(([tubeLabel, examCount], index) => ({
    tubeLabel,
    examCount,
    specimenCode: `${order.id.replace("#", "SP-")}-${index + 1}`,
  }));
}

export function ReceptionInboxClient() {
  const [orders, setOrders] = useState<ReceptionOrder[]>(INITIAL_ORDERS);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("Sin muestras");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [highlightedNewIds, setHighlightedNewIds] = useState(
    INITIAL_ORDERS.filter((order) => order.isNew).map((order) => order.id)
  );
  const [generationModal, setGenerationModal] = useState<{
    open: boolean;
    orderId: string;
    patientName: string;
    specimens: GeneratedSpecimen[];
    printed: boolean;
  }>({
    open: false,
    orderId: "",
    patientName: "",
    specimens: [],
    printed: false,
  });

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === "Sin muestras").length,
    [orders]
  );

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    const searched = orders.filter((order) => {
      if (!q) return true;
      const inPatient = order.patientName.toLowerCase().includes(q);
      const inOrder = order.id.toLowerCase().includes(q);
      const inTest = order.tests.some((test) => test.toLowerCase().includes(q));
      return inPatient || inOrder || inTest;
    });

    const filtered = searched.filter((order) => {
      if (activeFilter === "Todas") return true;
      if (activeFilter === "Hoy") return isToday(order.createdAt);
      if (activeFilter === "Urgentes") return order.priority === "Urgente";
      if (activeFilter === "Sin muestras") return order.status === "Sin muestras";
      return order.status === "Muestras creadas";
    });

    return filtered.toSorted((a, b) => {
      const aNeedsAction = a.status === "Sin muestras" ? 0 : 1;
      const bNeedsAction = b.status === "Sin muestras" ? 0 : 1;
      if (aNeedsAction !== bNeedsAction) return aNeedsAction - bNeedsAction;

      const aUrgent = a.priority === "Urgente" ? 0 : 1;
      const bUrgent = b.priority === "Urgente" ? 0 : 1;
      if (aUrgent !== bUrgent) return aUrgent - bUrgent;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeFilter, orders, search]);

  useEffect(() => {
    if (highlightedNewIds.length === 0) return;
    const timeoutId = window.setTimeout(() => setHighlightedNewIds([]), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedNewIds]);

  function runGenerateSpecimens(order: ReceptionOrder) {
    if (order.status !== "Sin muestras") return;

    const specimens = generateSpecimens(order);
    setOrders((prev) =>
      prev.map((current) =>
        current.id === order.id ? { ...current, status: "Muestras creadas", isNew: false } : current
      )
    );

    setGenerationModal({
      open: true,
      orderId: order.id,
      patientName: order.patientName,
      specimens,
      printed: false,
    });
  }

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

        <section className="space-y-3">
          <div className="relative max-w-2xl">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar paciente, orden o prueba…"
              className="h-11 pl-9 text-base"
              aria-label="Buscar paciente, orden o prueba"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((filter) => (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={activeFilter === filter ? "default" : "outline"}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Pruebas</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                    No hay órdenes para los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                visibleOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className={
                      highlightedNewIds.includes(order.id)
                        ? "bg-emerald-50/80 dark:bg-emerald-950/20"
                        : undefined
                    }
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{order.patientName}</span>
                        {order.isNew ? (
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                            Nueva
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell>{order.tests.length}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${priorityPillClass(order.priority)}`}
                      >
                        {order.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillClass(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          runGenerateSpecimens(order);
                          setSelectedOrderId(order.id);
                        }}
                        disabled={order.status !== "Sin muestras"}
                      >
                        {order.status === "Sin muestras" ? "Generar muestras" : "Generadas"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>

      <Sheet
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      >
        <SheetContent className="w-full sm:max-w-lg">
          {selectedOrder ? (
            <>
              <SheetHeader>
                <SheetTitle>Orden {selectedOrder.id}</SheetTitle>
                <p className="text-muted-foreground text-sm">
                  Revisión rápida para generar muestras.
                </p>
              </SheetHeader>

              <div className="space-y-4 px-4">
                <div className="space-y-1 rounded-lg border p-3">
                  <p className="text-sm font-medium">{selectedOrder.patientName}</p>
                  <p className="text-muted-foreground text-sm">
                    Edad: {selectedOrder.patientAge} años
                  </p>
                  <p className="text-muted-foreground text-sm">Doctor: {selectedOrder.doctor}</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">Pruebas solicitadas</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {selectedOrder.tests.map((test) => (
                      <li key={test} className="text-muted-foreground">
                        • {test}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">Notas</p>
                  <p className="text-muted-foreground mt-1 text-sm">{selectedOrder.notes}</p>
                </div>
              </div>

              <SheetFooter>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => runGenerateSpecimens(selectedOrder)}
                  disabled={selectedOrder.status !== "Sin muestras"}
                  className="w-full"
                >
                  {selectedOrder.status === "Sin muestras"
                    ? "Generar muestras"
                    : "Muestras ya creadas"}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={generationModal.open}
        onOpenChange={(open) => setGenerationModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{generationModal.specimens.length} muestras creadas</DialogTitle>
            <DialogDescription>
              Orden {generationModal.orderId} · {generationModal.patientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            {generationModal.specimens.map((specimen) => (
              <div key={specimen.specimenCode} className="rounded-md border p-3">
                <p className="font-medium">
                  {specimen.tubeLabel} → {specimen.examCount} exámenes
                </p>
                <p className="text-muted-foreground">Código: {specimen.specimenCode}</p>
              </div>
            ))}
            {generationModal.printed ? (
              <p className="text-emerald-700 dark:text-emerald-300">
                Etiquetas enviadas a impresora (simulado).
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setGenerationModal((prev) => ({ ...prev, printed: true }))}
            >
              Imprimir etiquetas
            </Button>
            <Button
              type="button"
              onClick={() => setGenerationModal((prev) => ({ ...prev, open: false }))}
            >
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
