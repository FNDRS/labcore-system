import { Suspense } from "react";
import {
  fetchIncidentFeedAction,
  fetchIncidentSummaryAction,
} from "./actions";
import { IncidenciasClient } from "./incidencias-client";
import { IncidenciasProvider } from "./incidencias-provider";
import { IncidenciasSkeleton } from "./incidencias-skeleton";
import { createDefaultTimeRange } from "@/lib/utils/time-range";

const DEFAULT_PAGE_LIMIT = 20;

async function IncidenciasLoader() {
  const initialRange = createDefaultTimeRange("last7d");
  const [summary, feedPage] = await Promise.all([
    fetchIncidentSummaryAction(initialRange),
    fetchIncidentFeedAction(
      { range: initialRange },
      { limit: DEFAULT_PAGE_LIMIT },
    ),
  ]);

  return (
    <IncidenciasProvider
      initialSummary={summary}
      initialFeedItems={feedPage.items}
      initialNextCursor={feedPage.nextCursor}
      initialRange={initialRange}
    >
      <IncidenciasClient />
    </IncidenciasProvider>
  );
}

export default function SupervisorIncidenciasPage() {
  return (
    <div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <Suspense fallback={<IncidenciasSkeleton />}>
          <IncidenciasLoader />
        </Suspense>
      </div>
    </div>
  );
}
