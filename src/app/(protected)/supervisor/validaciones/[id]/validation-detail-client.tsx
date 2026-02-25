"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  approveExamAction,
  createIncidenceAction,
  rejectExamAction,
} from "@/app/(protected)/supervisor/actions";
import type { ValidationDetail } from "@/lib/types/validation-types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ValidationResultReadOnly } from "./validation-result-readonly";

const incidenceTypeOptions = [
  { value: "critical_value", label: "Valor crítico" },
  { value: "sample_issue", label: "Problema de muestra" },
  { value: "instrument_issue", label: "Problema de equipo" },
  { value: "rework", label: "Retrabajo" },
  { value: "other", label: "Otro" },
] as const;

const approvalSchema = z.object({
  comments: z.string().optional(),
});

const rejectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Debe indicar un motivo de rechazo"),
  comments: z.string().optional(),
});

const incidenceSchema = z.object({
  type: z.enum(incidenceTypeOptions.map((opt) => opt.value) as [string, ...string[]]),
  description: z
    .string()
    .trim()
    .min(1, "Debe indicar la descripción de la incidencia"),
});

type ApprovalValues = z.infer<typeof approvalSchema>;
type RejectionValues = z.infer<typeof rejectionSchema>;
type IncidenceValues = z.infer<typeof incidenceSchema>;

function buildReturnHref(
	returnTo: string,
	feedback: "approved" | "rejected",
	reviewedId: string,
) {
	const [pathname, rawQuery = ""] = returnTo.split("?");
	const params = new URLSearchParams(rawQuery);
	params.set("feedback", feedback);
	params.set("reviewed", reviewedId);
	const query = params.toString();
	return query ? `${pathname}?${query}` : pathname;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: ValidationDetail["exam"]["status"]): string {
  if (status === "ready_for_validation") return "Pendiente";
  if (status === "approved") return "Aprobado";
  if (status === "rejected") return "Rechazado";
  if (status === "review") return "En revisión";
  if (status === "inprogress") return "En proceso";
  if (status === "pending") return "Pendiente";
  return status ?? "—";
}

