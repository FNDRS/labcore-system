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

type AppFooterProps = {
  variant?: "default" | "dashboard";
};

export function AppFooter({ variant = "default" }: AppFooterProps) {
  if (variant === "dashboard") {
    return (
      <footer
        className="mt-6 min-w-0 w-full shrink-0 border-t border-zinc-200 bg-white"
        role="contentinfo"
      >
        <div className="mx-auto flex min-w-0 max-w-6xl flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-zinc-500 sm:flex-row sm:px-6">
          <p className="min-w-0 shrink-0">© {CURRENT_YEAR} LabCore LIS</p>
          <p className="flex min-w-0 shrink-0 items-center gap-1.5">
            <Shield className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
            Datos seguros · v1.0
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className="mt-10 min-w-0 w-full shrink-0 border-t border-zinc-200 bg-white"
      role="contentinfo"
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid min-w-0 grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr]">
          {/* Marca */}
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-zinc-900">LabCore LIS</p>
            <p className="mt-1 text-xs text-zinc-500">Sistema de trazabilidad</p>
          </div>

          {/* Soporte */}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Soporte</p>
            <ul className="mt-2 space-y-1">
              {footerLinks.soporte.map((item) => {
                const Icon = item.icon;
                const isInternal = item.href.startsWith("/");
                return (
                  <li key={item.label}>
                    {isInternal ? (
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
                      >
                        <Icon className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="inline-flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icon className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
                        {item.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Legal */}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Legal</p>
            <ul className="mt-2 space-y-1">
              {footerLinks.legal.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
                    >
                      <Icon className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Línea inferior: copyright + versión */}
        <div className="mt-6 flex min-w-0 flex-col gap-2 border-t border-zinc-200 pt-6 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="min-w-0 shrink-0 text-xs text-zinc-500">
            © {CURRENT_YEAR} LabCore LIS. Todos los derechos reservados.
          </p>
          <p className="flex min-w-0 shrink-0 items-center gap-1.5 text-xs text-zinc-500">
            <Shield className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
            Datos seguros · LabCore LIS v1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
