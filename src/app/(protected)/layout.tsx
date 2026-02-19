import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { connection } from "next/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { requireAuthWithGroup } from "@/lib/auth-server";
import { getRequiredGroupForPath, GROUP_TO_ROUTE } from "@/lib/auth";
import { cookies } from "next/headers";

export default async function ProtectedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await connection();

	const headersList = await headers();
	const pathname = headersList.get("x-pathname") ?? "";

	try {
		const { groups } = await runWithAmplifyServerContext({
			nextServerContext: { cookies },
			operation: (ctx) => requireAuthWithGroup(ctx),
		});

		const requiredGroup = getRequiredGroupForPath(pathname);
		if (requiredGroup && !groups.includes(requiredGroup)) {
			const fallbackRoute = groups[0] ? GROUP_TO_ROUTE[groups[0]] : "/";
			redirect(fallbackRoute);
		}
	} catch {
		redirect("/");
	}

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
				className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#161616] p-4 pl-0 **:data-[slot=sidebar-inner]:bg-[#161616]!"
			>
				<AppSidebar />
				<SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl rounded-l-2xl bg-zinc-100 text-zinc-900 shadow-lg shadow-zinc-900/10 pr-8 md:ml-[calc(var(--sidebar-width)+0.25rem)]! md:peer-data-[state=collapsed]:ml-[calc(var(--sidebar-width-icon)+0.25rem)]!">
					<div className="min-h-full min-w-0 flex-1 overflow-auto rounded-l-2xl bg-zinc-100">
						{children}
					</div>
				</SidebarInset>
			</SidebarProvider>
		</div>
	);
}
