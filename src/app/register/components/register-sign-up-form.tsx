"use client";

import { useRouter } from "next/navigation";
import { signUp, autoSignIn } from "aws-amplify/auth";
import { getCurrentUser } from "aws-amplify/auth";
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

const signUpSchema = z.object({
  email: z
    .string()
    .email("Introduce un correo válido.")
    .min(1, "Introduce tu correo."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

type SignUpValues = z.infer<typeof signUpSchema>;

export interface RegisterSignUpFormProps {
  defaultEmail?: string;
  onConfirmRequired: (email: string) => void;
}

export function RegisterSignUpForm({
  defaultEmail = "",
  onConfirmRequired,
}: RegisterSignUpFormProps) {
  const router = useRouter();

  const form = useForm<SignUpValues>({
    resolver: standardSchemaResolver(signUpSchema),
    defaultValues: { email: defaultEmail, password: "" },
  });

  const handleAlreadySignedIn = async () => {
    try {
      await getCurrentUser();
      router.replace("/login");
      return true;
    } catch {
      return false;
    }
  };

  const onSubmit = async (values: SignUpValues) => {
    try {
      const signedIn = await handleAlreadySignedIn();
      if (signedIn) return;

      const { nextStep } = await signUp({
        username: values.email.trim(),
        password: values.password,
        options: {
          userAttributes: { email: values.email.trim() },
          autoSignIn: { authFlowType: "USER_AUTH" },
        },
      });

      if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        onConfirmRequired(values.email.trim());
        return;
      }

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
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Error al crear la cuenta.";
      form.setError("root", { message });
    }
  };

  const rootError = form.formState.errors.root?.message;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Correo
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="nombre@empresa.com"
                  spellCheck={false}
                  aria-invalid={fieldState.invalid}
                  className="h-11 rounded-lg border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                />
              </FormControl>
              <FormMessage className="text-red-600 dark:text-red-400" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Contraseña
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="················"
                  aria-invalid={fieldState.invalid}
                  className="h-11 rounded-lg border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                />
              </FormControl>
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
          {form.formState.isSubmitting ? "Enviando…" : "Registrarme"}
        </Button>
      </form>
    </Form>
  );
}
