"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HomeSidebarIcon } from "@/components/icons/home-sidebar-icon";
import {
  ChevronDown,
  ChevronsLeft,
  ClipboardList,
  FileEdit,
  FlaskConical,
  LogOut,
  Pencil,
  Settings,
  Shield,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  /** Group required to see this item (tecnico, supervisor, admin) */
  group: "tecnico" | "supervisor" | "admin";
};

/** Sidebar operativo para técnico: solo flujo de trabajo (sin administración). */
const tecnicoNavItems: NavItem[] = [
  { href: "/technician", label: "Dashboard", icon: HomeSidebarIcon, activeWhen: (p) => p === "/technician", group: "tecnico" },
  { href: "/technician/muestras", label: "Muestras", icon: FlaskConical, activeWhen: (p) => p.startsWith("/technician/muestras"), group: "tecnico" },
  { href: "/technician/ordenes", label: "Órdenes", icon: ClipboardList, activeWhen: (p) => p.startsWith("/technician/ordenes"), group: "tecnico" },
  { href: "/technician/resultados", label: "Resultados", icon: FileEdit, activeWhen: (p) => p.startsWith("/technician/resultados"), group: "tecnico" },
];

/** Items para supervisor y admin (incluye reportes, configuración, etc.). */
const supervisorAdminNavItems: NavItem[] = [
  { href: "/supervisor", label: "Dashboard", icon: HomeSidebarIcon, activeWhen: (p) => p === "/supervisor" || p.startsWith("/supervisor/"), group: "supervisor" },
  { href: "/admin", label: "Dashboard", icon: HomeSidebarIcon, activeWhen: (p) => p === "/admin" || p.startsWith("/admin/"), group: "admin" },
];

function getNavItems(groups: string[]): NavItem[] {
  if (groups.includes("tecnico") && !groups.includes("supervisor") && !groups.includes("admin")) {
    return tecnicoNavItems;
  }
  return [...tecnicoNavItems, ...supervisorAdminNavItems].filter((item) => groups.includes(item.group));
}

/** Técnico no ve Configuración; supervisor/admin sí. */
function getSettingsHref(groups: string[]): string | null {
  if (groups.includes("supervisor")) return "/supervisor";
  if (groups.includes("admin")) return "/admin";
  return null;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state: authState, actions } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);

  const navItems = getNavItems(authState.groups);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      className="overflow-hidden border-r-0! bg-sidebar-dark text-zinc-50"
    >
      <SidebarHeader className=" rounded-md px-2 py-2 ml-2 mr-0 mt-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:mr-2">
        <div className="flex w-full items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <button
            type="button"
            onClick={() => toggleSidebar()}
            className="flex min-w-0 size-9 shrink-0 items-center justify-center overflow-hidden rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/20 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:min-w-0 group-data-[collapsible=icon]:rounded"
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
            <p className="truncate text-sm font-semibold leading-tight text-white">LabCore</p>
            <p className="truncate text-xs leading-tight text-zinc-400">Company</p>
          </div>
          <button
            type="button"
            onClick={() => toggleSidebar()}
            className="flex size-7 mt-2 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:hidden"
            aria-label="Contraer barra"
          >
            <ChevronsLeft className="size-4" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar-dark pl-0 pr-2 pt-8">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-4">
              {navItems.map((item) => {
                const isActive = mounted ? item.activeWhen(pathname) : false;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className="group h-10 justify-start rounded-r-full rounded-l-none pr-3 text-[13px] text-zinc-200 hover:bg-white/10 hover:text-white data-[active=true]:bg-white data-[active=true]:text-zinc-950 data-[active=true]:shadow-sm pl-4 group-data-[collapsible=icon]:!w-12 group-data-[collapsible=icon]:!justify-start"
                    >
                      <Link href={item.href}>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-white group-data-[active=true]:text-zinc-950">
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

      <SidebarFooter className="border-t border-white/5 bg-sidebar-dark pr-2 py-2 pl-0">
        <SidebarMenu className="flex flex-col gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Soporte"
              className="group h-10 justify-start rounded-r-full rounded-l-none pl-4 pr-3 text-[13px] text-zinc-200 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:!w-12 group-data-[collapsible=icon]:!justify-start group-data-[collapsible=icon]:rounded-r-full group-data-[collapsible=icon]:pl-2"
            >
              <Link href="/support">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center text-white">
                  <Shield className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <span className="truncate text-md font-medium group-data-[collapsible=icon]:hidden">Soporte</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-white hover:bg-white/10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5 ml-2 pr-4 mr-2"
                aria-label="Cuenta de usuario"
              >
                <Avatar className="size-6 shrink-0 ring-1 ring-white/20">
                  <AvatarImage src="" alt="" />
                  <AvatarFallback className="bg-zinc-600 text-xs font-medium text-white">
                    {authState.userName?.slice(0, 2).toUpperCase() ||
                      authState.userEmail?.slice(0, 2).toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium group-data-[collapsible=icon]:hidden">
                  {authState.userName ?? "Usuario"}
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-zinc-400 group-data-[collapsible=icon]:hidden" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="right"
              className="w-56 border-zinc-800 bg-zinc-950 p-0 shadow-xl shadow-black/40"
            >
              <div className="border-b border-white/5 px-3 py-2">
                <p className="truncate text-sm font-medium text-white">
                  {authState.userName ?? "Usuario"}
                </p>
                <p className="truncate text-xs text-zinc-400">{authState.userEmail ?? ""}</p>
              </div>
              <div className="py-1">
                {getSettingsHref(authState.groups) && (
                  <Link
                    href={getSettingsHref(authState.groups)!}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Pencil className="size-4 shrink-0 text-zinc-400" />
                    Editar perfil
                  </Link>
                )}
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                  onClick={() => actions.signOut()}
                >
                  <LogOut className="size-4 shrink-0" />
                  Cerrar sesión
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
