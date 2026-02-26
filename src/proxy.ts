import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { getRequiredGroupForPath } from "@/lib/auth";

/**
 * Sets x-pathname header so the protected layout can read it for RBAC.
 */
function nextWithPathname(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

/**
 * Proxy/Middleware: auth-only check. No role validation.
 * RBAC is handled entirely in (protected)/layout.tsx.
 *
 * Uses { request, response } per Amplify docs for correct cookie/token handling in middleware.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedPath = getRequiredGroupForPath(pathname) !== null;

  if (!isProtectedPath) {
    return nextWithPathname(request, pathname);
  }

  const response = NextResponse.next();

  try {
    const authenticated = await runWithAmplifyServerContext({
      nextServerContext: { request, response },
      operation: async (contextSpec) => {
        const session = await fetchAuthSession(contextSpec);
        return (
          session.tokens?.accessToken !== undefined &&
          session.tokens?.idToken !== undefined
        );
      },
    });

    if (!authenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return nextWithPathname(request, pathname);
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * All routes except static assets. Exclude login, register, forgot-password.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|images/|login|register|forgot-password).*)",
  ],
};
