import { Suspense } from "react";
import { fetchAuditTimelineAction, fetchRecentAuditAction } from "./actions";
import { AuditSearchClient } from "./audit-search-client";
import { AuditoriaSkeleton } from "./audit-skeleton";

type PageSearchParams = {
  orden?: string;
};

async function AuditoriaLoader({ searchParams }: { searchParams: PageSearchParams }) {
  const workOrderId = searchParams.orden?.trim();
  const [recentActivity, timeline] = await Promise.all([
    fetchRecentAuditAction(10),
    workOrderId ? fetchAuditTimelineAction(workOrderId) : Promise.resolve(null),
  ]);
  return (
    <AuditSearchClient recentActivity={recentActivity} timeline={timeline} />
  );
}

export default async function SupervisorAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const resolved = await searchParams;
  return (
    <div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <Suspense fallback={<AuditoriaSkeleton />}>
          <AuditoriaLoader searchParams={resolved} />
        </Suspense>
      </div>
    </div>
  );
}
