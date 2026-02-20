"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeSidebarIcon } from "@/components/icons/home-sidebar-icon";
import { FlaskConical, PanelRight, Shield } from "lucide-react";
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
import { useAuth } from "@/contexts/auth-context";
import { CLINIC_BRANDING, initialsFromName } from "@/lib/branding";

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
];

/** Items para supervisor y admin (incluye reportes, configuración, etc.). */
const supervisorAdminNavItems: NavItem[] = [
  {
    href: "/supervisor",
    label: "Dashboard",
    icon: HomeSidebarIcon,
    activeWhen: (p) => p === "/supervisor" || p.startsWith("/supervisor/"),
    group: "supervisor",
  },
  {
    href: "/admin",
    label: "Dashboard",
    icon: HomeSidebarIcon,
    activeWhen: (p) => p === "/admin" || p.startsWith("/admin/"),
    group: "admin",
  },
];

function getNavItems(groups: string[]): NavItem[] {
  if (groups.includes("tecnico") && !groups.includes("supervisor") && !groups.includes("admin")) {
    return tecnicoNavItems;
  }
  return [...tecnicoNavItems, ...supervisorAdminNavItems].filter((item) =>
    groups.includes(item.group)
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state: authState } = useAuth();
  const { state, toggleSidebar } = useSidebar();

  const navItems = getNavItems(authState.groups);

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
        <div className="w-full space-y-1.5 group-data-[collapsible=icon]:space-y-0">
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

          <div className="mr-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 group-data-[collapsible=icon]:hidden">
            <Avatar className="size-8 shrink-0 ring-1 ring-zinc-900/10">
              {CLINIC_BRANDING.logoUrl ? (
                <AvatarImage src={CLINIC_BRANDING.logoUrl} alt={CLINIC_BRANDING.name} />
              ) : null}
              <AvatarFallback className="bg-zinc-100 text-xs font-semibold text-zinc-700">
                {initialsFromName(CLINIC_BRANDING.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">{CLINIC_BRANDING.name}</p>
              <p className="truncate text-xs text-zinc-500">{authState.groups[0] ?? "Usuario"}</p>
            </div>
          </div>
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
