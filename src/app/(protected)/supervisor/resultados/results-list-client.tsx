"use client";

import { X } from "lucide-react";
import { ResultsFilters } from "./results-list-filters";
import { ResultsSearch } from "./results-list-search";
import { useResultsListProvider } from "./results-list-provider";
import { ResultsTable } from "./results-list-table";

export function ResultsListClient() {
  const {
    state: { items, filteredItems, filters, search },
    actions: { clear },
  } = useResultsListProvider();

  const hasActiveFilters =
    search.trim() !== "" ||
    (filters.status ?? "todas") !== "todas" ||
    filters.from != null ||
    filters.to != null ||
    filters.referringDoctor != null;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-zinc-900">
            Resultados de exámenes
          </h1>
          <p className="mt-0.5 text-[13px] text-zinc-500">
            {filteredItems.length === items.length
              ? `${items.length} orden${items.length !== 1 ? "es" : ""} con resultados`
              : `${filteredItems.length} de ${items.length} órdenes`}
          </p>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clear}
            className="mb-0.5 flex items-center gap-1 text-[12px] text-zinc-400 transition-colors hover:text-zinc-700"
          >
            <X className="size-3" />
            Limpiar filtros
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <ResultsFilters />
        <ResultsSearch />
      </div>

      <ResultsTable />
    </div>
  );
}
