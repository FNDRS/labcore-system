import { Suspense } from "react";
import { fetchOperativeDashboard } from "./actions";
import { DashboardHeader, NextSampleCard, DashboardQueueSection } from "./dashboard-client";

async function DashboardContent() {
  const { nextSample, queueRows } = await fetchOperativeDashboard();

  return (
    <>
      <div className="shrink-0 space-y-4">
        <DashboardHeader />
        <section>
          <NextSampleCard nextSample={nextSample} />
        </section>
      </div>
      <section className="mt-6">
        <DashboardQueueSection rows={queueRows} />
      </section>
    </>
  );
}

const DashboardSkeleton = () => (
  <div className="flex h-full flex-col">
    <div className="h-12 w-64 shrink-0 animate-pulse rounded bg-muted" />
    <div className="h-40 shrink-0 animate-pulse rounded-xl bg-muted" />
    <div className="min-h-0 flex-1 animate-pulse rounded-xl bg-muted" />
  </div>
);

export default function TechnicianPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
