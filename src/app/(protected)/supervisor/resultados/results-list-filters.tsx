"use client";

import * as React from "react";
import {
  TimeRangeSelector,
  createDefaultTimeRange,
} from "@/components/time-range-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalyticsTimeRange } from "@/lib/types/analytics-types";
import { useResultsListProvider } from "./results-list-provider";

const DEFAULT_TIME_RANGE = createDefaultTimeRange("last30d");

function inferPreset(from?: string, to?: string): AnalyticsTimeRange["preset"] {
  if (!from || !to) return DEFAULT_TIME_RANGE.preset;
  const now = new Date();
  const expectedTodayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  ).toISOString();
  const expectedTodayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString();
  if (from === expectedTodayStart && to === expectedTodayEnd) return "today";
  return "custom";
}

export function ResultsFilters() {
  const {
    state: { filters },
    actions: { setFilters, refetch },
  } = useResultsListProvider();

  const timeRange = React.useMemo<AnalyticsTimeRange>(() => {
    if (!filters.from || !filters.to) return DEFAULT_TIME_RANGE;
    return {
      from: filters.from,
      to: filters.to,
      preset: inferPreset(filters.from, filters.to),
    };
  }, [filters.from, filters.to]);

  const status = filters.status ?? "todas";

  function handleTimeRangeChange(range: AnalyticsTimeRange) {
    const nextFilters = { from: range.from, to: range.to };
    setFilters(nextFilters);
    refetch(nextFilters);
  }

  return (
    <div className="flex items-center gap-2.5">
      <TimeRangeSelector
        value={timeRange}
        onChange={handleTimeRangeChange}
        className="shrink-0"
      />
      <Select
        value={status}
        onValueChange={(value) => {
          const nextStatus = value as "completa" | "parcial" | "todas";
          setFilters({ status: nextStatus });
          refetch({ status: nextStatus });
        }}
      >
        <SelectTrigger
          className="h-9 w-[130px] rounded-lg text-sm"
          aria-label="Filtrar por estado"
        >
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="todas">Todas</SelectItem>
          <SelectItem value="completa">Completa</SelectItem>
          <SelectItem value="parcial">Parcial</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
