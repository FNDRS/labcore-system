/**
 * Typed field schema for exam result forms.
 * Aligned with ExamType.fieldSchema from seed and amplify/data/resource.ts.
 *
 * @see docs/integration/phase-3.md Phase 3a
 */

/** Field definition for a single result field. */
export interface FieldDef {
  key: string;
  label: string;
  type: "string" | "numeric" | "enum";
  unit?: string;
  referenceRange?: string;
  options?: string[]; // for enum
}

/** Section grouping related fields. */
export interface Section {
  id: string;
  label: string;
  fields: FieldDef[];
}

/** Full field schema (sections with fields). */
export interface FieldSchema {
  sections: Section[];
}

/** Parsed exam results object — keys from FieldDef.key, values string | number. */
export type ResultsRecord = Record<string, string | number | undefined>;

/**
 * Normalize fieldSchema from storage (may be string or object).
 * Amplify a.json() + seed JSON.stringify can yield either.
 */
export function parseFieldSchema(value: unknown): FieldSchema | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return assertFieldSchema(parsed);
    } catch {
      return null;
    }
  }
  return assertFieldSchema(value);
}

function assertFieldSchema(value: unknown): FieldSchema | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as FieldSchema).sections)) {
    return null;
  }
  const schema = value as FieldSchema;
  const sections = schema.sections.filter(
    (s): s is Section =>
      s != null &&
      typeof s === "object" &&
      typeof (s as Section).id === "string" &&
      typeof (s as Section).label === "string" &&
      Array.isArray((s as Section).fields),
  );
  if (sections.length === 0) return null;

  const validSections: Section[] = sections.map((s) => ({
    id: String(s.id),
    label: String(s.label),
    fields: (s.fields ?? [])
      .filter(
        (f): f is FieldDef =>
          f != null &&
          typeof f === "object" &&
          typeof (f as FieldDef).key === "string" &&
          typeof (f as FieldDef).label === "string" &&
          ["string", "numeric", "enum"].includes((f as FieldDef).type ?? ""),
      )
      .map((f) => ({
        key: String(f.key),
        label: String(f.label),
        type: f.type as "string" | "numeric" | "enum",
        unit: f.unit != null ? String(f.unit) : undefined,
        referenceRange: f.referenceRange != null ? String(f.referenceRange) : undefined,
        options: Array.isArray(f.options) ? f.options.map(String) : undefined,
      })),
  }));

  return { sections: validSections };
}

/** @deprecated Use fieldSchemaToZod from ./field-schema-to-zod instead. */
export { fieldSchemaToZod as resultsSchema } from "./field-schema-to-zod";
