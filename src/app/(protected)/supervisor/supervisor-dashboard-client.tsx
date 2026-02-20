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

type ResultRow = {
  id: string;
  patientName: string;
  test: string;
  technician: string;
  status: string;
  processedAt: string;
  flag: "normal" | "critico" | "atencion";
};

const MOCK_STATS = {
  pendientesValidar: 12,
  criticos: 2,
  incidencias: 1,
  tiempoPromedioMin: 18,
};

const MOCK_RESULTS: ResultRow[] = [
  { id: "1", patientName: "María García", test: "Hemograma", technician: "Técnico A", status: "Pendiente validar", processedAt: "10:24", flag: "normal" },
  { id: "2", patientName: "Juan Pérez", test: "Perfil lipídico", technician: "Técnico B", status: "Pendiente validar", processedAt: "10:18", flag: "critico" },
  { id: "3", patientName: "Ana López", test: "Glucosa", technician: "Técnico A", status: "Pendiente validar", processedAt: "10:05", flag: "atencion" },
  { id: "4", patientName: "Carlos Ruiz", test: "TSH", technician: "Técnico B", status: "Pendiente validar", processedAt: "09:52", flag: "normal" },
];

function FlagBadge({ flag }: { flag: ResultRow["flag"] }) {
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

export function SupervisorDashboardClient() {
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
            <p className="text-3xl font-bold tabular-nums text-zinc-900">{MOCK_STATS.pendientesValidar}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-red-200 bg-red-50/50 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-red-700">
              Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-red-800">{MOCK_STATS.criticos}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-amber-200 bg-amber-50/50 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-amber-700">
              Incidencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-amber-800">{MOCK_STATS.incidencias}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Tiempo prom. (min)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-zinc-900">{MOCK_STATS.tiempoPromedioMin}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla: resultados listos para validar */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resultados pendientes de validación</CardTitle>
          <p className="text-muted-foreground text-sm">
            Paciente · Prueba · Técnico · Estado · Hora procesado · Flag · Revisar
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Paciente</TableHead>
                <TableHead className="text-muted-foreground font-medium">Prueba</TableHead>
                <TableHead className="text-muted-foreground font-medium">Técnico</TableHead>
                <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
                <TableHead className="text-muted-foreground font-medium">Hora procesado</TableHead>
                <TableHead className="text-muted-foreground font-medium">Flag clínico</TableHead>
                <TableHead className="text-muted-foreground w-[100px] font-medium">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_RESULTS.map((row) => (
                <TableRow key={row.id} className="border-zinc-100">
                  <TableCell className="font-medium">{row.patientName}</TableCell>
                  <TableCell className="text-zinc-600">{row.test}</TableCell>
                  <TableCell className="text-zinc-600">{row.technician}</TableCell>
                  <TableCell className="text-zinc-600">{row.status}</TableCell>
                  <TableCell className="text-zinc-600">{row.processedAt}</TableCell>
                  <TableCell>
                    <FlagBadge flag={row.flag} />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="rounded-full" asChild>
                      <Link href={`/supervisor/validaciones/${row.id}`}>Revisar</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
