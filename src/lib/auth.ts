import { fetchAuthSession } from "aws-amplify/auth";

/**
 * Cognito group names as defined in amplify/auth/resource.ts
 */
export const AUTH_GROUPS = [
	"tecnico",
	"supervisor",
	"admin",
	"doctor",
	"recepcion",
] as const;
export type AuthGroup = (typeof AUTH_GROUPS)[number];

/**
 * Route for each role. "tecnico" maps to /technician (plural for URL).
 */
export const GROUP_TO_ROUTE: Record<AuthGroup, string> = {
	tecnico: "/technician",
	supervisor: "/supervisor",
	admin: "/admin",
	doctor: "/doctor",
	recepcion: "/recepcion",
};

/**
 * Priority order: admin > supervisor > doctor > tecnico.
 * Used when user belongs to multiple groups.
 */
export const ROLE_PRIORITY: AuthGroup[] = [
	"admin",
	"supervisor",
	"doctor",
	"tecnico",
	"recepcion",
];

/**
 * Extracts cognito:groups from the current auth session.
 * Returns empty array if unauthenticated or no groups.
 */
export async function getUserGroups(): Promise<AuthGroup[]> {
	try {
		const session = await fetchAuthSession();
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
 * Returns the default route for the user's highest-priority group.
 * If no valid groups, returns /technician as fallback (or / if you prefer redirect to login).
 */
export async function getDefaultRoleRoute(): Promise<string> {
	const groups = await getUserGroups();
	const highest = groups[0];
	return highest ? GROUP_TO_ROUTE[highest] : "/";
}

/**
 * Check if the given path requires a specific group and return that group.
 */
export function getRequiredGroupForPath(pathname: string): AuthGroup | null {
	if (pathname.startsWith("/admin")) return "admin";
	if (pathname.startsWith("/supervisor")) return "supervisor";
	if (pathname.startsWith("/doctor")) return "doctor";
	if (pathname.startsWith("/technician")) return "tecnico";
	if (pathname.startsWith("/recepcion")) return "recepcion";
	return null;
}

/**
 * Returns true if the user's groups include the required group for the path.
 */
export function hasAccessToPath(
	userGroups: AuthGroup[],
	pathname: string,
): boolean {
	const required = getRequiredGroupForPath(pathname);
	if (!required) return true;
	return userGroups.includes(required);
}
