import Link from "next/link";
import { HelpCircle, Mail, Shield, Scale } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
const SUPPORT_EMAIL = "marlon.castro@thefndrs.com";
const CONTACT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Contacto - LabCore LIS`;

const footerLinks = {
  soporte: [
    { label: "Centro de ayuda", href: "/centro-de-ayuda", icon: HelpCircle },
    { label: "Contacto", href: CONTACT_MAILTO, icon: Mail },
  ],
  legal: [
    { label: "Privacidad", href: "/privacidad", icon: Shield },
    { label: "Términos de uso", href: "/terminos", icon: Scale },
  ],
};

export function AppFooter() {
  return (
    <footer
      className="min-w-0 w-full shrink-0 border-t-2 border-zinc-100 bg-white"
      role="contentinfo"
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid grid-cols-1 min-w-0 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
          {/* Marca */}
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-sm font-semibold tracking-tight text-zinc-900">LabCore LIS</p>
            <p className="mt-2 text-xs text-zinc-500">Sistema de trazabilidad</p>
          </div>

          {/* Soporte */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Soporte</p>
            <ul className="mt-3 space-y-2">
              {footerLinks.soporte.map((item) => {
                const Icon = item.icon;
                const isInternal = item.href.startsWith("/");
                return (
                  <li key={item.label}>
                    {isInternal ? (
                      <Link
                        href={item.href}
                        className="flex min-h-11 min-w-0 items-center gap-2 py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 sm:min-h-0 sm:py-0"
                      >
                        <Icon className="size-3.5 text-zinc-400" aria-hidden />
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="flex min-h-11 min-w-0 items-center gap-2 py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 sm:min-h-0 sm:py-0"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icon className="size-3.5 text-zinc-400" aria-hidden />
                        {item.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Legal / Enlaces */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Legal</p>
            <ul className="mt-3 space-y-2">
              {footerLinks.legal.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex min-h-11 min-w-0 items-center gap-2 py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 sm:min-h-0 sm:py-0"
                    >
                      <Icon className="size-3.5 text-zinc-400" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="mt-6 flex min-w-0 flex-col gap-3 border-t border-zinc-200 pt-6 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <p className="min-w-0 break-words text-xs text-zinc-500">
            © {CURRENT_YEAR} LabCore LIS. Todos los derechos reservados.
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs text-zinc-500 sm:gap-4">
            <span className="flex items-center gap-1.5">
              <Shield className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
              Datos seguros
            </span>
            <span className="shrink-0">LabCore LIS v1.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
