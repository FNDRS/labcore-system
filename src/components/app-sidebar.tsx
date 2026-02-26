"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeSidebarIcon } from "@/components/icons/home-sidebar-icon";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ClipboardCheck,
  FileCheck,
  FileText,
  FlaskConical,
  History,
  PanelRight,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{
    className?: string;
    active?: boolean;
    strokeWidth?: number;
  }>;
  activeWhen: (pathname: string) => boolean;
  /** Group required to see this item */
  group: "tecnico" | "supervisor" | "admin" | "doctor" | "recepcion";
};

/**
 * Sidebar técnico: minimalista (ver docs/navegacion-por-roles.md).
 * Órdenes y Resultados son módulos administrativos/clínicos; el técnico solo ve Dashboard + Muestras.
 */
const tecnicoNavItems: NavItem[] = [
  {
    href: "/technician",
    label: "Dashboard",
    icon: HomeSidebarIcon,
    activeWhen: (p) => p === "/technician",
    group: "tecnico",
  },
  {
    href: "/technician/muestras",
    label: "Muestras",
    icon: FlaskConical,
    activeWhen: (p) => p.startsWith("/technician/muestras"),
    group: "tecnico",
  },
  {
    href: "/technician/settings",
    label: "Configuración",
    icon: Settings,
    activeWhen: (p) => p.startsWith("/technician/settings"),
    group: "tecnico",
  },
];

/** Supervisor: validación, muestras, resultados, incidencias, analítica, auditoría (ver navegacion-por-roles). */
const supervisorNavItems: NavItem[] = [
  { href: "/supervisor", label: "Dashboard", icon: HomeSidebarIcon, activeWhen: (p) => p === "/supervisor", group: "supervisor" },
  { href: "/supervisor/validaciones", label: "Validaciones", icon: FileCheck, activeWhen: (p) => p.startsWith("/supervisor/validaciones"), group: "supervisor" },
  { href: "/supervisor/muestras", label: "Muestras", icon: FlaskConical, activeWhen: (p) => p.startsWith("/supervisor/muestras"), group: "supervisor" },
  { href: "/supervisor/resultados", label: "Resultados", icon: ClipboardCheck, activeWhen: (p) => p.startsWith("/supervisor/resultados"), group: "supervisor" },
  { href: "/supervisor/incidencias", label: "Incidencias", icon: AlertTriangle, activeWhen: (p) => p.startsWith("/supervisor/incidencias"), group: "supervisor" },
  { href: "/supervisor/analitica", label: "Analítica", icon: BarChart3, activeWhen: (p) => p.startsWith("/supervisor/analitica"), group: "supervisor" },
  { href: "/supervisor/auditoria", label: "Auditoría", icon: History, activeWhen: (p) => p.startsWith("/supervisor/auditoria"), group: "supervisor" },
  { href: "/supervisor/settings", label: "Configuración", icon: Settings, activeWhen: (p) => p.startsWith("/supervisor/settings"), group: "supervisor" },
];

/** Recepción: órdenes, generación de muestras. */
const recepcionNavItems: NavItem[] = [
  { href: "/recepcion", label: "Recepción", icon: FileText, activeWhen: (p) => p.startsWith("/recepcion"), group: "recepcion" },
];

/** Admin: solo dashboard por ahora. */
const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: HomeSidebarIcon, activeWhen: (p) => p === "/admin" || p.startsWith("/admin/"), group: "admin" },
];

/** Vista doctor: clínica, solo resultados y pacientes (ver navegacion-por-roles). */
const doctorNavItems: NavItem[] = [
  { href: "/doctor", label: "Dashboard", icon: HomeSidebarIcon, activeWhen: (p) => p === "/doctor", group: "doctor" },
  { href: "/doctor/pacientes", label: "Pacientes", icon: Users, activeWhen: (p) => p.startsWith("/doctor/pacientes"), group: "doctor" },
  { href: "/doctor/resultados", label: "Resultados", icon: FileText, activeWhen: (p) => p.startsWith("/doctor/resultados"), group: "doctor" },
  { href: "/doctor/notificaciones", label: "Notificaciones", icon: Bell, activeWhen: (p) => p.startsWith("/doctor/notificaciones"), group: "doctor" },
  { href: "/doctor/settings", label: "Configuración", icon: Settings, activeWhen: (p) => p.startsWith("/doctor/settings"), group: "doctor" },
];

