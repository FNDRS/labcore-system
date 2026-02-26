"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  fetchAnalyticsDashboardAction,
  fetchDetailedChartsAction,
} from "./actions";
import type {
  AnalyticsDashboardData,
  AnalyticsDetailedChartsData,
  AnalyticsFilters,
  AnalyticsTimeRange,
  ExamMixEntry,
  KPISummary,
  ThroughputDataPoint,
} from "@/lib/types/analytics-types";

type AnalyticsChartsState = {
  throughput: ThroughputDataPoint[];
  examMix: ExamMixEntry[];
};

export interface AnalyticsProviderState {
  range: AnalyticsTimeRange;
  filters: AnalyticsFilters;
  kpis: KPISummary;
  charts: AnalyticsChartsState;
  detailedCharts: AnalyticsDetailedChartsData | null;
  isLoading: boolean;
  isLoadingDetailed: boolean;
}

export interface AnalyticsProviderActions {
  setRange: (nextRange: AnalyticsTimeRange) => void;
  setFilters: (next: Partial<AnalyticsFilters>) => void;
  loadDetailedCharts: (force?: boolean) => void;
  clearDetailedCharts: () => void;
}

export interface AnalyticsProviderValue {
  state: AnalyticsProviderState;
  actions: AnalyticsProviderActions;
}

const AnalyticsContext = createContext<AnalyticsProviderValue | null>(null);

export function AnalyticsProvider({
  children,
  initialData,
  initialFilters = {},
}: {
  children: ReactNode;
  initialData: AnalyticsDashboardData;
  initialFilters?: AnalyticsFilters;
}) {
  const requestIdRef = useRef(0);
  const [isLoading, startLoadingTransition] = useTransition();
  const [isLoadingDetailed, startDetailedTransition] = useTransition();
  const [range, setRangeState] = useState<AnalyticsTimeRange>(initialData.range);
  const [filters, setFiltersState] = useState<AnalyticsFilters>(initialFilters);
  const [kpis, setKpis] = useState<KPISummary>(initialData.kpis);
  const [charts, setCharts] = useState<AnalyticsChartsState>({
    throughput: initialData.throughput,
    examMix: initialData.examMix,
  });
  const [detailedCharts, setDetailedCharts] =
    useState<AnalyticsDetailedChartsData | null>(null);

  const setFilters = useCallback((next: Partial<AnalyticsFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...next }));
  }, []);

  const setRange = useCallback(
    (nextRange: AnalyticsTimeRange) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      startLoadingTransition(() => {
        setRangeState(nextRange);
        setDetailedCharts(null);

        void (async () => {
          const dashboard = await fetchAnalyticsDashboardAction(nextRange, filters);
          if (requestIdRef.current !== requestId) return;

          setKpis(dashboard.kpis);
          setCharts({
            throughput: dashboard.throughput,
            examMix: dashboard.examMix,
          });
        })();
      });
    },
    [filters],
  );

  const loadDetailedCharts = useCallback(
    (force = false) => {
      if (detailedCharts && !force) return;

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      startDetailedTransition(() => {
        void (async () => {
          const detailed = await fetchDetailedChartsAction(range, filters);
          if (requestIdRef.current !== requestId) return;
          setDetailedCharts(detailed);
        })();
      });
    },
    [detailedCharts, range, filters],
  );

  const clearDetailedCharts = useCallback(() => {
    setDetailedCharts(null);
  }, []);

  const value: AnalyticsProviderValue = useMemo(
    () => ({
      state: {
        range,
        filters,
        kpis,
        charts,
        detailedCharts,
        isLoading,
        isLoadingDetailed,
      },
      actions: {
        setRange,
        setFilters,
        loadDetailedCharts,
        clearDetailedCharts,
      },
    }),
    [
      range,
      filters,
      kpis,
      charts,
      detailedCharts,
      isLoading,
      isLoadingDetailed,
      setRange,
      setFilters,
      loadDetailedCharts,
      clearDetailedCharts,
    ],
  );

  return (
    <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
  );
}

export function useAnalyticsProvider(): AnalyticsProviderValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalyticsProvider must be used within AnalyticsProvider");
  }
  return context;
}
