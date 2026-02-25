import Link from "next/link";
import { cookies } from "next/headers";
import { forbidden, unauthorized } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getValidationDetail } from "@/lib/repositories/supervisor-repository";
import { requireAuthWithGroup } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { ValidationDetailClient } from "@/app/(protected)/supervisor/validaciones/[id]/validation-detail-client";

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ from?: string }>;
};

function sanitizeReturnPath(from: string | undefined): string {
	if (!from || !from.startsWith("/supervisor/validaciones")) {
		return "/supervisor/validaciones";
	}
	return from;
}

export default async function SupervisorValidacionDetailPage({
	params,
	searchParams,
}: Props) {
	try {
		await runWithAmplifyServerContext({
			nextServerContext: { cookies },
			operation: (ctx) => requireAuthWithGroup(ctx, "supervisor"),
		});
	} catch (error) {
		if (error instanceof Error && error.message === "Forbidden") {
			forbidden();
		}
		unauthorized();
	}

	const { id } = await params;
	const query = await searchParams;
	const returnTo = sanitizeReturnPath(query.from);
	const detail = await getValidationDetail(id);

	return (
		<div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
			<div className="mx-auto max-w-6xl space-y-4">
				<Button variant="outline" size="sm" className="rounded-full" asChild>
					<Link href={returnTo}>
						<ArrowLeft className="size-3.5" />
						Volver a validaciones
					</Link>
				</Button>
				{detail == null ? (
					<Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
						<CardHeader>
							<CardTitle>Examen no encontrado</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-sm">
								No pudimos cargar la validación solicitada. Puede haber sido
								eliminada o no estar disponible.
							</p>
						</CardContent>
					</Card>
				) : (
					<ValidationDetailClient detail={detail} returnTo={returnTo} />
				)}
			</div>
		</div>
	);
}
