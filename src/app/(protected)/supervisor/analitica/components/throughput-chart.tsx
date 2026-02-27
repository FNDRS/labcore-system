"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

// Paleta moderna minimalista: teal suave (aprobados), slate/rose suave (rechazados)
const chartConfig = {
  approved: { label: "Aprobados", color: "oklch(0.55 0.11 168)" },
  rejected: { label: "Rechazados", color: "oklch(0.62 0.04 260)" },
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
    <Card className="flex h-full min-h-0 flex-col rounded-2xl border border-zinc-100 bg-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-6">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-medium text-zinc-800">
            Volumen de exámenes
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Aprobados vs rechazados por día
          </CardDescription>
        </div>
        <Select value={window} onValueChange={setWindow}>
          <SelectTrigger
            className="h-8 w-[110px] rounded-lg border-zinc-100 text-xs text-zinc-600"
            aria-label="Periodo del gráfico"
          >
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-zinc-100">
            <SelectItem value="90d">90 días</SelectItem>
            <SelectItem value="30d">30 días</SelectItem>
            <SelectItem value="7d">7 días</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 pb-6 pt-2">
        {hasData ? (
          <ChartContainer config={chartConfig} className="min-h-[240px] w-full flex-1">
            <AreaChart
              accessibilityLayer
              data={filtered}
              margin={{ top: 12, right: 4, bottom: 0, left: -8 }}
              animationDuration={500}
              animationBegin={0}
            >
              <defs>
                <linearGradient id="throughputGradApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-approved)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-approved)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="throughputGradRejected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-rejected)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-rejected)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="oklch(0.97 0 0)" strokeWidth={1} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: "oklch(0.55 0 0)", fontSize: 11 }}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString("es-CL", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: "oklch(0.55 0 0)", fontSize: 11 }}
                tickFormatter={(v: number) => v.toLocaleString("es-CL")}
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
                    className="rounded-xl border-zinc-100 bg-white shadow-lg"
                  />
                }
              />
              <Area
                dataKey="rejected"
                type="monotone"
                fill="url(#throughputGradRejected)"
                stroke="var(--color-rejected)"
                strokeWidth={1.5}
                stackId="throughput"
              />
              <Area
                dataKey="approved"
                type="monotone"
                fill="url(#throughputGradApproved)"
                stroke="var(--color-approved)"
                strokeWidth={1.5}
                stackId="throughput"
              />
              <ChartLegend content={<ChartLegendContent className="text-zinc-500" />} />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex min-h-[260px] items-center justify-center">
            <p className="text-xs text-zinc-400">
              Sin datos de volumen para el periodo seleccionado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
