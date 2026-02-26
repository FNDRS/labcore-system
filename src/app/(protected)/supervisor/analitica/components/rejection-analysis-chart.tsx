"use client";

import * as React from "react";
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
import type { RejectionAnalysisEntry } from "@/lib/types/analytics-types";

const REASON_PALETTE = [
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-3)",
  "var(--chart-1)",
];

interface RejectionAnalysisChartProps {
  data: RejectionAnalysisEntry[];
}

export function RejectionAnalysisChart({ data }: RejectionAnalysisChartProps) {
  const allReasons = React.useMemo(() => {
    const reasonSet = new Set<string>();
    for (const entry of data) {
      for (const reason of Object.keys(entry.byReason)) {
        reasonSet.add(reason);
      }
    }
    return [...reasonSet];
  }, [data]);

  const chartConfig = React.useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    for (let i = 0; i < allReasons.length; i += 1) {
      const reason = allReasons[i];
      cfg[reason] = {
        label: reason,
        color: REASON_PALETTE[i % REASON_PALETTE.length],
      };
    }
    return cfg satisfies ChartConfig;
  }, [allReasons]);

  const barData = React.useMemo(
    () =>
      data.map((entry) => {
        const row: Record<string, string | number> = {
          examType: entry.examTypeCode,
        };
        for (const reason of allReasons) {
          row[reason] = entry.byReason[reason] ?? 0;
        }
        return row;
      }),
    [data, allReasons],
  );

  const hasData = data.length > 0 && allReasons.length > 0;

  return (
    <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
      <CardHeader className="space-y-0.5 pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-900">
          Análisis de rechazos
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500">
          Motivos de rechazo por tipo de examen
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {hasData ? (
          <ChartContainer config={chartConfig} className="min-h-[240px] w-full">
            <BarChart accessibilityLayer data={barData} barCategoryGap="16%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="examType"
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
                width={28}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              {allReasons.map((reason, i) => (
                <Bar
                  key={reason}
                  dataKey={reason}
                  stackId="rejections"
                  fill={REASON_PALETTE[i % REASON_PALETTE.length]}
                  radius={
                    i === allReasons.length - 1
                      ? [3, 3, 0, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex min-h-[240px] items-center justify-center">
            <p className="text-sm text-zinc-400">Sin datos de rechazos</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
