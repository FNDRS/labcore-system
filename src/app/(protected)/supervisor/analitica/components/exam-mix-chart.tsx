"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
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
import type { ExamMixEntry } from "@/lib/types/analytics-types";

// Paleta moderna minimalista: tonos suaves, sin café/marrón
const CHART_PALETTE = [
  "oklch(0.55 0.11 168)",   // teal
  "oklch(0.6 0.1 250)",     // slate/blue
  "oklch(0.58 0.1 145)",    // sage
  "oklch(0.6 0.1 300)",     // violet
  "oklch(0.55 0.08 200)",   // cyan
];

interface ExamMixChartProps {
  data: ExamMixEntry[];
}

export function ExamMixChart({ data }: ExamMixChartProps) {
  const chartConfig = React.useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    for (let i = 0; i < data.length; i += 1) {
      const entry = data[i];
      cfg[entry.examTypeCode] = {
        label: entry.examTypeName,
        color: CHART_PALETTE[i % CHART_PALETTE.length],
      };
    }
    return cfg satisfies ChartConfig;
  }, [data]);

  const total = React.useMemo(
    () => data.reduce((sum, entry) => sum + entry.count, 0),
    [data],
  );

  const pieData = React.useMemo(
    () =>
      data.map((entry) => ({
        type: entry.examTypeCode,
        name: entry.examTypeName,
        count: entry.count,
        fill: `var(--color-${entry.examTypeCode})`,
      })),
    [data],
  );

  const hasData = data.length > 0;

  return (
    <Card className="flex h-full min-h-0 flex-col rounded-2xl border border-zinc-100 bg-white shadow-none">
      <CardHeader className="space-y-0.5 pb-1 pt-6">
        <CardTitle className="text-sm font-medium text-zinc-800">
          Distribución de exámenes
        </CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Proporción por tipo de examen
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pb-6 pt-2">
        {hasData ? (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[260px] w-full"
            >
              <PieChart accessibilityLayer>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="type"
                      hideLabel
                      className="rounded-xl border-zinc-100 bg-white shadow-lg"
                    />
                  }
                />
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="type"
                  innerRadius={58}
                  outerRadius={88}
                  strokeWidth={2}
                  stroke="var(--background)"
                  paddingAngle={0}
                  isAnimationActive
                  animationBegin={0}
                  animationDuration={600}
                >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-zinc-800 text-2xl font-semibold tabular-nums"
                          >
                            {total.toLocaleString("es-CL")}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 18}
                            className="fill-zinc-400 text-[11px]"
                          >
                            Exámenes
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
            <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-2 px-1">
              {data.map((entry, i) => (
                <div
                  key={entry.examTypeId}
                  className="flex min-w-0 max-w-full shrink-0 items-center gap-1.5 text-[11px] text-zinc-500"
                >
                  <span
                    className="size-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
                  />
                  <span className="min-w-0 max-w-[110px] truncate" title={entry.examTypeName}>
                    {entry.examTypeName}
                  </span>
                  <span className="tabular-nums text-zinc-400">({entry.count})</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-[260px] items-center justify-center">
            <p className="text-xs text-zinc-400">
              Sin datos de distribución para el periodo seleccionado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
