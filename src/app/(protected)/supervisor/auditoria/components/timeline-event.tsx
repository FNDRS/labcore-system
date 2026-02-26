import type { AuditTimelineEvent, AuditEventCategory } from "@/lib/types/audit-timeline-types";
import { getAuditActionLabel } from "@/lib/audit-labels";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<AuditEventCategory, { dot: string; iconBg: string; line: string }> = {
  creation: {
    dot: "bg-blue-500 ring-blue-500/20",
    iconBg: "bg-blue-50 text-blue-600",
    line: "bg-blue-200",
  },
  processing: {
    dot: "bg-amber-500 ring-amber-500/20",
    iconBg: "bg-amber-50 text-amber-600",
    line: "bg-amber-200",
  },
  validation: {
    dot: "bg-emerald-500 ring-emerald-500/20",
    iconBg: "bg-emerald-50 text-emerald-700",
    line: "bg-emerald-200",
  },
  rejection: {
    dot: "bg-red-500 ring-red-500/20",
    iconBg: "bg-red-50 text-red-600",
    line: "bg-red-200",
  },
  incidence: {
    dot: "bg-orange-500 ring-orange-500/20",
    iconBg: "bg-orange-50 text-orange-600",
    line: "bg-orange-200",
  },
  info: {
    dot: "bg-zinc-400 ring-zinc-400/20",
    iconBg: "bg-zinc-100 text-zinc-500",
    line: "bg-zinc-200",
  },
};

function formatTimestamp(isoString: string): { time: string; date: string } {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return { time: "—", date: "—" };
  return {
    time: d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    date: d.toLocaleDateString("es-CL", { day: "numeric", month: "short" }),
  };
}

function extractMetadataEntries(metadata: Record<string, unknown> | null): [string, string][] {
  if (!metadata) return [];
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (value == null || value === "") continue;
    const label = key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .trim();
    entries.push([label, String(value)]);
  }
  return entries;
}

interface TimelineEventProps {
  event: AuditTimelineEvent;
  isFirst: boolean;
  isLast: boolean;
}

export function TimelineEvent({ event, isFirst, isLast }: TimelineEventProps) {
  const actionLabel = getAuditActionLabel(event.action);
  const Icon = actionLabel.icon;
  const styles = CATEGORY_STYLES[event.category] ?? CATEGORY_STYLES.info;
  const ts = formatTimestamp(event.timestamp);
  const metadataEntries = extractMetadataEntries(event.metadata);

  return (
    <div className="group relative flex gap-3">
      {/* Vertical connector line */}
      <div className="relative flex w-8 shrink-0 flex-col items-center">
        {/* Top line segment */}
        {!isFirst ? (
          <div className={cn("absolute top-0 h-3 w-px", styles.line)} />
        ) : null}

        {/* Icon node */}
        <div
          className={cn(
            "relative z-10 mt-3 flex size-8 items-center justify-center rounded-full",
            "ring-2 ring-offset-2 ring-offset-white transition-shadow",
            styles.dot,
            styles.iconBg,
          )}
        >
          <Icon className="size-3.5" />
        </div>

        {/* Bottom line segment */}
        {!isLast ? (
          <div className={cn("mt-px w-px flex-1", styles.line)} />
        ) : null}
      </div>

      {/* Event content */}
      <div
        className={cn(
          "min-w-0 flex-1 pb-5",
          isLast && "pb-0",
        )}
      >
        <div className="mt-2.5 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3.5 py-2.5 transition-colors group-hover:border-zinc-200 group-hover:bg-zinc-50">
          {/* Header row: label + timestamp */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-[13px] font-medium leading-snug text-zinc-900">
              {event.label}
            </span>
            <span className="shrink-0 text-right font-mono text-[11px] leading-snug text-zinc-400">
              <span>{ts.time}</span>
              <span className="ml-1.5 text-zinc-300">{ts.date}</span>
            </span>
          </div>

          {/* Actor */}
          {event.actorId ? (
            <p className="mt-1 text-[12px] text-zinc-500">
              {event.actorName ?? event.actorId}
            </p>
          ) : null}

          {/* Metadata details */}
          {metadataEntries.length > 0 ? (
            <dl className="mt-1.5 space-y-0.5">
              {metadataEntries.map(([label, value]) => (
                <div key={label} className="flex gap-1.5 text-[11px]">
                  <dt className="shrink-0 capitalize text-zinc-400">{label}:</dt>
                  <dd className="min-w-0 wrap-break-word text-zinc-600">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </div>
  );
}
