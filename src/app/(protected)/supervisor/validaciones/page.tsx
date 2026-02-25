import { listPendingValidation } from "@/lib/repositories/supervisor-repository";
import type {
	ValidationQueueFilterFlag,
	ValidationQueueFilters,
	ValidationQueueStatusFilter,
} from "@/lib/types/validation-types";
import { ValidationListClient } from "./validation-list-client";
import { ValidationProvider } from "./validation-provider";

type PageProps = {
	searchParams: Promise<{
		status?: string;
		flag?: string;
		from?: string;
		to?: string;
	}>;
};

function parseFilters(searchParams: {
	status?: string;
	flag?: string;
	from?: string;
	to?: string;
}): ValidationQueueFilters {
	const statusFilter = (searchParams.status === "all"
		? "all"
		: "pending") as ValidationQueueStatusFilter;

	const flag = searchParams.flag?.trim();
	const validFlags: ValidationQueueFilterFlag[] = [
		"critico",
		"atencion",
		"normal",
		"abnormal",
	];
	const flagFilter = flag && validFlags.includes(flag as ValidationQueueFilterFlag)
		? (flag as ValidationQueueFilterFlag)
		: undefined;

	let fromResultedAt: string | undefined;
	let toResultedAt: string | undefined;

	if (searchParams.from?.trim()) {
		const fromDate = searchParams.from.trim();
		if (/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
			fromResultedAt = `${fromDate}T00:00:00.000Z`;
		}
	}
	if (searchParams.to?.trim()) {
		const toDate = searchParams.to.trim();
		if (/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
			toResultedAt = `${toDate}T23:59:59.999Z`;
		}
	}

	return {
		statusFilter,
		flag: flagFilter,
		fromResultedAt,
		toResultedAt,
	};
}

export default async function SupervisorValidacionesPage({
	searchParams,
}: PageProps) {
	const params = await searchParams;
	const filters = parseFilters(params);
	const initialItems = await listPendingValidation(filters);

	return (
		<ValidationProvider
			initialItems={initialItems}
			initialFilters={filters}
		>
			<ValidationListClient />
		</ValidationProvider>
	);
}
