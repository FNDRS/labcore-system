import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { connection } from "next/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AnimatedSidebar } from "@/components/animated-sidebar";
import { AnimatedPageContent } from "@/components/animated-page-content";
import { AppHeader } from "@/components/app-header";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { requireAuthWithGroup } from "@/lib/auth-server";
import { getRequiredGroupForPath, GROUP_TO_ROUTE } from "@/lib/auth";
import { cookies } from "next/headers";

const DEV_BYPASS_GROUPS = ["tecnico"] as const;
const OPERATIONAL_PATHS = ["/technician/muestras", "/technician/work-order"] as const;

function isOperationalPath(pathname: string) {
  return OPERATIONAL_PATHS.some((path) => pathname.startsWith(path));
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await connection();

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const hideSidebar = isOperationalPath(pathname);
  const bypassEnv = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS;

  // Logs de depuración (solo en dev)
  if (process.env.NODE_ENV === "development") {
    console.log("[protected layout]", {
      pathname,
      NEXT_PUBLIC_DEV_AUTH_BYPASS: bypassEnv,
      bypassActive: bypassEnv === "true",
    });
  }

  // Bypass: no llamar a Amplify (evita fallos si amplify_outputs no está listo)
  if (bypassEnv === "true") {
    const requiredGroup = getRequiredGroupForPath(pathname);
    if (requiredGroup && !DEV_BYPASS_GROUPS.includes(requiredGroup)) {
      console.log("[protected layout] REDIRECT → /login (bypass activo pero rol no permitido)", {
        requiredGroup,
      });
      redirect("/login");
    }
    if (process.env.NODE_ENV === "development") {
      console.log("[protected layout] BYPASS OK → renderizando dashboard");
    }
  } else {
    try {
      const { groups } = await runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: (ctx) => requireAuthWithGroup(ctx),
      });

      const requiredGroup = getRequiredGroupForPath(pathname);
      if (requiredGroup && !groups.includes(requiredGroup)) {
        const fallbackRoute = groups[0] ? GROUP_TO_ROUTE[groups[0]] : "/login";
        console.log("[protected layout] REDIRECT → fallback (sin permiso)", {
          requiredGroup,
          fallbackRoute,
        });
        redirect(fallbackRoute);
      }
    } catch (err) {
      console.log("[protected layout] REDIRECT → /login (catch)", err);
      redirect("/login");
    }
  }

  if (hideSidebar) {
    return (
      <div className="fixed inset-0 flex overflow-hidden bg-zinc-50 text-zinc-900">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader showSidebarTrigger={false} />
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
            <div className="w-full space-y-6">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-zinc-50">
      <SidebarProvider
        defaultOpen
        style={
          {
            "--sidebar-width": "12rem",
            "--sidebar-width-icon": "4rem",
          } as React.CSSProperties
        }
        className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-zinc-50 p-0 **:data-[slot=sidebar-inner]:bg-white!"
      >
        <AnimatedSidebar />
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none bg-zinc-50 text-zinc-900 md:ml-(--sidebar-width) md:peer-data-[state=collapsed]:ml-(--sidebar-width-icon) pr-0">
          <AppHeader />
          <AnimatedPageContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none bg-zinc-50">
            <main className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="w-full space-y-6">{children}</div>
            </main>
          </AnimatedPageContent>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
