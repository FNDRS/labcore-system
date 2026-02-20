"use client";

import { useRef } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ScanBar({
  scanValue,
  onScanChange,
  onScan,
  onOpenScanModal,
}: {
  scanValue: string;
  onScanChange: (v: string) => void;
  onScan: () => void;
  onOpenScanModal: () => void;
  lastScannedId: string | null;
  scannerStatus: "listo" | "ocupado" | "error";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <label
          htmlFor="scan-input"
          className="text-muted-foreground text-sm font-medium"
        >
          Escanear muestra:
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
          <Input
            ref={inputRef}
            id="scan-input"
            name="sample-scan"
            type="text"
            placeholder="Código o ID (#LC-9024)"
            value={scanValue}
            onChange={(e) => onScanChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onScan()}
            className="rounded-full font-mono shadow-none focus-visible:ring-0"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            autoFocus
          />
          <Button
            type="button"
            className="rounded-full bg-primary hover:bg-primary/90 focus-visible:ring-primary"
            onClick={onOpenScanModal}
          >
            <ScanLine className="size-4 sm:mr-1" />
            <span className="hidden sm:inline">Escanear</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
