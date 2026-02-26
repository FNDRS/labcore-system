"use server";

import { cache } from "react";
import { requireAuthWithGroup } from "@/lib/auth-server";
import {
  getIncidentPatterns,
  getIncidentSummaryCards,
  listIncidentFeed,
} from "@/lib/repositories/incidence-repository";
import type { AnalyticsTimeRange } from "@/lib/types/analytics-types";
import type {
  IncidentFeedFilters,
  IncidentFeedPage,
  IncidentFeedPagination,
  IncidentPattern,
  IncidentSummaryCards,
} from "@/lib/types/incidence-types";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { cookies } from "next/headers";

async function requireSupervisorAuth() {
  await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (ctx) => requireAuthWithGroup(ctx, "supervisor"),
  });
}

function normalizeRange(range: AnalyticsTimeRange): AnalyticsTimeRange {
  return {
    from: range.from.trim(),
    to: range.to.trim(),
    preset: range.preset,
  };
}

function normalizeFeedFilters(filters: IncidentFeedFilters): IncidentFeedFilters {
  return {
    range: normalizeRange(filters.range),
    type: filters.type ?? "all",
    examTypeId: filters.examTypeId?.trim() || null,
    technicianId: filters.technicianId?.trim() || null,
    search: filters.search?.trim() || undefined,
  };
}

function normalizePagination(
  pagination: IncidentFeedPagination | undefined,
): IncidentFeedPagination {
  const rawLimit = pagination?.limit ?? 20;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 100)
      : 20;
  return {
    limit,
    cursor: pagination?.cursor?.trim() || null,
  };
}

function parseFeedRequestCacheKey(cacheKey: string): {
  filters: IncidentFeedFilters;
  pagination: IncidentFeedPagination;
} {
  try {
    const parsed = JSON.parse(cacheKey) as {
      filters: IncidentFeedFilters;
      pagination?: IncidentFeedPagination;
    };
    return {
      filters: normalizeFeedFilters(parsed.filters),
      pagination: normalizePagination(parsed.pagination),
    };
  } catch {
    throw new Error("Invalid incident feed cache key");
  }
}

function parseRangeCacheKey(cacheKey: string): AnalyticsTimeRange {
  try {
    const parsed = JSON.parse(cacheKey) as AnalyticsTimeRange;
    return normalizeRange(parsed);
  } catch {
    throw new Error("Invalid range cache key");
  }
}

const fetchIncidentFeedCached = cache(
  async (requestCacheKey: string): Promise<IncidentFeedPage> => {
    await requireSupervisorAuth();
    const { filters, pagination } = parseFeedRequestCacheKey(requestCacheKey);
    return listIncidentFeed(filters, pagination);
  },
);

const fetchIncidentSummaryCached = cache(
  async (rangeCacheKey: string): Promise<IncidentSummaryCards> => {
    await requireSupervisorAuth();
    const range = parseRangeCacheKey(rangeCacheKey);
    return getIncidentSummaryCards(range);
  },
);

const fetchIncidentPatternsCached = cache(
  async (rangeCacheKey: string): Promise<IncidentPattern> => {
    await requireSupervisorAuth();
    const range = parseRangeCacheKey(rangeCacheKey);
    return getIncidentPatterns(range);
  },
);

export async function fetchIncidentFeedAction(
  filters: IncidentFeedFilters,
  pagination?: IncidentFeedPagination,
): Promise<IncidentFeedPage> {
  const normalizedFilters = normalizeFeedFilters(filters);
  const normalizedPagination = normalizePagination(pagination);
  const cacheKey = JSON.stringify({
    filters: normalizedFilters,
    pagination: normalizedPagination,
  });
  return fetchIncidentFeedCached(cacheKey);
}

export async function fetchIncidentSummaryAction(
  range: AnalyticsTimeRange,
): Promise<IncidentSummaryCards> {
  const normalizedRange = normalizeRange(range);
  return fetchIncidentSummaryCached(JSON.stringify(normalizedRange));
}

export async function fetchIncidentPatternsAction(
  range: AnalyticsTimeRange,
): Promise<IncidentPattern> {
  const normalizedRange = normalizeRange(range);
  return fetchIncidentPatternsCached(JSON.stringify(normalizedRange));
}
