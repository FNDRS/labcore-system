import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Términos de uso",
  description: "Términos y condiciones de uso de LabCore LIS.",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/login" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
            LabCore LIS
          </Link>
          <Button variant="outline" size="sm" className="rounded-full" asChild>
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-xl">Términos de uso</CardTitle>
            <p className="text-muted-foreground text-sm">
              Última actualización: {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-zinc-700">
            <section>
              <h2 className="mb-2 font-semibold text-zinc-900">1. Aceptación</h2>
              <p>
                El acceso y uso de LabCore LIS («el Servicio») implica la aceptación de estos términos de uso.
                Si no está de acuerdo, no utilice el Servicio. El Servicio se ofrece como software como servicio (SaaS)
                para la gestión de información de laboratorio.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-zinc-900">2. Uso del Servicio</h2>
              <p>
                El usuario se compromete a utilizar el Servicio de forma lícita, conforme a la normativa aplicable
                y a las instrucciones proporcionadas. Es responsable de la confidencialidad de sus credenciales
                y de toda la actividad que se realice bajo su cuenta. El uso del Servicio para fines no autorizados
                o que puedan afectar a terceros o al correcto funcionamiento del sistema queda prohibido.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-zinc-900">3. Datos y privacidad</h2>
              <p>
                El tratamiento de datos personales y de salud se rige por nuestra{" "}
                <Link href="/privacidad" className="text-zinc-900 underline hover:no-underline">
                  Política de privacidad
                </Link>
                . El cliente que contrata el Servicio es responsable del cumplimiento de la normativa de protección
                de datos en relación con los datos que introduce en el sistema.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-zinc-900">4. Disponibilidad y modificaciones</h2>
              <p>
                Nos esforzamos por mantener el Servicio disponible, pero no garantizamos una disponibilidad
                ininterrumpida. Nos reservamos el derecho de modificar, suspender o interrumpir funciones
                del Servicio, previo aviso cuando sea razonable. Los términos de uso pueden actualizarse;
                el uso continuado del Servicio tras la publicación de cambios implica la aceptación de los mismos.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-zinc-900">5. Contacto</h2>
              <p>
                Para consultas sobre estos términos o sobre el Servicio puede contactar a{" "}
                <a href="mailto:marlon.castro@thefndrs.com" className="text-zinc-900 underline hover:no-underline">
                  marlon.castro@thefndrs.com
                </a>.
              </p>
            </section>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/login" className="hover:text-zinc-700 underline">
            Volver al inicio de sesión
          </Link>
          {" · "}
          <Link href="/privacidad" className="hover:text-zinc-700 underline">
            Política de privacidad
          </Link>
        </p>
      </main>
    </div>
  );
}
