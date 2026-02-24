"use client";

/**
 * Process sample workspace — full UI with form, actions, loading/error states.
 * @see docs/integration/phase-3.md Phase 3d, 3e
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ProcessWorkspaceProvider,
  useProcessWorkspace,
} from "../process-workspace-provider";
import { ExamResultForm } from "../ExamResultForm";
import {
  useUnsavedGuard,
  confirmNavigateIfDirty,
} from "../use-unsaved-guard";
import type { ProcessContext } from "@/lib/repositories/process-repository";

type ProcessSampleWorkspaceProps = {
  context: ProcessContext | null;
  displayId: string;
};

export function ProcessSampleWorkspace({
  context,
  displayId,
}: ProcessSampleWorkspaceProps) {
  return (
    <ProcessWorkspaceProvider
      initialContext={context}
      displayId={displayId}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
        <ProcessWorkspaceHeader displayId={displayId} />
        <ProcessWorkspaceContent />
      </div>
    </ProcessWorkspaceProvider>
  );
}

function ProcessWorkspaceHeader({ displayId }: { displayId: string }) {
  const router = useRouter();
  const { isDirty } = useProcessWorkspace();

  const handleBack = () => {
    if (!confirmNavigateIfDirty(isDirty)) return;
    router.push("/technician/muestras");
  };

  return (
    <div className="border-b border-zinc-200 bg-amber-50/80 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-lg font-semibold text-amber-800">
          Procesando muestra {displayId}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={handleBack}
        >
          <ArrowLeft className="size-3.5 mr-1.5" />
          Volver a cola
        </Button>
      </div>
      <p className="mt-1 text-xs text-amber-700/90">
        Vista dedicada para ingreso de resultados. Al guardar volverás a la cola.
      </p>
    </div>
  );
}

function ProcessWorkspaceContent() {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const {
    context,
    isDirty,
    setIsDirty,
    isSubmitting,
    conflict,
    dismissConflict,
    pendingDraft,
    restoreDraft,
    clearPendingDraft,
    onReload,
    onSaveDraft,
    onSendToValidation,
    persistDraft,
  } = useProcessWorkspace();

  const [defaultResults, setDefaultResults] = useState<
    Record<string, string | number | undefined>
  >({});

  useUnsavedGuard(isDirty);

  // Sync defaultResults from context when context loads
  useEffect(() => {
    if (context?.exam) {
      setDefaultResults((context.exam.results ?? {}) as Record<string, string | number | undefined>);
    }
  }, [context?.exam?.id, context?.exam?.results]);

  const handleRestoreDraft = () => {
    const draft = restoreDraft();
    if (draft) {
      setDefaultResults(draft);
      setFormKey((k) => k + 1);
      setIsDirty(true);
    }
  };

  if (!context) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-8">
        <p className="text-center text-muted-foreground">
          Muestra no encontrada
        </p>
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href="/technician/muestras">Volver a cola</Link>
        </Button>
      </div>
    );
  }

  const { exam, examType, sample } = context;

  const handleSaveDraft = (values: Record<string, string | number | undefined>) => {
    void onSaveDraft(values);
  };

  const handleSendToValidation = (values: Record<string, string | number | undefined>) => {
    void onSendToValidation(values);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      {conflict && (
        <div className="mx-auto mb-4 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Otro usuario modificó este examen
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Recarga la página para ver los cambios más recientes.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-amber-400 hover:bg-amber-100 dark:border-amber-600 dark:hover:bg-amber-900/50"
              onClick={() => {
                onReload();
                dismissConflict();
              }}
            >
              Recargar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50"
              onClick={dismissConflict}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
      {pendingDraft && Object.keys(pendingDraft).length > 0 && (
        <div className="mx-auto mb-4 max-w-2xl rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Hay un borrador guardado localmente
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            Se recuperó un borrador anterior (ej. tras recargar). ¿Restaurar?
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-blue-400 hover:bg-blue-100 dark:border-blue-600 dark:hover:bg-blue-900/50"
              onClick={handleRestoreDraft}
            >
              Recuperar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/50"
              onClick={clearPendingDraft}
            >
              Descartar
            </Button>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {examType.name}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Muestra {sample.barcode ?? sample.id}
        </p>
        <ExamResultForm
          key={formKey}
          fieldSchema={examType.fieldSchema}
          defaultValues={defaultResults}
          onDirtyChange={setIsDirty}
          onDraftPersist={persistDraft}
          onSubmit={handleSendToValidation}
        >
          {({ getValues, formState }) => (
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={isSubmitting || !isDirty || formState.isSubmitting}
                onClick={() => handleSaveDraft(getValues())}
              >
                {isSubmitting ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : null}
                Guardar borrador
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-full"
                disabled={isSubmitting || formState.isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : null}
                Enviar a validación
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  if (confirmNavigateIfDirty(isDirty)) {
                    router.push("/technician/muestras");
                  }
                }}
              >
                Cancelar y volver
              </Button>
            </div>
          )}
        </ExamResultForm>
      </div>
    </div>
  );
}