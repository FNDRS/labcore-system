"use server";

import { cookieBasedClient } from "@/utils/amplifyServerUtils";
import {
  ageFromDateOfBirth,
  buildPatientFullName,
  getExamTypeCodeMap,
} from "@/lib/repositories/shared";
import type {
  Priority,
  QuickFilter,
  ReceptionOrder,
  ReceptionStatus,
} from "@/app/(protected)/recepcion/types";

const RECEPTION_WO_SELECTION = [
  "id",
  "accessionNumber",
  "referringDoctor",
  "requestedExamTypeCodes",
  "priority",
  "notes",
  "requestedAt",
  "status",
  "patientId",
  "patient.id",
  "patient.firstName",
  "patient.lastName",
  "patient.dateOfBirth",
  "samples.id",
  "samples.status",
] as const;

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

  const [{ data: workOrders, errors, nextToken }, examTypeMap] = await Promise.all([
    cookieBasedClient.models.WorkOrder.list({
      filter: { status: { ne: "completed" } },
      limit,
      nextToken: pagination?.nextToken ?? undefined,
      selectionSet: RECEPTION_WO_SELECTION,
    }),
    getExamTypeCodeMap(),
  ]);

  if (errors?.length) {
    console.error("[listReceptionOrders] Amplify errors:", errors);
  }

  const workOrderRows = workOrders ?? [];
  const pageNextToken = nextToken ?? null;

  if (workOrderRows.length === 0) {
    return { orders: [], nextToken: null, hasMore: false };
  }

  const candidateOrders: ReceptionOrder[] = [];
  for (const wo of workOrderRows) {
    if (!wo.id) continue;

    const samples = (wo.samples ?? []).filter(
      (sample): sample is NonNullable<typeof sample> => sample != null
    );
    const createdAt = wo.requestedAt ?? new Date().toISOString();
    const sampleStatuses = samples.map((s) => s.status).filter(Boolean) as string[];
    const status = deriveReceptionStatus(samples.length > 0, sampleStatuses);

    if (!isReceptionRelevant(status, createdAt)) continue;

    const requestedCodes = (wo.requestedExamTypeCodes ?? []).filter((c): c is string => c != null);
    const testNames = requestedCodes.map((code) => examTypeMap.get(code) ?? code);
    const displayId = wo.accessionNumber ?? `#${wo.id.slice(0, 8)}`;
    const patientName = buildPatientFullName(wo.patient?.firstName, wo.patient?.lastName);

    const order: ReceptionOrder = {
      id: wo.id,
      displayId,
      patientName,
      patientAge: ageFromDateOfBirth(wo.patient?.dateOfBirth),
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

    candidateOrders.push(order);
  }

  let filtered: ReceptionOrder[] = candidateOrders;

  const q = search.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(
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

  const orders = filtered.toSorted((a, b) => {
    const ra = sortRank(a);
    const rb = sortRank(b);
    if (ra !== rb) return ra - rb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    orders,
    nextToken: pageNextToken,
    hasMore: pageNextToken != null,
  };
}

/** Lookup order by scanned code (accession or id). Uses targeted API queries - no full list. */
export async function lookupOrderByCode(code: string): Promise<ReceptionOrder | null> {
  const raw = code.trim();
  if (!raw) return null;
  const normalized = raw.startsWith("#") ? raw.slice(1) : raw;
  const client = cookieBasedClient;

  // Targeted lookup: try accessionNumber first (most common scan), then id
  const { data: byAccession, errors } = await client.models.WorkOrder.list({
    filter: {
      and: [{ status: { ne: "completed" } }, { accessionNumber: { eq: normalized } }],
    },
    limit: 1,
    selectionSet: RECEPTION_WO_SELECTION,
  });
  if (errors?.length) {
    console.error("[lookupOrderByCode] Amplify errors:", errors);
  }
  let wo = byAccession?.[0] ?? null;

  if (!wo) {
    try {
      const { data: byId, errors: idErrors } = await client.models.WorkOrder.get(
        { id: normalized },
        { selectionSet: RECEPTION_WO_SELECTION }
      );
      if (idErrors?.length) {
        console.error("[lookupOrderByCode] Amplify errors (byId):", idErrors);
      }
      if (byId && byId.status !== "completed") wo = byId;
    } catch {
      // id may not be valid; ignore
    }
  }

  if (!wo || !wo.id) return null;
  const examTypeMap = await getExamTypeCodeMap();
  const samples = (wo.samples ?? []).filter(
    (sample): sample is NonNullable<typeof sample> => sample != null
  );

  const requestedCodes = (wo.requestedExamTypeCodes ?? []).filter(
    (c: string | null): c is string => c != null
  );
  const testNames = requestedCodes.map((code: string) => examTypeMap.get(code) ?? code);
  const sampleStatuses = (samples?.map((s) => s.status).filter(Boolean) ?? []) as string[];
  const status = deriveReceptionStatus((samples?.length ?? 0) > 0, sampleStatuses);

  return {
    id: wo.id,
    displayId: wo.accessionNumber ?? `#${wo.id.slice(0, 8)}`,
    patientName: buildPatientFullName(wo.patient?.firstName, wo.patient?.lastName),
    patientAge: ageFromDateOfBirth(wo.patient?.dateOfBirth),
    doctor: wo.referringDoctor ?? "—",
    tests: testNames,
    priority: toUIPriority(wo.priority),
    status,
    notes: wo.notes ?? "",
    createdAt: wo.requestedAt ?? new Date().toISOString(),
  };
}
