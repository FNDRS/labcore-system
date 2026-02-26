"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import type {
  AnalyticsTimeRange,
  AnalyticsRangePreset,
} from "@/lib/types/analytics-types";
import { computePresetRange, createDefaultTimeRange } from "@/lib/utils/time-range";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export { createDefaultTimeRange } from "@/lib/utils/time-range";

const PRESET_LABELS: Record<AnalyticsRangePreset, string> = {
  today: "Hoy",
  last7d: "Últimos 7 días",
  last30d: "Últimos 30 días",
  custom: "Personalizado",
};

function formatDateCompact(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

interface TimeRangeSelectorProps {
  value: AnalyticsTimeRange;
  onChange: (range: AnalyticsTimeRange) => void;
  className?: string;
}

export function TimeRangeSelector({
  value,
  onChange,
  className,
}: TimeRangeSelectorProps) {
  const [customOpen, setCustomOpen] = React.useState(false);
  const [pendingRange, setPendingRange] = React.useState<
    DateRange | undefined
  >();

  function handlePresetChange(preset: string) {
    if (preset === "custom") {
      setPendingRange({
        from: new Date(value.from),
        to: new Date(value.to),
      });
      setTimeout(() => setCustomOpen(true), 150);
      return;
    }
    const range = computePresetRange(
      preset as Exclude<AnalyticsRangePreset, "custom">,
    );
    onChange({ ...range, preset: preset as AnalyticsRangePreset });
  }

  function handleCustomApply() {
    if (!pendingRange?.from || !pendingRange?.to) return;
    const from = new Date(pendingRange.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(pendingRange.to);
    to.setHours(23, 59, 59, 999);
    onChange({
      from: from.toISOString(),
      to: to.toISOString(),
      preset: "custom",
    });
    setCustomOpen(false);
  }

  const triggerLabel =
    value.preset === "custom"
      ? `${formatDateCompact(value.from)} – ${formatDateCompact(value.to)}`
      : PRESET_LABELS[value.preset];

  return (
    <Popover open={customOpen} onOpenChange={setCustomOpen}>
      <div className={cn("inline-flex items-center gap-2", className)}>
        <PopoverAnchor asChild>
          <div>
            <Select value={value.preset} onValueChange={handlePresetChange}>
              <SelectTrigger
                className="w-[200px] rounded-lg"
                aria-label="Seleccionar periodo de tiempo"
              >
                <CalendarDays className="size-3.5 shrink-0 text-zinc-400" />
                <SelectValue placeholder="Periodo">
                  {triggerLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="today">{PRESET_LABELS.today}</SelectItem>
                <SelectItem value="last7d">{PRESET_LABELS.last7d}</SelectItem>
                <SelectItem value="last30d">{PRESET_LABELS.last30d}</SelectItem>
                <SelectItem value="custom">{PRESET_LABELS.custom}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PopoverAnchor>
      </div>

      <PopoverContent
        className="w-auto rounded-xl p-0"
        align="start"
        sideOffset={8}
      >
        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-900">
              Rango personalizado
            </p>
            {pendingRange?.from && pendingRange?.to && (
              <p className="text-xs text-zinc-500">
                {formatDateCompact(pendingRange.from.toISOString())} –{" "}
                {formatDateCompact(pendingRange.to.toISOString())}
              </p>
            )}
          </div>

          <Calendar
            mode="range"
            selected={pendingRange}
            onSelect={setPendingRange}
            numberOfMonths={1}
            disabled={{ after: new Date() }}
          />

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg text-xs"
              onClick={() => setCustomOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="rounded-lg text-xs"
              disabled={!pendingRange?.from || !pendingRange?.to}
              onClick={handleCustomApply}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
