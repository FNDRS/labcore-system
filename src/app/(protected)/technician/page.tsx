import { Suspense } from "react";
import { fetchOperativeDashboard } from "./actions";
import {
  DashboardHeader,
  NextSampleCard,
  UrgentBar,
  DashboardQueueSection,
} from "./dashboard-client";

async function DashboardContent() {
  const { nextSample, urgentCount, queueRows } = await fetchOperativeDashboard();

  return (
    <>
      <div className="shrink-0 space-y-6 px-4 pt-6">
        <DashboardHeader />
        <section>
          <NextSampleCard nextSample={nextSample} />
        </section>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 mt-6">
        <div className="w-full max-w-full space-y-6 pt-2">
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">Cola de muestras</h2>
            <DashboardQueueSection rows={queueRows} />
          </section>
        </div>
      </div>
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
