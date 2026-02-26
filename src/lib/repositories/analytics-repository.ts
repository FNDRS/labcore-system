"use server";

import { cache } from "react";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/contracts";
import type {
  AnalyticsFilters,
  AnalyticsTimeRange,
  DoctorVolumeEntry,
  ExamMixEntry,
  KPISummary,
  RejectionAnalysisEntry,
  TATBucket,
  TechnicianWorkloadEntry,
  ThroughputDataPoint,
} from "@/lib/types/analytics-types";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

type WorkOrderRecord = {
  id: string;
  requestedAt: string | null;
  priority: "routine" | "urgent" | "stat" | null;
  referringDoctor: string | null;
};

type SampleRecord = {
  id: string;
  workOrderId: string;
  examTypeId: string;
};

type ExamRecord = {
  id: string;
  sampleId: string;
  examTypeId: string;
  status: string | null;
  startedAt: string | null;
  resultedAt: string | null;
  validatedAt: string | null;
  performedBy: string | null;
};

type ExamTypeRecord = {
  id: string;
  code: string | null;
  name: string | null;
};

type AuditEventRecord = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
};

type AnalyticsBaseData = {
  workOrders: WorkOrderRecord[];
  samples: SampleRecord[];
  exams: ExamRecord[];
  examTypes: ExamTypeRecord[];
  auditEvents: AuditEventRecord[];
  samplesByWorkOrderId: Map<string, SampleRecord[]>;
  examBySampleId: Map<string, ExamRecord>;
  workOrderById: Map<string, WorkOrderRecord>;
  examTypeById: Map<string, ExamTypeRecord>;
};

const TERMINAL_EXAM_STATUSES = new Set(["approved", "rejected"]);
const TAT_BUCKETS: { label: string; minMinutes: number; maxMinutes: number | null }[] = [
  { label: "0-30 min", minMinutes: 0, maxMinutes: 30 },
  { label: "31-60 min", minMinutes: 31, maxMinutes: 60 },
  { label: "61-120 min", minMinutes: 61, maxMinutes: 120 },
  { label: "121-240 min", minMinutes: 121, maxMinutes: 240 },
  { label: ">240 min", minMinutes: 241, maxMinutes: null },
];

