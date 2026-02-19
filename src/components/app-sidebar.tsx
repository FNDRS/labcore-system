"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchUserAttributes, getCurrentUser, signOut } from "aws-amplify/auth";
import { HomeSidebarIcon } from "@/components/icons/home-sidebar-icon";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
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
  const { state, toggleSidebar } = useSidebar();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    getCurrentUser()
      .then(() => fetchUserAttributes())
      .then((attrs) => {
        setUserEmail(attrs.email ?? null);
        setUserName(attrs.name ?? attrs.given_name ?? null);
      })
      .catch(() => {
        setUserEmail(null);
        setUserName(null);
      });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="icon"
      style={
        {
          "--sidebar-width": "12rem",
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties
      }
      className="overflow-hidden border-r-0! bg-[#161616] text-zinc-50"
    >
      <SidebarHeader className="bg-[#161616] px-2 py-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleSidebar()}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
            aria-label={isCollapsed ? "Expandir barra" : "Contraer barra"}
          >
            {isCollapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <ChevronsLeft className="size-4" />
            )}
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
            <Image
              src="/images/logo-black.png"
              alt="LabCore"
              width={20}
              height={20}
              className="shrink-0 invert"
              priority
            />
            <span className="truncate text-base font-bold tracking-tight">LabCore</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-[#161616] pl-0 pr-2 pt-8">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-4">
              {navItems.map((item) => {
                const isActive = item.activeWhen(pathname);
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
                          <Icon className="h-4 w-4" active={isActive} strokeWidth={2} />
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

      <SidebarFooter className="border-t border-white/5 bg-[#161616] px-2 py-2">
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
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-white hover:bg-white/10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2"
                aria-label="Cuenta de usuario"
              >
                <Avatar className="size-7 shrink-0 ring-2 ring-white/20">
                  <AvatarImage src="" alt="" />
                  <AvatarFallback className="bg-zinc-600 text-sm font-medium text-white">
                    {userName?.slice(0, 2).toUpperCase() ||
                      userEmail?.slice(0, 2).toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-[13px] font-medium text-white">
                    {userName ?? "Marlon Castro "}
                  </p>
                  <p className="truncate text-xs text-zinc-300">
                    {userEmail ?? "marlon.castro@thefndrs.com"}
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
                href="/technician/settings"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Pencil className="size-4 shrink-0 text-zinc-400" />
                Editar perfil
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                onClick={handleSignOut}
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
