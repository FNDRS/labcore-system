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
  "hasSamples",
  "hasSamplesKey",
  "patientId",
  "patient.id",
  "patient.firstName",
  "patient.lastName",
  "patient.dateOfBirth",
  "samples.id",
  "samples.status",
] as const;

type ReceptionListCursor = {
  stream: "without_samples" | "with_samples";
  withoutSamplesNextToken: string | null;
  withSamplesNextToken: string | null;
};

function parseCursor(raw: string | null | undefined): ReceptionListCursor {
  if (!raw) {
    return {
      stream: "without_samples",
      withoutSamplesNextToken: null,
      withSamplesNextToken: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ReceptionListCursor>;
    return {
      stream: parsed.stream === "with_samples" ? "with_samples" : "without_samples",
      withoutSamplesNextToken: parsed.withoutSamplesNextToken ?? null,
      withSamplesNextToken: parsed.withSamplesNextToken ?? null,
    };
  } catch {
    return {
      stream: "without_samples",
      withoutSamplesNextToken: null,
      withSamplesNextToken: null,
    };
  }
}

async function listWorkOrdersByHasSamples(args: {
  hasSamples: boolean;
  limit: number;
  nextToken?: string | null;
}) {
  const hasSamplesKey = args.hasSamples ? "YES" : "NO";
  const { data, errors, nextToken } = await cookieBasedClient.models.WorkOrder.listByHasSamplesKey(
    { hasSamplesKey },
    {
      limit: args.limit,
      nextToken: args.nextToken ?? undefined,
      selectionSet: RECEPTION_WO_SELECTION,
    }
  );
  if (errors?.length) {
    console.error("[listReceptionOrders] Amplify errors:", errors);
  }
  return { workOrders: data ?? [], nextToken: nextToken ?? null };
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
  const cursor = parseCursor(pagination?.nextToken);
  const shouldOnlyWithoutSamples = quickFilter === "Sin muestras";
  const shouldOnlyWithSamples = quickFilter === "Listas";

  const workOrderRows: Awaited<ReturnType<typeof listWorkOrdersByHasSamples>>["workOrders"] = [];
  let withoutSamplesNextToken = cursor.withoutSamplesNextToken;
  let withSamplesNextToken = cursor.withSamplesNextToken;
  let stream = cursor.stream;

  if (shouldOnlyWithoutSamples) {
    const page = await listWorkOrdersByHasSamples({
      hasSamples: false,
      limit,
      nextToken: withoutSamplesNextToken,
    });
    workOrderRows.push(...page.workOrders);
    withoutSamplesNextToken = page.nextToken;
    stream = "without_samples";
  } else if (shouldOnlyWithSamples) {
    const page = await listWorkOrdersByHasSamples({
      hasSamples: true,
      limit,
      nextToken: withSamplesNextToken,
    });
    workOrderRows.push(...page.workOrders);
    withSamplesNextToken = page.nextToken;
    stream = "with_samples";
  } else {
    let remaining = limit;
    if (stream === "without_samples" && remaining > 0) {
      const withoutSamplesPage = await listWorkOrdersByHasSamples({
        hasSamples: false,
        limit: remaining,
        nextToken: withoutSamplesNextToken,
      });
      workOrderRows.push(...withoutSamplesPage.workOrders);
      remaining -= withoutSamplesPage.workOrders.length;
      withoutSamplesNextToken = withoutSamplesPage.nextToken;
      if (!withoutSamplesNextToken) {
        stream = "with_samples";
      }
    }
    if (remaining > 0 && stream === "with_samples") {
      const withSamplesPage = await listWorkOrdersByHasSamples({
        hasSamples: true,
        limit: remaining,
        nextToken: withSamplesNextToken,
      });
      workOrderRows.push(...withSamplesPage.workOrders);
      withSamplesNextToken = withSamplesPage.nextToken;
    }
  }

  const pageNextToken =
    withoutSamplesNextToken || withSamplesNextToken
      ? JSON.stringify({
          stream,
          withoutSamplesNextToken,
          withSamplesNextToken,
        } satisfies ReceptionListCursor)
      : null;

  if (workOrderRows.length === 0) {
    return { orders: [], nextToken: null, hasMore: false };
  }

  const examTypeMap = await getExamTypeCodeMap();

  const candidateOrders: ReceptionOrder[] = [];
  for (const wo of workOrderRows) {
    if (!wo.id) continue;

    const patient = wo.patient ?? null;
    const samples = (wo.samples ?? []).filter(
      (sample): sample is NonNullable<typeof sample> => sample != null
    );
    const createdAt = wo.requestedAt ?? new Date().toISOString();
    const sampleStatuses = samples.map((s) => s.status).filter(Boolean) as string[];
    const hasSamples = wo.hasSamplesKey === "YES" || Boolean(wo.hasSamples) || samples.length > 0;
    const status = deriveReceptionStatus(hasSamples, sampleStatuses);
    if (wo.status === "completed") continue;
    if (status === "Procesando") continue;

    const requestedCodes = (wo.requestedExamTypeCodes ?? []).filter((c): c is string => c != null);
    const testNames = requestedCodes.map((code) => examTypeMap.get(code) ?? code);
    const displayId = wo.accessionNumber ?? `#${wo.id.slice(0, 8)}`;
    const patientName = buildPatientFullName(patient?.firstName, patient?.lastName);

    const order: ReceptionOrder = {
      id: wo.id,
      displayId,
      patientName,
      patientAge: ageFromDateOfBirth(patient?.dateOfBirth),
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
  const status = deriveReceptionStatus(
    wo.hasSamplesKey === "YES" || Boolean(wo.hasSamples) || (samples?.length ?? 0) > 0,
    sampleStatuses
  );

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
