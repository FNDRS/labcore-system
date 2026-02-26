"use client";

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
import type { DoctorVolumeEntry } from "@/lib/types/analytics-types";

const chartConfig = {
  workOrderCount: {
    label: "Órdenes",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

interface DoctorVolumeChartProps {
  data: DoctorVolumeEntry[];
}

export function DoctorVolumeChart({ data }: DoctorVolumeChartProps) {
  const hasData = data.length > 0;

  return (
    <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
      <CardHeader className="space-y-0.5 pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-900">
          Volumen por médico derivante
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500">
          Top 10 por cantidad de órdenes
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {hasData ? (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ minHeight: Math.max(180, data.length * 36 + 40) }}
          >
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
            >
              <YAxis
                dataKey="referringDoctor"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={120}
                className="text-[11px]"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    indicator="dot"
                  />
                }
              />
              <Bar
                dataKey="workOrderCount"
                fill="var(--color-workOrderCount)"
                radius={[0, 4, 4, 0]}
                barSize={22}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex min-h-[180px] items-center justify-center">
            <p className="text-sm text-zinc-400">Sin datos de médicos</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
