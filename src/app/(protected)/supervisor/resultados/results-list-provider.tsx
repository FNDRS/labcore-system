"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ResultsListFilters, ResultsListItem } from "@/lib/types/results-types";

export interface ResultsListProviderState {
  items: ResultsListItem[];
  filteredItems: ResultsListItem[];
  filters: ResultsListFilters;
  search: string;
  isLoading: boolean;
}

export interface ResultsListProviderActions {
  setFilters: (filters: Partial<ResultsListFilters>) => void;
  setSearch: (search: string) => void;
  refetch: (overrides?: Partial<ResultsListFilters>) => void;
  clear: () => void;
}

export interface ResultsListProviderValue {
  state: ResultsListProviderState;
  actions: ResultsListProviderActions;
}

const ResultsListContext = createContext<ResultsListProviderValue | null>(null);

function toTime(value: string | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function filterItems(
  items: ResultsListItem[],
  search: string,
  filters: ResultsListFilters,
): ResultsListItem[] {
  const term = search.trim().toLowerCase();
  const fromTimeValue = toTime(filters.from);
  const toTimeValue = toTime(filters.to);
  const referringDoctor = filters.referringDoctor?.trim().toLowerCase() ?? "";

  return items.filter((item) => {
    if (term) {
      const accession = item.accessionNumber?.toLowerCase() ?? "";
      const patientName = item.patientName.toLowerCase();
      if (!accession.includes(term) && !patientName.includes(term)) return false;
    }

    if (filters.status && filters.status !== "todas" && item.status !== filters.status) {
      return false;
    }

    if (referringDoctor) {
      const currentDoctor = item.referringDoctor?.toLowerCase() ?? "";
      if (!currentDoctor.includes(referringDoctor)) return false;
    }

    if (item.requestedAt) {
      const requestedAt = new Date(item.requestedAt).getTime();
      if (fromTimeValue && requestedAt < fromTimeValue) return false;
      if (toTimeValue && requestedAt > toTimeValue) return false;
    }

    return true;
  });
}

export function ResultsListProvider({
  children,
  initialItems,
  initialFilters = {},
  initialSearch = "",
}: {
  children: ReactNode;
  initialItems: ResultsListItem[];
  initialFilters?: ResultsListFilters;
  initialSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, startTransition] = useTransition();
  const [filters, setFiltersState] = useState<ResultsListFilters>(initialFilters);
  const [search, setSearch] = useState<string>(initialSearch);

  const setFilters = useCallback((next: Partial<ResultsListFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...next }));
  }, []);

  const refetch = useCallback(
    (overrides: Partial<ResultsListFilters> = {}) => {
      const merged = { ...filters, ...overrides };
      const params = new URLSearchParams();

      if (merged.from?.trim()) params.set("from", merged.from.trim());
      if (merged.to?.trim()) params.set("to", merged.to.trim());
      if (merged.status && merged.status !== "todas") params.set("status", merged.status);
      if (merged.referringDoctor?.trim()) {
        params.set("referringDoctor", merged.referringDoctor.trim());
      }

      startTransition(() => {
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
      });
    },
    [filters, pathname, router],
  );

  const clear = useCallback(() => {
    setSearch("");
    setFiltersState({});
    startTransition(() => router.replace(pathname));
  }, [pathname, router]);

  const filteredItems = useMemo(
    () => filterItems(initialItems, search, filters),
    [initialItems, search, filters],
  );

  const value: ResultsListProviderValue = useMemo(
    () => ({
      state: {
        items: initialItems,
        filteredItems,
        filters,
        search,
        isLoading,
      },
      actions: {
        setFilters,
        setSearch,
        refetch,
        clear,
      },
    }),
    [initialItems, filteredItems, filters, search, isLoading, setFilters, refetch, clear],
  );

  return <ResultsListContext.Provider value={value}>{children}</ResultsListContext.Provider>;
}

export function useResultsListProvider(): ResultsListProviderValue {
  const ctx = useContext(ResultsListContext);
  if (!ctx) {
    throw new Error("useResultsListProvider must be used within ResultsListProvider");
  }
  return ctx;
}
