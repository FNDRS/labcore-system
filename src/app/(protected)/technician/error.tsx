"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TechnicianError({
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
              Error al cargar el panel de técnico
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {error.message || "No se pudo cargar la información del dashboard."}
            </p>
            <Button
              variant="outline"
              className="rounded-full border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
              onClick={reset}
            >
              Reintentar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
