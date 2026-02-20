"use client";

import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ScanSampleDialog({
  open,
  onOpenChange,
  scanValue,
  onScanChange,
  onConfirmScan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanValue: string;
  onScanChange: (v: string) => void;
  onConfirmScan: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="size-5 text-orange-500" />
            Escanear muestra
          </DialogTitle>
          <DialogDescription>
            Pasa el código por el lector o escribe el ID manualmente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <label
            htmlFor="scan-modal-input"
            className="text-muted-foreground text-sm"
          >
            Código o ID de muestra
          </label>
          <Input
            id="scan-modal-input"
            name="sample-scan-modal"
            type="text"
            placeholder="Ej. #LC-9024"
            value={scanValue}
            onChange={(e) => onScanChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onConfirmScan()}
            className="rounded-full font-mono shadow-none focus-visible:ring-0"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-full bg-primary hover:bg-primary/90 focus-visible:ring-primary"
            onClick={onConfirmScan}
          >
            Escanear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
