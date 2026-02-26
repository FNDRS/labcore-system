"use server";

import { cookieBasedClient } from "@/utils/amplifyServerUtils";
import type {
  Priority,
  QuickFilter,
  ReceptionOrder,
  ReceptionStatus,
} from "@/app/(protected)/recepcion/types";

/** Minimal fields for reception list - reduces payload per [Amplify docs](https://docs.amplify.aws/nextjs/build-a-backend/data/query-data/). */
const WORK_ORDER_SELECTION = [
  "id",
  "patientId",
  "accessionNumber",
  "referringDoctor",
  "requestedExamTypeCodes",
  "priority",
  "notes",
  "requestedAt",
  "status",
] as const;

const SAMPLE_SELECTION = ["id", "workOrderId", "status"] as const;

const PATIENT_SELECTION = ["id", "firstName", "lastName", "dateOfBirth"] as const;

const EXAM_TYPE_SELECTION = ["code", "name"] as const;

/** Reception only cares about orders it can act on: Sin muestras (always) or Muestras creadas from today. */
function isReceptionRelevant(status: ReceptionStatus, createdAt: string): boolean {
  if (status === "Sin muestras") return true;
  if (status === "Procesando") return false;
  if (status === "Muestras creadas") {
    const d = new Date(createdAt);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }
  return false;
}

/** Compute reception status from samples. */
function deriveReceptionStatus(hasSamples: boolean, sampleStatuses: string[]): ReceptionStatus {
  if (!hasSamples || sampleStatuses.length === 0) return "Sin muestras";
  const anyReady = sampleStatuses.some(
    (s) => s === "ready_for_lab" || s === "received" || s === "inprogress" || s === "completed"
  );
  if (anyReady) return "Procesando";
  return "Muestras creadas";
}

/** Compute age from dateOfBirth (YYYY-MM-DD). */
function ageFromDateOfBirth(dob: string | null | undefined): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Map schema priority to UI. */
function toUIPriority(p: string | null | undefined): Priority {
  if (p === "urgent" || p === "stat") return "Urgente";
  return "Rutina";
}

export type ReceptionListFilters = {
  quickFilter?: QuickFilter;
  search?: string;
};

export type ReceptionListPage = {
  orders: ReceptionOrder[];
  nextToken: string | null;
  hasMore: boolean;
};

const PAGE_SIZE = 50;

