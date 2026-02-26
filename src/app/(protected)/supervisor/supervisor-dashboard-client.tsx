"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  SupervisorDashboardStats,
  ValidationClinicalFlag,
  ValidationQueueItem,
} from "@/lib/types/validation-types";

function formatProcessedDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${date} ${time}`;
  } catch {
    return "—";
  }
}

function FlagBadge({ flag }: { flag: ValidationClinicalFlag }) {
  const style =
    flag === "critico"
      ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
      : flag === "atencion"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  const label = flag === "critico" ? "Crítico" : flag === "atencion" ? "Atención" : "Normal";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

export interface SupervisorDashboardClientProps {
  stats: SupervisorDashboardStats;
  pending: ValidationQueueItem[];
}

export function SupervisorDashboardClient({ stats, pending }: SupervisorDashboardClientProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      {/* Indicadores operativos */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Pendientes validar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-zinc-900">{stats.pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-red-200 bg-red-50/50 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-red-700">
              Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-red-800">{stats.criticalCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-amber-200 bg-amber-50/50 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-amber-700">
              Incidencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-amber-800">
              {stats.activeIncidences}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Tiempo prom. (min)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-zinc-900">
              {stats.averageValidationTurnaroundMins}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla: resultados listos para validar */}
      <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resultados pendientes de validación</CardTitle>
          <p className="text-muted-foreground text-sm">
            Paciente · Prueba · Técnico · Estado · Fecha y hora · Flag · Revisar
          </p>
        </CardHeader>
        <CardContent className="px-4 py-0">
          <div className="overflow-x-auto rounded-t-xl rounded-b-xl border border-zinc-100">
            <Table>
              <TableHeader className="bg-zinc-50">
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="h-12 rounded-tl-xl px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Paciente
                  </TableHead>
                  <TableHead className="h-12 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Prueba
                  </TableHead>
                  <TableHead className="h-12 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Técnico
                  </TableHead>
                  <TableHead className="h-12 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Estado
                  </TableHead>
                  <TableHead className="h-12 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Fecha y hora
                  </TableHead>
                  <TableHead className="h-12 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Flag clínico
                  </TableHead>
                  <TableHead className="h-12 w-[100px] rounded-tr-xl px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Acción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 ? (
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableCell colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No hay resultados pendientes de validación
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.map((row) => (
                    <TableRow
                      key={row.examId}
                      className="border-b border-border/40 transition-colors hover:bg-muted/70"
                    >
                      <TableCell className="px-6 py-4 text-sm font-semibold">
                        {row.patientName}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                        {row.examTypeName}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                        {row.technicianId ?? "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                        Pendiente validar
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                        {formatProcessedDateTime(row.processedAt)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <FlagBadge flag={row.clinicalFlag} />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                          <Link href={`/supervisor/validaciones/${row.examId}`}>Revisar</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
