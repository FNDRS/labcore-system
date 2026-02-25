"use client";

/**
 * Dynamic field renderer for exam results.
 * Renders sections/fields from fieldSchema; maps string→Input, numeric→Input number, enum→Select.
 * Shows referenceRange, unit, and optional high/low flag for numeric out-of-range values.
 *
 * @see docs/integration/phase-3.md Phase 3c
 */

import type { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldDef, FieldSchema } from "@/lib/process/field-schema-types";
import { cn } from "@/lib/utils";

type ExamResultFieldsProps<T extends FieldValues> = {
  fieldSchema: FieldSchema;
  control: Control<T>;
};

/**
 * Parse a reference range string (e.g. "4.0 – 5.5", "80-100") into min/max.
 * Returns null if unparseable.
 */
function parseReferenceRange(range: string | undefined): { min: number; max: number } | null {
  if (!range || typeof range !== "string") return null;
  const match = range.match(/(\d+(?:\.\d+)?)\s*[–\-]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const min = parseFloat(match[1]);
  const max = parseFloat(match[2]);
  if (Number.isNaN(min) || Number.isNaN(max) || min > max) return null;
  return { min, max };
}

/**
 * Determine if a numeric value is below, above, or within the reference range.
 */
/** Sentinel for "no selection" in enum Select; Radix reserves empty string for clearing. */
const EMPTY_SELECT_VALUE = "__none__";

function getRangeFlag(
  value: number | undefined,
  range: { min: number; max: number } | null
): "low" | "high" | null {
  if (value == null || range == null || Number.isNaN(value)) return null;
  if (value < range.min) return "low";
  if (value > range.max) return "high";
  return null;
}

function FieldReferenceInfo({
  field,
  value,
  unit,
}: {
  field: FieldDef;
  value: unknown;
  unit?: string;
}) {
  const refRange = field.referenceRange
    ? parseReferenceRange(field.referenceRange)
    : null;
  const numValue =
    field.type === "numeric" && typeof value === "number" ? value : undefined;
  const flag = refRange && numValue != null ? getRangeFlag(numValue, refRange) : null;

  const parts: string[] = [];
  if (field.referenceRange) parts.push(`Ref: ${field.referenceRange}`);
  if (unit ?? field.unit) parts.push(`(${unit ?? field.unit})`);
  const refText = parts.length > 0 ? parts.join(" ") : null;

  if (!refText && !flag) return null;

  return (
    <span
      className="text-xs text-muted-foreground"
      id={`${field.key}-ref-info`}
    >
      {refText}
      {flag && (
        <span
          className={cn(
            "ml-1.5 font-medium",
            flag === "low" && "text-amber-600",
            flag === "high" && "text-rose-600"
          )}
          aria-live="polite"
        >
          ({flag === "low" ? "bajo" : "alto"})
        </span>
      )}
    </span>
  );
}

export function ExamResultFields<T extends FieldValues>({
  fieldSchema,
  control,
}: ExamResultFieldsProps<T>) {
  return (
    <div className="space-y-6">
      {fieldSchema.sections.map((section) => (
        <fieldset key={section.id} className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-700">
            {section.label}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => (
              <FormField
                key={field.key}
                control={control}
                name={field.key as Path<T>}
                render={({ field: formField, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor={`${field.key}-input`}>
                      {field.label}
                    </FormLabel>
                    <div className="flex flex-col gap-1">
                      <FormControl>
                        {field.type === "numeric" ? (
                          <Input
                            id={`${field.key}-input`}
                            type="number"
                            step="any"
                            placeholder={field.unit ?? ""}
                            aria-invalid={!!fieldState.error}
                            aria-describedby={
                              field.referenceRange || field.unit
                                ? `${field.key}-ref-info`
                                : undefined
                            }
                            {...formField}
                            value={formField.value ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              formField.onChange(
                                v === "" ? undefined : Number(v)
                              );
                            }}
                          />
                        ) : field.type === "enum" && (field.options?.length ?? 0) > 0 ? (
                          <Select
                            value={
                              formField.value === undefined || formField.value === ""
                                ? EMPTY_SELECT_VALUE
                                : formField.value
                            }
                            onValueChange={(v) =>
                              formField.onChange(
                                v === EMPTY_SELECT_VALUE ? undefined : v
                              )
                            }
                          >
                            <SelectTrigger
                              id={`${field.key}-input`}
                              aria-invalid={!!fieldState.error}
                              aria-describedby={
                                field.referenceRange || field.unit
                                  ? `${field.key}-ref-info`
                                  : undefined
                              }
                            >
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EMPTY_SELECT_VALUE}>
                                —
                              </SelectItem>
                              {field.options!.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id={`${field.key}-input`}
                            type="text"
                            aria-invalid={!!fieldState.error}
                            aria-describedby={
                              field.referenceRange || field.unit
                                ? `${field.key}-ref-info`
                                : undefined
                            }
                            {...formField}
                            value={formField.value ?? ""}
                          />
                        )}
                      </FormControl>
                      <FieldReferenceInfo
                        field={field}
                        value={formField.value}
                        unit={field.unit}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