/** List work orders as ReceptionOrder DTOs with pagination. Only fetches orders relevant to reception. */
export async function listReceptionOrders(
  filters: ReceptionListFilters = {},
  pagination?: { limit?: number; nextToken?: string | null }
): Promise<ReceptionListPage> {
  const { quickFilter = "Todas", search = "" } = filters;
  const limit = Math.min(pagination?.limit ?? PAGE_SIZE, 100);
  const client = cookieBasedClient;

  // 1. Fetch one page of work orders + exam types (selection sets reduce payload)
  const [{ data: examTypes }, workOrderPage] = await Promise.all([
    client.models.ExamType.list({ selectionSet: EXAM_TYPE_SELECTION }),
    client.models.WorkOrder.list({
      filter: { status: { ne: "completed" } },
      limit,
      nextToken: pagination?.nextToken ?? undefined,
      selectionSet: WORK_ORDER_SELECTION,
    }),
  ]);

  const workOrders = workOrderPage.data ?? [];
  const nextToken = workOrderPage.nextToken ?? null;

  if (workOrders.length === 0) {
    return { orders: [], nextToken: null, hasMore: false };
  }

  const examTypeByName = new Map(examTypes?.map((e) => [e.code, e.name]) ?? []);

  // 2. Fetch samples for this page of work orders (parallel, one call per WO)
  const sampleResults = await Promise.all(
    workOrders.map((wo) =>
      wo.id
        ? client.models.Sample.list({
            filter: { workOrderId: { eq: wo.id } },
            selectionSet: SAMPLE_SELECTION,
          })
        : Promise.resolve({ data: [] })
    )
  );

  const samplesByWorkOrderId = new Map<string, Awaited<typeof sampleResults>[number]["data"]>();
  workOrders.forEach((wo, i) => {
    if (wo.id) {
      const samples = sampleResults[i]?.data ?? [];
      samplesByWorkOrderId.set(wo.id, samples);
    }
  });

  // 3. Build candidates: reception-relevant only, apply quick filter (search needs patientName, done after patients)
  const candidateOrders: { order: ReceptionOrder; patientId: string }[] = [];
  for (const wo of workOrders) {
    if (!wo.id || !wo.patientId) continue;

    const samples = samplesByWorkOrderId.get(wo.id) ?? [];
    const createdAt = wo.requestedAt ?? new Date().toISOString();
    const sampleStatuses = (samples.map((s) => s.status).filter(Boolean) ?? []) as string[];
    const status = deriveReceptionStatus(samples.length > 0, sampleStatuses);

    if (!isReceptionRelevant(status, createdAt)) continue;

    const requestedCodes = (wo.requestedExamTypeCodes ?? []).filter((c): c is string => c != null);
    const testNames = requestedCodes.map((code) => examTypeByName.get(code) ?? code);
    const displayId = wo.accessionNumber ?? `#${wo.id.slice(0, 8)}`;

    const order: ReceptionOrder = {
      id: wo.id,
      displayId,
      patientName: "—",
      patientAge: 0,
      doctor: wo.referringDoctor ?? "—",
      tests: testNames,
      priority: toUIPriority(wo.priority),
      status,
      notes: wo.notes ?? "",
      createdAt,
    };

    if (quickFilter === "Hoy") {
      const d = new Date(createdAt);
      const now = new Date();
      if (
        d.getDate() !== now.getDate() ||
        d.getMonth() !== now.getMonth() ||
        d.getFullYear() !== now.getFullYear()
      )
        continue;
    }
    if (quickFilter === "Urgentes" && order.priority !== "Urgente") continue;
    if (quickFilter === "Sin muestras" && order.status !== "Sin muestras") continue;
    if (quickFilter === "Listas" && order.status !== "Muestras creadas") continue;

    candidateOrders.push({ order, patientId: wo.patientId });
  }

  // 4. Batch fetch patients for filtered orders only
  const uniquePatientIds = [...new Set(candidateOrders.map((c) => c.patientId).filter(Boolean))];
  const patientResults = await Promise.all(
    uniquePatientIds.map((id) =>
      client.models.Patient.get({ id }, { selectionSet: PATIENT_SELECTION })
    )
  );
  const patientById = new Map(
    patientResults.map((r, i) => [uniquePatientIds[i], r.data]).filter(([, p]) => p != null) as [
      string,
      NonNullable<(typeof patientResults)[number]["data"]>
    ][]
  );

  // 5. Enrich with patient data and apply search filter
  let enriched: ReceptionOrder[] = candidateOrders.map(({ order, patientId }) => {
    const patient = patientById.get(patientId);
    const patientName = patient
      ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Desconocido"
      : "Desconocido";
    return {
      ...order,
      patientName,
      patientAge: ageFromDateOfBirth(patient?.dateOfBirth),
    };
  });

  const q = search.trim().toLowerCase();
  if (q) {
    enriched = enriched.filter(
      (order) =>
        order.patientName.toLowerCase().includes(q) ||
        order.displayId.toLowerCase().includes(q) ||
        order.tests.some((t) => t.toLowerCase().includes(q))
    );
  }

  function sortRank(o: ReceptionOrder): number {
    if (o.status === "Sin muestras" && o.priority === "Urgente") return 0;
    if (o.status === "Sin muestras") return 1;
    if (o.status === "Muestras creadas") return 2;
    return 3;
  }

  const orders = enriched.toSorted((a, b) => {
    const ra = sortRank(a);
    const rb = sortRank(b);
    if (ra !== rb) return ra - rb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    orders,
    nextToken,
    hasMore: nextToken != null,
  };
}

/** Lookup order by scanned code (accession or id). Uses targeted API queries - no full list. */
export async function lookupOrderByCode(code: string): Promise<ReceptionOrder | null> {
  const raw = code.trim();
  if (!raw) return null;
  const normalized = raw.startsWith("#") ? raw.slice(1) : raw;
  const client = cookieBasedClient;

  // Targeted lookup: try accessionNumber first (most common scan), then id
  let wo: {
    id: string;
    patientId: string;
    accessionNumber?: string | null;
    referringDoctor?: string | null;
    requestedExamTypeCodes?: (string | null)[] | null;
    priority?: string | null;
    notes?: string | null;
    requestedAt?: string | null;
    status?: string | null;
  } | null = null;

  const { data: byAccession } = await client.models.WorkOrder.list({
    filter: {
      and: [
        { status: { ne: "completed" } },
        { accessionNumber: { eq: normalized } },
      ],
    },
    limit: 1,
    selectionSet: WORK_ORDER_SELECTION,
  });
  if (byAccession?.[0]) wo = byAccession[0];

  if (!wo) {
    try {
      const { data: byId } = await client.models.WorkOrder.get({ id: normalized });
      if (byId && byId.status !== "completed") wo = byId;
    } catch {
      // id may not be valid; ignore
    }
  }

  if (!wo || !wo.id || !wo.patientId) return null;

  const [{ data: patient }, { data: samples }] = await Promise.all([
    client.models.Patient.get({ id: wo.patientId }, { selectionSet: PATIENT_SELECTION }),
    client.models.Sample.list({
      filter: { workOrderId: { eq: wo.id } },
      selectionSet: SAMPLE_SELECTION,
    }),
  ]);

  const { data: examTypes } = await client.models.ExamType.list({
    selectionSet: EXAM_TYPE_SELECTION,
  });
  const examTypeByName = new Map(examTypes?.map((e) => [e.code, e.name]) ?? []);

  const requestedCodes = (wo.requestedExamTypeCodes ?? []).filter((c: string | null): c is string => c != null);
  const testNames = requestedCodes.map((code: string) => examTypeByName.get(code) ?? code);
  const sampleStatuses = (samples?.map((s) => s.status).filter(Boolean) ?? []) as string[];
  const status = deriveReceptionStatus((samples?.length ?? 0) > 0, sampleStatuses);

  return {
    id: wo.id,
    displayId: wo.accessionNumber ?? `#${wo.id.slice(0, 8)}`,
    patientName: patient
      ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Desconocido"
      : "Desconocido",
    patientAge: ageFromDateOfBirth(patient?.dateOfBirth),
    doctor: wo.referringDoctor ?? "—",
    tests: testNames,
    priority: toUIPriority(wo.priority),
    status,
    notes: wo.notes ?? "",
    createdAt: wo.requestedAt ?? new Date().toISOString(),
  };
}