/** Sidebar dinámico: según la ruta actual se muestra el menú del rol correspondiente. */
function getNavItems(pathname: string, groups: string[]): NavItem[] {
  if (pathname.startsWith("/doctor")) return doctorNavItems;
  if (pathname.startsWith("/technician")) return tecnicoNavItems;
  if (pathname.startsWith("/supervisor")) return supervisorNavItems;
  if (pathname.startsWith("/admin")) return adminNavItems;
  if (pathname.startsWith("/recepcion")) return recepcionNavItems;
  if (groups.includes("doctor") && !groups.includes("supervisor") && !groups.includes("admin")) return doctorNavItems;
  if (groups.includes("tecnico") && !groups.includes("supervisor") && !groups.includes("admin") && !groups.includes("doctor")) return tecnicoNavItems;
  if (groups.includes("recepcion") && !groups.includes("tecnico") && !groups.includes("supervisor") && !groups.includes("admin") && !groups.includes("doctor")) return recepcionNavItems;
  return [...recepcionNavItems, ...tecnicoNavItems, ...supervisorNavItems, ...adminNavItems].filter((item) => groups.includes(item.group));
}

/** Barra de navegación horizontal debajo del header (mismos enlaces que el sidebar). */
export function AppNavBar() {
  const pathname = usePathname();
  const { state: authState } = useAuth();
  const navItems = getNavItems(pathname ?? "", authState.groups);

  return (
    <nav
      className="shrink-0 border-b border-zinc-200 bg-white"
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="flex items-center gap-1 px-4 py-2 md:px-6">
        {navItems.map((item) => {
          const isActive = item.activeWhen(pathname ?? "");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 hover:text-zinc-900 ${
                isActive
                  ? "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 hover:text-white"
                  : "text-zinc-700"
              }`}
            >
              {Icon === HomeSidebarIcon ? (
                <Icon className="size-4 shrink-0" active={isActive} strokeWidth={2} />
              ) : (
                <Icon className="size-4 shrink-0" strokeWidth={2} />
              )}
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/support"
          className="ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Shield className="size-4 shrink-0" strokeWidth={1.75} />
          Soporte
        </Link>
      </div>
    </nav>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state: authState } = useAuth();
  const { state, toggleSidebar } = useSidebar();

  const navItems = getNavItems(pathname ?? "", authState.groups);

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="icon"
      style={
        {
          "--sidebar-width": "12rem",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
      className="overflow-hidden border-r border-zinc-200 bg-white text-zinc-900"
    >
      <SidebarHeader className="rounded-md px-2 py-1.5 ml-2 mr-0 mt-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:mr-2">
        <div className="flex w-full items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <button
            type="button"
            onClick={() => toggleSidebar()}
            className="flex min-w-0 size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-900 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:min-w-0 group-data-[collapsible=icon]:rounded"
            aria-label={isCollapsed ? "Expandir barra" : "LabCore"}
          >
            <Image
              src="/images/logo-white.png"
              alt="LabCore"
              width={24}
              height={24}
              className="size-full max-w-[24px] max-h-[24px] object-contain p-0.5 group-data-[collapsible=icon]:p-0.5"
              priority
              sizes="(max-width: 24px) 18px, 24px"
            />
          </button>
          <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold leading-tight text-zinc-900">LabCore</p>
            <p className="truncate text-xs leading-tight text-zinc-500">LIS</p>
          </div>
          <button
            type="button"
            onClick={() => toggleSidebar()}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 group-data-[collapsible=icon]:hidden"
            aria-label="Contraer barra"
          >
            <PanelRight className="size-4 rotate-180" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white pl-0 pr-2 pt-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-4 mt-4">
              {navItems.map((item) => {
                const isActive = item.activeWhen(pathname);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className="group h-10 justify-start rounded-r-full rounded-l-none pr-3 text-[13px] text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 data-[active=true]:bg-zinc-900 data-[active=true]:text-white data-[active=true]:shadow-sm pl-4 group-data-[collapsible=icon]:w-12! group-data-[collapsible=icon]:justify-start!"
                    >
                      <Link href={item.href}>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-zinc-500 group-data-[active=true]:text-white">
                          {Icon === HomeSidebarIcon ? (
                            <Icon className="h-4 w-4" active={isActive} strokeWidth={2} />
                          ) : (
                            <Icon className="h-4 w-4" strokeWidth={2} />
                          )}
                        </span>
                        <span className="truncate text-md font-medium group-data-[collapsible=icon]:hidden">
                          {item.label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-zinc-200 bg-white pr-2 py-2 pl-0">
        <SidebarMenu className="flex flex-col gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Soporte"
              className="group h-10 justify-start rounded-r-full rounded-l-none pl-4 pr-3 text-[13px] text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 group-data-[collapsible=icon]:w-12! group-data-[collapsible=icon]:justify-start! group-data-[collapsible=icon]:rounded-r-full group-data-[collapsible=icon]:pl-2"
            >
              <Link href="/support">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center text-zinc-500">
                  <Shield className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="truncate text-md font-medium group-data-[collapsible=icon]:hidden">
                  Soporte
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
