"use client";

import * as React from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { IncidentPattern } from "@/lib/types/incidence-types";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

function truncateLabel(label: string, maxLength = 28): string {
  return label.length > maxLength ? `${label.slice(0, maxLength)}…` : label;
}

interface RejectionReasonsChartProps {
  data: IncidentPattern["reasonDistribution"];
}

export function RejectionReasonsChart({ data }: RejectionReasonsChartProps) {
  if (!data.length) {
    return (
      <p className="py-12 text-center text-sm text-zinc-400">
        Sin datos de motivos de rechazo
      </p>
    );
  }

  const sliced = data.slice(0, 8);

  const chartData = React.useMemo(
    () =>
      sliced.map((entry, i) => ({
        reason: truncateLabel(entry.reason),
        fullReason: entry.reason,
        count: entry.count,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      })),
    [sliced],
  );

  const chartConfig = React.useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {
      count: { label: "Rechazos", color: "var(--chart-1)" },
    };
    for (const item of chartData) {
      config[item.reason] = {
        label: item.fullReason,
        color: item.fill,
      };
    }
    return config satisfies ChartConfig;
  }, [chartData]);

  const chartHeight = Math.max(sliced.length * 40 + 24, 180);

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ minHeight: `${chartHeight}px` }}
    >
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 16, bottom: 0, left: 4 }}
        barCategoryGap="20%"
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <YAxis
          dataKey="reason"
          type="category"
          tickLine={false}
          axisLine={false}
          width={140}
          tick={{ fontSize: 11 }}
          tickFormatter={(value: string) => truncateLabel(value, 22)}
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as
                  | { fullReason?: string }
                  | undefined;
                return item?.fullReason ?? "";
              }}
              indicator="dot"
            />
          }
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          fill="var(--color-count)"
          maxBarSize={24}
        />
      </BarChart>
    </ChartContainer>
  );
}
