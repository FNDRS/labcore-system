import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-zinc-950">
      <SidebarProvider
        defaultOpen
        className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#161616] p-4 pl-0"
      >
        <AppSidebar />
        <SidebarInset className="ml-2 flex min-h-0 flex-1 flex-col overflow-auto rounded-3xl rounded-l-2xl bg-zinc-100 text-zinc-900 shadow-lg shadow-zinc-900/10">
          <div className="min-h-full flex-1 bg-zinc-100">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
