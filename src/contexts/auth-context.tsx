"use client";

import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchUserAttributes, getCurrentUser, signOut as amplifySignOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import {
	getUserGroups,
	hasAccessToPath,
	GROUP_TO_ROUTE,
	type AuthGroup,
} from "@/lib/auth";

// --- Context interface (state, actions, meta for dependency injection) ---

interface AuthState {
	user: { username: string } | null;
	groups: AuthGroup[];
	userEmail: string | null;
	userName: string | null;
	isLoading: boolean;
	isAuthenticated: boolean;
}

interface AuthActions {
	refreshAuth: () => Promise<void>;
	redirectToRoleRoute: () => Promise<void>;
	signOut: () => Promise<void>;
}

interface AuthContextValue {
	state: AuthState;
	actions: AuthActions;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// --- Provider (sole owner of state management) ---

function AuthProviderInner({ children }: { children: ReactNode }) {
	const router = useRouter();
	const [state, setState] = useState<AuthState>({
		user: null,
		groups: [],
		userEmail: null,
		userName: null,
		isLoading: true,
		isAuthenticated: false,
	});
	const isRedirecting = useRef(false);
	const groupsRef = useRef<AuthGroup[]>([]);

	const refreshAuth = useCallback(async () => {
		setState((prev) => ({ ...prev, isLoading: true }));
		const bypassEnv = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS;
		if (typeof window !== "undefined") {
			console.log("[auth refreshAuth]", {
				NEXT_PUBLIC_DEV_AUTH_BYPASS: bypassEnv,
				bypassActive: bypassEnv === "true",
			});
		}
		if (bypassEnv === "true") {
			groupsRef.current = ["tecnico"];
			setState({
				user: { username: "technician@dev.local" },
				groups: ["tecnico"],
				userEmail: "technician@dev.local",
				userName: "Técnico (dev bypass)",
				isLoading: false,
				isAuthenticated: true,
			});
			if (typeof window !== "undefined") console.log("[auth refreshAuth] BYPASS → isAuthenticated: true");
			return;
		}
		try {
			const [user, groups, attrs] = await Promise.all([
				getCurrentUser(),
				getUserGroups(),
				fetchUserAttributes(),
			]);
			groupsRef.current = groups;
			setState({
				user: { username: user.username },
				groups,
				userEmail: attrs.email ?? null,
				userName: attrs.name ?? attrs.given_name ?? null,
				isLoading: false,
				isAuthenticated: true,
			});
		} catch {
			groupsRef.current = [];
			setState({
				user: null,
				groups: [],
				userEmail: null,
				userName: null,
				isLoading: false,
				isAuthenticated: false,
			});
		}
	}, []);

	const redirectToRoleRoute = useCallback(async () => {
		if (isRedirecting.current) return;
		isRedirecting.current = true;
		try {
			const groups =
				groupsRef.current.length > 0 ? groupsRef.current : state.groups;
			const highest = groups[0];
			const route = highest ? GROUP_TO_ROUTE[highest] : "/login";
			if (typeof window !== "undefined") {
				console.log("[auth redirectToRoleRoute]", { groups, highest, route });
			}
			if (route) {
				router.replace(route);
			}
		} finally {
			// Defer reset so Strict Mode's second effect run sees the guard and skips
			queueMicrotask(() => {
				isRedirecting.current = false;
			});
		}
	}, [router, state.groups]);

	const signOutAction = useCallback(async () => {
		if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS !== "true") {
			await amplifySignOut();
		}
		router.push("/login");
	}, [router]);

	useEffect(() => {
		refreshAuth();
	}, [refreshAuth]);

	useEffect(() => {
		const cancel = Hub.listen("auth", async ({ payload }) => {
			switch (payload.event) {
				case "signedIn":
				case "tokenRefresh": {
					await refreshAuth();
					break;
				}
				case "signedOut":
				case "tokenRefresh_failure": {
					setState({
						user: null,
						groups: [],
						userEmail: null,
						userName: null,
						isLoading: false,
						isAuthenticated: false,
					});
					break;
				}
				default:
					break;
			}
		});
		return () => cancel();
	}, [refreshAuth]);

	const actionsValue = useMemo(
		() => ({
			refreshAuth,
			redirectToRoleRoute,
			signOut: signOutAction,
		}),
		[refreshAuth, redirectToRoleRoute, signOutAction],
	);

	return (
		<AuthContext.Provider
			value={{
				state,
				actions: actionsValue,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

// --- Loading (explicit variant, no inline conditional) ---

function AuthLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-zinc-950">
			<div
				className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white"
				aria-hidden
			/>
		</div>
	);
}

// --- Guard (protects routes, redirects when unauthorized) ---

function AuthGuard({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const ctx = use(AuthContext);

	if (!ctx) {
		throw new Error("Auth.Guard must be used within Auth.Provider");
	}

	const { state } = ctx;

	useEffect(() => {
		if (state.isLoading) return;

		if (!state.isAuthenticated) {
			router.replace("/login");
			return;
		}

		if (!hasAccessToPath(state.groups, pathname ?? "")) {
			const route = state.groups[0]
				? GROUP_TO_ROUTE[state.groups[0]]
				: "/login";
			router.replace(route);
		}
	}, [
		state.isLoading,
		state.isAuthenticated,
		state.groups,
		pathname,
		router,
	]);

	if (state.isLoading) {
		return <AuthLoading />;
	}

	if (!state.isAuthenticated) {
		return null;
	}

	if (!hasAccessToPath(state.groups, pathname ?? "")) {
		return null;
	}

	return <>{children}</>;
}

// --- Hook (React 19: use instead of useContext) ---

function useAuth() {
	const ctx = use(AuthContext);
	if (!ctx) {
		throw new Error("useAuth must be used within Auth.Provider");
	}
	return ctx;
}

// --- Compound export ---

export const Auth = {
	Provider: AuthProviderInner,
	Guard: AuthGuard,
	Loading: AuthLoading,
	useAuth,
};

// Backwards-compatible exports
export { AuthProviderInner as AuthProvider };
export { AuthGuard };
export { useAuth };