function toMs(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function toDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function isInRange(ts: string | null | undefined, range: AnalyticsTimeRange): boolean {
  if (!ts) return false;
  const ms = toMs(ts);
  if (!ms) return false;
  const from = toMs(range.from);
  const to = toMs(range.to);
  if (from && ms < from) return false;
  if (to && ms > to) return false;
  return true;
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function parseReason(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const direct =
    typeof metadata.reason === "string"
      ? metadata.reason
      : typeof metadata.motivo === "string"
        ? metadata.motivo
        : typeof metadata.type === "string"
          ? metadata.type
          : null;
  return direct?.trim() || null;
}

function computeTatMinutes(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  if (!start || !end) return null;
  const startMs = toMs(start);
  const endMs = toMs(end);
  if (!startMs || !endMs || endMs < startMs) return null;
  return Math.round((endMs - startMs) / 60_000);
}

async function fetchAnalyticsBaseData(range: AnalyticsTimeRange): Promise<AnalyticsBaseData> {
  const auditFilter: Array<Record<string, unknown>> = [];
  if (range.from?.trim()) auditFilter.push({ timestamp: { ge: range.from.trim() } });
  if (range.to?.trim()) auditFilter.push({ timestamp: { le: range.to.trim() } });

  const [workOrderRes, sampleRes, examRes, examTypeRes, auditRes] = await Promise.all([
    cookieBasedClient.models.WorkOrder.list(),
    cookieBasedClient.models.Sample.list(),
    cookieBasedClient.models.Exam.list(),
    cookieBasedClient.models.ExamType.list(),
    cookieBasedClient.models.AuditEvent.list({
      filter: auditFilter.length > 0 ? { and: auditFilter } : undefined,
    }),
  ]);

  const workOrders: WorkOrderRecord[] = [];
  for (const row of workOrderRes.data ?? []) {
    if (!row?.id) continue;
    workOrders.push({
      id: row.id,
      requestedAt: typeof row.requestedAt === "string" ? row.requestedAt : null,
      priority:
        row.priority === "routine" || row.priority === "urgent" || row.priority === "stat"
          ? row.priority
          : null,
      referringDoctor: typeof row.referringDoctor === "string" ? row.referringDoctor : null,
    });
  }

  const samples: SampleRecord[] = [];
  for (const row of sampleRes.data ?? []) {
    if (!row?.id || !row.workOrderId || !row.examTypeId) continue;
    samples.push({
      id: row.id,
      workOrderId: row.workOrderId,
      examTypeId: row.examTypeId,
    });
  }

  const exams: ExamRecord[] = [];
  for (const row of examRes.data ?? []) {
    if (!row?.id || !row.sampleId || !row.examTypeId) continue;
    exams.push({
      id: row.id,
      sampleId: row.sampleId,
      examTypeId: row.examTypeId,
      status: typeof row.status === "string" ? row.status : null,
      startedAt: typeof row.startedAt === "string" ? row.startedAt : null,
      resultedAt: typeof row.resultedAt === "string" ? row.resultedAt : null,
      validatedAt: typeof row.validatedAt === "string" ? row.validatedAt : null,
      performedBy: typeof row.performedBy === "string" ? row.performedBy : null,
    });
  }

  const examTypes: ExamTypeRecord[] = [];
  for (const row of examTypeRes.data ?? []) {
    if (!row?.id) continue;
    examTypes.push({
      id: row.id,
      code: typeof row.code === "string" ? row.code : null,
      name: typeof row.name === "string" ? row.name : null,
    });
  }

  const auditEvents: AuditEventRecord[] = [];
  for (const row of auditRes.data ?? []) {
    if (!row?.id || !row.timestamp || !row.action) continue;
    auditEvents.push({
      id: row.id,
      action: row.action,
      entityType: typeof row.entityType === "string" ? row.entityType : null,
      entityId: typeof row.entityId === "string" ? row.entityId : null,
      timestamp: row.timestamp,
      metadata: parseRecord(row.metadata),
    });
  }

  const samplesByWorkOrderId = new Map<string, SampleRecord[]>();
  for (const s of samples) {
    const arr = samplesByWorkOrderId.get(s.workOrderId) ?? [];
    arr.push(s);
    samplesByWorkOrderId.set(s.workOrderId, arr);
  }

  const examBySampleId = new Map<string, ExamRecord>();
  for (const e of exams) {
    examBySampleId.set(e.sampleId, e);
  }

  const workOrderById = new Map(workOrders.map((w) => [w.id, w]));
  const examTypeById = new Map(examTypes.map((t) => [t.id, t]));

  return {
    workOrders,
    samples,
    exams,
    examTypes,
    auditEvents,
    samplesByWorkOrderId,
    examBySampleId,
    workOrderById,
    examTypeById,
  };
}

const fetchAnalyticsBaseDataCached = cache(
  async (rangeKey: string): Promise<AnalyticsBaseData> => {
    const range = JSON.parse(rangeKey) as AnalyticsTimeRange;
    return fetchAnalyticsBaseData(range);
  },
);

function applyFilters(
  base: AnalyticsBaseData,
  range: AnalyticsTimeRange,
  filters: AnalyticsFilters | undefined,
): {
  workOrderIdsInRange: Set<string>;
  examIdsInRange: Set<string>;
  workOrderIdsRequestedInRange: Set<string>;
  examTypeIdsAllowed: Set<string> | null;
  priorityAllowed: Set<string> | null;
} {
  const examTypeIdsAllowed: Set<string> | null =
    filters?.examTypeCode?.trim()
      ? new Set(
          base.examTypes
            .filter((t) => t.code?.toLowerCase() === filters.examTypeCode!.trim().toLowerCase())
            .map((t) => t.id),
        )
      : null;

  const priorityAllowed: Set<string> | null =
    filters?.priority && filters.priority !== "all"
      ? new Set([filters.priority])
      : null;

  const workOrderIdsInRange = new Set<string>();
  const examIdsInRange = new Set<string>();

  for (const exam of base.exams) {
    if (!TERMINAL_EXAM_STATUSES.has(exam.status ?? "")) continue;
    if (!isInRange(exam.validatedAt, range)) continue;

    const sample = base.samples.find((s) => s.id === exam.sampleId);
    const woId = sample?.workOrderId;
    if (!woId) continue;

    const wo = base.workOrderById.get(woId);
    if (priorityAllowed && (!wo?.priority || !priorityAllowed.has(wo.priority))) continue;
    if (examTypeIdsAllowed && !examTypeIdsAllowed.has(exam.examTypeId)) continue;

    workOrderIdsInRange.add(woId);
    examIdsInRange.add(exam.id);
  }

  const workOrderIdsRequestedInRange = new Set<string>();
  for (const wo of base.workOrders) {
    if (!isInRange(wo.requestedAt, range)) continue;
    if (priorityAllowed && (!wo.priority || !priorityAllowed.has(wo.priority))) continue;
    workOrderIdsRequestedInRange.add(wo.id);
  }

  return {
    workOrderIdsInRange,
    examIdsInRange,
    workOrderIdsRequestedInRange,
    examTypeIdsAllowed,
    priorityAllowed,
  };
}

export async function getKPISummary(
  range: AnalyticsTimeRange,
  filters?: AnalyticsFilters,
): Promise<KPISummary> {
  const base = await fetchAnalyticsBaseDataCached(JSON.stringify(range));
  const { workOrderIdsInRange, examIdsInRange } = applyFilters(base, range, filters);

  let ordersProcessed = workOrderIdsInRange.size;
  let examsCompleted = 0;
  let totalTatMs = 0;
  let tatCount = 0;
  let approved = 0;
  let rejected = 0;

  for (const examId of examIdsInRange) {
    const exam = base.exams.find((e) => e.id === examId);
    if (!exam) continue;
    if (!TERMINAL_EXAM_STATUSES.has(exam.status ?? "")) continue;

    examsCompleted++;
    if (exam.status === "approved") {
      approved++;
      const tat = computeTatMinutes(exam.startedAt ?? exam.resultedAt, exam.validatedAt);
      if (tat != null) {
        totalTatMs += tat * 60_000;
        tatCount++;
      }
    } else if (exam.status === "rejected") {
      rejected++;
    }
  }

  const incidenceCount = base.auditEvents.filter((e) => {
    if (e.action !== AUDIT_ACTIONS.INCIDENCE_CREATED) return false;
    if (!isInRange(e.timestamp, range)) return false;
    if (e.entityType === AUDIT_ENTITY_TYPES.EXAM) {
      const exam = base.exams.find((ex) => ex.id === e.entityId);
      const sample = exam ? base.samples.find((s) => s.id === exam.sampleId) : null;
      const woId = sample?.workOrderId;
      return woId ? workOrderIdsInRange.has(woId) : false;
    }
    if (e.entityType === AUDIT_ENTITY_TYPES.SAMPLE) {
      const sample = base.samples.find((s) => s.id === e.entityId);
      return sample ? workOrderIdsInRange.has(sample.workOrderId) : false;
    }
    return false;
  }).length;

  let pendingBacklog = 0;
  for (const woId of workOrderIdsInRange) {
    const samples = base.samplesByWorkOrderId.get(woId) ?? [];
    for (const sample of samples) {
      const exam = base.examBySampleId.get(sample.id);
      if (!exam) continue;
      if (!TERMINAL_EXAM_STATUSES.has(exam.status ?? "")) pendingBacklog++;
    }
  }

  const totalTerminal = approved + rejected;
  const rejectionRate = totalTerminal > 0 ? rejected / totalTerminal : 0;
  const averageTatMinutes = tatCount > 0 ? Math.round(totalTatMs / 60_000 / tatCount) : 0;

  return {
    ordersProcessed,
    examsCompleted,
    averageTatMinutes,
    rejectionRate,
    incidencesCount: incidenceCount,
    pendingBacklog,
  };
}

export async function getThroughputSeries(
  range: AnalyticsTimeRange,
  filters?: AnalyticsFilters,
): Promise<ThroughputDataPoint[]> {
  const base = await fetchAnalyticsBaseDataCached(JSON.stringify(range));
  const { examIdsInRange } = applyFilters(base, range, filters);

  const byDate = new Map<string, { approved: number; rejected: number }>();

  for (const examId of examIdsInRange) {
    const exam = base.exams.find((e) => e.id === examId);
    if (!exam?.validatedAt) continue;
    const dateKey = toDateKey(exam.validatedAt);
    const curr = byDate.get(dateKey) ?? { approved: 0, rejected: 0 };
    if (exam.status === "approved") curr.approved++;
    else if (exam.status === "rejected") curr.rejected++;
    byDate.set(dateKey, curr);
  }

  const sortedDates = [...byDate.keys()].sort();
  return sortedDates.map((date) => {
    const { approved, rejected } = byDate.get(date)!;
    return { date, approved, rejected, total: approved + rejected };
  });
}

export async function getExamMixDistribution(
  range: AnalyticsTimeRange,
  filters?: AnalyticsFilters,
): Promise<ExamMixEntry[]> {
  const base = await fetchAnalyticsBaseDataCached(JSON.stringify(range));
  const { examIdsInRange } = applyFilters(base, range, filters);

  const byExamType = new Map<string, number>();
  for (const examId of examIdsInRange) {
    const exam = base.exams.find((e) => e.id === examId);
    if (!exam) continue;
    const count = byExamType.get(exam.examTypeId) ?? 0;
    byExamType.set(exam.examTypeId, count + 1);
  }

  const total = [...byExamType.values()].reduce((a, b) => a + b, 0);
  return [...byExamType.entries()]
    .map(([examTypeId, count]) => {
      const examType = base.examTypeById.get(examTypeId);
      return {
        examTypeId,
        examTypeCode: examType?.code ?? "N/A",
        examTypeName: examType?.name ?? "Examen",
        count,
        percentage: total > 0 ? count / total : 0,
      };
    })
    .toSorted((a, b) => b.count - a.count);
}

export async function getTATDistribution(
  range: AnalyticsTimeRange,
  filters?: AnalyticsFilters,
): Promise<TATBucket[]> {
  const base = await fetchAnalyticsBaseDataCached(JSON.stringify(range));
  const { examIdsInRange } = applyFilters(base, range, filters);

  const buckets: TATBucket[] = TAT_BUCKETS.map((b) => ({
    bucketLabel: b.label,
    minMinutes: b.minMinutes,
    maxMinutes: b.maxMinutes,
    routine: 0,
    urgent: 0,
    stat: 0,
    total: 0,
  }));

  for (const examId of examIdsInRange) {
    const exam = base.exams.find((e) => e.id === examId);
    if (!exam || !exam.validatedAt) continue;
    const sample = base.samples.find((s) => s.id === exam.sampleId);
    const wo = sample ? base.workOrderById.get(sample.workOrderId) : null;
    const priority = (wo?.priority ?? "routine") as "routine" | "urgent" | "stat";

    const tat = computeTatMinutes(exam.startedAt ?? exam.resultedAt, exam.validatedAt);
    if (tat == null) continue;

    let bucketIdx = -1;
    for (let i = 0; i < TAT_BUCKETS.length; i++) {
      const b = TAT_BUCKETS[i];
      if (tat >= b.minMinutes && (b.maxMinutes == null || tat <= b.maxMinutes)) {
        bucketIdx = i;
        break;
      }
    }
    if (bucketIdx < 0) continue;

    buckets[bucketIdx].total++;
    buckets[bucketIdx][priority]++;
  }

  return buckets;
}

export async function getTechnicianWorkload(
  range: AnalyticsTimeRange,
  filters?: AnalyticsFilters,
): Promise<TechnicianWorkloadEntry[]> {
  const base = await fetchAnalyticsBaseDataCached(JSON.stringify(range));
  const { examIdsInRange } = applyFilters(base, range, filters);

  const byTechnician = new Map<
    string,
    { examCount: number; approvedCount: number; rejectedCount: number; tatSum: number; tatCount: number }
  >();

  for (const examId of examIdsInRange) {
    const exam = base.exams.find((e) => e.id === examId);
    if (!exam) continue;
    const techId = exam.performedBy?.trim() || "Sin asignar";
    const curr = byTechnician.get(techId) ?? {
      examCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      tatSum: 0,
      tatCount: 0,
    };
    curr.examCount++;
    if (exam.status === "approved") curr.approvedCount++;
    else if (exam.status === "rejected") curr.rejectedCount++;
    const tat = computeTatMinutes(exam.startedAt ?? exam.resultedAt, exam.validatedAt);
    if (tat != null) {
      curr.tatSum += tat;
      curr.tatCount++;
    }
    byTechnician.set(techId, curr);
  }

  return [...byTechnician.entries()].map(([technicianId, agg]) => ({
    technicianId,
    technicianName: technicianId,
    examCount: agg.examCount,
    approvedCount: agg.approvedCount,
    rejectedCount: agg.rejectedCount,
    averageTatMinutes: agg.tatCount > 0 ? Math.round(agg.tatSum / agg.tatCount) : null,
  }));
}

export async function getRejectionAnalysis(
  range: AnalyticsTimeRange,
  filters?: AnalyticsFilters,
): Promise<RejectionAnalysisEntry[]> {
  const base = await fetchAnalyticsBaseDataCached(JSON.stringify(range));
  const { examTypeIdsAllowed, priorityAllowed } = applyFilters(base, range, filters);

  const byExamType = new Map<
    string,
    { totalRejections: number; byReason: Map<string, number> }
  >();

  for (const event of base.auditEvents) {
    if (event.action !== AUDIT_ACTIONS.EXAM_REJECTED) continue;
    if (!isInRange(event.timestamp, range)) continue;

    let examTypeId: string | null = null;
    let woId: string | null = null;
    if (event.entityType === AUDIT_ENTITY_TYPES.EXAM && event.entityId) {
      const exam = base.exams.find((e) => e.id === event.entityId);
      examTypeId = exam?.examTypeId ?? null;
      const sample = exam ? base.samples.find((s) => s.id === exam.sampleId) : null;
      woId = sample?.workOrderId ?? null;
    }
    if (!examTypeId) {
      const meta = event.metadata;
      if (meta && typeof meta.examTypeId === "string") examTypeId = meta.examTypeId;
      if (meta && typeof meta.sampleId === "string") {
        const sample = base.samples.find((s) => s.id === meta.sampleId);
        examTypeId = examTypeId ?? sample?.examTypeId ?? null;
        woId = woId ?? sample?.workOrderId ?? null;
      }
    }
    if (!examTypeId) continue;
    if (examTypeIdsAllowed && !examTypeIdsAllowed.has(examTypeId)) continue;
    if (priorityAllowed && woId) {
      const wo = base.workOrderById.get(woId);
      if (!wo?.priority || !priorityAllowed.has(wo.priority)) continue;
    }

    const reason = parseReason(event.metadata) ?? "Sin motivo";

    const entry = byExamType.get(examTypeId) ?? {
      totalRejections: 0,
      byReason: new Map<string, number>(),
    };
    entry.totalRejections++;
    const reasonCount = entry.byReason.get(reason) ?? 0;
    entry.byReason.set(reason, reasonCount + 1);
    byExamType.set(examTypeId, entry);
  }

  return [...byExamType.entries()].map(([examTypeId, entry]) => {
    const examType = base.examTypeById.get(examTypeId);
    const byReason: Record<string, number> = {};
    for (const [k, v] of entry.byReason) byReason[k] = v;
    return {
      examTypeId,
      examTypeCode: examType?.code ?? "N/A",
      examTypeName: examType?.name ?? "Examen",
      totalRejections: entry.totalRejections,
      byReason,
    };
  });
}

export async function getDoctorVolume(
  range: AnalyticsTimeRange,
  filters?: AnalyticsFilters,
): Promise<DoctorVolumeEntry[]> {
  const base = await fetchAnalyticsBaseDataCached(JSON.stringify(range));
  const { workOrderIdsRequestedInRange } = applyFilters(base, range, filters);

  const byDoctor = new Map<string, number>();
  for (const woId of workOrderIdsRequestedInRange) {
    const wo = base.workOrderById.get(woId);
    if (!wo) continue;
    const doctor = wo.referringDoctor?.trim() || "Sin doctor";
    byDoctor.set(doctor, (byDoctor.get(doctor) ?? 0) + 1);
  }

  const total = [...byDoctor.values()].reduce((a, b) => a + b, 0);
  return [...byDoctor.entries()]
    .map(([referringDoctor, workOrderCount]) => ({
      referringDoctor,
      workOrderCount,
      percentage: total > 0 ? workOrderCount / total : 0,
    }))
    .toSorted((a, b) => b.workOrderCount - a.workOrderCount);
}
