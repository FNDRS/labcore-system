import { Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createDefaultTimeRange } from "@/lib/utils/time-range";
import { fetchAnalyticsDashboardAction } from "./actions";
import { AnalyticsDashboardClient } from "./analytics-dashboard-client";

function AnaliticaPageSkeleton() {
  return (
    <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  );
}

async function AnalyticsDataLoader() {
  const defaultRange = createDefaultTimeRange("last30d");
  const data = await fetchAnalyticsDashboardAction(defaultRange, {});

  return <AnalyticsDashboardClient initialData={data} />;
}

export default async function SupervisorAnaliticaPage() {
  return (
    <div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Analítica</h1>
          <p className="mt-1 text-sm text-zinc-500">
            KPIs, volumen de exámenes, TAT, distribución por tipo y técnico.
          </p>
        </div>
        <Suspense fallback={<AnaliticaPageSkeleton />}>
          <AnalyticsDataLoader />
        </Suspense>
      </div>
    </div>
  );
}
