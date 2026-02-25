"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ValidationQueueItem } from "@/lib/types/validation-types";

function ClinicalFlagBadge({
	flag,
	hasViolation,
}: {
	flag: ValidationQueueItem["clinicalFlag"];
	hasViolation: boolean;
}) {
	const isCritical = flag === "critico" || (flag === "atencion" && hasViolation);
	const isAttention = flag === "atencion" && !hasViolation;

	const style = isCritical
		? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
		: isAttention
			? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
			: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

	const label =
		flag === "critico"
			? "Crítico"
			: flag === "atencion"
				? "Atención"
				: "Normal";

	return (
		<span
			className={cn(
				"inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
				style,
			)}
		>
			{label}
		</span>
	);
}

function StatusBadge({ status }: { status: ValidationQueueItem["status"] }) {
	const labels: Record<string, string> = {
		ready_for_validation: "Pendiente",
		approved: "Aprobado",
		rejected: "Rechazado",
		review: "Revisión",
	};
	const label = labels[status] ?? status;

	return (
		<span
			className={cn(
				"inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
				status === "approved" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
				status === "rejected" && "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
				status === "ready_for_validation" && "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
				status === "review" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
			)}
		>
			{label}
		</span>
	);
}

function formatProcessedAt(processedAt: string | null): string {
	if (!processedAt) return "—";
	try {
		const d = new Date(processedAt);
		if (Number.isNaN(d.getTime())) return processedAt;
		return d.toLocaleString("es-CL", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return processedAt;
	}
}

export function ValidationQueueTable({
	items,
	highlightCritical = true,
}: {
	items: ValidationQueueItem[];
	highlightCritical?: boolean;
}) {
	if (items.length === 0) {
		return (
			<div className="py-12 text-center text-sm text-muted-foreground">
				No hay resultados que coincidan con los filtros.
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow className="border-zinc-200 hover:bg-transparent">
					<TableHead className="text-muted-foreground font-medium">
						Paciente
					</TableHead>
					<TableHead className="text-muted-foreground font-medium">
						Examen
					</TableHead>
					<TableHead className="text-muted-foreground font-medium">
						Técnico
					</TableHead>
					<TableHead className="text-muted-foreground font-medium">
						Procesado
					</TableHead>
					<TableHead className="text-muted-foreground font-medium">
						Flag clínico
					</TableHead>
					<TableHead className="text-muted-foreground font-medium">
						Estado
					</TableHead>
					<TableHead className="text-muted-foreground w-[100px] font-medium">
						Acción
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((row) => {
					const isCritical =
						highlightCritical &&
						(row.clinicalFlag !== "normal" || row.hasReferenceRangeViolation);
					return (
						<TableRow
							key={row.examId}
							className={cn(
								"border-zinc-100",
								isCritical &&
									"bg-red-50/50 dark:bg-red-950/20 border-l-2 border-l-red-400",
							)}
						>
							<TableCell className="font-medium">
								{row.patientName}
								{row.accessionNumber && (
									<span className="text-muted-foreground ml-1 text-xs">
										({row.accessionNumber})
									</span>
								)}
							</TableCell>
							<TableCell className="text-zinc-600">
								{row.examTypeName}
							</TableCell>
							<TableCell className="text-zinc-600">
								{row.technicianId ?? "—"}
							</TableCell>
							<TableCell className="text-zinc-600 tabular-nums">
								{formatProcessedAt(row.processedAt)}
							</TableCell>
							<TableCell>
								<ClinicalFlagBadge
									flag={row.clinicalFlag}
									hasViolation={row.hasReferenceRangeViolation}
								/>
							</TableCell>
							<TableCell>
								<StatusBadge status={row.status} />
							</TableCell>
							<TableCell>
								{row.status === "ready_for_validation" ? (
									<Button variant="outline" size="sm" className="rounded-full" asChild>
										<Link href={`/supervisor/validaciones/${row.examId}`}>
											Revisar
										</Link>
									</Button>
								) : (
									<Button
										variant="ghost"
										size="sm"
										className="rounded-full"
										asChild
									>
										<Link href={`/supervisor/validaciones/${row.examId}`}>
											Ver
										</Link>
									</Button>
								)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
