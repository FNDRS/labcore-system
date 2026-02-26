"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ThroughputDataPoint } from "@/lib/types/analytics-types";

const chartConfig = {
  approved: { label: "Aprobados", color: "var(--chart-1)" },
  rejected: { label: "Rechazados", color: "var(--chart-2)" },
} satisfies ChartConfig;

interface ThroughputChartProps {
  data: ThroughputDataPoint[];
}

export function ThroughputChart({ data }: ThroughputChartProps) {
  const [window, setWindow] = React.useState("30d");

  const filtered = React.useMemo(() => {
    const days = window === "7d" ? 7 : window === "30d" ? 30 : 90;
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    return data.filter((point) => new Date(point.date) >= cutoff);
  }, [data, window]);

  const hasData = filtered.length > 0;

  return (
    <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold text-zinc-900">
            Volumen de exámenes
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Aprobados vs rechazados por día
          </CardDescription>
        </div>
        <Select value={window} onValueChange={setWindow}>
          <SelectTrigger
            className="w-[130px] rounded-lg text-xs"
            aria-label="Periodo del gráfico"
          >
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d">90 días</SelectItem>
            <SelectItem value="30d">30 días</SelectItem>
            <SelectItem value="7d">7 días</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-0">
        {hasData ? (
          <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
            <AreaChart accessibilityLayer data={filtered}>
              <defs>
                <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-approved)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--color-approved)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-rejected)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--color-rejected)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString("es-CL", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v: string) =>
                      new Date(v).toLocaleDateString("es-CL", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="rejected"
                type="monotone"
                fill="url(#gradRejected)"
                stroke="var(--color-rejected)"
                strokeWidth={2}
                stackId="throughput"
              />
              <Area
                dataKey="approved"
                type="monotone"
                fill="url(#gradApproved)"
                stroke="var(--color-approved)"
                strokeWidth={2}
                stackId="throughput"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center">
            <p className="text-sm text-zinc-400">
              Sin datos de volumen para el periodo seleccionado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
