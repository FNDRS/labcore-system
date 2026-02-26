import type { ExamStatus } from "@/lib/contracts";
import type { AnalyticsTimeRange } from "@/lib/types/analytics-types";

export type IncidentType =
  | "exam_rejected"
  | "specimen_rejected"
  | "incidence_created"
  | "critical_result"
  | "exam_overdue";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentResolutionStatus = "open" | "resolved";

export interface IncidentFeedFilters {
  range: AnalyticsTimeRange;
  type?: IncidentType | "all";
  examTypeId?: string | null;
  technicianId?: string | null;
  search?: string;
}

export interface IncidentFeedPagination {
  limit: number;
  cursor?: string | null;
}

export interface IncidentFeedItem {
  id: string;
  eventId: string;
  workOrderId: string;
  sampleId: string | null;
  examId: string | null;
  accessionNumber: string | null;
  patientName: string;
  examTypeId: string | null;
  examTypeName: string | null;
  sampleBarcode: string | null;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string | null;
  reason: string | null;
  status: IncidentResolutionStatus;
  timestamp: string;
  actorId: string | null;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
}

export interface IncidentFeedPage {
  items: IncidentFeedItem[];
  nextCursor: string | null;
}

export interface IncidentSummaryCards {
  activeIncidences: number;
  rejectedExams: number;
  rejectedSamples: number;
  criticalResults: number;
}

export interface IncidentTrendDataPoint {
  date: string;
  count: number;
}

export interface IncidentPattern {
  reasonDistribution: Array<{ reason: string; count: number }>;
  rejectionByTechnician: Array<{
    technicianId: string;
    technicianName: string;
    count: number;
  }>;
  rejectionByExamType: Array<{
    examTypeId: string;
    examTypeCode: string;
    examTypeName: string;
    count: number;
  }>;
  incidenceTrend: IncidentTrendDataPoint[];
}

export interface OverdueExam {
  examId: string;
  sampleId: string;
  workOrderId: string;
  accessionNumber: string | null;
  patientName: string;
  examTypeId: string;
  examTypeName: string;
  status: ExamStatus;
  priority: "routine" | "urgent" | "stat" | null;
  startedAt: string | null;
  resultedAt: string | null;
  hoursOverdue: number;
  slaHours: number;
}
