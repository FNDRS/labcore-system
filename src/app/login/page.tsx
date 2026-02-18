"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "aws-amplify/auth";
import { getCurrentUser } from "aws-amplify/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAlreadySignedIn = async () => {
    try {
      await getCurrentUser();
      router.replace("/");
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const signedIn = await handleAlreadySignedIn();
      if (signedIn) return;

      const { nextStep } = await signIn({
        username: email.trim(),
        password,
      });

      if (nextStep.signInStep === "CONFIRM_SIGN_UP") {
        router.push(
          "/register?confirm=1&email=" + encodeURIComponent(email.trim()),
        );
        return;
      }
      if (nextStep.signInStep === "RESET_PASSWORD") {
        router.push(
          "/forgot-password?email=" + encodeURIComponent(email.trim()),
        );
        return;
      }
      if (nextStep.signInStep === "DONE") {
        router.replace("/");
        return;
      }
      // Cognito can return other steps (e.g. MFA); we only handle CONFIRM_SIGN_UP, RESET_PASSWORD, DONE
      setError(
        "Se requiere un paso adicional. Prueba desde la consola de Cognito o contacta al administrador.",
      );
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Error al iniciar sesión. Revisa email y contraseña.";
      setError(message);
    } finally {
      setLoading(false);
    }
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
            priority
          />
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            LabCore
          </h1>
        </div>
        <h2 className="mt-6 text-xl font-semibold text-black dark:text-white">
          Bienvenido de nuevo
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Introduce tus datos para acceder a tu cuenta
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Correo
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nombre@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-lg border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                Contraseña
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-zinc-600 underline hover:text-black dark:text-zinc-400 dark:hover:text-white"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="················"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-lg border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-11 w-full rounded-lg bg-black text-sm font-medium uppercase tracking-wide text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            disabled={loading}
          >
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200 dark:border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              <span className="bg-white px-2 dark:bg-zinc-950">
                O continúa con
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-11 w-full rounded-lg border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
            disabled
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-black underline hover:no-underline dark:text-white"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
