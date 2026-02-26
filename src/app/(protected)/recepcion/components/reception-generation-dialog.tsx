import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GenerationModalState } from "../types";

type ReceptionGenerationDialogProps = {
  state: GenerationModalState;
  onOpenChange: (open: boolean) => void;
  onDownloadPdf: () => void;
  onReady: () => void;
};

export function ReceptionGenerationDialog({
  state,
  onOpenChange,
  onDownloadPdf,
  onReady,
}: ReceptionGenerationDialogProps) {
  const canCloseByEscapeOrOutside = state.printState === "printed";
  const isLoadingSpecimens = state.specimens.length === 0 && state.printState === "pending";

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        onEscapeKeyDown={(event) => {
          if (!canCloseByEscapeOrOutside) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (!canCloseByEscapeOrOutside) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{state.specimens.length} muestras creadas</DialogTitle>
          <DialogDescription>
            Orden {state.displayId || state.orderId} · {state.patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {isLoadingSpecimens ? (
            <p className="text-muted-foreground">Generando muestras…</p>
          ) : state.printState === "pending" ? (
            <p className="text-muted-foreground">Estado: Pendiente de descarga de etiquetas.</p>
          ) : null}
          {state.printState === "generating" ? (
            <p className="text-muted-foreground">Generando PDF…</p>
          ) : null}
          {state.printState === "printed" ? (
            <p className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
              Estado: Etiquetas listas (PDF descargado).
            </p>
          ) : null}
          {state.printState === "error" ? (
            <p className="inline-flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="size-4" />
              Estado: Error al generar PDF. Reintente.
            </p>
          ) : null}
        </div>

        <div className="space-y-2 text-sm">
          {state.specimens.map((specimen) => (
            <div key={specimen.specimenCode} className="flex items-start justify-between rounded-md border p-3">
              <p className="font-medium">
                {specimen.tubeLabel} → {specimen.examCount} exámenes
                <span className="text-muted-foreground mt-1 block font-normal">
                  Código: {specimen.specimenCode}
                </span>
              </p>
              {state.printState === "printed" ? (
                <CheckCircle2 className="mt-0.5 size-4 text-emerald-600 dark:text-emerald-300" />
              ) : null}
            </div>
          ))}
          {state.printState === "printed" ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              Pegue etiquetas en los tubos y envíe la muestra al laboratorio.
            </p>
          ) : null}
          {state.printAttempts > 1 ? (
            <p className="text-muted-foreground text-xs">
              Reimpresiones/descargas realizadas: {state.printAttempts - 1}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDownloadPdf} disabled={isLoadingSpecimens || state.printState === "generating"}>
            {isLoadingSpecimens ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Cargando…
              </span>
            ) : state.printState === "generating" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Generando…
              </span>
            ) : state.printState === "printed" ? (
              "Reimprimir PDF"
            ) : (
              "Descargar PDF"
            )}
          </Button>
          <Button type="button" onClick={onReady} disabled={state.printState !== "printed"}>
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
