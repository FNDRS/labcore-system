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

function formatProcessedTime(iso: string | null): string {
	if (!iso) return "—";
	try {
		const d = new Date(iso);
		return d.toLocaleTimeString("es-CL", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
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

export function SupervisorDashboardClient({
	stats,
	pending,
}: SupervisorDashboardClientProps) {
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
						<p className="text-3xl font-bold tabular-nums text-zinc-900">
							{stats.pendingCount}
						</p>
					</CardContent>
				</Card>
				<Card className="rounded-xl border border-red-200 bg-red-50/50 shadow-none">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium uppercase tracking-wide text-red-700">
							Críticos
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold tabular-nums text-red-800">
							{stats.criticalCount}
						</p>
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
			<Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">
						Resultados pendientes de validación
					</CardTitle>
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
								<TableHead className="text-muted-foreground font-medium">
									Hora procesado
								</TableHead>
								<TableHead className="text-muted-foreground font-medium">Flag clínico</TableHead>
								<TableHead className="text-muted-foreground w-[100px] font-medium">
									Acción
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{pending.length === 0 ? (
								<TableRow className="border-zinc-100">
									<TableCell
										colSpan={7}
										className="py-12 text-center text-muted-foreground"
									>
										No hay resultados pendientes de validación
									</TableCell>
								</TableRow>
							) : (
								pending.map((row) => (
									<TableRow key={row.examId} className="border-zinc-100">
										<TableCell className="font-medium">{row.patientName}</TableCell>
										<TableCell className="text-zinc-600">{row.examTypeName}</TableCell>
										<TableCell className="text-zinc-600">
											{row.technicianId ?? "—"}
										</TableCell>
										<TableCell className="text-zinc-600">
											Pendiente validar
										</TableCell>
										<TableCell className="text-zinc-600">
											{formatProcessedTime(row.processedAt)}
										</TableCell>
										<TableCell>
											<FlagBadge flag={row.clinicalFlag} />
										</TableCell>
										<TableCell>
											<Button variant="outline" size="sm" className="rounded-full" asChild>
												<Link href={`/supervisor/validaciones/${row.examId}`}>
													Revisar
												</Link>
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
