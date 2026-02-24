/**
 * Zod schema generator for exam result forms.
 * Transforms FieldSchema into a Zod object schema for use with RHF zodResolver.
 *
 * @see docs/integration/phase-3.md Phase 3c.1
 */

import { z } from "zod";
import type { FieldSchema } from "./field-schema-types";

/**
 * Returns a Zod schema for the `results` object from a FieldSchema.
 * Use with RHF zodResolver for form validation.
 *
 * @example
 * const schema = fieldSchemaToZod(fieldSchema);
 * const parsed = schema.parse(formValues);
 */
export function fieldSchemaToZod(schema: FieldSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      const base =
        field.type === "numeric"
          ? z.coerce.number().optional()
          : field.type === "enum" && (field.options?.length ?? 0) > 0
            ? z
                .enum(field.options as [string, ...string[]])
                .optional()
                .or(z.literal(""))
            : z.string().optional();
      shape[field.key] = base;
    }
  }
  return z.object(shape);
}
