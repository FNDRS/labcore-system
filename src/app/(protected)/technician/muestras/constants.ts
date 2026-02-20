/** Filtros de la cola de muestras (teclas 1–6). */
export const FILTERS = [
  { value: "All", label: "Todos" },
  { value: "Processing", label: "En proceso" },
  { value: "Received", label: "Recibidas" },
  { value: "Urgent", label: "Urgentes" },
  { value: "Flagged", label: "Marcadas" },
  { value: "Mine", label: "Mis muestras" },
] as const;

export type Filter = (typeof FILTERS)[number]["value"];
