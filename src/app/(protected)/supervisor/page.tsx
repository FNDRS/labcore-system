import { Suspense } from "react";
import { fetchSupervisorDashboard } from "./actions";
import { SupervisorDashboardClient } from "./supervisor-dashboard-client";
import { SupervisorDashboardSkeleton } from "./supervisor-dashboard-skeleton";

async function SupervisorDashboardContent() {
	const { stats, pending } = await fetchSupervisorDashboard();
	return <SupervisorDashboardClient stats={stats} pending={pending} />;
}

export default function SupervisorPage() {
	return (
		<div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
			<Suspense fallback={<SupervisorDashboardSkeleton />}>
				<SupervisorDashboardContent />
			</Suspense>
		</div>
	);
}
