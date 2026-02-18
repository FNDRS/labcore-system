"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, confirmSignUp, autoSignIn } from "aws-amplify/auth";
import { getCurrentUser } from "aws-amplify/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const confirmMode = searchParams.get("confirm") === "1";
	const emailParam = searchParams.get("email") ?? "";

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [step, setStep] = useState<"signup" | "confirm">(confirmMode ? "confirm" : "signup");

	useEffect(() => {
		if (confirmMode && emailParam) setEmail(decodeURIComponent(emailParam));
	}, [confirmMode, emailParam]);

	const handleAlreadySignedIn = async () => {
		try {
			await getCurrentUser();
			router.replace("/");
			return true;
		} catch {
			return false;
		}
	};

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const signedIn = await handleAlreadySignedIn();
			if (signedIn) return;

			const { nextStep } = await signUp({
				username: email.trim(),
				password,
				options: {
					userAttributes: { email: email.trim() },
					autoSignIn: { authFlowType: "USER_AUTH" },
				},
			});

			if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
				setStep("confirm");
			} else if (nextStep.signUpStep === "DONE" || nextStep.signUpStep === "COMPLETE_AUTO_SIGN_IN") {
				try {
					await autoSignIn();
				} catch {}
				router.replace("/");
			}
		} catch (err: unknown) {
			const message = err && typeof err === "object" && "message" in err
				? String((err as { message: string }).message)
				: "Error al crear la cuenta.";
			setError(message);
		} finally {
			setLoading(false);
		}
	};

	const handleConfirm = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const { nextStep } = await confirmSignUp({
				username: email.trim(),
				confirmationCode: code.trim(),
			});

			if (nextStep.signUpStep === "DONE" || nextStep.signUpStep === "COMPLETE_AUTO_SIGN_IN") {
				try {
					await autoSignIn();
				} catch {}
				router.replace("/");
			} else {
				setError("Código inválido o expirado.");
			}
		} catch (err: unknown) {
			const message = err && typeof err === "object" && "message" in err
				? String((err as { message: string }).message)
				: "Error al confirmar. Revisa el código.";
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
					/>
					<h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
						LabCore
					</h1>
				</div>
				<h2 className="mt-6 text-xl font-semibold text-black dark:text-white">
					{step === "signup" ? "Crear cuenta" : "Confirmar correo"}
				</h2>
				<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
					{step === "signup"
						? "Registro para técnicos"
						: "Ingresa el código que enviamos a tu correo"}
				</p>

				{step === "signup" ? (
					<form onSubmit={handleSignUp} className="mt-6 space-y-4">
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
							<Label
								htmlFor="password"
								className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
							>
								Contraseña
							</Label>
							<Input
								id="password"
								type="password"
								autoComplete="new-password"
								placeholder="················"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="h-11 rounded-lg border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
								required
								minLength={8}
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
							{loading ? "Enviando…" : "Registrarme"}
						</Button>
					</form>
				) : (
					<form onSubmit={handleConfirm} className="mt-6 space-y-4">
						<div className="space-y-2">
							<Label
								htmlFor="code"
								className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
							>
								Código de verificación
							</Label>
							<Input
								id="code"
								type="text"
								inputMode="numeric"
								autoComplete="one-time-code"
								placeholder="123456"
								value={code}
								onChange={(e) => setCode(e.target.value)}
								className="h-11 rounded-lg border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
								required
							/>
							<p className="text-xs text-zinc-500 dark:text-zinc-400">
								Enviado a {email || "tu correo"}
							</p>
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
							{loading ? "Comprobando…" : "Confirmar"}
						</Button>
						<Button
							type="button"
							variant="ghost"
							className="w-full text-sm text-zinc-600 dark:text-zinc-400"
							onClick={() => setStep("signup")}
						>
							Usar otro correo
						</Button>
					</form>
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
