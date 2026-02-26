import {
  AlertTriangle,
  Beaker,
  ChevronDown,
  Clock,
  FlaskConical,
  Microscope,
  Timer,
  XCircle,
} from "lucide-react";
import type { SampleTimeline as SampleTimelineData, TimelineDurations } from "@/lib/types/audit-timeline-types";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { TimelineEvent } from "./timeline-event";

// ─── Duration Badges (7b.2.5) ─────────────────────────────────────────────────

const SLA_THRESHOLDS = {
  preAnalytical: { green: 60, amber: 120 },
  analytical: { green: 120, amber: 240 },
  postAnalytical: { green: 30, amber: 60 },
  total: { green: 240, amber: 480 },
} as const;

function getSlaColor(minutes: number | null, thresholds: { green: number; amber: number }): string {
  if (minutes == null) return "bg-zinc-100 text-zinc-500 border-zinc-200";
  if (minutes <= thresholds.green) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (minutes <= thresholds.amber) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface DurationBadgesProps {
  durations: TimelineDurations;
}

const DURATION_ENTRIES = [
  { key: "preAnalyticalMinutes", label: "Pre-analítica", icon: Clock, thresholds: SLA_THRESHOLDS.preAnalytical },
  { key: "analyticalMinutes", label: "Analítica", icon: Microscope, thresholds: SLA_THRESHOLDS.analytical },
  { key: "postAnalyticalMinutes", label: "Post-analítica", icon: Timer, thresholds: SLA_THRESHOLDS.postAnalytical },
  { key: "totalLifecycleMinutes", label: "Total", icon: Beaker, thresholds: SLA_THRESHOLDS.total },
] as const;

function DurationBadges({ durations }: DurationBadgesProps) {
  const hasAnyDuration = Object.values(durations).some((v) => v != null);
  if (!hasAnyDuration) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {DURATION_ENTRIES.map(({ key, label, icon: DurIcon, thresholds }) => {
        const value = durations[key];
        return (
          <Badge
            key={key}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-medium tabular-nums gap-1",
              getSlaColor(value, thresholds),
            )}
          >
            <DurIcon className="size-2.5" />
            <span className="font-normal opacity-70">{label}</span>
            {formatDuration(value)}
          </Badge>
        );
      })}
    </div>
  );
}

// ─── Sample Status Indicator ──────────────────────────────────────────────────

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  labeled: { label: "Etiquetada", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  ready_for_lab: { label: "Lista", className: "bg-blue-50 text-blue-700 border-blue-200" },
  received: { label: "Recibida", className: "bg-blue-50 text-blue-700 border-blue-200" },
  inprogress: { label: "En proceso", className: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Completada", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rechazada", className: "bg-red-50 text-red-700 border-red-200" },
};

// ─── Sample Timeline Card (7b.2.3) ───────────────────────────────────────────

interface SampleTimelineCardProps {
  timeline: SampleTimelineData;
  defaultOpen?: boolean;
}

export function SampleTimelineCard({ timeline, defaultOpen = true }: SampleTimelineCardProps) {
  const statusConfig = timeline.sampleStatus
    ? (STATUS_DISPLAY[timeline.sampleStatus] ?? STATUS_DISPLAY.pending)
    : null;

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <div className="rounded-xl border border-zinc-200 bg-white shadow-none">
        {/* Sample Header */}
        <CollapsibleTrigger className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-50/50">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
            <FlaskConical className="size-3.5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {/* Barcode */}
              <span className="font-mono text-[13px] font-semibold tracking-tight text-zinc-900">
                {timeline.barcode ?? timeline.sampleId.slice(0, 8)}
              </span>

              {/* Exam type */}
              {timeline.examTypeName ? (
                <span className="text-[12px] text-zinc-500">
                  {timeline.examTypeName}
                  {timeline.examTypeCode ? (
                    <span className="ml-1 font-mono text-[11px] text-zinc-400">
                      ({timeline.examTypeCode})
                    </span>
                  ) : null}
                </span>
              ) : null}

              {/* Status badge */}
              {statusConfig ? (
                <Badge
                  className={cn(
                    "rounded-md border px-1.5 py-0 text-[10px] font-medium",
                    statusConfig.className,
                  )}
                >
                  {statusConfig.label}
                </Badge>
              ) : null}

              {/* Warning indicators */}
              {timeline.incidenceCount > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-orange-600">
                  <AlertTriangle className="size-3" />
                  {timeline.incidenceCount}
                </span>
              ) : null}
              {timeline.rejectionCount > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-600">
                  <XCircle className="size-3" />
                  {timeline.rejectionCount}
                </span>
              ) : null}
            </div>

            {/* Duration badges */}
            <div className="mt-2">
              <DurationBadges durations={timeline.durations} />
            </div>
          </div>

          {/* Collapse indicator */}
          <div className="mt-1 shrink-0">
            <ChevronDown className="size-4 text-zinc-400 transition-transform duration-200 in-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>

        {/* Events timeline */}
        <CollapsibleContent>
          <div className="border-t border-zinc-100 px-5 py-4">
            {timeline.events.length > 0 ? (
              <div>
                {timeline.events.map((event, index) => (
                  <TimelineEvent
                    key={event.id}
                    event={event}
                    isFirst={index === 0}
                    isLast={index === timeline.events.length - 1}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-[12px] text-zinc-400">
                No se registraron eventos para esta muestra.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
