import { cache } from "react";
import { AnimatedPageContent } from "@/components/animated-page-content";
import { AnimatedSidebar } from "@/components/animated-sidebar";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getRequiredGroupForPath, GROUP_TO_ROUTE } from "@/lib/auth";
import { requireAuthWithGroup } from "@/lib/auth-server";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

/** Per-request deduplication for auth check (server-cache-react). */
const getAuthForLayout = cache(async () => {
  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (ctx) => requireAuthWithGroup(ctx),
  });
});

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await connection();

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  const requiredGroup = getRequiredGroupForPath(pathname);
  const hasPathRequirement = requiredGroup !== null;

  try {
    const { groups } = await getAuthForLayout();

    if (hasPathRequirement && !groups.includes(requiredGroup!)) {
      redirect(groups[0] ? GROUP_TO_ROUTE[groups[0]] : "/login");
    }
  } catch {
    redirect("/login");
  }

  const isRecepcion = pathname.startsWith("/recepcion");

  if (isRecepcion) {
    return (
      <div className="fixed inset-0 flex w-full min-w-0 flex-col overflow-hidden bg-zinc-50">
        <AppHeader />
        <AnimatedPageContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto rounded-none bg-zinc-50 w-full max-w-full">
          <main className="min-w-0 shrink-0 p-4">
            <div className="w-full min-w-0 space-y-6">{children}</div>
          </main>
          <AppFooter />
        </AnimatedPageContent>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex min-w-0 overflow-hidden bg-zinc-50">
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
        <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none bg-zinc-50 text-zinc-900 w-full md:ml-(--sidebar-width) md:peer-data-[state=collapsed]:ml-(--sidebar-width-icon) pr-0">
          <AppHeader />
          <AnimatedPageContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto rounded-none bg-zinc-50 w-full">
            <main className="min-h-0 min-w-0 flex-1 p-4">
              <div className="w-full min-w-0 space-y-6">{children}</div>
            </main>
            <AppFooter />
          </AnimatedPageContent>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
