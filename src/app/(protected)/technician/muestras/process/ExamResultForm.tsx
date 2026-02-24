"use client";

/**
 * Form integration for exam results.
 * RHF + standardSchemaResolver (Zod 4) + ExamResultFields. Parent provides buttons and submit handlers.
 * Lazy-loads ExamResultFields for code-splitting (Phase 3e.3).
 *
 * @see docs/integration/phase-3.md Phase 3c.3, 3e.3
 */

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { fieldSchemaToZod } from "@/lib/process/field-schema-to-zod";
import type { FieldSchema } from "@/lib/process/field-schema-types";
import type { ResultsRecord } from "@/lib/process/field-schema-types";

const ExamResultFields = dynamic(
  () => import("./ExamResultFields").then((m) => ({ default: m.ExamResultFields })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </div>
      </div>
    ),
    ssr: false,
  },
);

type ResultsFormValues = ResultsRecord;

export type ExamResultFormHelpers<FV = ResultsFormValues> = {
  getValues: () => FV;
  handleSubmit: (fn: (values: FV) => void) => (e?: React.BaseSyntheticEvent) => void;
  formState: { isDirty: boolean; isSubmitting: boolean };
};

type ExamResultFormProps = {
  fieldSchema: FieldSchema;
  defaultValues?: Partial<ResultsFormValues>;
  onSubmit: (values: ResultsFormValues) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Called (debounced) when values change — for localStorage persistence (Phase 3e.4). */
  onDraftPersist?: (values: ResultsFormValues) => void;
  children?: React.ReactNode | ((helpers: ExamResultFormHelpers) => React.ReactNode);
};

export function ExamResultForm({
  fieldSchema,
  defaultValues,
  onSubmit,
  onDirtyChange,
  onDraftPersist,
  children,
}: ExamResultFormProps) {
  const zodSchema = fieldSchemaToZod(fieldSchema);
  type FormValues = z.infer<typeof zodSchema>;

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(zodSchema),
    defaultValues: (defaultValues ?? {}) as FormValues,
  });

  const isDirty = form.formState.isDirty;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!onDraftPersist || !isDirty) return;
    const id = setInterval(() => {
      onDraftPersist(form.getValues() as ResultsFormValues);
    }, 5000);
    return () => clearInterval(id);
  }, [isDirty, onDraftPersist, form]);

  const helpers = {
    getValues: form.getValues as () => ResultsFormValues,
    handleSubmit: form.handleSubmit as (
      fn: (values: ResultsFormValues) => void,
    ) => (e?: React.BaseSyntheticEvent) => void,
    formState: {
      isDirty: form.formState.isDirty,
      isSubmitting: form.formState.isSubmitting,
    },
  } satisfies ExamResultFormHelpers;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as (v: FormValues) => void)}>
        <ExamResultFields fieldSchema={fieldSchema} control={form.control} />
        {typeof children === "function" ? children(helpers) : children}
      </form>
    </Form>
  );
}
