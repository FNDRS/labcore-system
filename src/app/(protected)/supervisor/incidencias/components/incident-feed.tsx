"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  FlaskConical,
  Loader2,
  TestTube,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IncidentFeedItem, IncidentSeverity, IncidentType } from "@/lib/types/incidence-types";
import { useIncidencias } from "../incidencias-provider";

// ─── Severity config ──────────────────────────────────────────────────────────

type SeverityConfig = {
  borderClass: string;
  bgClass: string;
  badgeClass: string;
  dotClass: string;
  label: string;
};

const SEVERITY_CONFIG: Record<IncidentSeverity, SeverityConfig> = {
  critical: {
    borderClass: "border-l-red-700",
    bgClass: "hover:bg-red-50/40",
    badgeClass: "bg-red-100 text-red-800 ring-1 ring-red-200",
    dotClass: "bg-red-700",
    label: "Crítico",
  },
  high: {
    borderClass: "border-l-rose-500",
    bgClass: "hover:bg-rose-50/40",
    badgeClass: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
    dotClass: "bg-rose-500",
    label: "Alto",
  },
  medium: {
    borderClass: "border-l-amber-400",
    bgClass: "hover:bg-amber-50/30",
    badgeClass: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    dotClass: "bg-amber-400",
    label: "Medio",
  },
  low: {
    borderClass: "border-l-zinc-300",
    bgClass: "hover:bg-zinc-50/60",
    badgeClass: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200",
    dotClass: "bg-zinc-400",
    label: "Bajo",
  },
};

// ─── Incident type config ─────────────────────────────────────────────────────

type TypeConfig = {
  Icon: React.ElementType;
  label: string;
};

const TYPE_CONFIG: Record<IncidentType, TypeConfig> = {
  exam_rejected: { Icon: XCircle, label: "Examen rechazado" },
  specimen_rejected: { Icon: TestTube, label: "Muestra rechazada" },
  incidence_created: { Icon: AlertTriangle, label: "Incidencia" },
  critical_result: { Icon: FlaskConical, label: "Resultado crítico" },
  exam_overdue: { Icon: Clock, label: "Examen atrasado" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Feed item ────────────────────────────────────────────────────────────────

function IncidentFeedRow({
  item,
  isPending,
  onDetailClick,
}: {
  item: IncidentFeedItem;
  isPending: boolean;
  onDetailClick: () => void;
}) {
  const severity = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.low;
  const typeConfig = TYPE_CONFIG[item.incidentType] ?? TYPE_CONFIG.incidence_created;
  const { Icon } = typeConfig;

  return (
    <li
      className={cn(
        "group relative flex gap-4 border-l-4 bg-white px-5 py-4 transition-colors",
        severity.borderClass,
        severity.bgClass,
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-full",
            severity.badgeClass,
          )}
          aria-hidden
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Row 1: title + status */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
              severity.badgeClass,
            )}
          >
            <span className={cn("size-1.5 rounded-full", severity.dotClass)} aria-hidden />
            {item.title}
          </span>

          {item.status === "resolved" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-3" strokeWidth={2.5} />
              Resuelta
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 ring-1 ring-zinc-200">
              <Circle className="size-3" strokeWidth={2.5} />
              Abierta
            </span>
          )}

          <span className="ml-auto flex items-center gap-1 text-xs text-zinc-400">
            <Clock className="size-3" aria-hidden />
            {formatTimestamp(item.timestamp)}
          </span>
        </div>

        {/* Row 2: patient, accession, exam type */}
        <p className="text-sm leading-snug">
          <span className="font-semibold text-zinc-900">{item.patientName}</span>
          {item.accessionNumber && (
            <span className="ml-2 font-mono text-xs text-zinc-400">
              #{item.accessionNumber}
            </span>
          )}
          {item.examTypeName && (
            <span className="text-zinc-500">
              {" · "}
              {item.examTypeName}
            </span>
          )}
          {item.sampleBarcode && (
            <span className="ml-2 font-mono text-xs text-zinc-400">
              [{item.sampleBarcode}]
            </span>
          )}
        </p>

        {/* Row 3: reason / description */}
        {(item.reason ?? item.description) && (
          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
            {item.reason ?? item.description}
          </p>
        )}
      </div>

      {/* Action */}
      <div className="flex shrink-0 items-start pt-0.5">
        <Link
          href={`/supervisor/auditoria?orden=${item.workOrderId}`}
          onClick={onDetailClick}
          aria-busy={isPending}
          aria-label={isPending ? "Cargando…" : `Ver detalle de ${item.patientName}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 transition-all hover:bg-zinc-100 hover:text-zinc-900 hover:ring-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
            isPending && "pointer-events-none opacity-80",
          )}
        >
          {isPending ? (
            <>
              Cargando…
              <Loader2 className="size-3 animate-spin" aria-hidden />
            </>
          ) : (
            <>
              Ver detalle
              <ArrowRight className="size-3" />
            </>
          )}
        </Link>
      </div>
    </li>
  );
}

// ─── Load more ────────────────────────────────────────────────────────────────

function LoadMoreButton() {
  const { state, actions } = useIncidencias();

  if (!state.nextCursor) return null;

  return (
    <div className="border-t border-zinc-100 px-5 py-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-xs text-zinc-500 hover:text-zinc-900"
        onClick={() => void actions.loadMore()}
        disabled={state.isLoadingMore}
      >
        {state.isLoadingMore ? (
          <span className="flex items-center gap-2">
            <span className="size-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" aria-hidden />
            Cargando más...
          </span>
        ) : (
          "Cargar más incidencias"
        )}
      </Button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-zinc-100">
        <CheckCircle2 className="size-6 text-zinc-400" strokeWidth={1.5} />
      </span>
      <p className="text-sm font-medium text-zinc-700">Sin incidencias</p>
      <p className="max-w-xs text-xs text-zinc-400">
        No se encontraron incidencias para el periodo y filtros seleccionados.
      </p>
    </div>
  );
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export function IncidentFeed() {
  const pathname = usePathname();
  const [pendingDetailId, setPendingDetailId] = useState<string | null>(null);
  const { state } = useIncidencias();

  // Limpiar pending cuando se navega a auditoría
  useEffect(() => {
    if (!pendingDetailId || pathname == null) return;
    if (pathname === "/supervisor/auditoria" || pathname.startsWith("/supervisor/auditoria/")) {
      setPendingDetailId(null);
    }
  }, [pathname, pendingDetailId]);

  return (
    <div className="overflow-hidden rounded-b-xl">
      {state.isRefreshing && (
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-5 py-2.5">
          <span className="size-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" aria-hidden />
          <span className="text-xs text-zinc-500">Actualizando...</span>
        </div>
      )}

      {state.feed.length === 0 && !state.isRefreshing ? (
        <EmptyFeed />
      ) : (
        <ul className="divide-y divide-zinc-100" role="list" aria-label="Lista de incidencias">
          {state.feed.map((item) => (
            <IncidentFeedRow
              key={item.id}
              item={item}
              isPending={pendingDetailId === item.id}
              onDetailClick={() => setPendingDetailId(item.id)}
            />
          ))}
        </ul>
      )}

      <LoadMoreButton />
    </div>
  );
}
