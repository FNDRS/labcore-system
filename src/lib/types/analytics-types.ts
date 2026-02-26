export type AnalyticsRangePreset = "today" | "last7d" | "last30d" | "custom";

export interface AnalyticsTimeRange {
  from: string;
  to: string;
  preset: AnalyticsRangePreset;
}

export interface AnalyticsFilters {
  examTypeCode?: string | null;
  priority?: "routine" | "urgent" | "stat" | "all";
}

export type AnalyticsTrendDirection = "up" | "down" | "flat";

export type AnalyticsMetricKey =
  | "ordersProcessed"
  | "examsCompleted"
  | "averageTatMinutes"
  | "rejectionRate"
  | "incidencesCount"
  | "pendingBacklog";

export interface AnalyticsMetricTrend {
  direction: AnalyticsTrendDirection;
  percentage: number;
  previousValue: number | null;
}

export interface KPISummary {
  ordersProcessed: number;
  examsCompleted: number;
  averageTatMinutes: number;
  rejectionRate: number;
  incidencesCount: number;
  pendingBacklog: number;
  trends?: Partial<Record<AnalyticsMetricKey, AnalyticsMetricTrend>>;
}

export interface ThroughputDataPoint {
  date: string;
  approved: number;
  rejected: number;
  total: number;
}

export interface TATBucket {
  bucketLabel: string;
  minMinutes: number | null;
  maxMinutes: number | null;
  routine: number;
  urgent: number;
  stat: number;
  total: number;
}

export interface ExamMixEntry {
  examTypeId: string;
  examTypeCode: string;
  examTypeName: string;
  count: number;
  percentage: number;
}

export interface TechnicianWorkloadEntry {
  technicianId: string;
  technicianName: string;
  examCount: number;
  approvedCount: number;
  rejectedCount: number;
  averageTatMinutes: number | null;
}

export interface RejectionAnalysisEntry {
  examTypeId: string;
  examTypeCode: string;
  examTypeName: string;
  totalRejections: number;
  byReason: Record<string, number>;
}

export interface PeakHourCell {
  dayOfWeek: number;
  hourOfDay: number;
  count: number;
}

export interface DoctorVolumeEntry {
  referringDoctor: string;
  workOrderCount: number;
  percentage: number;
}

export interface AnalyticsDashboardData {
  range: AnalyticsTimeRange;
  kpis: KPISummary;
  throughput: ThroughputDataPoint[];
  examMix: ExamMixEntry[];
}

export interface AnalyticsDetailedChartsData {
  range: AnalyticsTimeRange;
  tatDistribution: TATBucket[];
  technicianWorkload: TechnicianWorkloadEntry[];
  rejectionAnalysis: RejectionAnalysisEntry[];
  doctorVolume: DoctorVolumeEntry[];
  peakHours?: PeakHourCell[];
}
