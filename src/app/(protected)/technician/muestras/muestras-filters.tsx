"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { Filter } from "./constants";
import { FILTERS } from "./constants";

export function MuestrasFilters({
  filter,
  onFilter,
}: {
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input") || target.closest("textarea")) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const i = parseInt(e.key, 10);
      if (i >= 1 && i <= FILTERS.length) {
        e.preventDefault();
        onFilter(FILTERS[i - 1].value);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onFilter]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((f, i) => (
        <Button
          key={f.value}
          variant={filter === f.value ? "default" : "outline"}
          size="sm"
          className={
            filter === f.value
              ? "rounded-full bg-primary hover:bg-primary/90 focus-visible:ring-primary"
              : "rounded-full"
          }
          onClick={() => onFilter(f.value)}
        >
          {f.label}
          <span className="text-muted-foreground ml-1.5 text-[10px]">
            ({i + 1})
          </span>
        </Button>
      ))}
    </div>
  );
}
