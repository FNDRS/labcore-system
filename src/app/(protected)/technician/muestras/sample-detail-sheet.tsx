"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import type {
  SampleWorkstationRow,
  SampleWorkstationStatus,
} from "../actions";

const MOCK_HISTORY = [
  { at: "08:24", event: "En proceso" },
  { at: "08:20", event: "Recibida" },
  { at: "08:00", event: "Recolección" },
];

type SampleExam = { id: string; name: string; status: SampleWorkstationStatus };

function getExamsFromSample(sample: SampleWorkstationRow): SampleExam[] {
  return [{ id: sample.id, name: sample.testType, status: sample.status }];
}

const EXAM_LABELS: Record<SampleWorkstationStatus, string> = {
  Received: "Pendiente",
  Processing: "En proceso",
  "Waiting Equipment": "Esperando equipo",
  Completed: "Completado",
  Flagged: "Marcado",
};

function ExamStatusBadge({ status }: { status: SampleWorkstationStatus }) {
  const style =
    status === "Completed"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : status === "Flagged"
        ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
        : status === "Processing" || status === "Waiting Equipment"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {EXAM_LABELS[status]}
    </span>
  );
}

export function SampleDetailSheet({
  sample,
  open,
  onOpenChange,
  onProcess,
  onReportIncident,
  onReprintLabel,
}: {
  sample: SampleWorkstationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcess: (id: string) => void;
  onReportIncident: (id: string) => void;
  onReprintLabel: (id: string) => void;
}) {
  if (!sample) return null;

  const exams = getExamsFromSample(sample);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col sm:max-w-md"
        side="right"
      >
        <SheetHeader>
          <SheetTitle className="font-mono text-lg">
            Detalle de Muestra {sample.sampleId}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-1">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Paciente: </span>
              <span className="font-medium">{sample.patientName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Prioridad: </span>
              {sample.priority}
            </p>
            <p>
              <span className="text-muted-foreground">Tipo de muestra: </span>
              {sample.sampleType}
            </p>
            <p>
              <span className="text-muted-foreground">Hora recolección: </span>
              {sample.collectedAt ?? "—"}
            </p>
            {sample.notes && (
              <p>
                <span className="text-muted-foreground">Notas: </span>
                {sample.notes}
              </p>
            )}
          </div>
          <div>
            <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
              Exámenes asociados
            </h4>
            <ul className="space-y-2">
              {exams.map((exam) => (
                <li
                  key={exam.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{exam.name}</span>
                    <ExamStatusBadge status={exam.status} />
                  </div>
                  {exam.status !== "Completed" && exam.status !== "Flagged" && (
                    <Button
                      size="sm"
                      className="shrink-0 rounded-full bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500"
                      onClick={() => onProcess(exam.id)}
                    >
                      {exam.status === "Processing" ||
                      exam.status === "Waiting Equipment"
                        ? "Continuar"
                        : "Procesar"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-2 text-xs">
              Solo al elegir Procesar o Continuar se abre el formulario del
              examen.
            </p>
          </div>
          <div>
            <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
              Historial
            </h4>
            <ul className="space-y-1.5 text-sm">
              {MOCK_HISTORY.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    {h.at}
                  </span>
                  <span>{h.event}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <SheetFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onReportIncident(sample.id)}
          >
            Marcar incidencia
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onReprintLabel(sample.id)}
          >
            <Printer className="size-4 mr-2" />
            Reimprimir etiqueta
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
