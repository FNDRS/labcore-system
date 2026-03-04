"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUICK_FILTERS } from "../constants";
import type { QuickFilter } from "../types";

type ReceptionSearchFiltersProps = {
  search: string;
  activeFilter: QuickFilter;
};

export function ReceptionSearchFilters({
  search: initialSearch,
  activeFilter,
}: ReceptionSearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localSearch, setLocalSearch] = useState(initialSearch);

  useEffect(() => {
    setLocalSearch(initialSearch);
  }, [initialSearch]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `?${qs}` : "?");
      });
    },
    [router, searchParams, startTransition]
  );

  const handleSearchSubmit = useCallback(() => {
    updateParams({ search: localSearch || null });
  }, [localSearch, updateParams]);

  const handleFilterChange = useCallback(
    (filter: QuickFilter) => {
      updateParams({ filter: filter === "Sin muestras" ? null : filter });
    },
    [updateParams]
  );

  return (
    <section className="space-y-3">
      <form
        className="flex w-full max-w-2xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleSearchSubmit();
        }}
      >
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 sm:left-4" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar paciente, orden o prueba…"
            className="min-h-11 w-full rounded-full pl-9 pr-4 text-base sm:pl-10"
            aria-label="Buscar paciente, orden o prueba"
          />
        </div>
        <Button type="submit" disabled={isPending} className="min-h-11 rounded-full px-5">
          Buscar
        </Button>
      </form>

      <div className={`flex flex-wrap gap-3 ${isPending ? "opacity-70 transition-opacity" : ""}`}>
        {QUICK_FILTERS.map((filter) => (
          <Button
            key={filter}
            type="button"
            variant={activeFilter === filter ? "default" : "outline"}
            className="min-h-11 min-w-0 rounded-full px-4 py-2 text-sm"
            onClick={() => handleFilterChange(filter)}
          >
            {filter}
          </Button>
        ))}
      </div>
    </section>
  );
}
