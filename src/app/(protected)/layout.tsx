import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-zinc-950">
      <SidebarProvider
        defaultOpen
        style={
          {
            "--sidebar-width": "12rem",
            "--sidebar-width-icon": "4rem",
          } as React.CSSProperties
        }
        className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#161616] p-4 pl-0 [&_[data-slot=sidebar-inner]]:!bg-[#161616]"
      >
        <AppSidebar />
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl rounded-l-2xl bg-zinc-100 text-zinc-900 shadow-lg shadow-zinc-900/10 pr-8 md:!ml-[calc(var(--sidebar-width)+0.25rem)] md:peer-data-[state=collapsed]:!ml-[calc(var(--sidebar-width-icon)+0.25rem)]">
          <div className="min-h-full min-w-0 flex-1 overflow-auto rounded-l-2xl bg-zinc-100">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
