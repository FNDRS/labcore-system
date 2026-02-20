"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StatusVariant = "normal" | "warning" | "critical";

type PatientRow = {
  id: string;
  patientName: string;
  study: string;
  status: string;
  statusVariant: StatusVariant;
  date: string;
};

function StatusBadge({ status, variant }: { status: string; variant: StatusVariant }) {
  const style =
    variant === "critical"
      ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
      : variant === "warning"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}

export function DoctorDashboardClient({
  stats,
  patients,
}: {
  stats: { nuevos: number; criticos: number; pendientes: number };
  patients: PatientRow[];
}) {
  const [search, setSearch] = useState("");

  const filtered = patients.filter(
    (p) =>
      !search.trim() ||
      p.patientName.toLowerCase().includes(search.trim().toLowerCase()) ||
      p.study.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      {/* Buscador global */}
      <div className="relative max-w-md">
        <Search className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="Buscar paciente o estudio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 rounded-full border-zinc-200 bg-white pl-10 shadow-none"
          aria-label="Búsqueda"
        />
      </div>

      {/* Cards: Resultados nuevos, Críticos, Pendientes */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Resultados nuevos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-zinc-900">{stats.nuevos}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-red-200 bg-red-50/50 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-red-700">
              Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-red-800">{stats.criticos}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-zinc-900">{stats.pendientes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla: Pacientes con resultados recientes */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pacientes con resultados recientes</CardTitle>
          <p className="text-muted-foreground text-sm">
            Lista de pacientes con resultados recientes.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow className="border-zinc-200 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Paciente</TableHead>
                <TableHead className="text-muted-foreground font-medium">Estudio</TableHead>
                <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
                <TableHead className="text-muted-foreground font-medium">Fecha</TableHead>
                <TableHead className="text-muted-foreground w-[140px] font-medium">
                  Acción
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-zinc-500">
                    No hay resultados que coincidan.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id} className="border-zinc-100">
                    <TableCell className="font-medium">{row.patientName}</TableCell>
                    <TableCell className="text-zinc-600">{row.study}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} variant={row.statusVariant} />
                    </TableCell>
                    <TableCell className="text-zinc-600">{row.date}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="rounded-full" asChild>
                        <Link href={`/doctor/resultados/${row.id}`}>Ver resultado</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
