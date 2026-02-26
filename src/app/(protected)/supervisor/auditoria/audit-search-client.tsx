"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  History,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { searchAuditAction } from "./actions";
import { SampleTimelineCard } from "./components/sample-timeline";
import type { RecentAuditActivityItem, WorkOrderTimeline } from "@/lib/types/audit-timeline-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  query: z
    .string()
    .min(1, "Ingresa un número de acceso, código de barras o nombre de paciente"),
});

type SearchFormValues = z.infer<typeof searchSchema>;

const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  stat: { label: "STAT", className: "bg-red-50 text-red-700 border-red-200" },
  urgent: { label: "Urgente", className: "bg-amber-50 text-amber-700 border-amber-200" },
  routine: { label: "Rutina", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;

  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function formatFullDate(isoString: string | null): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Search Form ──────────────────────────────────────────────────────────────

interface SearchFormProps {
  defaultQuery?: string;
  onClear: () => void;
  hasActiveSearch: boolean;
}

function SearchForm({ defaultQuery = "", onClear, hasActiveSearch }: SearchFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [notFound, setNotFound] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SearchFormValues>({
    resolver: standardSchemaResolver(searchSchema),
    defaultValues: { query: defaultQuery },
  });

  const queryValue = watch("query");
  const isLoading = isSubmitting || isPending;

  function handleClear() {
    setValue("query", "");
    setNotFound(false);
    onClear();
  }

  async function onSubmit({ query }: SearchFormValues) {
    setNotFound(false);
    const result = await searchAuditAction(query);
    if (!result?.workOrderId) {
      setNotFound(true);
      return;
    }
    const params = new URLSearchParams({ orden: result.workOrderId });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            {...register("query")}
            type="search"
            placeholder="N.° de acceso, código de barras o paciente…"
            aria-label="Buscar orden de trabajo"
            aria-invalid={!!errors.query || notFound}
            disabled={isLoading}
            className={cn(
              "h-10 rounded-lg border-zinc-200 bg-white pl-10 pr-10 text-sm shadow-none placeholder:text-zinc-400",
              "focus-visible:border-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0",
              (errors.query || notFound) && "border-red-300 focus-visible:border-red-400",
            )}
          />
          {queryValue && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-400 transition-colors hover:text-zinc-700"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Button type="submit" size="default" disabled={isLoading} className="h-10 shrink-0">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Buscar"
          )}
        </Button>

        {hasActiveSearch && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-10 shrink-0 text-zinc-500"
          >
            Limpiar
          </Button>
        )}
      </div>

      {errors.query && (
        <p role="alert" className="mt-1.5 flex items-center gap-1 text-[12px] text-red-600">
          <AlertCircle className="size-3" />
          {errors.query.message}
        </p>
      )}
      {notFound && !errors.query && (
        <p role="alert" className="mt-1.5 flex items-center gap-1 text-[12px] text-amber-600">
          <AlertCircle className="size-3" />
          No se encontró ninguna orden de trabajo para ese criterio.
        </p>
      )}
    </form>
  );
}

// ─── Recent Activity List ─────────────────────────────────────────────────────

interface RecentActivityListProps {
  items: RecentAuditActivityItem[];
}

