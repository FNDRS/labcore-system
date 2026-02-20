"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, ScanBarcode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ScanStatus = "idle" | "manual" | "searching" | "not_found";

type ReceptionScanOverlayProps = {
  open: boolean;
  status: ScanStatus;
  onClose: () => void;
  onManualEntry: () => void;
  onBackToScan: () => void;
  onRetry: () => void;
  onScannedCode: (code: string) => void;
};

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // ignore if AudioContext not supported
  }
}

export function ReceptionScanOverlay({
  open,
  status,
  onClose,
  onManualEntry,
  onBackToScan,
  onRetry,
  onScannedCode,
}: ReceptionScanOverlayProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [manualValue, setManualValue] = useState("");

  useEffect(() => {
    if (open && status === "idle") {
      hiddenInputRef.current?.focus();
    }
  }, [open, status]);

  useEffect(() => {
    if (open && status === "manual") {
      setManualValue("");
      manualInputRef.current?.focus();
    }
  }, [open, status]);

  function handleHiddenKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const value = (e.target as HTMLInputElement).value.trim();
    if (!value) return;
    playBeep();
    (e.target as HTMLInputElement).value = "";
    onScannedCode(value);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = manualValue.trim();
    if (!value) return;
    onScannedCode(value);
    setManualValue("");
  }

  if (!open) return null;

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      className="absolute top-4 right-4 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      aria-label="Cerrar"
    >
      <X className="size-5" />
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Modo escáner"
    >
      <input
        ref={hiddenInputRef}
        type="text"
        autoComplete="off"
        className="absolute h-0 w-0 opacity-0"
        aria-label="Código de orden"
        onKeyDown={handleHiddenKeyDown}
      />

      {status === "searching" ? (
        <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white px-8 py-12">
          {closeButton}
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-12 animate-spin text-zinc-600" aria-hidden />
            <p className="text-lg font-medium text-zinc-900">Buscando orden…</p>
          </div>
        </div>
      ) : status === "manual" ? (
        <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white px-8 py-8">
          {closeButton}
          <p className="text-center text-lg font-semibold text-zinc-900">Ingresar código de orden</p>
          <form onSubmit={handleManualSubmit} className="mt-6 space-y-4">
            <Input
              ref={manualInputRef}
              type="text"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Ej. 1042 o #1042"
              className="rounded-full"
              aria-label="Código de orden"
            />
            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full rounded-full" disabled={!manualValue.trim()}>
                Buscar orden
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-full text-zinc-600"
                onClick={onBackToScan}
              >
                <ArrowLeft className="mr-2 size-4" />
                Volver al escáner
              </Button>
            </div>
          </form>
        </div>
      ) : status === "not_found" ? (
        <div className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6">
          {closeButton}
          <p className="text-center text-lg font-semibold text-zinc-900">Orden no encontrada</p>
          <p className="text-muted-foreground mt-1 text-center text-sm">
            Verifique el código e intente de nuevo.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button className="rounded-full" onClick={onRetry}>
              Reintentar escaneo
            </Button>
            <Button variant="outline" className="rounded-full" onClick={onManualEntry}>
              Ingresar manualmente
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white px-8 py-12">
          {closeButton}
          <div className="flex flex-col items-center gap-6">
            <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100">
              <ScanBarcode className="size-8 text-zinc-700" />
            </div>
            <p className="text-center text-xl font-semibold text-zinc-900">
              Escanee el código de la orden
            </p>
            <p className="text-muted-foreground -mt-2 text-center text-sm">
              El lector enviará el código automáticamente
            </p>
            <Button
              variant="outline"
              className="w-full max-w-xs rounded-full border-zinc-300"
              onClick={onManualEntry}
            >
              Escribir código manualmente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

