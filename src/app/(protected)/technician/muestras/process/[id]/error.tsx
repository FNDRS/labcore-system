"use client";

/**
 * Error boundary for process workspace.
 * @see docs/integration/phase-3.md Phase 3d.4
 */

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ProcessSampleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6">
      <Card className="max-w-md border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-4">
          <AlertCircle className="size-8 shrink-0 text-amber-600 dark:text-amber-500" />
          <div className="space-y-3">
            <h2 className="font-semibold text-amber-900 dark:text-amber-100">
              Error en el proceso de muestra
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {error.message || "No se pudo cargar el formulario de resultados."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-full border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
                onClick={reset}
              >
                Reintentar
              </Button>
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/technician/muestras">Volver a cola</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