function RecentActivityList({ items }: RecentActivityListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleSelect(workOrderId: string) {
    setActiveId(workOrderId);
    const params = new URLSearchParams({ orden: workOrderId });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <History className="size-8 text-zinc-300" />
        <p className="text-[13px] text-zinc-400">No hay actividad reciente registrada</p>
      </div>
    );
  }

  return (
    <ul role="list" className="divide-y divide-zinc-100">
      {items.map((item) => {
        const isLoading = isPending && activeId === item.workOrderId;
        return (
          <li key={item.workOrderId}>
            <button
              type="button"
              onClick={() => handleSelect(item.workOrderId)}
              disabled={isPending}
              className={cn(
                "group flex w-full items-center gap-3 py-3 text-left transition-colors",
                "hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-1",
                "rounded-lg px-3 -mx-3",
                isPending && "pointer-events-none opacity-60",
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-zinc-200">
                <ClipboardCheck className="size-3.5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[13px] font-medium text-zinc-900">
                    {item.patientName}
                  </span>
                  {item.accessionNumber && (
                    <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                      {item.accessionNumber}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <CalendarClock className="size-3 shrink-0 text-zinc-400" />
                  <span className="text-[12px] text-zinc-400">
                    {formatRelativeTime(item.lastEventAt)}
                  </span>
                  <span className="text-zinc-300">·</span>
                  <span className="text-[12px] text-zinc-400">
                    {item.eventCount} evento{item.eventCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500">
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Active Timeline Header ───────────────────────────────────────────────────

interface ActiveTimelineHeaderProps {
  timeline: WorkOrderTimeline;
}

function ActiveTimelineHeader({ timeline }: ActiveTimelineHeaderProps) {
  const priority = timeline.priority;
  const priorityConfig = priority ? (PRIORITY_MAP[priority] ?? PRIORITY_MAP.routine) : null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">
              {timeline.patient.fullName}
            </h2>
            {timeline.accessionNumber && (
              <span className="font-mono text-[12px] text-zinc-400">
                {timeline.accessionNumber}
              </span>
            )}
            {priorityConfig && (
              <Badge
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  priorityConfig.className,
                )}
              >
                {priorityConfig.label}
              </Badge>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            {timeline.requestedAt && (
              <span className="text-[12px] text-zinc-500">
                Solicitado: {formatFullDate(timeline.requestedAt)}
              </span>
            )}
            {timeline.referringDoctor && (
              <span className="text-[12px] text-zinc-500">
                Dr. {timeline.referringDoctor}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">Muestras</p>
            <p className="text-[20px] font-semibold tabular-nums leading-none text-zinc-900">
              {timeline.summary.totalSamples}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">Eventos</p>
            <p className="text-[20px] font-semibold tabular-nums leading-none text-zinc-900">
              {timeline.summary.totalEvents}
            </p>
          </div>
          {timeline.summary.samplesWithIncidence > 0 && (
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wide text-amber-500">Incidencias</p>
              <p className="text-[20px] font-semibold tabular-nums leading-none text-amber-600">
                {timeline.summary.samplesWithIncidence}
              </p>
            </div>
          )}
          {timeline.summary.samplesWithRejection > 0 && (
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wide text-red-500">Rechazos</p>
              <p className="text-[20px] font-semibold tabular-nums leading-none text-red-600">
                {timeline.summary.samplesWithRejection}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root Client Component ────────────────────────────────────────────────────

interface AuditSearchClientProps {
  recentActivity: RecentAuditActivityItem[];
  timeline: WorkOrderTimeline | null;
}

export function AuditSearchClient({ recentActivity, timeline }: AuditSearchClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleClear() {
    router.push(pathname);
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-[15px] font-semibold tracking-tight text-zinc-900">
          Auditoría de trazabilidad
        </h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">
          Busca una orden por número de acceso, código de barras o paciente para ver el timeline de
          cada muestra.
        </p>
      </div>

      {/* Search form */}
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-none">
        <SearchForm
          defaultQuery=""
          onClear={handleClear}
          hasActiveSearch={timeline !== null}
        />
      </div>

      {/* Active timeline */}
      {timeline !== null ? (
        <div className="space-y-4">
          <ActiveTimelineHeader timeline={timeline} />

          {timeline.sampleTimelines.length > 0 ? (
            <div className="space-y-3">
              {timeline.sampleTimelines.map((sampleTimeline, index) => (
                <SampleTimelineCard
                  key={sampleTimeline.sampleId}
                  timeline={sampleTimeline}
                  defaultOpen={index === 0}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-10 text-center shadow-none">
              <p className="text-[13px] text-zinc-400">
                No se encontraron eventos de auditoría para esta orden.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Recent activity */
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-none">
          <div className="mb-3 flex items-center gap-2">
            <History className="size-3.5 text-zinc-400" />
            <h2 className="text-[12px] font-medium uppercase tracking-wide text-zinc-400">
              Actividad reciente
            </h2>
          </div>
          <Separator className="mb-3" />
          <RecentActivityList items={recentActivity} />
        </div>
      )}
    </div>
  );
}
