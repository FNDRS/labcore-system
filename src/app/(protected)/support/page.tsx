import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, Shield } from "lucide-react";

export const metadata = {
  title: "Soporte",
  description: "Centro de soporte y contacto de LabCore LIS.",
};

const SUPPORT_EMAIL = "marlon.castro@thefndrs.com";

export default function SupportPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Soporte
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Consulte ayuda, documentación o contacte al equipo.
          </p>
        </div>

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="size-5 text-zinc-600" />
              Centro de ayuda
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Envíe su consulta o mensaje y se abrirá su cliente de correo.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="rounded-full" asChild>
              <Link href="/centro-de-ayuda">
                Ir al centro de ayuda
              </Link>
            </Button>
            <p className="text-muted-foreground text-xs">
              O escriba directamente a{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Consulta%20LabCore%20LIS`}
                className="font-medium text-zinc-700 underline hover:no-underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="size-5 text-zinc-600" />
              Contacto
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Para soporte técnico o consultas sobre LabCore LIS.
            </p>
          </CardHeader>
          <CardContent>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900"
            >
              <Mail className="size-4" />
              {SUPPORT_EMAIL}
            </a>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="size-5 text-zinc-600" />
              Recursos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link
              href="/privacidad"
              className="block text-zinc-600 hover:text-zinc-900"
            >
              Política de privacidad
            </Link>
            <Link
              href="/terminos"
              className="block text-zinc-600 hover:text-zinc-900"
            >
              Términos de uso
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
