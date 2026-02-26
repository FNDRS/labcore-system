"use client";

import { KPICard } from "@/components/kpi-card";
import type { KPISummary } from "@/lib/types/analytics-types";
import { cn } from "@/lib/utils";

interface KPICardsProps {
  kpis: KPISummary;
  isLoading?: boolean;
  className?: string;
}

export function KPICards({ kpis, isLoading, className }: KPICardsProps) {
  const rejectionPercent =
    typeof kpis.rejectionRate === "number"
      ? `${(kpis.rejectionRate * 100).toFixed(1)}`
      : `${kpis.rejectionRate}`;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6",
        isLoading && "pointer-events-none opacity-60",
        className,
      )}
    >
      <KPICard
        title="Órdenes procesadas"
        value={kpis.ordersProcessed}
        trend={kpis.trends?.ordersProcessed}
      />
      <KPICard
        title="Exámenes completados"
        value={kpis.examsCompleted}
        trend={kpis.trends?.examsCompleted}
      />
      <KPICard
        title="TAT promedio"
        value={kpis.averageTatMinutes}
        unit="min"
        trendPositiveDirection="down"
        trend={kpis.trends?.averageTatMinutes}
      />
      <KPICard
        title="Tasa de rechazo"
        value={rejectionPercent}
        unit="%"
        trendPositiveDirection="down"
        trend={kpis.trends?.rejectionRate}
        variant={kpis.rejectionRate > 0.15 ? "danger" : kpis.rejectionRate > 0.08 ? "warning" : "default"}
      />
      <KPICard
        title="Incidencias"
        value={kpis.incidencesCount}
        trendPositiveDirection="down"
        trend={kpis.trends?.incidencesCount}
        variant={kpis.incidencesCount > 5 ? "warning" : "default"}
      />
      <KPICard
        title="Pendientes ahora"
        value={kpis.pendingBacklog}
        trendPositiveDirection="down"
        trend={kpis.trends?.pendingBacklog}
        variant={kpis.pendingBacklog > 20 ? "danger" : kpis.pendingBacklog > 10 ? "warning" : "default"}
      />
    </div>
  );
}
