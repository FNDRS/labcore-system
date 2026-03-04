"use server";

import { cache } from "react";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookieBasedClient, runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { requireAuthWithGroup } from "@/lib/auth-server";
import { cookies } from "next/headers";
import {
  computeDashboardMetrics,
  getCompletedTodayCount,
  listTechnicianSamples,
  computeMuestrasSummary,
  getSampleDetail as getSampleDetailFromRepo,
  lookupSampleByBarcode,
} from "@/lib/repositories/technician-repository";
import {
  markSampleCompleted,
  markSampleReceived,
  markSampleInProgress,
  markSampleRejected,
  reprintSampleLabel,
} from "@/lib/services/sample-status-service";
import type {
  DashboardMetrics,
  MuestrasSummary,
  NextSample,
  QueueRow,
  SampleStatus,
  SampleWorkstationDetail,
  SampleWorkstationRow,
} from "./types";

async function requireTechnicianAuth() {
  const { user } = await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (ctx) => requireAuthWithGroup(ctx, "tecnico"),
  });
  return user;
}

export type { SampleStatus, SamplePriority, SampleWorkstationPriority } from "./types";
export type {
  QueueRow,
  NextSample,
  DashboardMetrics,
  SampleWorkstationStatus,
  SampleWorkstationRow,
  SampleWorkstationDetail,
  MuestrasSummary,
} from "./types";

export const fetchPendingWorkOrders = cache(async () => {
  await requireTechnicianAuth();
  const { data: workOrders } = await cookieBasedClient.models.WorkOrder.list({
    filter: { status: { ne: "completed" } },
  });
  const enriched = await Promise.all(
    workOrders.map(async (wo) => {
      const [{ data: patient }, { data: samples }] = await Promise.all([
        cookieBasedClient.models.Patient.get({ id: wo.patientId }),
        cookieBasedClient.models.Sample.list({
          filter: { workOrderId: { eq: wo.id } },
        }),
      ]);
      return {
        id: wo.id,
        accessionNumber: wo.accessionNumber ?? "—",
        priority: wo.priority ?? "routine",
        status: wo.status ?? "pending",
        requestedAt: wo.requestedAt,
        patientName: patient
          ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Unknown"
          : "Unknown",
        sampleCount: samples?.length ?? 0,
      };
    })
  );
  return enriched;
});

export const fetchPendingSamples = cache(async () => {
  await requireTechnicianAuth();
  const [pending, received] = await Promise.all([
    cookieBasedClient.models.Sample.list({ filter: { status: { eq: "pending" } } }),
    cookieBasedClient.models.Sample.list({ filter: { status: { eq: "received" } } }),
  ]);
  const enrich = async (s: {
    id: string;
    workOrderId: string;
    examTypeId: string;
    barcode?: string | null;
    status?: string | null;
  }) => {
    const { data: workOrder } = await cookieBasedClient.models.WorkOrder.get({ id: s.workOrderId });
    const { data: examType } = await cookieBasedClient.models.ExamType.get({ id: s.examTypeId });
    if (!workOrder) return null;
    const { data: patient } = await cookieBasedClient.models.Patient.get({
      id: workOrder.patientId,
    });
    return {
      id: s.id,
      barcode: s.barcode ?? "—",
      status: s.status ?? "pending",
      examTypeName: examType?.name ?? "Unknown",
      patientName: patient
        ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Unknown"
        : "Unknown",
      accessionNumber: workOrder.accessionNumber ?? "—",
    };
  };
  const all = [...(pending.data ?? []), ...(received.data ?? [])];
  const enriched = await Promise.all(all.map(enrich));
  return enriched.filter((x): x is NonNullable<typeof x> => x !== null);
});

export async function getTechnicianDashboardData() {
  await requireTechnicianAuth();
  const [workOrders, samples] = await Promise.all([
    fetchPendingWorkOrders(),
    fetchPendingSamples(),
  ]);
  return { workOrders, samples };
}

export async function getSampleDetail(id: string): Promise<SampleWorkstationDetail | null> {
  await requireTechnicianAuth();
  return getSampleDetailFromRepo(id);
}

async function getUserId(): Promise<string> {
  await requireTechnicianAuth();
  const { userId } = await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (ctx) => getCurrentUser(ctx),
  });
  return userId ?? "unknown";
}

export async function markReceivedAction(
  sampleId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTechnicianAuth();
  const userId = await getUserId();
  return markSampleReceived(sampleId, userId);
}

export async function markInProgressAction(
  sampleId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTechnicianAuth();
  const userId = await getUserId();
  return markSampleInProgress(sampleId, userId);
}

export async function markRejectedAction(
  sampleId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTechnicianAuth();
  const userId = await getUserId();
  return markSampleRejected(sampleId, userId);
}

export async function markCompletedAction(
  sampleId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTechnicianAuth();
  const userId = await getUserId();
  return markSampleCompleted(sampleId, userId);
}

export async function lookupSampleByBarcodeAction(
  code: string
): Promise<{ ok: true; sample: SampleWorkstationRow } | { ok: false; error: string }> {
  await requireTechnicianAuth();
  const sample = await lookupSampleByBarcode(code);
  if (sample) return { ok: true, sample };
  return { ok: false, error: "Muestra no encontrada" };
}

export async function reprintLabelAction(
  sampleId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTechnicianAuth();
  const userId = await getUserId();
  return reprintSampleLabel(sampleId, userId);
}

/** Alias for markRejectedAction; sets Sample.status = "rejected" and audits SPECIMEN_REJECTED. */
export async function reportProblemAction(
  sampleId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return markRejectedAction(sampleId);
}

export async function fetchMuestrasAction(): Promise<{
  samples: SampleWorkstationRow[];
  summary: MuestrasSummary;
}> {
  await requireTechnicianAuth();
  const samples = await listTechnicianSamples();
  const summary = await computeMuestrasSummary(samples);
  return { samples, summary };
}

export const fetchOperativeDashboard = cache(async () => {
  await requireTechnicianAuth();
  const [samples, completedToday] = await Promise.all([
    listTechnicianSamples(),
    getCompletedTodayCount(),
  ]);
  const metrics: DashboardMetrics = await computeDashboardMetrics(samples, completedToday);
  const queueRows: QueueRow[] = samples.map((s) => ({
    id: s.id,
    sampleId: s.sampleId,
    patientName: s.patientName,
    testType: s.testType,
    priority: s.priority,
    status: (s.status === "Completed"
      ? "Complete"
      : s.status === "Flagged"
        ? "Flagged"
        : "Processing") as SampleStatus,
    waitMins: s.waitMins,
    assignedToMe: s.assignedToMe,
  }));
  const next: NextSample | null = queueRows[0]
    ? {
        sampleId: queueRows[0].sampleId,
        testType: queueRows[0].testType,
        patientName: queueRows[0].patientName,
        priority: queueRows[0].priority,
        waitMins: queueRows[0].waitMins,
      }
    : null;
  const lastScanned = queueRows[0]
    ? { sampleId: queueRows[0].sampleId, status: queueRows[0].status }
    : null;
  const urgentCount = samples.filter(
    (s) => s.priority === "Urgent" && s.status !== "Completed"
  ).length;
  return {
    nextSample: next,
    urgentCount,
    queueRows,
    metrics,
    lastScanned,
  };
});
