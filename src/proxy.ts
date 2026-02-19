import { NextRequest, NextResponse } from "next/server";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { getUserGroupsServer } from "@/lib/auth-server";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import {
	GROUP_TO_ROUTE,
	getRequiredGroupForPath,
	type AuthGroup,
} from "@/lib/auth";

export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const requiredGroup = getRequiredGroupForPath(pathname);

	if (!requiredGroup) {
		return NextResponse.next();
	}

	try {
		const { groups } = await runWithAmplifyServerContext({
			nextServerContext: { cookies },
			operation: async (ctx) => {
				const user = await getCurrentUser(ctx);
				if (!user) return { groups: null as AuthGroup[] | null };
				const groups = await getUserGroupsServer(ctx);
				return { groups };
			},
		});

		if (!groups || groups.length === 0) {
			return NextResponse.redirect(new URL("/", request.url));
		}

		if (!groups.includes(requiredGroup)) {
			const fallbackRoute = GROUP_TO_ROUTE[groups[0]];
			return NextResponse.redirect(new URL(fallbackRoute, request.url));
		}

		const requestHeaders = new Headers(request.headers);
		requestHeaders.set("x-pathname", pathname);
		return NextResponse.next({
			request: { headers: requestHeaders },
		});
	} catch {
		return NextResponse.redirect(new URL("/", request.url));
	}
}

export const config = {
	matcher: [
		"/technician/:path*",
		"/supervisor/:path*",
		"/admin/:path*",
	],
};