export function ValidationDetailClient({
	detail,
	returnTo,
}: {
	detail: ValidationDetail;
	returnTo: string;
}) {
  const router = useRouter();
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(
    detail.exam.updatedAt ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [isIncidenceDialogOpen, setIsIncidenceDialogOpen] = useState(false);

  const canValidate = detail.exam.status === "ready_for_validation";

  const approvalForm = useForm<ApprovalValues>({
    resolver: standardSchemaResolver(approvalSchema),
    defaultValues: { comments: "" },
  });
  const rejectionForm = useForm<RejectionValues>({
    resolver: standardSchemaResolver(rejectionSchema),
    defaultValues: { reason: "", comments: "" },
  });
  const incidenceForm = useForm<IncidenceValues>({
    resolver: standardSchemaResolver(incidenceSchema),
    defaultValues: {
      type: incidenceTypeOptions[0].value,
      description: "",
    },
  });

  const handleApprove = async () => {
    const values = approvalForm.getValues();
    setConflictMessage(null);
    setIsSubmitting(true);
    try {
      const status = await approveExamAction(
        detail.exam.id,
        values.comments?.trim() || undefined,
        expectedUpdatedAt,
      );
      if (status.ok) {
        setExpectedUpdatedAt(status.updatedAt ?? null);
        toast.success("Examen aprobado");
        router.push(buildReturnHref(returnTo, "approved", detail.exam.id));
        return;
      }
      if (status.conflict) {
        setConflictMessage(status.error);
        return;
      }
      toast.error(status.error);
    } catch {
      toast.error("No se pudo aprobar el examen");
    } finally {
      setIsSubmitting(false);
      setIsApproveConfirmOpen(false);
    }
  };

  const handleReject = async () => {
    const values = rejectionForm.getValues();
    setConflictMessage(null);
    setIsSubmitting(true);
    try {
      const status = await rejectExamAction(
        detail.exam.id,
        values.reason,
        values.comments?.trim() || undefined,
        expectedUpdatedAt,
      );
      if (status.ok) {
        setExpectedUpdatedAt(status.updatedAt ?? null);
        toast.success("Examen rechazado");
        router.push(buildReturnHref(returnTo, "rejected", detail.exam.id));
        return;
      }
      if (status.conflict) {
        setConflictMessage(status.error);
        return;
      }
      toast.error(status.error);
    } catch {
      toast.error("No se pudo rechazar el examen");
    } finally {
      setIsSubmitting(false);
      setIsRejectConfirmOpen(false);
    }
  };

  const handleCreateIncidence = async (values: IncidenceValues) => {
    setConflictMessage(null);
    setIsSubmitting(true);
    try {
      const status = await createIncidenceAction(
        detail.exam.id,
        values.type,
        values.description,
      );
      if (status.ok) {
        toast.success("Incidencia reportada");
        setIsIncidenceDialogOpen(false);
        incidenceForm.reset({
          type: incidenceTypeOptions[0].value,
          description: "",
        });
        router.refresh();
        return;
      }
      toast.error(status.error);
    } catch {
      toast.error("No se pudo reportar la incidencia");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {conflictMessage ? (
          <Card className="border-amber-200 bg-amber-50/60 shadow-none dark:border-amber-900/60 dark:bg-amber-950/20">
            <CardContent className="pt-5">
              <p
                role="alert"
                aria-live="assertive"
                className="text-sm font-medium text-amber-900 dark:text-amber-100"
              >
                Otro usuario modificó este examen
              </p>
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                {conflictMessage}. Recarga para revisar la información actualizada.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-amber-400 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
                  onClick={() => {
                    setConflictMessage(null);
                    router.refresh();
                  }}
                >
                  Recargar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
                  onClick={() => setConflictMessage(null)}
                >
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{detail.examType.name}</CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Paciente: {detail.patient.fullName}
                  {detail.workOrder.accessionNumber
                    ? ` · Orden ${detail.workOrder.accessionNumber}`
                    : ""}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                  detail.exam.status === "approved" &&
                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
                  detail.exam.status === "rejected" &&
                    "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
                  detail.exam.status === "ready_for_validation" &&
                    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
                  detail.exam.status !== "approved" &&
                    detail.exam.status !== "rejected" &&
                    detail.exam.status !== "ready_for_validation" &&
                    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                )}
              >
                {statusLabel(detail.exam.status)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ValidationResultReadOnly detail={detail} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Contexto del examen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Paciente:</span>{" "}
              {detail.patient.fullName}
            </p>
            <p>
              <span className="text-muted-foreground">N° acceso:</span>{" "}
              {detail.workOrder.accessionNumber ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Tipo examen:</span>{" "}
              {detail.examType.name}
            </p>
            <p>
              <span className="text-muted-foreground">Técnico:</span>{" "}
              {detail.exam.performedBy ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Procesado:</span>{" "}
              {formatDateTime(detail.exam.resultedAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Muestra:</span>{" "}
              {detail.sample.barcode ?? detail.sample.id}
            </p>
            <p>
              <span className="text-muted-foreground">Recibida:</span>{" "}
              {formatDateTime(detail.sample.receivedAt)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Aprobar examen</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...approvalForm}>
              <form
                className="space-y-3"
                onSubmit={approvalForm.handleSubmit(() => setIsApproveConfirmOpen(true))}
              >
                <FormField
                  control={approvalForm.control}
                  name="comments"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Comentarios (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          id="approval-comments"
                          rows={3}
                          placeholder="Observaciones de aprobación"
                          aria-invalid={fieldState.invalid}
                          aria-describedby={
                            fieldState.invalid ? "approval-comments-error" : undefined
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage id="approval-comments-error" aria-live="polite" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={!canValidate || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Aprobar
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Rechazar examen</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...rejectionForm}>
              <form
                className="space-y-3"
                onSubmit={rejectionForm.handleSubmit(() => setIsRejectConfirmOpen(true))}
              >
                <FormField
                  control={rejectionForm.control}
                  name="reason"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Motivo de rechazo</FormLabel>
                      <FormControl>
                        <Input
                          id="rejection-reason"
                          placeholder="Ej. Muestra hemolizada"
                          aria-invalid={fieldState.invalid}
                          aria-describedby={
                            fieldState.invalid ? "rejection-reason-error" : undefined
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage id="rejection-reason-error" aria-live="polite" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={rejectionForm.control}
                  name="comments"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Comentarios (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          id="rejection-comments"
                          rows={3}
                          placeholder="Comentarios adicionales"
                          aria-invalid={fieldState.invalid}
                          aria-describedby={
                            fieldState.invalid ? "rejection-comments-error" : undefined
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage id="rejection-comments-error" aria-live="polite" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full rounded-full"
                  disabled={!canValidate || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Rechazar
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Incidencias</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              onClick={() => setIsIncidenceDialogOpen(true)}
              disabled={isSubmitting}
            >
              Reportar incidencia
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprobación</AlertDialogTitle>
            <AlertDialogDescription>
              El examen se marcará como aprobado y quedará auditado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(e) => {
                e.preventDefault();
                void handleApprove();
              }}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar aprobación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRejectConfirmOpen} onOpenChange={setIsRejectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar rechazo</AlertDialogTitle>
            <AlertDialogDescription>
              El examen se marcará como rechazado y quedará auditado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                void handleReject();
              }}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isIncidenceDialogOpen} onOpenChange={setIsIncidenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar incidencia</DialogTitle>
            <DialogDescription>
              Registra la incidencia para dejar trazabilidad de validación.
            </DialogDescription>
          </DialogHeader>

          <Form {...incidenceForm}>
            <form
              className="space-y-3"
              onSubmit={incidenceForm.handleSubmit((values) => void handleCreateIncidence(values))}
            >
              <FormField
                control={incidenceForm.control}
                name="type"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger
                          id="incidence-type"
                          aria-invalid={fieldState.invalid}
                          aria-describedby={
                            fieldState.invalid ? "incidence-type-error" : undefined
                          }
                        >
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {incidenceTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage id="incidence-type-error" aria-live="polite" />
                  </FormItem>
                )}
              />
              <FormField
                control={incidenceForm.control}
                name="description"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        id="incidence-description"
                        rows={4}
                        placeholder="Detalle de la incidencia"
                        aria-invalid={fieldState.invalid}
                        aria-describedby={
                          fieldState.invalid ? "incidence-description-error" : undefined
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage id="incidence-description-error" aria-live="polite" />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsIncidenceDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Guardar incidencia
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
