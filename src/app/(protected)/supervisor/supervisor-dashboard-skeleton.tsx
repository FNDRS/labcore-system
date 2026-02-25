import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function SupervisorDashboardSkeleton() {
	return (
		<div className="mx-auto max-w-5xl space-y-6 pb-8">
			<div className="grid gap-4 sm:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i} className="rounded-xl border border-zinc-200 bg-white shadow-none">
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-24" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-9 w-12" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
				<CardHeader className="pb-3">
					<Skeleton className="h-5 w-64" />
					<Skeleton className="mt-2 h-4 w-96" />
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow className="border-zinc-200 hover:bg-transparent">
								<TableHead><Skeleton className="h-4 w-20" /></TableHead>
								<TableHead><Skeleton className="h-4 w-16" /></TableHead>
								<TableHead><Skeleton className="h-4 w-20" /></TableHead>
								<TableHead><Skeleton className="h-4 w-16" /></TableHead>
								<TableHead><Skeleton className="h-4 w-24" /></TableHead>
								<TableHead><Skeleton className="h-4 w-20" /></TableHead>
								<TableHead><Skeleton className="h-4 w-16" /></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i} className="border-zinc-100">
									<TableCell><Skeleton className="h-4 w-24" /></TableCell>
									<TableCell><Skeleton className="h-4 w-20" /></TableCell>
									<TableCell><Skeleton className="h-4 w-16" /></TableCell>
									<TableCell><Skeleton className="h-4 w-24" /></TableCell>
									<TableCell><Skeleton className="h-4 w-14" /></TableCell>
									<TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
									<TableCell><Skeleton className="h-9 w-20 rounded-full" /></TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
