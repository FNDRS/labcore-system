import { TEST_TO_TUBE } from "./constants";
import type { GeneratedSpecimen, Priority, QuickFilter, ReceptionOrder, ReceptionStatus } from "./types";

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

export function generateSpecimens(order: ReceptionOrder): GeneratedSpecimen[] {
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

export function filterAndSortOrders(orders: ReceptionOrder[], search: string, activeFilter: QuickFilter) {
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
}
