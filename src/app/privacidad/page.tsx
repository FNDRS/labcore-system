import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Política de privacidad",
  description: "Política de privacidad y protección de datos de LabCore LIS.",
};

export default function PrivacidadPage() {
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
            <CardTitle className="text-xl">Política de privacidad</CardTitle>
            <p className="text-muted-foreground text-sm">
              Última actualización: {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-zinc-700">
            <section>
              <h2 className="mb-2 font-semibold text-zinc-900">1. Responsable del tratamiento</h2>
              <p>
                LabCore LIS es un software como servicio (SaaS) de gestión de información de laboratorio.
                El responsable del tratamiento de los datos personales en el marco del servicio es la entidad
                que proporciona el software. Para consultas sobre privacidad puede contactar a{" "}
                <a href="mailto:marlon.castro@thefndrs.com" className="text-zinc-900 underline hover:no-underline">
                  marlon.castro@thefndrs.com
                </a>.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-zinc-900">2. Datos que recogemos</h2>
              <p>
                En el uso del sistema se pueden procesar datos de pacientes, profesionales sanitarios y
                usuarios del laboratorio (identificación, datos clínicos asociados a órdenes y resultados,
                registros de acceso y actividad). Estos datos son introducidos y gestionados por la organización
                cliente (por ejemplo, el laboratorio o clínica) que utiliza LabCore LIS.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-zinc-900">3. Finalidad y base legal</h2>
              <p>
                El tratamiento tiene como finalidad la prestación del servicio de información de laboratorio,
                la gestión de órdenes, muestras y resultados, y el cumplimiento de obligaciones legales y
                normativas aplicables al sector. La base legal puede ser la ejecución del contrato, el
                consentimiento cuando aplique, o el interés legítimo.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-zinc-900">4. Conservación y seguridad</h2>
              <p>
                Los datos se conservan durante el tiempo necesario para la finalidad indicada y según la
                normativa aplicable. Se aplican medidas técnicas y organizativas para garantizar la
                confidencialidad, integridad y disponibilidad de la información.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-semibold text-zinc-900">5. Derechos</h2>
              <p>
                Los interesados pueden ejercer los derechos de acceso, rectificación, supresión, limitación
                del tratamiento, portabilidad y oposición ante el responsable del tratamiento o, en su caso,
                ante la organización cliente que utiliza el sistema. También puede presentar una reclamación
                ante la autoridad de control competente.
              </p>
            </section>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/login" className="hover:text-zinc-700 underline">
            Volver al inicio de sesión
          </Link>
          {" · "}
          <Link href="/terminos" className="hover:text-zinc-700 underline">
            Términos de uso
          </Link>
        </p>
      </main>
    </div>
  );
}
