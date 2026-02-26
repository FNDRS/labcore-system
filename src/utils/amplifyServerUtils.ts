import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import {
  generateServerClientUsingCookies,
  generateServerClientUsingReqRes,
} from "@aws-amplify/adapter-nextjs/data";
import type { Schema } from "../../amplify/data/resource";
import outputs from "../../amplify_outputs.json";
import { cookies } from "next/headers";

/**
 * Server runner for Amplify SSR - use for isolated request contexts.
 * Use with NextRequest/NextResponse in middleware, API routes, getServerSideProps.
 *
 * Note: createAuthRouteHandlers is available for Cognito Hosted UI flows.
 * Add AMPLIFY_APP_ORIGIN and externalProviders to auth resource to use it.
 */
export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});

/**
 * Cookie-based data client for Next.js App Router.
 * Use in React Server Components, Server Actions, and Route Handlers.
 * Dynamically refetches cookies at runtime per request.
 */
export const cookieBasedClient = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies,
});

/**
 * Req/Res-based data client for middleware and Pages Router.
 * Use with runWithAmplifyServerContext - pass contextSpec to API calls.
 */
export const reqResBasedClient = generateServerClientUsingReqRes<Schema>({
  config: outputs,
});
