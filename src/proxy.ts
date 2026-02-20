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

/** Rutas que el bypass de desarrollo puede acceder sin Cognito */
const DEV_BYPASS_GROUPS = ["tecnico"] as const;

function nextWithPathname(request: NextRequest, pathname: string) {
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("x-pathname", pathname);
	return NextResponse.next({
		request: { headers: requestHeaders },
	});
}

export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const requiredGroup = getRequiredGroupForPath(pathname);

	if (process.env.NODE_ENV === "development") {
		console.log("[proxy]", {
			pathname,
			requiredGroup,
			NEXT_PUBLIC_DEV_AUTH_BYPASS: process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS,
		});
	}

	// Rutas no protegidas: pasar con x-pathname para que el layout pueda leerla
	if (!requiredGroup) {
		return nextWithPathname(request, pathname);
	}

	// Bypass de desarrollo: no llamar a Amplify
	if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true") {
		if (DEV_BYPASS_GROUPS.includes(requiredGroup as (typeof DEV_BYPASS_GROUPS)[number])) {
			if (process.env.NODE_ENV === "development") {
				console.log("[proxy] BYPASS OK → next", pathname);
			}
			return nextWithPathname(request, pathname);
		}
		return NextResponse.redirect(new URL("/login", request.url));
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
			return NextResponse.redirect(new URL("/login", request.url));
		}

		if (!groups.includes(requiredGroup)) {
			const fallbackRoute = GROUP_TO_ROUTE[groups[0]];
			return NextResponse.redirect(new URL(fallbackRoute, request.url));
		}

		return nextWithPathname(request, pathname);
	} catch {
		return NextResponse.redirect(new URL("/login", request.url));
	}
}

export const config = {
	matcher: [
		/*
		 * Todas las rutas excepto estáticos, para que x-pathname llegue siempre al layout.
		 */
		"/((?!_next/static|_next/image|favicon.ico|images/).*)",
	],
};
