import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DoctorResultadosPage() {
  return (
    <div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <p className="text-muted-foreground text-sm">
              Valores, rangos normales, indicador visual (🟢 normal, 🟡 atención, 🟥 crítico),
              interpretación, descargar PDF.
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Próximamente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
