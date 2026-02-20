import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

export default async function DoctorResultadoDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href="/doctor">← Volver al panel</Link>
        </Button>
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle>Resultado del estudio</CardTitle>
            <p className="text-muted-foreground text-sm">
              Valores · Rangos normales · 🟢 Normal / 🟡 Atención / 🟥 Crítico · Observaciones lab ·
              Descargar PDF
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Vista resultado (id: {id}). Próximamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
