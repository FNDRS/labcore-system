"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword, confirmResetPassword } from "aws-amplify/auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const requestSchema = z.object({
  email: z.email("Introduce un correo válido.").min(1, "Introduce tu correo."),
});

const confirmSchema = z.object({
  code: z.string().min(1, "Introduce el código."),
  newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

type RequestValues = z.infer<typeof requestSchema>;
type ConfirmValues = z.infer<typeof confirmSchema>;

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? "";

  const [apiError, setApiError] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  const requestForm = useForm<RequestValues>({
    resolver: standardSchemaResolver(requestSchema),
    defaultValues: { email: emailParam ? decodeURIComponent(emailParam) : "" },
  });
  const { reset: resetRequestForm } = requestForm;

  const confirmForm = useForm<ConfirmValues>({
    resolver: standardSchemaResolver(confirmSchema),
    defaultValues: { code: "", newPassword: "" },
  });

  useEffect(() => {
    if (emailParam) {
      resetRequestForm({ email: decodeURIComponent(emailParam) });
    }
  }, [emailParam, resetRequestForm]);

  const step = submittedEmail ? "confirm" : "request";

  const onRequestSubmit = async (values: RequestValues) => {
    setApiError("");
    try {
      await resetPassword({ username: values.email.trim() });
      setSubmittedEmail(values.email.trim());
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Error al enviar el código. Revisa el correo.";
      setApiError(message);
    }
  };

  const onConfirmSubmit = async (values: ConfirmValues) => {
    setApiError("");
    try {
      await confirmResetPassword({
        username: submittedEmail,
        confirmationCode: values.code.trim(),
        newPassword: values.newPassword,
      });
      router.replace("/login");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Código inválido o contraseña no cumple requisitos.";
      setApiError(message);
    }
  };

  const handleUseOtherEmail = () => {
    setSubmittedEmail("");
    setApiError("");
    confirmForm.reset({ code: "", newPassword: "" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-zinc-800">
      <div className="w-full max-w-[400px] rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-700 dark:bg-zinc-950">
        <div className="flex items-center justify-center gap-2">
          <Image
            src="/images/logo-black.png"
            alt="LabCore"
            width={28}
            height={28}
            className="dark:invert"
          />
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">LabCore</h1>
        </div>
        <div className="mt-6 text-center">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            {step === "request" ? "Recuperar contraseña" : "Nueva contraseña"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {step === "request"
              ? "Te enviaremos un código a tu correo"
              : "Ingresa el código y tu nueva contraseña"}
          </p>
        </div>

        {step === "request" ? (
          <Form {...requestForm}>
            <form
              onSubmit={requestForm.handleSubmit(onRequestSubmit)}
              className="mt-6 space-y-4"
              noValidate
            >
              <FormField
                control={requestForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Correo
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder="nombre@empresa.com"
                        spellCheck={false}
                        className="h-11 rounded-lg border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                      />
                    </FormControl>
                    <FormMessage className="text-red-600 dark:text-red-400" />
                  </FormItem>
                )}
              />
              {apiError && (
                <p
                  className="text-sm text-red-600 dark:text-red-400"
                  role="alert"
                  aria-live="polite"
                >
                  {apiError}
                </p>
              )}
              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-black text-sm font-medium uppercase tracking-wide text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                disabled={requestForm.formState.isSubmitting}
              >
                {requestForm.formState.isSubmitting ? "Enviando…" : "Enviar código"}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...confirmForm}>
            <form
              onSubmit={confirmForm.handleSubmit(onConfirmSubmit)}
              className="mt-6 space-y-4"
              noValidate
            >
              <FormField
                control={confirmForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Código
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        spellCheck={false}
                        className="h-11 rounded-lg border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                      />
                    </FormControl>
                    <FormMessage className="text-red-600 dark:text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={confirmForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Nueva contraseña
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        autoComplete="new-password"
                        placeholder="················"
                        className="h-11 rounded-lg border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                      />
                    </FormControl>
                    <FormMessage className="text-red-600 dark:text-red-400" />
                  </FormItem>
                )}
              />
              {apiError && (
                <p
                  className="text-sm text-red-600 dark:text-red-400"
                  role="alert"
                  aria-live="polite"
                >
                  {apiError}
                </p>
              )}
              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-black text-sm font-medium uppercase tracking-wide text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                disabled={confirmForm.formState.isSubmitting}
              >
                {confirmForm.formState.isSubmitting ? "Guardando…" : "Cambiar contraseña"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm text-zinc-600 dark:text-zinc-400"
                onClick={handleUseOtherEmail}
              >
                Usar otro correo
              </Button>
            </form>
          </Form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/"
            className="font-medium text-black underline hover:no-underline dark:text-white"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFormSkeleton />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordFormSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-zinc-800">
      <div className="w-full max-w-[400px] rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-700 dark:bg-zinc-950">
        <div className="flex items-center justify-center gap-2">
          <div className="h-7 w-7 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-7 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="mt-6 h-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-6 space-y-4">
          <div className="h-11 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-11 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
