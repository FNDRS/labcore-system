"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword, confirmResetPassword } from "aws-amplify/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const emailParam = searchParams.get("email") ?? "";

	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [step, setStep] = useState<"request" | "confirm">("request");

	useEffect(() => {
		if (emailParam) setEmail(decodeURIComponent(emailParam));
	}, [emailParam]);

	const handleRequestCode = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await resetPassword({ username: email.trim() });
			setStep("confirm");
		} catch (err: unknown) {
			const message =
				err && typeof err === "object" && "message" in err
					? String((err as { message: string }).message)
					: "Error al enviar el código. Revisa el correo.";
			setError(message);
		} finally {
			setLoading(false);
		}
	};

	const handleConfirmReset = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await confirmResetPassword({
				username: email.trim(),
				confirmationCode: code.trim(),
				newPassword,
			});
			router.replace("/login");
		} catch (err: unknown) {
			const message =
				err && typeof err === "object" && "message" in err
					? String((err as { message: string }).message)
					: "Código inválido o contraseña no cumple requisitos.";
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
					{step === "request" ? "Recuperar contraseña" : "Nueva contraseña"}
				</h2>
				<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
					{step === "request"
						? "Te enviaremos un código a tu correo"
						: "Ingresa el código y tu nueva contraseña"}
				</p>

				{step === "request" ? (
					<form onSubmit={handleRequestCode} className="mt-6 space-y-4">
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
							{loading ? "Enviando…" : "Enviar código"}
						</Button>
					</form>
				) : (
					<form onSubmit={handleConfirmReset} className="mt-6 space-y-4">
						<div className="space-y-2">
							<Label
								htmlFor="code"
								className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
							>
								Código
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
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="newPassword"
								className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
							>
								Nueva contraseña
							</Label>
							<Input
								id="newPassword"
								type="password"
								autoComplete="new-password"
								placeholder="················"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
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
							{loading ? "Guardando…" : "Cambiar contraseña"}
						</Button>
						<Button
							type="button"
							variant="ghost"
							className="w-full text-sm text-zinc-600 dark:text-zinc-400"
							onClick={() => setStep("request")}
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
