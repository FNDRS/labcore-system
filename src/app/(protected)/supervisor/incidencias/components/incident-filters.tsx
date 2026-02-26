"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TimeRangeSelector } from "@/components/time-range-selector";
import { cn } from "@/lib/utils";
import type { IncidentType } from "@/lib/types/incidence-types";
import { useIncidencias } from "../incidencias-provider";

// ─── Incident type options ─────────────────────────────────────────────────────

const INCIDENT_TYPE_OPTIONS: Array<{ value: IncidentType | "all"; label: string }> = [
  { value: "all", label: "Todos los tipos" },
  { value: "exam_rejected", label: "Examen rechazado" },
  { value: "specimen_rejected", label: "Muestra rechazada" },
  { value: "incidence_created", label: "Incidencia" },
  { value: "critical_result", label: "Resultado crítico" },
  { value: "exam_overdue", label: "Examen atrasado" },
];

// ─── Search input ─────────────────────────────────────────────────────────────

function SearchInput() {
  const { state, actions } = useIncidencias();

  const [localValue, setLocalValue] = React.useState(state.filters.search ?? "");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if provider search was cleared externally (e.g. reset).
  React.useEffect(() => {
    const externalValue = state.filters.search ?? "";
    if (externalValue !== localValue) setLocalValue(externalValue);
    // Only sync from provider → local, not the other way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filters.search]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setLocalValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      actions.setFilters({ search: value.trim() || undefined });
    }, 300);
  }

  function handleClear() {
    setLocalValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    actions.setFilters({ search: undefined });
  }

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasValue = localValue.length > 0;

  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Paciente, accesión, muestra..."
        value={localValue}
        onChange={handleChange}
        className="h-9 rounded-lg pl-8 pr-8 text-sm"
        aria-label="Buscar incidencias"
      />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          aria-label="Limpiar búsqueda"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Type selector ─────────────────────────────────────────────────────────────

function IncidentTypeSelect() {
  const { state, actions } = useIncidencias();
  const value = state.filters.type ?? "all";

  return (
    <Select
      value={value}
      onValueChange={(next) =>
        actions.setFilters({ type: next as IncidentType | "all" })
      }
    >
      <SelectTrigger
        className="h-9 w-[190px] shrink-0 rounded-lg text-sm"
        aria-label="Filtrar por tipo de incidencia"
      >
        <SlidersHorizontal className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
        <SelectValue placeholder="Tipo" />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {INCIDENT_TYPE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Reset button ──────────────────────────────────────────────────────────────

function ResetFiltersButton() {
  const { state, actions } = useIncidencias();

  const isDirty =
    (state.filters.type && state.filters.type !== "all") ||
    !!state.filters.examTypeId ||
    !!state.filters.technicianId ||
    !!state.filters.search?.trim();

  if (!isDirty) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-9 shrink-0 rounded-lg px-2.5 text-xs text-zinc-500 hover:text-zinc-900"
      onClick={() =>
        actions.setFilters({
          type: "all",
          examTypeId: null,
          technicianId: null,
          search: undefined,
        })
      }
    >
      <X className="mr-1 size-3" aria-hidden />
      Limpiar
    </Button>
  );
}

// ─── Filters bar ──────────────────────────────────────────────────────────────

interface IncidentFiltersProps {
  className?: string;
}

export function IncidentFilters({ className }: IncidentFiltersProps) {
  const { state, actions } = useIncidencias();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-5 py-3",
        className,
      )}
      role="search"
      aria-label="Filtros de incidencias"
    >
      <TimeRangeSelector
        value={state.filters.range}
        onChange={(range) => actions.setFilters({ range })}
      />
      <IncidentTypeSelect />
      <SearchInput />
      <ResetFiltersButton />
    </div>
  );
}
