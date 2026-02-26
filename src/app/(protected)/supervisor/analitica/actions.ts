"use server";

import { cache } from "react";
import { requireAuthWithGroup } from "@/lib/auth-server";
import {
  getDoctorVolume,
  getExamMixDistribution,
  getKPISummary,
  getRejectionAnalysis,
  getTATDistribution,
  getTechnicianWorkload,
  getThroughputSeries,
} from "@/lib/repositories/analytics-repository";
import type {
  AnalyticsDashboardData,
  AnalyticsDetailedChartsData,
  AnalyticsFilters,
  AnalyticsTimeRange,
} from "@/lib/types/analytics-types";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { cookies } from "next/headers";

type Payload = { range: AnalyticsTimeRange; filters: AnalyticsFilters };

function toMs(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? Number.NaN : ms;
}

function buildDefaultRange(): AnalyticsTimeRange {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString(),
    to: now.toISOString(),
    preset: "last30d",
  };
}

async function requireSupervisorAuth() {
  await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (ctx) => requireAuthWithGroup(ctx, "supervisor"),
  });
}

function normalizeRange(range?: AnalyticsTimeRange): AnalyticsTimeRange {
  if (!range) return buildDefaultRange();
  const fromMs = toMs(range.from);
  const toMsValue = toMs(range.to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMsValue)) return buildDefaultRange();
  const preset =
    range.preset === "today" ||
    range.preset === "last7d" ||
    range.preset === "last30d" ||
    range.preset === "custom"
      ? range.preset
      : "custom";
  const [from, to] = fromMs <= toMsValue ? [fromMs, toMsValue] : [toMsValue, fromMs];
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    preset,
  };
}

function normalizeFilters(filters: AnalyticsFilters = {}): AnalyticsFilters {
  return {
    examTypeCode: filters.examTypeCode?.trim() || undefined,
    priority:
      filters.priority === "routine" ||
      filters.priority === "urgent" ||
      filters.priority === "stat" ||
      filters.priority === "all"
        ? filters.priority
        : undefined,
  };
}

function parsePayload(cacheKey: string): Payload {
  try {
    const parsed = JSON.parse(cacheKey) as Partial<Payload>;
    return {
      range: normalizeRange(parsed.range),
      filters: normalizeFilters(parsed.filters),
    };
  } catch {
    return { range: buildDefaultRange(), filters: {} };
  }
}

const fetchDashboardCached = cache(
  async (cacheKey: string): Promise<AnalyticsDashboardData> => {
    await requireSupervisorAuth();
    const { range, filters } = parsePayload(cacheKey);
    const [kpis, throughput, examMix] = await Promise.all([
      getKPISummary(range, filters),
      getThroughputSeries(range, filters),
      getExamMixDistribution(range, filters),
    ]);
    return { range, kpis, throughput, examMix };
  },
);

const fetchDetailedCached = cache(
  async (cacheKey: string): Promise<AnalyticsDetailedChartsData> => {
    await requireSupervisorAuth();
    const { range, filters } = parsePayload(cacheKey);
    const [tatDistribution, technicianWorkload, rejectionAnalysis, doctorVolume] =
      await Promise.all([
        getTATDistribution(range, filters),
        getTechnicianWorkload(range, filters),
        getRejectionAnalysis(range, filters),
        getDoctorVolume(range, filters),
      ]);
    return {
      range,
      tatDistribution,
      technicianWorkload,
      rejectionAnalysis,
      doctorVolume,
    };
  },
);

export async function fetchAnalyticsDashboardAction(
  range: AnalyticsTimeRange,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsDashboardData> {
  const payload: Payload = {
    range: normalizeRange(range),
    filters: normalizeFilters(filters),
  };
  return fetchDashboardCached(JSON.stringify(payload));
}

export async function fetchDetailedChartsAction(
  range: AnalyticsTimeRange,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsDetailedChartsData> {
  const payload: Payload = {
    range: normalizeRange(range),
    filters: normalizeFilters(filters),
  };
  return fetchDetailedCached(JSON.stringify(payload));
}
