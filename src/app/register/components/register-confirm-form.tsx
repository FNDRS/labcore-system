"use client";

import { useRouter } from "next/navigation";
import { confirmSignUp, autoSignIn } from "aws-amplify/auth";
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

const confirmSchema = z.object({
  code: z.string().min(1, "Introduce el código de verificación."),
});

type ConfirmValues = z.infer<typeof confirmSchema>;

export interface RegisterConfirmFormProps {
  email: string;
  onUseOtherEmail: () => void;
}

export function RegisterConfirmForm({ email, onUseOtherEmail }: RegisterConfirmFormProps) {
  const router = useRouter();

  if (!email) {
    return (
      <div className="mt-6 space-y-4">
        <p
          className="text-sm text-zinc-600 dark:text-zinc-400"
          role="status"
        >
          No se encontró el correo. Regístrate de nuevo o usa el enlace del correo.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={onUseOtherEmail}
        >
          Usar otro correo
        </Button>
      </div>
    );
  }

  const form = useForm<ConfirmValues>({
    resolver: standardSchemaResolver(confirmSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = async (values: ConfirmValues) => {
    try {
      const { nextStep } = await confirmSignUp({
        username: email,
        confirmationCode: values.code.trim(),
      });

      if (
        nextStep.signUpStep === "DONE" ||
        nextStep.signUpStep === "COMPLETE_AUTO_SIGN_IN"
      ) {
        try {
          await autoSignIn();
        } catch {
          /* ignore */
        }
        router.replace("/login");
        return;
      }

      form.setError("root", { message: "Código inválido o expirado." });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Error al confirmar. Revisa el código.";
      form.setError("root", { message });
    }
  };

  const rootError = form.formState.errors.root?.message;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-6 space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="code"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Código de verificación
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  spellCheck={false}
                  aria-invalid={fieldState.invalid}
                  className="h-11 rounded-lg border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                />
              </FormControl>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Enviado a {email || "tu correo"}
              </p>
              <FormMessage className="text-red-600 dark:text-red-400" />
            </FormItem>
          )}
        />
        {rootError && (
          <p
            className="text-sm text-red-600 dark:text-red-400"
            role="alert"
            aria-live="polite"
          >
            {rootError}
          </p>
        )}
        <Button
          type="submit"
          className="h-11 w-full rounded-lg bg-black text-sm font-medium uppercase tracking-wide text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Comprobando…" : "Confirmar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-sm text-zinc-600 dark:text-zinc-400"
          onClick={onUseOtherEmail}
        >
          Usar otro correo
        </Button>
      </form>
    </Form>
  );
}
