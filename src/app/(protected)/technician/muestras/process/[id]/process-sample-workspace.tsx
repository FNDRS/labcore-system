"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProcessSampleWorkspace({
  rowId,
  sampleId,
}: {
  rowId: string;
  sampleId: string;
}) {
  const displayId = sampleId || `#${rowId}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      {/* Indicador claro: modo procesamiento */}
      <div className="border-b border-zinc-200 bg-amber-50/80 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-semibold text-amber-800">
              Procesando muestra {displayId}
            </span>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" asChild>
            <Link href="/technician/muestras">
              <ArrowLeft className="size-3.5 mr-1.5" />
              Volver a cola
            </Link>
          </Button>
        </div>
        <p className="mt-1 text-xs text-amber-700/90">
          Vista dedicada para ingreso de resultados. Al guardar volverás a la cola.
        </p>
      </div>

      {/* Área del formulario (placeholder hasta tener formulario real) */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-none">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Formulario del examen
          </h2>
          <p className="mt-2 text-zinc-600">
            Próximamente: campos del examen (valores, unidades, notas). Submit → toast éxito →
            regreso a cola.
          </p>
          <div className="mt-6 flex gap-2">
            <Button className="rounded-full" size="sm">
              Guardar resultados
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link href="/technician/muestras">Cancelar y volver</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
