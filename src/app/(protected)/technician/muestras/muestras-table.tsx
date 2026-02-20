"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SampleWorkstationRow } from "../actions";
import type { Filter } from "./constants";
import { filterRows } from "./filter-utils";
import { StatusBadge } from "./status-badge";

export function MuestrasTable({
  rows,
  filter,
  searchQuery,
  selectedId,
  highlightedId,
  onSelect,
  onMarkReceived,
  onProcess,
  onReportProblem,
  tableRef,
  rowRefs,
}: {
  rows: SampleWorkstationRow[];
  filter: Filter;
  searchQuery: string;
  selectedId: string | null;
  highlightedId: string | null;
  onSelect: (id: string) => void;
  onMarkReceived: (id: string) => void;
  onProcess: (id: string) => void;
  onReportProblem: (id: string) => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
  rowRefs: (id: string) => (el: HTMLTableRowElement | null) => void;
}) {
  const filtered = filterRows(rows, filter).filter((row) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      row.sampleId.toLowerCase().includes(q) ||
      row.patientName.toLowerCase().includes(q) ||
      row.testType.toLowerCase().includes(q)
    );
  });

  return (
    <div
      ref={tableRef}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/60 hover:bg-transparent">
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              ID
            </TableHead>
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Paciente
            </TableHead>
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Prueba
            </TableHead>
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estado
            </TableHead>
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Prioridad
            </TableHead>
            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Espera
            </TableHead>
            <TableHead className="h-12 w-[220px] px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Acción
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={7}
                className="py-12 text-center text-muted-foreground"
              >
                No hay muestras en esta vista.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((row) => (
              <TableRow
                key={row.id}
                ref={rowRefs(row.id)}
                className={`border-b border-border/40 transition-colors hover:bg-muted/70 ${
                  highlightedId === row.id
                    ? "bg-orange-100/80 dark:bg-orange-950/30"
                    : selectedId === row.id
                      ? "bg-muted/50"
                      : ""
                }`}
              >
                <TableCell className="px-4 py-3 font-mono text-sm font-semibold text-muted-foreground">
                  {row.sampleId}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm font-semibold">
                  {row.patientName}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  {row.testType}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  {row.priority}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  {row.waitMins > 0 ? `${row.waitMins} min` : "—"}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
                        aria-label="Más opciones"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => onSelect(row.id)}>
                        Ver detalle
                      </DropdownMenuItem>
                      {row.status !== "Completed" &&
                        row.status !== "Flagged" && (
                          <DropdownMenuItem onClick={() => onProcess(row.id)}>
                            Procesar
                          </DropdownMenuItem>
                        )}
                      {row.status !== "Received" &&
                        row.status !== "Completed" &&
                        row.status !== "Flagged" && (
                          <DropdownMenuItem
                            onClick={() => onMarkReceived(row.id)}
                          >
                            Marcar recibida
                          </DropdownMenuItem>
                        )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onReportProblem(row.id)}
                      >
                        Reportar problema
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
