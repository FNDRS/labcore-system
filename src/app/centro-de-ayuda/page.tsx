import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CentroDeAyudaForm } from "./centro-de-ayuda-form";

export const metadata = {
  title: "Centro de ayuda",
  description: "Envíe su consulta o mensaje al equipo de soporte de LabCore LIS.",
};

const SUPPORT_EMAIL = "marlon.castro@thefndrs.com";

export default function CentroDeAyudaPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/login" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
            LabCore LIS
          </Link>
          <Button variant="outline" size="sm" className="rounded-full" asChild>
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-xl">Centro de ayuda</CardTitle>
            <p className="text-muted-foreground text-sm">
              Redacte su mensaje y se abrirá su cliente de correo para enviarlo a soporte.
            </p>
          </CardHeader>
          <CardContent>
            <CentroDeAyudaForm supportEmail={SUPPORT_EMAIL} />
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Si su correo no se abre, envíe su mensaje directamente a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-zinc-700 underline hover:no-underline">
            {SUPPORT_EMAIL}
          </a>
        </p>

        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link href="/login" className="hover:text-zinc-700 underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </main>
    </div>
  );
}
