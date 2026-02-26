"use client";

import * as React from "react";
import {
  fetchIncidentFeedAction,
  fetchIncidentPatternsAction,
  fetchIncidentSummaryAction,
} from "./actions";
import type { AnalyticsTimeRange } from "@/lib/types/analytics-types";
import type {
  IncidentFeedFilters,
  IncidentFeedItem,
  IncidentPattern,
  IncidentSummaryCards,
} from "@/lib/types/incidence-types";

const DEFAULT_PAGE_LIMIT = 20;

export type IncidenciasTab = "feed" | "patterns";

type IncidenciasState = {
  feed: IncidentFeedItem[];
  summary: IncidentSummaryCards;
  patterns: IncidentPattern | null;
  filters: IncidentFeedFilters;
  activeTab: IncidenciasTab;
  nextCursor: string | null;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  isLoadingPatterns: boolean;
};

type IncidenciasActions = {
  setFilters: (updates: Partial<IncidentFeedFilters>) => void;
  setTab: (tab: IncidenciasTab) => void;
  loadMore: () => Promise<void>;
};

type IncidenciasContextValue = {
  state: IncidenciasState;
  actions: IncidenciasActions;
};

const IncidenciasContext = React.createContext<IncidenciasContextValue | null>(null);

function mergeFilters(
  previous: IncidentFeedFilters,
  updates: Partial<IncidentFeedFilters>,
): IncidentFeedFilters {
  return {
    ...previous,
    ...updates,
    range: updates.range ?? previous.range,
    type: updates.type ?? previous.type ?? "all",
  };
}

function appendUniqueById(
  current: IncidentFeedItem[],
  incoming: IncidentFeedItem[],
): IncidentFeedItem[] {
  if (!incoming.length) return current;
  const seen = new Set(current.map((item) => item.id));
  const merged = [...current];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

interface IncidenciasProviderProps {
  initialSummary: IncidentSummaryCards;
  initialFeedItems: IncidentFeedItem[];
  initialNextCursor: string | null;
  initialRange: AnalyticsTimeRange;
  children: React.ReactNode;
}

export function IncidenciasProvider({
  initialSummary,
  initialFeedItems,
  initialNextCursor,
  initialRange,
  children,
}: IncidenciasProviderProps) {
  const [feed, setFeed] = React.useState(initialFeedItems);
  const [summary, setSummary] = React.useState(initialSummary);
  const [patterns, setPatterns] = React.useState<IncidentPattern | null>(null);
  const [filters, setFiltersState] = React.useState<IncidentFeedFilters>({
    range: initialRange,
    type: "all",
    examTypeId: null,
    technicianId: null,
    search: "",
  });
  const [activeTab, setActiveTab] = React.useState<IncidenciasTab>("feed");
  const [nextCursor, setNextCursor] = React.useState<string | null>(initialNextCursor);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isLoadingPatterns, setIsLoadingPatterns] = React.useState(false);

  const activeTabRef = React.useRef(activeTab);
  const filtersRef = React.useRef(filters);
  const patternsRef = React.useRef(patterns);

  React.useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  React.useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  React.useEffect(() => {
    patternsRef.current = patterns;
  }, [patterns]);

  const refreshForFilters = React.useCallback(
    async (nextFilters: IncidentFeedFilters, tab: IncidenciasTab) => {
      setIsRefreshing(true);
      try {
        const [nextSummary, nextFeedPage, maybePatterns] = await Promise.all([
          fetchIncidentSummaryAction(nextFilters.range),
          fetchIncidentFeedAction(nextFilters, { limit: DEFAULT_PAGE_LIMIT }),
          tab === "patterns" ? fetchIncidentPatternsAction(nextFilters.range) : Promise.resolve(null),
        ]);

        setSummary(nextSummary);
        setFeed(nextFeedPage.items);
        setNextCursor(nextFeedPage.nextCursor);
        if (maybePatterns) {
          setPatterns(maybePatterns);
        } else {
          setPatterns(null);
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [],
  );

  const setFilters = React.useCallback(
    (updates: Partial<IncidentFeedFilters>) => {
      setFiltersState((previous) => {
        const merged = mergeFilters(previous, updates);
        void refreshForFilters(merged, activeTabRef.current);
        return merged;
      });
    },
    [refreshForFilters],
  );

  const setTab = React.useCallback(
    (tab: IncidenciasTab) => {
      setActiveTab(tab);
      if (tab !== "patterns" || patternsRef.current) return;

      const currentFilters = filtersRef.current;
      setIsLoadingPatterns(true);
      void fetchIncidentPatternsAction(currentFilters.range)
        .then((result) => {
          setPatterns(result);
        })
        .finally(() => {
          setIsLoadingPatterns(false);
        });
    },
    [],
  );

  const loadMore = React.useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await fetchIncidentFeedAction(filtersRef.current, {
        limit: DEFAULT_PAGE_LIMIT,
        cursor: nextCursor,
      });
      setFeed((current) => appendUniqueById(current, page.items));
      setNextCursor(page.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextCursor]);

  const value = React.useMemo<IncidenciasContextValue>(
    () => ({
      state: {
        feed,
        summary,
        patterns,
        filters,
        activeTab,
        nextCursor,
        isRefreshing,
        isLoadingMore,
        isLoadingPatterns,
      },
      actions: {
        setFilters,
        setTab,
        loadMore,
      },
    }),
    [
      feed,
      summary,
      patterns,
      filters,
      activeTab,
      nextCursor,
      isRefreshing,
      isLoadingMore,
      isLoadingPatterns,
      setFilters,
      setTab,
      loadMore,
    ],
  );

  return <IncidenciasContext.Provider value={value}>{children}</IncidenciasContext.Provider>;
}

export function useIncidencias() {
  const context = React.useContext(IncidenciasContext);
  if (!context) {
    throw new Error("useIncidencias must be used within IncidenciasProvider");
  }
  return context;
}
