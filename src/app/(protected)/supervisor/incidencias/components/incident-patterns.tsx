"use client";

import dynamic from "next/dynamic";
import { useIncidencias } from "../incidencias-provider";

const RejectionReasonsChart = dynamic(
  () =>
    import("./rejection-reasons-chart").then((m) => m.RejectionReasonsChart),
  { ssr: false, loading: () => <ChartsSkeleton /> },
);

const IncidenceTrendChart = dynamic(
  () =>
    import("./incidence-trend-chart").then((m) => m.IncidenceTrendChart),
  { ssr: false, loading: () => <ChartsSkeleton /> },
);

function ChartsSkeleton() {
  return (
    <div className="flex min-h-[200px] animate-pulse items-center justify-center rounded-lg bg-zinc-50">
      <span className="text-sm text-zinc-400">Cargando gráfico...</span>
    </div>
  );
}

export function IncidentPatterns() {
  const { state } = useIncidencias();

  if (state.isLoadingPatterns) {
    return (
      <div className="flex items-center justify-center gap-2 px-5 py-16">
        <span
          className="size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"
          aria-hidden
        />
        <span className="text-sm text-zinc-500">Cargando patrones...</span>
      </div>
    );
  }

  if (!state.patterns) {
    return (
      <p className="px-5 py-16 text-center text-sm text-zinc-400">
        Sin patrones para el periodo seleccionado.
      </p>
    );
  }

  const { reasonDistribution, incidenceTrend } = state.patterns;

  return (
    <div className="grid gap-6 p-5 sm:grid-cols-2">
      <section
        className="rounded-lg border border-zinc-200 bg-white p-4"
        aria-labelledby="rejection-reasons-heading"
      >
        <h2
          id="rejection-reasons-heading"
          className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-500"
        >
          Motivos de rechazo
        </h2>
        <RejectionReasonsChart data={reasonDistribution} />
      </section>

      <section
        className="rounded-lg border border-zinc-200 bg-white p-4"
        aria-labelledby="incidence-trend-heading"
      >
        <h2
          id="incidence-trend-heading"
          className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-500"
        >
          Tendencia por día
        </h2>
        <IncidenceTrendChart data={incidenceTrend} />
      </section>
    </div>
  );
}
