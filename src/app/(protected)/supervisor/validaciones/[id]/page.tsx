import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ id: string }> };

export default async function SupervisorValidacionDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href="/supervisor">← Volver al panel</Link>
        </Button>
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle>Vista de validación</CardTitle>
            <p className="text-muted-foreground text-sm">
              Info clínica · Valores y rangos · Flags · Trazabilidad (quién, cuándo, estación). Acciones: Aprobar, Rechazar, Marcar incidencia, Solicitar repetición.
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Resultado id: {id}. Próximamente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
