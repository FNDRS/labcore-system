import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUICK_FILTERS } from "../constants";
import type { QuickFilter } from "../types";

type ReceptionSearchFiltersProps = {
  search: string;
  activeFilter: QuickFilter;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: QuickFilter) => void;
};

export function ReceptionSearchFilters({
  search,
  activeFilter,
  onSearchChange,
  onFilterChange,
}: ReceptionSearchFiltersProps) {
  return (
    <section className="space-y-3">
      <div className="relative w-full max-w-2xl">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 sm:left-4" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar paciente, orden o prueba…"
          className="min-h-11 w-full rounded-full pl-9 pr-4 text-base sm:pl-10"
          aria-label="Buscar paciente, orden o prueba"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {QUICK_FILTERS.map((filter) => (
          <Button
            key={filter}
            type="button"
            variant={activeFilter === filter ? "default" : "outline"}
            className="min-h-11 min-w-0 rounded-full px-4 py-2 text-sm"
            onClick={() => onFilterChange(filter)}
          >
            {filter}
          </Button>
        ))}
      </div>
    </section>
  );
}
