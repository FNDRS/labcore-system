"use server";

import { cache } from "react";
import { requireAuthWithGroup } from "@/lib/auth-server";
import {
  getWorkOrderConsolidatedResults,
  listCompletedWorkOrders,
} from "@/lib/repositories/results-repository";
import type {
  ConsolidatedWorkOrderResult,
  ResultsListFilters,
  ResultsListItem,
} from "@/lib/types/results-types";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { cookies } from "next/headers";

async function requireSupervisorAuth() {
  await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (ctx) => requireAuthWithGroup(ctx, "supervisor"),
  });
}

function normalizeResultsFilters(filters: ResultsListFilters = {}): ResultsListFilters {
  return {
    from: filters.from?.trim() || undefined,
    to: filters.to?.trim() || undefined,
    status: filters.status ?? undefined,
    search: filters.search?.trim() || undefined,
    referringDoctor: filters.referringDoctor?.trim() || undefined,
  };
}

function parseFiltersFromCacheKey(cacheKey: string): ResultsListFilters {
  try {
    const parsed = JSON.parse(cacheKey) as ResultsListFilters;
    return normalizeResultsFilters(parsed);
  } catch {
    return {};
  }
}

const fetchResultsListCached = cache(
  async (filtersCacheKey: string): Promise<ResultsListItem[]> => {
    await requireSupervisorAuth();
    const filters = parseFiltersFromCacheKey(filtersCacheKey);
    return listCompletedWorkOrders(filters);
  }
);

const fetchConsolidatedResultCached = cache(
  async (workOrderId: string): Promise<ConsolidatedWorkOrderResult | null> => {
    await requireSupervisorAuth();
    return getWorkOrderConsolidatedResults(workOrderId);
  }
);

export async function fetchResultsListAction(
  filters: ResultsListFilters = {}
): Promise<ResultsListItem[]> {
  const normalizedFilters = normalizeResultsFilters(filters);
  const filtersCacheKey = JSON.stringify(normalizedFilters);
  return fetchResultsListCached(filtersCacheKey);
}

export async function fetchConsolidatedResultAction(
  workOrderId: string
): Promise<ConsolidatedWorkOrderResult | null> {
  return fetchConsolidatedResultCached(workOrderId.trim());
}
