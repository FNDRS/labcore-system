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

const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
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
    <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
      <CardHeader className="space-y-0.5 pb-2">
        <CardTitle className="text-base font-semibold text-zinc-900">
          Distribución de exámenes
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500">
          Proporción por tipo de examen
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {hasData ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[280px]"
          >
            <PieChart accessibilityLayer>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="type" hideLabel />}
              />
              <Pie
                data={pieData}
                dataKey="count"
                nameKey="type"
                innerRadius={64}
                outerRadius={100}
                strokeWidth={4}
                stroke="var(--background)"
                paddingAngle={2}
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
                            className="fill-foreground text-3xl font-bold tabular-nums"
                          >
                            {total.toLocaleString("es-CL")}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 22}
                            className="fill-muted-foreground text-xs"
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
        ) : (
          <div className="flex min-h-[280px] items-center justify-center">
            <p className="text-sm text-zinc-400">
              Sin datos de distribución para el periodo seleccionado
            </p>
          </div>
        )}

        {hasData && (
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {data.map((entry, i) => (
              <div key={entry.examTypeId} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
                />
                <span className="text-zinc-600">{entry.examTypeName}</span>
                <span className="tabular-nums text-zinc-400">
                  ({entry.count})
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
