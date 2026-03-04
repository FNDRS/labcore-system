import type { FieldSchema } from "@/lib/process/field-schema-types";

export type ClinicalFlag = "normal" | "atencion" | "critico";

export function parseReferenceRange(
  range: string | undefined
): { min: number; max: number } | null {
  if (!range || typeof range !== "string") return null;
  const match = range.match(/(\d+(?:\.\d+)?)\s*(?:-|\u2013)\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const min = Number.parseFloat(match[1]);
  const max = Number.parseFloat(match[2]);
  if (Number.isNaN(min) || Number.isNaN(max) || min > max) return null;
  return { min, max };
}

export function hasReferenceRangeViolation(
  results: Record<string, unknown> | null,
  fieldSchema: FieldSchema
): boolean {
  if (!results) return false;
  for (const section of fieldSchema.sections) {
    for (const field of section.fields) {
      if (field.type !== "numeric" || !field.referenceRange) continue;
      const range = parseReferenceRange(field.referenceRange);
      if (!range) continue;

      const rawValue = results[field.key];
      const value =
        typeof rawValue === "number"
          ? rawValue
          : typeof rawValue === "string"
            ? Number.parseFloat(rawValue)
            : Number.NaN;

      if (Number.isNaN(value)) continue;
      if (value < range.min || value > range.max) return true;
    }
  }
  return false;
}

export function deriveClinicalFlag(
  results: Record<string, unknown> | null,
  fieldSchema: FieldSchema
): ClinicalFlag {
  if (!results) return "normal";

  let isAttention = false;
  for (const [key, rawValue] of Object.entries(results)) {
    if (typeof rawValue !== "string") continue;
    const normalized = rawValue.trim().toLowerCase();
    if (!normalized) continue;
    if (
      normalized.includes("critico") ||
      normalized.includes("critical") ||
      normalized === "high" ||
      normalized === "low"
    ) {
      return "critico";
    }
    if (
      normalized.includes("atencion") ||
      normalized.includes("attention") ||
      (key.toLowerCase().includes("flag") && normalized !== "normal")
    ) {
      isAttention = true;
    }
  }

  if (isAttention || hasReferenceRangeViolation(results, fieldSchema)) {
    return "atencion";
  }
  return "normal";
}
