"use client";

import dynamic from "next/dynamic";
import { useAnalyticsProvider } from "../analytics-provider";
import { ChartSkeleton } from "./chart-skeleton";

const TATDistributionChart = dynamic(
  () =>
    import("./tat-distribution-chart").then(
      (mod) => mod.TATDistributionChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton className="h-[280px] w-full rounded-xl" /> },
);

const TechnicianWorkloadChart = dynamic(
  () =>
    import("./technician-workload-chart").then(
      (mod) => mod.TechnicianWorkloadChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton className="h-[280px] w-full rounded-xl" /> },
);

const RejectionAnalysisChart = dynamic(
  () =>
    import("./rejection-analysis-chart").then(
      (mod) => mod.RejectionAnalysisChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton className="h-[280px] w-full rounded-xl" /> },
);

const DoctorVolumeChart = dynamic(
  () =>
    import("./doctor-volume-chart").then(
      (mod) => mod.DoctorVolumeChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton className="h-[280px] w-full rounded-xl" /> },
);

/**
 * Renders when detailedCharts data is loaded. Shows 2×2 grid of charts.
 * Triggered by loadDetailedCharts() action. Container with dynamic imports.
 */
export function DetailedChartsSection() {
  const { state } = useAnalyticsProvider();
  const data = state.detailedCharts;

  if (!data) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-zinc-700">
        Análisis detallado
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TATDistributionChart data={data.tatDistribution} />
        <TechnicianWorkloadChart data={data.technicianWorkload} />
        <RejectionAnalysisChart data={data.rejectionAnalysis} />
        <DoctorVolumeChart data={data.doctorVolume} />
      </div>
    </section>
  );
}
