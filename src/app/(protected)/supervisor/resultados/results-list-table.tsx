"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResultsListItem } from "@/lib/types/results-types";
import { cn } from "@/lib/utils";
import { useResultsListProvider } from "./results-list-provider";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function StatusPill({ status }: { status: "completa" | "parcial" }) {
  return status === "completa" ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
      Completa
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">
      Parcial
    </span>
  );
}

function PriorityChip({ priority }: { priority: ResultsListItem["priority"] }) {
  if (priority === "stat") {
    return (
      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-700">
        STAT
      </span>
    );
  }
  if (priority === "urgent") {
    return (
      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">
        URG
      </span>
    );
  }
  return <span className="text-xs text-zinc-400">Rutina</span>;
}

function ExamProgressBar({
  terminalCount,
  total,
}: {
  terminalCount: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((terminalCount / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-[34px] text-right text-[13px] tabular-nums text-zinc-700">
        {terminalCount}/{total}
      </span>
      <div className="h-1 w-10 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            pct === 100 ? "bg-emerald-500" : "bg-amber-400",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full border border-zinc-200 bg-zinc-50 p-4">
        <FileText className="size-5 text-zinc-300" />
      </div>
      {hasFilters ? (
        <>
          <p className="text-[13px] font-medium text-zinc-600">
            Sin resultados para esta búsqueda
          </p>
          <p className="text-xs text-zinc-400">
            Ajusta los filtros o amplía el rango de fechas
          </p>
        </>
      ) : (
        <>
          <p className="text-[13px] font-medium text-zinc-600">
            No hay órdenes con resultados terminales
          </p>
          <p className="text-xs text-zinc-400">
            Aparecerán aquí cuando los exámenes sean aprobados o rechazados
          </p>
        </>
      )}
    </div>
  );
}

export function ResultsTable() {
  const {
    state: { filteredItems, filters, search, isLoading },
  } = useResultsListProvider();

  const status = filters.status ?? "todas";
  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "todas" ||
    filters.from != null ||
    filters.to != null ||
    filters.referringDoctor != null;

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-none transition-opacity duration-150",
        isLoading && "opacity-50",
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-200 bg-zinc-50/80 hover:bg-zinc-50/80">
            <TableHead className="py-3 pl-5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              N.° Acceso
            </TableHead>
            <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Paciente
            </TableHead>
            <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Fecha solicitud
            </TableHead>
            <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Prioridad
            </TableHead>
            <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Exámenes
            </TableHead>
            <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Estado
            </TableHead>
            <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Último validado
            </TableHead>
            <TableHead className="w-[110px] py-3 pr-5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="p-0">
                <EmptyState hasFilters={hasActiveFilters} />
              </TableCell>
            </TableRow>
          ) : (
            filteredItems.map((item) => (
              <TableRow
                key={item.workOrderId}
                className="group border-zinc-100 transition-colors hover:bg-zinc-50/60"
              >
                <TableCell className="py-3.5 pl-5">
                  <span className="font-mono text-[13px] tabular-nums text-zinc-800">
                    {item.accessionNumber ?? <span className="text-zinc-300">—</span>}
                  </span>
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="text-[13px] font-medium text-zinc-900">{item.patientName}</span>
                  {item.referringDoctor ? (
                    <p className="mt-0.5 text-[11px] text-zinc-400">{item.referringDoctor}</p>
                  ) : null}
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="text-[13px] text-zinc-600">{formatDate(item.requestedAt)}</span>
                </TableCell>
                <TableCell className="py-3.5">
                  <PriorityChip priority={item.priority} />
                </TableCell>
                <TableCell className="py-3.5">
                  <ExamProgressBar
                    terminalCount={item.terminalExamCount}
                    total={item.examCount}
                  />
                </TableCell>
                <TableCell className="py-3.5">
                  <StatusPill status={item.status} />
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="text-[13px] text-zinc-600">
                    {formatDate(item.lastValidatedAt)}
                  </span>
                </TableCell>
                <TableCell className="py-3.5 pr-5 text-right">
                  <Link
                    href={`/supervisor/resultados/${item.workOrderId}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 shadow-sm transition-all duration-150 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                  >
                    Ver resultados
                    <ChevronRight className="size-3 text-zinc-400 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
