"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeSidebarIcon } from "@/components/icons/home-sidebar-icon";
import {
  BarChart3,
  ClipboardList,
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
} from "@/components/ui/sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{
    className?: string;
    active?: boolean;
    strokeWidth?: number;
  }>;
  activeWhen: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/technician",
    label: "Dashboard",
    icon: HomeSidebarIcon,
    activeWhen: (pathname) => pathname === "/technician",
  },
  {
    href: "/technician/requests",
    label: "Solicitudes",
    icon: ClipboardList,
    activeWhen: (pathname) => pathname.startsWith("/technician/requests"),
  },
  {
    href: "/technician/equipment",
    label: "Equipos",
    icon: Wrench,
    activeWhen: (pathname) => pathname.startsWith("/technician/equipment"),
  },
  {
    href: "/technician/personnel",
    label: "Personal",
    icon: Users,
    activeWhen: (pathname) => pathname.startsWith("/technician/personnel"),
  },
  {
    href: "/technician/reports",
    label: "Reportes",
    icon: Stethoscope,
    activeWhen: (pathname) => pathname.startsWith("/technician/reports"),
  },
  {
    href: "/technician/settings",
    label: "Configuración",
    icon: Settings,
    activeWhen: (pathname) => pathname.startsWith("/technician/settings"),
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="none"
      style={{ ["--sidebar-width" as never]: "12rem" } as React.CSSProperties}
      className="overflow-hidden rounded-3xl bg-zinc-950 text-zinc-50 shadow-sm"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 ml-2 mb-6 mt-2">
          <Image
            src="/images/logo-black.png"
            alt="LabCore"
            width={22}
            height={22}
            className="invert"
            priority
          />
          <span className="text-2xl font-bold tracking-tight">LabCore</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="pl-0 pr-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => {
                const isActive = item.activeWhen(pathname);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="group h-11 justify-start rounded-r-full rounded-l-none pl-3 pr-4 text-[13px] text-zinc-300 hover:bg-zinc-900 hover:text-white data-[active=true]:bg-white data-[active=true]:text-zinc-950 data-[active=true]:shadow-sm"
                    >
                      <Link href={item.href}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-white group-data-[active=true]:text-zinc-950">
                          <Icon className="h-4 w-4" active={isActive} strokeWidth={2} />
                        </span>
                        <span className="truncate text-md text-semibold">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-11 justify-start rounded-full bg-zinc-900 px-3 text-[13px] text-zinc-50 hover:bg-zinc-800"
            >
              <Link href="/support">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-white">
                  <Shield className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <span>Soporte</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
