"use client";

import { KPICard } from "@/components/kpi-card";
import type { IncidentSummaryCards } from "@/lib/types/incidence-types";

interface IncidentSummaryCardsProps {
  summary: IncidentSummaryCards;
}

export function IncidentSummaryCards({ summary }: IncidentSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <KPICard title="Incidencias activas" value={summary.activeIncidences} />
      <KPICard
        title="Exámenes rechazados"
        value={summary.rejectedExams}
        variant={summary.rejectedExams > 0 ? "warning" : "default"}
      />
      <KPICard
        title="Muestras rechazadas"
        value={summary.rejectedSamples}
        variant={summary.rejectedSamples > 0 ? "warning" : "default"}
      />
      <KPICard
        title="Resultados críticos"
        value={summary.criticalResults}
        variant={summary.criticalResults > 0 ? "danger" : "default"}
      />
    </div>
  );
}
