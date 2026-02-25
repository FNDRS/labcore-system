import type { Priority, QuickFilter, ReceptionOrder, ReceptionStatus } from "./types";

export function formatDateTime(dateIso: string) {
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

export function statusPillClass(status: ReceptionStatus) {
  if (status === "Sin muestras") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300";
  }
  if (status === "Muestras creadas") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-300";
}

export function priorityPillClass(priority: Priority) {
  if (priority === "Urgente") {
    return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export function filterAndSortOrders(orders: ReceptionOrder[], search: string, activeFilter: QuickFilter) {
  const q = search.trim().toLowerCase();

  const searched = orders.filter((order) => {
    if (!q) return true;
    const inPatient = order.patientName.toLowerCase().includes(q);
    const inOrder = order.displayId.toLowerCase().includes(q);
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

  // Orden operativo: 1) Sin muestras + urgentes, 2) Sin muestras, 3) Muestras creadas, 4) Procesando
  function sortRank(o: ReceptionOrder): number {
    if (o.status === "Sin muestras" && o.priority === "Urgente") return 0;
    if (o.status === "Sin muestras") return 1;
    if (o.status === "Muestras creadas") return 2;
    return 3; // Procesando
  }

  return filtered.toSorted((a, b) => {
    const ra = sortRank(a);
    const rb = sortRank(b);
    if (ra !== rb) return ra - rb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
