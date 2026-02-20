"use client";

/** Resumen de conteos para la estación de muestras (UI local). */
export interface MuestrasSummaryUI {
  completed: number;
  received: number;
  pending: number;
  urgent: number;
  issues: number;
}

const CARDS = [
  { label: "Completadas", key: "completed" as const },
  { label: "Recibidas", key: "received" as const },
  { label: "Pendientes", key: "pending" as const },
  { label: "Urgentes", key: "urgent" as const },
] as const;

export function StatusSummary({ summary }: { summary: MuestrasSummaryUI }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CARDS.map(({ label, key }) => (
        <div
          key={key}
          className="rounded-xl border border-border bg-card px-4 py-3 text-center"
        >
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {summary[key]}
          </p>
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
        </div>
      ))}
    </div>
  );
}
