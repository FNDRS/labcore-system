"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const router = useRouter();

	return (
		<div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
			<div className="w-full max-w-md">
				<Authenticator>
					{({ signOut, user }) => (
						<div className="flex flex-col gap-6">
							<div className="rounded-lg border border-border bg-card p-6 shadow-sm">
								<h2 className="text-xl font-semibold text-foreground">
									Signed in as {user?.signInDetails?.loginId ?? user?.username}
								</h2>
								<p className="mt-2 text-sm text-muted-foreground">
									You are authenticated. Navigate to the app or sign out.
								</p>
								<div className="mt-4 flex flex-wrap gap-3">
									<button
										type="button"
										onClick={() => router.push("/")}
										className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
									>
										Go to Home
									</button>
									<button
										type="button"
										onClick={() => router.push("/tecnico")}
										className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
									>
										Técnico
									</button>
									<button
										type="button"
										onClick={() => router.push("/supervisor")}
										className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
									>
										Supervisor
									</button>
									<button
										type="button"
										onClick={() => router.push("/admin")}
										className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
									>
										Admin
									</button>
									<button
										type="button"
										onClick={() => signOut?.()}
										className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
									>
										Sign Out
									</button>
								</div>
							</div>
						</div>
					)}
				</Authenticator>
			</div>
		</div>
	);
}
