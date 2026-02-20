"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/auth-context";

function getSettingsHref(pathname: string, groups: string[]) {
  if (pathname.startsWith("/doctor")) return "/doctor/settings";
  if (pathname.startsWith("/supervisor")) return "/supervisor/settings";
  if (pathname.startsWith("/admin")) return "/admin/settings";
  if (pathname.startsWith("/technician")) return "/technician/settings";
  const role = groups[0];
  if (role === "tecnico") return "/technician/settings";
  if (role === "supervisor") return "/supervisor/settings";
  if (role === "admin") return "/admin/settings";
  if (role === "doctor") return "/doctor/settings";
  return null;
}

/** Título del header según la ruta actual (evita dos headers cuando se navega por URL, ej. bypass a /doctor). */
function getHeaderTitle(pathname: string) {
  if (pathname.startsWith("/doctor")) return { title: "Panel clínico", subtitle: "Resultados y decisiones médicas." };
  if (pathname.startsWith("/supervisor")) return { title: "Supervisor", subtitle: "Validación y supervisión." };
  if (pathname.startsWith("/admin")) return { title: "Administración", subtitle: "Configuración del sistema." };
  if (pathname.startsWith("/technician")) return { title: "Panel Técnico", subtitle: "Resumen operativo y cola de procesamiento." };
  return { title: "LabCore", subtitle: "" };
}

export function AppHeader() {
  const pathname = usePathname();
  const { state: authState, actions } = useAuth();
  const settingsHref = getSettingsHref(pathname ?? "", authState.groups);
  const { title, subtitle } = getHeaderTitle(pathname ?? "");

  return (
    <header className="sticky top-0 py-2 z-20 border-b border-zinc-200 bg-white">
      <div className="flex h-12 w-full items-center gap-2 px-4">
        <div className="min-w-0 space-y-0.5">
          <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900">
            {title}
          </h1>
          <p className="truncate text-xs text-zinc-500">
            {subtitle}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Notificaciones"
                className="size-9 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
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
              className="size-9 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
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
                className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10"
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
