import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsTrendDirection } from "@/lib/types/analytics-types";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  /** Optional unit suffix displayed after the value (e.g. "min", "%"). */
  unit?: string;
  trend?: {
    direction: AnalyticsTrendDirection;
    percentage: number;
  };
  /**
   * Which direction is "good" for this metric.
   * "up" (default) — higher values are positive (e.g. orders processed).
   * "down" — lower values are positive (e.g. rejection rate, TAT).
   */
  trendPositiveDirection?: "up" | "down";
  variant?: "default" | "danger" | "warning";
  className?: string;
}

const VARIANT_CARD_STYLES: Record<NonNullable<KPICardProps["variant"]>, string> = {
  default: "border-zinc-200 bg-white",
  danger: "border-red-200 bg-red-50/50",
  warning: "border-amber-200 bg-amber-50/50",
};

const VARIANT_TITLE_STYLES: Record<NonNullable<KPICardProps["variant"]>, string> = {
  default: "text-zinc-500",
  danger: "text-red-700",
  warning: "text-amber-700",
};

const VARIANT_VALUE_STYLES: Record<NonNullable<KPICardProps["variant"]>, string> = {
  default: "text-zinc-900",
  danger: "text-red-800",
  warning: "text-amber-800",
};

function TrendBadge({
  trend,
  positiveDirection,
}: {
  trend: NonNullable<KPICardProps["trend"]>;
  positiveDirection: "up" | "down";
}) {
  const isPositive =
    trend.direction === "flat" ||
    (trend.direction === "up" && positiveDirection === "up") ||
    (trend.direction === "down" && positiveDirection === "down");

  const colorClass =
    trend.direction === "flat"
      ? "text-zinc-400 bg-zinc-50"
      : isPositive
        ? "text-emerald-700 bg-emerald-50"
        : "text-red-700 bg-red-50";

  const Icon =
    trend.direction === "up"
      ? TrendingUp
      : trend.direction === "down"
        ? TrendingDown
        : Minus;

  const ariaLabel =
    trend.direction === "flat"
      ? "Sin cambio"
      : `${trend.direction === "up" ? "Subió" : "Bajó"} ${trend.percentage.toFixed(1)}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none",
        colorClass,
      )}
      aria-label={ariaLabel}
    >
      <Icon className="size-3" strokeWidth={2.5} />
      {trend.direction !== "flat" && (
        <span className="tabular-nums">{trend.percentage.toFixed(1)}%</span>
      )}
    </span>
  );
}

export function KPICard({
  title,
  value,
  unit,
  trend,
  trendPositiveDirection = "up",
  variant = "default",
  className,
}: KPICardProps) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString("es-CL") : value;

  return (
    <Card
      className={cn(
        "rounded-xl border shadow-none transition-colors",
        VARIANT_CARD_STYLES[variant],
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle
          className={cn(
            "text-[11px] font-semibold uppercase tracking-widest",
            VARIANT_TITLE_STYLES[variant],
          )}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <p
            className={cn(
              "text-3xl font-bold tabular-nums leading-none",
              VARIANT_VALUE_STYLES[variant],
            )}
          >
            {formattedValue}
            {unit && (
              <span className="ml-1 text-base font-medium text-zinc-400">
                {unit}
              </span>
            )}
          </p>
          {trend && (
            <TrendBadge
              trend={trend}
              positiveDirection={trendPositiveDirection}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
