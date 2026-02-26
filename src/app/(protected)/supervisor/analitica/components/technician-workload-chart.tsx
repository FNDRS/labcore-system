"use client";

import * as React from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { TechnicianWorkloadEntry } from "@/lib/types/analytics-types";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface TechnicianWorkloadChartProps {
  data: TechnicianWorkloadEntry[];
}

export function TechnicianWorkloadChart({ data }: TechnicianWorkloadChartProps) {
  const chartConfig = React.useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    for (let i = 0; i < data.length; i += 1) {
      const entry = data[i];
      cfg[entry.technicianId] = {
        label: entry.technicianName,
        color: PALETTE[i % PALETTE.length],
      };
    }
    return cfg satisfies ChartConfig;
  }, [data]);

  const barData = React.useMemo(
    () =>
      data.map((entry, i) => ({
        name: entry.technicianName,
        examCount: entry.examCount,
        fill: PALETTE[i % PALETTE.length],
      })),
    [data],
  );

  const hasData = data.length > 0;

  return (
    <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
      <CardHeader className="space-y-0.5 pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-900">
          Carga de técnicos
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500">
          Exámenes procesados por operador
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {hasData ? (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ minHeight: Math.max(180, data.length * 40 + 40) }}
          >
            <BarChart
              accessibilityLayer
              data={barData}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
            >
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={100}
                className="text-[11px]"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip
                content={<ChartTooltipContent hideLabel indicator="dot" />}
              />
              <Bar
                dataKey="examCount"
                radius={[0, 4, 4, 0]}
                barSize={24}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex min-h-[180px] items-center justify-center">
            <p className="text-sm text-zinc-400">Sin datos de técnicos</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
