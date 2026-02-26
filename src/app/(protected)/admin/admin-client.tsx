"use client";

import { runSeedAction } from "./actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sprout } from "lucide-react";

export function AdminClient() {
  function handleGenerateSeed() {
    toast.success("Seed enviado", {
      description:
        "La generación de datos se ejecuta en segundo plano. Puede tardar varios minutos.",
    });
    runSeedAction().then((result) => {
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">
        <p>
          Genera datos de prueba (pacientes, órdenes, muestras, exámenes, auditoría) para demos y desarrollo.
          El proceso puede tardar varios minutos. Se ejecuta en segundo plano.
        </p>
      </div>
      <Button
        onClick={handleGenerateSeed}
        variant="outline"
        className="gap-2"
      >
        <Sprout className="size-4" aria-hidden />
        Generar seed
      </Button>
    </div>
  );
}
