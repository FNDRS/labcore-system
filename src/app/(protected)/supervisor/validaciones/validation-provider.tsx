"use client";

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type {
	ValidationQueueItem,
	ValidationQueueFilters,
	ValidationQueueFilterFlag,
	ValidationQueueStatusFilter,
} from "@/lib/types/validation-types";

/** Client-side filter state (synced with URL for server filters). */
export interface ValidationFilterState {
	statusFilter: ValidationQueueStatusFilter;
	flag: ValidationQueueFilterFlag | "";
	fromDate: string;
	toDate: string;
	searchQuery: string;
}

/** State exposed by the validation provider. */
export interface ValidationProviderState {
	items: ValidationQueueItem[];
	filteredItems: ValidationQueueItem[];
	filters: ValidationFilterState;
	pendingCount: number;
	criticalCount: number;
	selectedId: string | null;
	isLoading: boolean;
}

/** Actions exposed by the validation provider. */
export interface ValidationProviderActions {
	setSearchQuery: (q: string) => void;
	setStatusFilter: (v: ValidationQueueStatusFilter) => void;
	setFlagFilter: (v: ValidationQueueFilterFlag | "") => void;
	setFromDate: (v: string) => void;
	setToDate: (v: string) => void;
	applyServerFilters: () => void;
	clearFilters: () => void;
	setSelectedId: (id: string | null) => void;
}

export interface ValidationProviderContextValue {
	state: ValidationProviderState;
	actions: ValidationProviderActions;
}

const ValidationProviderContext =
	createContext<ValidationProviderContextValue | null>(null);

export function useValidationProvider(): ValidationProviderContextValue {
	const ctx = useContext(ValidationProviderContext);
	if (!ctx) {
		throw new Error(
			"useValidationProvider must be used within ValidationProvider",
		);
	}
	return ctx;
}

function matchesSearchQuery(
	item: ValidationQueueItem,
	query: string,
): boolean {
	if (!query.trim()) return true;
	const q = query.trim().toLowerCase();
	const patientMatch = item.patientName.toLowerCase().includes(q);
	const accessionMatch =
		item.accessionNumber?.toLowerCase().includes(q) ?? false;
	return patientMatch || accessionMatch;
}

export function ValidationProvider({
	children,
	initialItems,
	initialFilters,
}: {
	children: ReactNode;
	initialItems: ValidationQueueItem[];
	initialFilters: ValidationQueueFilters;
}) {
	const router = useRouter();
	const pathname = usePathname();

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const filters: ValidationFilterState = useMemo(
		() => ({
			statusFilter: initialFilters.statusFilter ?? "pending",
			flag: initialFilters.flag ?? "",
			fromDate: initialFilters.fromResultedAt
				? initialFilters.fromResultedAt.slice(0, 10)
				: "",
			toDate: initialFilters.toResultedAt
				? initialFilters.toResultedAt.slice(0, 10)
				: "",
			searchQuery,
		}),
		[
			initialFilters.statusFilter,
			initialFilters.flag,
			initialFilters.fromResultedAt,
			initialFilters.toResultedAt,
			searchQuery,
		],
	);

	const filteredItems = useMemo(() => {
		return initialItems.filter((item) =>
			matchesSearchQuery(item, searchQuery),
		);
	}, [initialItems, searchQuery]);

	const pendingCount = useMemo(
		() =>
			initialItems.filter(
				(item) => item.status === "ready_for_validation",
			).length,
		[initialItems],
	);

	const criticalCount = useMemo(
		() =>
			initialItems.filter(
				(item) =>
					item.clinicalFlag !== "normal" || item.hasReferenceRangeViolation,
			).length,
		[initialItems],
	);

	const buildSearchParams = useCallback(
		(overrides: Partial<ValidationFilterState>) => {
			const status =
				overrides.statusFilter ?? filters.statusFilter;
			const flag = overrides.flag ?? filters.flag;
			const from = overrides.fromDate ?? filters.fromDate;
			const to = overrides.toDate ?? filters.toDate;

			const params = new URLSearchParams();
			if (status !== "pending") params.set("status", status);
			if (flag) params.set("flag", flag);
			if (from) params.set("from", from);
			if (to) params.set("to", to);
			return params.toString();
		},
		[filters],
	);

	const setStatusFilter = useCallback(
		(v: ValidationQueueStatusFilter) => {
			const qs = buildSearchParams({ statusFilter: v });
			router.push(qs ? `${pathname}?${qs}` : pathname);
		},
		[router, pathname, buildSearchParams],
	);

	const setFlagFilter = useCallback(
		(v: ValidationQueueFilterFlag | "") => {
			const qs = buildSearchParams({ flag: v });
			router.push(qs ? `${pathname}?${qs}` : pathname);
		},
		[router, pathname, buildSearchParams],
	);

	const setFromDate = useCallback(
		(v: string) => {
			const qs = buildSearchParams({ fromDate: v });
			router.push(qs ? `${pathname}?${qs}` : pathname);
		},
		[router, pathname, buildSearchParams],
	);

	const setToDate = useCallback(
		(v: string) => {
			const qs = buildSearchParams({ toDate: v });
			router.push(qs ? `${pathname}?${qs}` : pathname);
		},
		[router, pathname, buildSearchParams],
	);

	const applyServerFilters = useCallback(() => {
		const qs = buildSearchParams({});
		router.push(qs ? `${pathname}?${qs}` : pathname);
	}, [router, pathname, buildSearchParams]);

	const clearFilters = useCallback(() => {
		router.push(pathname);
		setSearchQuery("");
	}, [router, pathname]);

	const value: ValidationProviderContextValue = useMemo(
		() => ({
			state: {
				items: initialItems,
				filteredItems,
				filters: { ...filters, searchQuery },
				pendingCount,
				criticalCount,
				selectedId,
				isLoading: false,
			},
			actions: {
				setSearchQuery,
				setStatusFilter,
				setFlagFilter,
				setFromDate,
				setToDate,
				applyServerFilters,
				clearFilters,
				setSelectedId,
			},
		}),
		[
			initialItems,
			filteredItems,
			filters,
			searchQuery,
			pendingCount,
			criticalCount,
			selectedId,
			setStatusFilter,
			setFlagFilter,
			setFromDate,
			setToDate,
			applyServerFilters,
			clearFilters,
		],
	);

	return (
		<ValidationProviderContext.Provider value={value}>
			{children}
		</ValidationProviderContext.Provider>
	);
}
