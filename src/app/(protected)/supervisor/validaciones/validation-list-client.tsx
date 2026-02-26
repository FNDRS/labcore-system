"use client";

import { Search, X } from "lucide-react";
import type { ValidationQueueFilterFlag } from "@/lib/types/validation-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useValidationProvider } from "./validation-provider";
import { ValidationQueueTable } from "./validation-queue-table";

const STATUS_OPTIONS = [
	{ value: "pending", label: "Pendientes" },
	{ value: "all", label: "Todos" },
] as const;

const FLAG_OPTIONS = [
	{ value: "__all__", label: "Todos" },
	{ value: "critico", label: "Crítico" },
	{ value: "atencion", label: "Atención" },
	{ value: "normal", label: "Normal" },
	{ value: "abnormal", label: "Anormales" },
] as const;

export function ValidationListClient({
	initialFeedback = null,
}: {
	initialFeedback?: "approved" | "rejected" | null;
}) {
	const {
		state: {
			filteredItems,
			filters,
			pendingCount,
			criticalCount,
			selectedId,
		},
		actions: {
			setSearchQuery,
			setStatusFilter,
			setFlagFilter,
			setFromDate,
			setToDate,
			clearFilters,
			setSelectedId,
		},
	} = useValidationProvider();

	const hasActiveFilters =
		filters.statusFilter !== "pending" ||
		filters.flag !== "" ||
		filters.fromDate !== "" ||
		filters.toDate !== "" ||
		filters.searchQuery !== "";

	return (
		<div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
			<div className="mx-auto max-w-5xl space-y-4">
				<Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-none">
					<CardHeader className="pb-3">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<CardTitle className="text-base">
									Cola de validación
								</CardTitle>
								<p className="text-muted-foreground mt-0.5 text-sm">
									{pendingCount} pendiente{pendingCount !== 1 ? "s" : ""} de
									validar
									{criticalCount > 0 && (
										<span className="text-red-600 dark:text-red-400">
											{" "}
											· {criticalCount} crítico{criticalCount !== 1 ? "s" : ""}
										</span>
									)}
								</p>
							</div>
							{hasActiveFilters && (
								<button
									type="button"
									onClick={clearFilters}
									className="text-muted-foreground hover:text-foreground text-sm underline"
								>
									Limpiar filtros
								</button>
							)}
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{initialFeedback ? (
							<div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
								{initialFeedback === "approved"
									? "Examen aprobado correctamente."
									: "Examen rechazado correctamente."}
							</div>
						) : null}
						{/* Filters */}
						<div className="flex flex-wrap items-center gap-3">
							<div className="relative w-full min-w-0 max-w-sm sm:w-72">
								<Search className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" />
								<Input
									type="text"
									placeholder="Buscar por paciente o n° de acceso..."
									value={filters.searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="h-11 rounded-full border-border/70 bg-card pl-10 pr-10 text-sm shadow-none transition-colors placeholder:text-muted-foreground/80 focus-visible:border-slate-400/50 focus-visible:ring-0"
									aria-label="Buscar por paciente o número de acceso"
								/>
								{filters.searchQuery.length > 0 && (
									<button
										type="button"
										onClick={() => setSearchQuery("")}
										className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors"
										aria-label="Limpiar búsqueda"
									>
										<X className="size-3.5" />
									</button>
								)}
							</div>

							<Select
								value={filters.statusFilter}
								onValueChange={(v) =>
									setStatusFilter(v as "pending" | "all")
								}
							>
								<SelectTrigger className="h-11 w-[140px]" size="sm">
									<SelectValue placeholder="Estado" />
								</SelectTrigger>
								<SelectContent>
									{STATUS_OPTIONS.map((o) => (
										<SelectItem key={o.value} value={o.value}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select
								value={filters.flag || "__all__"}
								onValueChange={(v) => {
									if (v === "__all__") setFlagFilter("");
									else setFlagFilter(v as ValidationQueueFilterFlag);
								}}
							>
								<SelectTrigger className="h-11 w-[140px]" size="sm">
									<SelectValue placeholder="Flag" />
								</SelectTrigger>
								<SelectContent>
									{FLAG_OPTIONS.map((o) => (
										<SelectItem key={o.value} value={o.value}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<div className="flex items-center gap-2">
								<Input
									type="date"
									value={filters.fromDate}
									onChange={(e) => setFromDate(e.target.value)}
									className="h-11 w-[140px] text-sm"
									aria-label="Fecha desde"
								/>
								<span className="text-muted-foreground text-sm">–</span>
								<Input
									type="date"
									value={filters.toDate}
									onChange={(e) => setToDate(e.target.value)}
									className="h-11 w-[140px] text-sm"
									aria-label="Fecha hasta"
								/>
							</div>
						</div>

						{/* Table */}
						<div className="overflow-x-auto rounded-lg border border-zinc-100">
							<ValidationQueueTable
								items={filteredItems}
								highlightCritical
								selectedId={selectedId}
								onReview={setSelectedId}
							/>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
