import { Suspense } from "react";
import { fetchResultsListAction } from "./actions";
import { ResultsListClient } from "./results-list-client";
import { ResultsListProvider } from "./results-list-provider";
import { ResultsListSkeleton } from "./results-list-skeleton";

type PageSearchParams = {
  from?: string;
  to?: string;
  status?: string;
  search?: string;
  referringDoctor?: string;
};

function parseStatus(value: string | undefined): "completa" | "parcial" | "todas" | undefined {
  if (value === "completa" || value === "parcial" || value === "todas") return value;
  return undefined;
}

async function ResultsListLoader({ searchParams }: { searchParams: PageSearchParams }) {
  const filters = {
    from: searchParams.from?.trim() || undefined,
    to: searchParams.to?.trim() || undefined,
    status: parseStatus(searchParams.status),
    referringDoctor: searchParams.referringDoctor?.trim() || undefined,
  };
  const items = await fetchResultsListAction(filters);

  return (
    <ResultsListProvider
      initialItems={items}
      initialFilters={filters}
      initialSearch={searchParams.search?.trim() ?? ""}
    >
      <ResultsListClient />
    </ResultsListProvider>
  );
}

export default async function SupervisorResultadosPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <Suspense fallback={<ResultsListSkeleton />}>
          <ResultsListLoader searchParams={resolvedSearchParams} />
        </Suspense>
      </div>
    </div>
  );
}
