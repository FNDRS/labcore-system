"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { IncidentTrendDataPoint } from "@/lib/types/incidence-types";

const chartConfig = {
  count: {
    label: "Incidencias",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function formatDateLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function formatTooltipDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

interface IncidenceTrendChartProps {
  data: IncidentTrendDataPoint[];
}

export function IncidenceTrendChart({ data }: IncidenceTrendChartProps) {
  if (!data.length) {
    return (
      <p className="py-12 text-center text-sm text-zinc-400">
        Sin datos de tendencia
      </p>
    );
  }

  const chartData = React.useMemo(
    () =>
      data.map((point) => ({
        date: point.date,
        count: point.count,
      })),
    [data],
  );

  const maxTicks = React.useMemo(() => {
    if (chartData.length <= 7) return chartData.length;
    if (chartData.length <= 14) return 7;
    return 10;
  }, [chartData.length]);

  return (
    <ChartContainer config={chartConfig} className="min-h-[220px] w-full">
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={36}
          tick={{ fontSize: 11 }}
          tickFormatter={formatDateLabel}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={32}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatTooltipDate(value as string)}
              indicator="dot"
            />
          }
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          strokeWidth={2}
          dot={{
            r: 3.5,
            fill: "var(--color-count)",
            strokeWidth: 2,
            stroke: "var(--background, #fff)",
          }}
          activeDot={{
            r: 5,
            strokeWidth: 2,
            stroke: "var(--color-count)",
            fill: "var(--background, #fff)",
          }}
        />
      </LineChart>
    </ChartContainer>
  );
}
