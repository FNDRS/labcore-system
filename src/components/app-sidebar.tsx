"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HomeSidebarIcon } from "@/components/icons/home-sidebar-icon";
import {
  BarChart3,
  ChevronsLeft,
  ClipboardList,
  LogOut,
  Pencil,
  Settings,
  Shield,
  Stethoscope,
  Users,
  Wrench,
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

const allNavItems: NavItem[] = [
  {
    href: "/technician",
    label: "Dashboard",
    icon: HomeSidebarIcon,
    activeWhen: (pathname) => pathname === "/technician",
    group: "tecnico",
  },
  {
    href: "/technician/requests",
    label: "Solicitudes",
    icon: ClipboardList,
    activeWhen: (pathname) => pathname.startsWith("/technician/requests"),
    group: "tecnico",
  },
  {
    href: "/technician/equipment",
    label: "Equipos",
    icon: Wrench,
    activeWhen: (pathname) => pathname.startsWith("/technician/equipment"),
    group: "tecnico",
  },
  {
    href: "/technician/personnel",
    label: "Personal",
    icon: Users,
    activeWhen: (pathname) => pathname.startsWith("/technician/personnel"),
    group: "tecnico",
  },
  {
    href: "/technician/reports",
    label: "Reportes",
    icon: Stethoscope,
    activeWhen: (pathname) => pathname.startsWith("/technician/reports"),
    group: "tecnico",
  },
  {
    href: "/technician/settings",
    label: "Configuración",
    icon: Settings,
    activeWhen: (pathname) => pathname.startsWith("/technician/settings"),
    group: "tecnico",
  },
  {
    href: "/supervisor",
    label: "Dashboard",
    icon: HomeSidebarIcon,
    activeWhen: (pathname) => pathname === "/supervisor" || pathname.startsWith("/supervisor/"),
    group: "supervisor",
  },
  {
    href: "/admin",
    label: "Dashboard",
    icon: HomeSidebarIcon,
    activeWhen: (pathname) => pathname === "/admin" || pathname.startsWith("/admin/"),
    group: "admin",
  },
];

function getSettingsHref(groups: string[]): string {
  if (groups.includes("tecnico")) return "/technician/settings";
  if (groups.includes("supervisor")) return "/supervisor";
  if (groups.includes("admin")) return "/admin";
  return "/technician/settings";
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state: authState, actions } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);

  const navItems = allNavItems.filter((item) =>
    authState.groups.includes(item.group),
  );

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
      className="overflow-hidden border-r-0! bg-[#161616] text-zinc-50"
    >
      <SidebarHeader className="bg-zinc-800 rounded-md px-2 py-2 ml-2 mr-0 mt-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:mr-2">
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
              width={36}
              height={36}
              className="size-full object-contain p-0.5 group-data-[collapsible=icon]:p-0.5"
              priority
              sizes="(max-width: 48px) 32px, 36px"
            />
          </button>
          <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold leading-tight text-white">LabCore</p>
            <p className="truncate text-xs leading-tight text-zinc-400">Company</p>
          </div>
          <button
            type="button"
            onClick={() => toggleSidebar()}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:hidden"
            aria-label="Contraer barra"
          >
            <ChevronsLeft className="size-4" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-[#161616] pl-0 pr-2 pt-8">
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
                      className="group h-10 justify-start rounded-r-full rounded-l-none pl-2 pr-3 text-[13px] text-zinc-200 hover:bg-white/10 hover:text-white data-[active=true]:bg-white data-[active=true]:text-zinc-950 data-[active=true]:shadow-sm"
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

      <SidebarFooter className="border-t border-white/5 bg-[#161616] pr-2 py-2 pl-0">
        <SidebarMenu className="flex flex-col gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Soporte"
              className="h-10 justify-start rounded-r-full rounded-l-none pl-2 pr-3 text-[13px] text-white hover:bg-white/10 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:px-2 hover:text-white"
            >
              <Link href="/support">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center text-white">
                  <Shield className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <span className="truncate group-data-[collapsible=icon]:hidden">Soporte</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-white hover:bg-white/10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2 ml-2"
                aria-label="Cuenta de usuario"
              >
                <Avatar className="size-7 shrink-0 ring-2 ring-white/20">
                  <AvatarImage src="" alt="" />
                  <AvatarFallback className="bg-zinc-600 text-sm font-medium text-white">
                    {authState.userName?.slice(0, 2).toUpperCase() ||
                      authState.userEmail?.slice(0, 2).toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-[13px] font-medium text-white">
                    {authState.userName ?? "Usuario"}
                  </p>
                  <p className="truncate text-xs text-zinc-300">
                    {authState.userEmail ?? ""}
                  </p>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="right"
              className="w-56 border-zinc-800 bg-zinc-950 p-1.5 shadow-xl shadow-black/40"
            >
              <Link
                href={getSettingsHref(authState.groups)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Pencil className="size-4 shrink-0 text-zinc-400" />
                Editar perfil
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                onClick={() => actions.signOut()}
              >
                <LogOut className="size-4 shrink-0" />
                Cerrar sesión
              </button>
            </PopoverContent>
          </Popover>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
