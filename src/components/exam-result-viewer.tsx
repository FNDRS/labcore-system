"use client";

import type { FieldDef, FieldSchema } from "@/lib/process/field-schema-types";
import { cn } from "@/lib/utils";

function parseReferenceRange(
	range: string | undefined,
): { min: number; max: number } | null {
	if (!range || typeof range !== "string") return null;
	const match = range.match(/(\d+(?:\.\d+)?)\s*[–\-]\s*(\d+(?:\.\d+)?)/);
	if (!match) return null;

	const min = Number.parseFloat(match[1]);
	const max = Number.parseFloat(match[2]);
	if (Number.isNaN(min) || Number.isNaN(max) || min > max) return null;
	return { min, max };
}

function getRangeFlag(field: FieldDef, value: unknown): "low" | "high" | null {
	if (field.type !== "numeric") return null;
	const range = parseReferenceRange(field.referenceRange);
	if (!range) return null;

	const parsedValue =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number.parseFloat(value)
				: Number.NaN;
	if (Number.isNaN(parsedValue)) return null;
	if (parsedValue < range.min) return "low";
	if (parsedValue > range.max) return "high";
	return null;
}

function formatResultValue(value: unknown): string {
	if (value == null) return "—";
	if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
	if (typeof value === "string") return value.trim() || "—";
	return String(value);
}

export function ExamResultViewer({
	fieldSchema,
	resultValues,
}: {
	fieldSchema: FieldSchema;
	resultValues: Record<string, unknown> | null | undefined;
}) {
	const values = resultValues ?? {};

	return (
		<div className="space-y-6">
			{fieldSchema.sections.map((section) => (
				<fieldset key={section.id} className="space-y-3">
					<legend className="text-sm font-semibold text-zinc-700">
						{section.label}
					</legend>
					<div className="grid gap-3 sm:grid-cols-2">
						{section.fields.map((field) => {
							const value = values[field.key];
							const flag = getRangeFlag(field, value);
							const hasFlag = flag != null;

							return (
								<div
									key={field.key}
									className={cn(
										"rounded-lg border border-zinc-200 bg-zinc-50 p-3",
										hasFlag && "border-amber-300 bg-amber-50/50",
									)}
								>
									<p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
										{field.label}
									</p>
									<p className="mt-1 text-sm font-medium text-zinc-900">
										{formatResultValue(value)}
									</p>
									<div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
										{field.unit ? <span>Unidad: {field.unit}</span> : null}
										{field.referenceRange ? (
											<span>Ref: {field.referenceRange}</span>
										) : null}
										{hasFlag ? (
											<span
												className={cn(
													"rounded-full px-2 py-0.5 font-medium",
													flag === "low"
														? "bg-amber-100 text-amber-700"
														: "bg-rose-100 text-rose-700",
												)}
											>
												{flag === "low" ? "Bajo" : "Alto"}
											</span>
										) : null}
									</div>
								</div>
							);
						})}
					</div>
				</fieldset>
			))}
		</div>
	);
}
