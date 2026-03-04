import { Suspense } from "react";
import { ReceptionDataLoader } from "./reception-data-loader";
import { ReceptionSkeleton } from "./components/reception-skeleton";
import type { ReceptionListFilters } from "@/lib/repositories/reception-repository";
import type { QuickFilter } from "./types";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseFilters(params: Record<string, string | string[] | undefined>): ReceptionListFilters {
  const quickFilter = (params.filter as QuickFilter) || "Sin muestras";
  const search = typeof params.search === "string" ? params.search : "";
  return { quickFilter, search };
}

export default async function ReceptionPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseFilters(params);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <Suspense fallback={<ReceptionSkeleton />}>
        <ReceptionDataLoader filters={filters} />
      </Suspense>
    </div>
  );
}
