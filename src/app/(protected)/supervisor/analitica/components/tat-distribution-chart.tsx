"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { TATBucket } from "@/lib/types/analytics-types";

const chartConfig = {
  routine: { label: "Rutina", color: "var(--chart-1)" },
  urgent: { label: "Urgente", color: "var(--chart-4)" },
  stat: { label: "STAT", color: "var(--chart-2)" },
} satisfies ChartConfig;

interface TATDistributionChartProps {
  data: TATBucket[];
}

export function TATDistributionChart({ data }: TATDistributionChartProps) {
  const hasData = data.some((bucket) => bucket.total > 0);

  return (
    <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
      <CardHeader className="space-y-0.5 pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-900">
          Distribución de TAT
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500">
          Tiempo de respuesta por prioridad
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {hasData ? (
          <ChartContainer config={chartConfig} className="min-h-[240px] w-full">
            <BarChart accessibilityLayer data={data} barCategoryGap="20%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="bucketLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-[10px]"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                allowDecimals={false}
                width={32}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Bar
                dataKey="routine"
                fill="var(--color-routine)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="urgent"
                fill="var(--color-urgent)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="stat"
                fill="var(--color-stat)"
                radius={[3, 3, 0, 0]}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex min-h-[240px] items-center justify-center">
            <p className="text-sm text-zinc-400">Sin datos de TAT</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
