"use server";

import { cache } from "react";
import { requireAuthWithGroup } from "@/lib/auth-server";
import {
  getAuditTimelineForWorkOrder,
  getRecentAuditActivity,
  searchAudit,
} from "@/lib/repositories/audit-repository";
import type {
  AuditSearchResult,
  RecentAuditActivityItem,
  WorkOrderTimeline,
} from "@/lib/types/audit-timeline-types";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { cookies } from "next/headers";

async function requireSupervisorAuth() {
  await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (ctx) => requireAuthWithGroup(ctx, "supervisor"),
  });
}

function normalizeWorkOrderId(workOrderId: string): string {
  return workOrderId.trim();
}

function normalizeSearchQuery(query: string): string {
  return query.trim();
}

function normalizeLimit(limit = 10): number {
  return Math.max(1, Math.min(50, Math.trunc(limit)));
}

const fetchAuditTimelineCached = cache(
  async (workOrderId: string): Promise<WorkOrderTimeline | null> => {
    await requireSupervisorAuth();
    return getAuditTimelineForWorkOrder(workOrderId);
  },
);

const searchAuditCached = cache(
  async (query: string): Promise<AuditSearchResult | null> => {
    await requireSupervisorAuth();
    return searchAudit(query);
  },
);

const fetchRecentAuditCached = cache(
  async (limit: number): Promise<RecentAuditActivityItem[]> => {
    await requireSupervisorAuth();
    return getRecentAuditActivity(limit);
  },
);

export async function fetchAuditTimelineAction(
  workOrderId: string,
): Promise<WorkOrderTimeline | null> {
  const normalizedWorkOrderId = normalizeWorkOrderId(workOrderId);
  if (!normalizedWorkOrderId) return null;
  return fetchAuditTimelineCached(normalizedWorkOrderId);
}

export async function searchAuditAction(
  query: string,
): Promise<AuditSearchResult | null> {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return null;
  return searchAuditCached(normalizedQuery);
}

export async function fetchRecentAuditAction(
  limit = 10,
): Promise<RecentAuditActivityItem[]> {
  return fetchRecentAuditCached(normalizeLimit(limit));
}
