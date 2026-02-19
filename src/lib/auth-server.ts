import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth/server";
import {
	AUTH_GROUPS,
	ROLE_PRIORITY,
	type AuthGroup,
} from "./auth";

/** Context type passed to Amplify server operations (runWithAmplifyServerContext) */
type AmplifyContext = Parameters<typeof getCurrentUser>[0];

/**
 * Server-side: get user groups from auth session.
 * Must be called inside runWithAmplifyServerContext.
 */
export async function getUserGroupsServer(
	ctx: AmplifyContext,
): Promise<AuthGroup[]> {
	try {
		const session = await fetchAuthSession(ctx);
		const raw = session.tokens?.accessToken?.payload?.["cognito:groups"];
		if (!Array.isArray(raw)) return [];
		return raw
			.filter((g): g is AuthGroup => AUTH_GROUPS.includes(g as AuthGroup))
			.sort(
				(a, b) =>
					ROLE_PRIORITY.indexOf(a) - ROLE_PRIORITY.indexOf(b),
			);
	} catch {
		return [];
	}
}

/**
 * Server-side: require auth and optionally a specific group.
 * Throws if not authenticated or if group is required but user doesn't have it.
 */
export async function requireAuthWithGroup(
	ctx: AmplifyContext,
	requiredGroup?: AuthGroup,
): Promise<{ user: Awaited<ReturnType<typeof getCurrentUser>>; groups: AuthGroup[] }> {
	const user = await getCurrentUser(ctx);
	if (!user) throw new Error("Unauthorized");

	const groups = await getUserGroupsServer(ctx);
	if (requiredGroup && !groups.includes(requiredGroup)) {
		throw new Error("Forbidden");
	}

	return { user, groups };
}
