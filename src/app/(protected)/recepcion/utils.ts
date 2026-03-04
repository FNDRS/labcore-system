import type { Priority, ReceptionStatus } from "./types";

export function formatDateTime(dateIso: string) {
  return new Intl.DateTimeFormat("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Tegucigalpa",
  }).format(new Date(dateIso));
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
