"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { RegisterConfirmForm } from "./components/register-confirm-form";
import { RegisterSignUpForm } from "./components/register-sign-up-form";

function RegisterForm() {
  const searchParams = useSearchParams();
  const confirmMode = searchParams.get("confirm") === "1";
  const emailParam = searchParams.get("email") ?? "";

  const [step, setStep] = useState<"signup" | "confirm">(confirmMode ? "confirm" : "signup");
  const [signupEmail, setSignupEmail] = useState<string | null>(null);

  const emailFromUrl = confirmMode && emailParam ? decodeURIComponent(emailParam) : "";
  const confirmedEmail = signupEmail ?? emailFromUrl;

  const handleConfirmRequired = (email: string) => {
    setSignupEmail(email);
    setStep("confirm");
  };

  const handleUseOtherEmail = () => {
    setStep("signup");
    setSignupEmail(null);
  };

  const defaultEmail = emailFromUrl;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-zinc-800">
      <div className="w-full max-w-100 rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-700 dark:bg-zinc-950">
        <div className="flex items-center justify-center gap-2">
          <Image
            src="/images/logo-black.png"
            alt="LabCore"
            width={28}
            height={28}
            className="dark:invert"
          />
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            LabCore
          </h1>
        </div>
        <div className="mt-6 text-center">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            {step === "signup" ? "Crear cuenta" : "Confirmar correo"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {step === "signup"
              ? "Registro para técnicos"
              : "Ingresa el código que enviamos a tu correo"}
          </p>
        </div>

        {step === "signup" ? (
          <RegisterSignUpForm
            defaultEmail={defaultEmail}
            onConfirmRequired={handleConfirmRequired}
          />
        ) : (
          <RegisterConfirmForm
            email={confirmedEmail}
            onUseOtherEmail={handleUseOtherEmail}
          />
        )}

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-black underline hover:no-underline dark:text-white"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFormSkeleton />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterFormSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-zinc-800">
      <div className="w-full max-w-100 rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-700 dark:bg-zinc-950">
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
