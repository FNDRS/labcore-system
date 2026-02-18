import { Suspense } from "react";
import {
	fetchPendingWorkOrders,
	fetchPendingSamples,
} from "./actions";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarcodeScanPlaceholder } from "./barcode-scan-placeholder";

async function WorkOrdersSection() {
	const workOrders = await fetchPendingWorkOrders();

	return (
		<Card>
			<CardHeader>
				<CardTitle>Órdenes de trabajo pendientes</CardTitle>
				<CardDescription>
					{workOrders.length} orden{workOrders.length !== 1 ? "es" : ""} activa
					{workOrders.length !== 1 ? "s" : ""}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{workOrders.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No hay órdenes pendientes.
					</p>
				) : (
					<ul className="space-y-3">
						{workOrders.map((wo) => (
							<li
								key={wo.id}
								className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
							>
								<div>
									<span className="font-medium">{wo.accessionNumber}</span>
									<span className="text-muted-foreground ml-2">– {wo.patientName}</span>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant="outline" className="capitalize">
										{wo.priority}
									</Badge>
									<Badge variant="secondary">{wo.sampleCount} muestra(s)</Badge>
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

async function SamplesQueueSection() {
	const samples = await fetchPendingSamples();

	return (
		<Card>
			<CardHeader>
				<CardTitle>Cola de muestras</CardTitle>
				<CardDescription>
					Muestras pendientes y recibidas listas para procesar
				</CardDescription>
			</CardHeader>
			<CardContent>
				{samples.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No hay muestras en cola.
					</p>
				) : (
					<ul className="space-y-2">
						{samples.map((s) => (
							<li
								key={s.id}
								className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
							>
								<span className="font-mono">{s.barcode}</span>
								<span className="text-muted-foreground truncate max-w-[140px]">
									{s.examTypeName} · {s.patientName}
								</span>
								<Badge
									variant={s.status === "received" ? "default" : "secondary"}
									className="capitalize text-xs"
								>
									{s.status}
								</Badge>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

const WorkOrdersSkeleton = () => (
	<Card>
		<CardHeader>
			<div className="h-6 w-48 animate-pulse rounded bg-muted" />
			<div className="h-4 w-32 animate-pulse rounded bg-muted" />
		</CardHeader>
		<CardContent>
			<div className="space-y-3">
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="h-14 animate-pulse rounded-lg bg-muted"
					/>
				))}
			</div>
		</CardContent>
	</Card>
);

const SamplesSkeleton = () => (
	<Card>
		<CardHeader>
			<div className="h-6 w-40 animate-pulse rounded bg-muted" />
			<div className="h-4 w-64 animate-pulse rounded bg-muted" />
		</CardHeader>
		<CardContent>
			<div className="space-y-2">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
				))}
			</div>
		</CardContent>
	</Card>
);

export default function TechnicianPage() {
	return (
		<div className="container mx-auto max-w-4xl space-y-8 py-8 px-4">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Panel Técnico
				</h1>
				<p className="text-muted-foreground mt-1">
					Dashboard y recepción de muestras
				</p>
			</div>

			<BarcodeScanPlaceholder />

			<div className="grid gap-6 md:grid-cols-2">
				<Suspense fallback={<WorkOrdersSkeleton />}>
					<WorkOrdersSection />
				</Suspense>
				<Suspense fallback={<SamplesSkeleton />}>
					<SamplesQueueSection />
				</Suspense>
			</div>
		</div>
	);
}
