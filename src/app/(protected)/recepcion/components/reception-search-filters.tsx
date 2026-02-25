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
      <div className="relative max-w-2xl">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar paciente, orden o prueba…"
          className="h-11 rounded-full pl-9 text-base"
          aria-label="Buscar paciente, orden o prueba"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={activeFilter === filter ? "default" : "outline"}
            className="rounded-full"
            onClick={() => onFilterChange(filter)}
          >
            {filter}
          </Button>
        ))}
      </div>
    </section>
  );
}
