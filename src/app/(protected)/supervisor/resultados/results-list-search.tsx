"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useResultsListProvider } from "./results-list-provider";

export function ResultsSearch() {
  const {
    state: { search },
    actions: { setSearch },
  } = useResultsListProvider();

  return (
    <div className="relative ml-auto w-full max-w-xs sm:w-60">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
      <Input
        type="search"
        placeholder="Paciente o n.° de acceso…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="h-9 rounded-lg border-zinc-200 bg-white pl-8 pr-8 text-sm shadow-none placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-0"
        aria-label="Buscar por paciente o número de acceso"
      />
      {search ? (
        <button
          type="button"
          onClick={() => setSearch("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-400 transition-colors hover:text-zinc-700"
          aria-label="Limpiar búsqueda"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
