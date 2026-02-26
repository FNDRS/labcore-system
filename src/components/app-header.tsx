"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/auth-context";
import { CLINIC_BRANDING } from "@/lib/branding";

function getSettingsHref(pathname: string, groups: string[]) {
  if (pathname.startsWith("/doctor")) return "/doctor/settings";
  if (pathname.startsWith("/supervisor")) return "/supervisor/settings";
  if (pathname.startsWith("/admin")) return "/admin/settings";
  if (pathname.startsWith("/technician")) return "/technician/settings";
  if (pathname.startsWith("/recepcion")) return null;
  const role = groups[0];
  if (role === "tecnico") return "/technician/settings";
  if (role === "supervisor") return "/supervisor/settings";
  if (role === "admin") return "/admin/settings";
  if (role === "doctor") return "/doctor/settings";
  return null;
}

/** Etiqueta breve de sección para el header (dónde estoy). */
function getSectionLabel(pathname: string): string | null {
  if (pathname.startsWith("/recepcion")) return "Recepción";
  if (pathname.startsWith("/technician")) return "Panel técnico";
  if (pathname.startsWith("/doctor")) return "Panel clínico";
  if (pathname.startsWith("/supervisor")) return "Supervisor";
  if (pathname.startsWith("/admin")) return "Administración";
  return null;
}

export function AppHeader() {
  const pathname = usePathname();
  const { state: authState, actions } = useAuth();
  const settingsHref = getSettingsHref(pathname ?? "", authState.groups);
  const sectionLabel = getSectionLabel(pathname ?? "");

  return (
    <header className="sticky top-0 z-20 w-full border-b border-zinc-200 bg-white py-2">
      <div className="flex min-h-12 w-full items-center gap-2 py-1">
        <div className="flex flex-none items-center gap-2 min-w-0">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-lg font-semibold tracking-tight text-zinc-900">
              {CLINIC_BRANDING.name}
            </span>
            {sectionLabel && (
              <span className="truncate text-xs text-zinc-500" aria-hidden>
                {sectionLabel}
              </span>
            )}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Notificaciones"
                className="min-h-11 min-w-11 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 md:size-9"
              >
                <Bell className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-900">Notificaciones</p>
              </div>
              <p className="px-4 py-5 text-sm text-zinc-600">Sin notificaciones nuevas.</p>
            </PopoverContent>
          </Popover>

          {settingsHref && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Configuración"
              className="min-h-11 min-w-11 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 md:size-9"
            >
              <Link href={settingsHref}>
                <Settings className="size-4" />
              </Link>
            </Button>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10 md:size-9"
                aria-label="Perfil"
              >
                <span className="text-xs font-semibold">
                  {(
                    authState.userName?.slice(0, 2) ||
                    authState.userEmail?.slice(0, 2) ||
                    "U"
                  ).toUpperCase()}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 border border-zinc-200 bg-white p-0">
              <div className="border-b border-zinc-200 px-3 py-2">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {authState.userName ?? "Usuario"}
                </p>
                <p className="truncate text-xs text-zinc-500">{authState.userEmail ?? ""}</p>
              </div>
              <div className="py-1">
                {settingsHref && (
                  <Link
                    href={settingsHref}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <Settings className="size-4 shrink-0 text-zinc-500" />
                    Configuración
                  </Link>
                )}
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600"
                  onClick={() => actions.signOut()}
                >
                  Cerrar sesión
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
