import { redirect } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { cookies } from "next/headers";

export default async function HomePage() {
	try {
		await runWithAmplifyServerContext({
			nextServerContext: { cookies },
			operation: (ctx) => getCurrentUser(ctx),
		});
	} catch {
		redirect("/login");
	}
	redirect("/technician");
}
