"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { TimeRangeSelector } from "@/components/time-range-selector";
import type { AnalyticsDashboardData } from "@/lib/types/analytics-types";
import { cn } from "@/lib/utils";
import {
  AnalyticsProvider,
  useAnalyticsProvider,
} from "./analytics-provider";
import { DetailedChartsSection as DetailedChartsGrid } from "./components/detailed-charts-section";
import { KPICards } from "./components/kpi-cards";
import { ChartSkeleton } from "./components/chart-skeleton";

const ThroughputChart = dynamic(
  () =>
    import("./components/throughput-chart").then(
      (mod) => mod.ThroughputChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[340px] w-full rounded-xl" /> },
);

const ExamMixChart = dynamic(
  () =>
    import("./components/exam-mix-chart").then(
      (mod) => mod.ExamMixChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[340px] w-full rounded-xl" /> },
);

function DashboardToolbar() {
  const { state, actions } = useAnalyticsProvider();

  return (
    <div className="flex items-center justify-between gap-4">
      <TimeRangeSelector
        value={state.range}
        onChange={actions.setRange}
      />
      {state.isLoading && (
        <Loader2 className="size-4 animate-spin text-zinc-400" />
      )}
    </div>
  );
}

function DashboardKPIs() {
  const { state } = useAnalyticsProvider();

  return (
    <KPICards
      kpis={state.kpis}
      isLoading={state.isLoading}
    />
  );
}

function DashboardPrimaryCharts() {
  const { state } = useAnalyticsProvider();

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 lg:grid-cols-5",
        state.isLoading && "pointer-events-none opacity-60",
      )}
    >
      <div className="lg:col-span-3">
        <ThroughputChart data={state.charts.throughput} />
      </div>
      <div className="lg:col-span-2">
        <ExamMixChart data={state.charts.examMix} />
      </div>
    </div>
  );
}

function DetailedChartsSection() {
  const { state, actions } = useAnalyticsProvider();

  if (state.detailedCharts) {
    return <DetailedChartsGrid />;
  }

  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-10">
      <button
        type="button"
        onClick={() => actions.loadDetailedCharts()}
        disabled={state.isLoadingDetailed}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50"
      >
        {state.isLoadingDetailed ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Cargando análisis...
          </>
        ) : (
          "Ver más análisis"
        )}
      </button>
    </div>
  );
}

function AnalyticsDashboardContent() {
  return (
    <div className="space-y-6">
      <DashboardToolbar />
      <DashboardKPIs />
      <DashboardPrimaryCharts />
      <DetailedChartsSection />
    </div>
  );
}

interface AnalyticsDashboardClientProps {
  initialData: AnalyticsDashboardData;
}

export function AnalyticsDashboardClient({ initialData }: AnalyticsDashboardClientProps) {
  return (
    <AnalyticsProvider initialData={initialData}>
      <AnalyticsDashboardContent />
    </AnalyticsProvider>
  );
}
