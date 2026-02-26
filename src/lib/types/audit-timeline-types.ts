import type { AuditAction, AuditEntityType, SampleStatus } from "@/lib/contracts";

export type AuditEventCategory =
  | "creation"
  | "processing"
  | "validation"
  | "rejection"
  | "incidence"
  | "info";

export interface AuditTimelineEvent {
  id: string;
  action: AuditAction | string;
  label: string;
  category: AuditEventCategory;
  entityType: AuditEntityType | string;
  entityId: string;
  timestamp: string;
  actorId: string | null;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
}

export interface TimelineDurations {
  preAnalyticalMinutes: number | null;
  analyticalMinutes: number | null;
  postAnalyticalMinutes: number | null;
  totalLifecycleMinutes: number | null;
}

export interface SampleTimeline {
  sampleId: string;
  barcode: string | null;
  sampleStatus: SampleStatus | null;
  examId: string | null;
  examTypeId: string | null;
  examTypeCode: string | null;
  examTypeName: string | null;
  events: AuditTimelineEvent[];
  durations: TimelineDurations;
  incidenceCount: number;
  rejectionCount: number;
}

export interface WorkOrderTimeline {
  workOrderId: string;
  accessionNumber: string | null;
  requestedAt: string | null;
  priority: "routine" | "urgent" | "stat" | null;
  referringDoctor: string | null;
  patient: {
    id: string;
    fullName: string;
  };
  orderEvents: AuditTimelineEvent[];
  sampleTimelines: SampleTimeline[];
  summary: {
    totalEvents: number;
    totalSamples: number;
    samplesWithIncidence: number;
    samplesWithRejection: number;
    firstEventAt: string | null;
    lastEventAt: string | null;
  };
}

export interface RecentAuditActivityItem {
  workOrderId: string;
  accessionNumber: string | null;
  patientName: string;
  lastEventAt: string;
  eventCount: number;
}

export interface AuditSearchResult {
  workOrderId: string;
  matchedBy: "accession" | "patient" | "barcode" | "workOrderId";
}
