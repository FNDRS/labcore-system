"use client";

import { useState } from "react";
import { User, ListOrdered, ScanLine, Printer, Shield, HelpCircle, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function TechnicianSettingsClient() {
  const [prefs, setPrefs] = useState({
    showUrgentFirst: true,
    showOnlyMine: false,
    sortOrder: "priority" as "priority" | "time" | "patient",
    scanAutoOpen: true,
    scanAutoFocus: true,
    scanEnterConfirm: true,
    soundOnScanSuccess: true,
    soundOnScanError: true,
    highlightOnScan: true,
    confirmAnimation: true,
    confirmBeforeSave: true,
    autoLogoutMins: 30,
    lockAfterInactivity: true,
    confirmBeforeSendResults: true,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Configuración</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ajustes operativos (laptop/escritorio). Perfil, flujo, escaneo, impresora, seguridad.
        </p>
      </div>

      {/* 1) Perfil */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-zinc-500" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Nombre del técnico"
                className="rounded-lg"
                defaultValue=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="id">ID interno</Label>
              <Input
                id="id"
                placeholder="Ej. TEC-001"
                className="rounded-lg font-mono"
                defaultValue=""
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="area">Área / laboratorio</Label>
              <Input
                id="area"
                placeholder="Ej. Química clínica"
                className="rounded-lg"
                defaultValue=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift">Turno</Label>
              <Input id="shift" placeholder="Ej. Mañana" className="rounded-lg" defaultValue="" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" className="rounded-full">
              <Key className="size-3.5 mr-1.5" />
              Cambiar contraseña
            </Button>
            <Button variant="outline" size="sm" className="rounded-full">
              Cambiar PIN de acceso rápido
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2) Flujo de trabajo */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListOrdered className="size-4 text-zinc-500" />
            Flujo de trabajo
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Cómo se ordenan y filtran las muestras en la cola.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">Mostrar urgentes primero</Label>
            <Switch
              checked={prefs.showUrgentFirst}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, showUrgentFirst: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">Mostrar solo mis muestras</Label>
            <Switch
              checked={prefs.showOnlyMine}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, showOnlyMine: v }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Orden por defecto</Label>
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={prefs.sortOrder}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  sortOrder: e.target.value as "priority" | "time" | "patient",
                }))
              }
            >
              <option value="priority">Prioridad</option>
              <option value="time">Tiempo de espera</option>
              <option value="patient">Paciente</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 3) Escaneo */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="size-4 text-zinc-500" />
            Escaneo
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Input y lector. Feedback visual y auditivo (sin vibración; contexto escritorio).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <div>
              <Label className="text-sm font-medium">
                Abrir escáner/input al entrar a Muestras
              </Label>
              <p className="text-muted-foreground text-xs">Enfocar campo de escaneo al cargar</p>
            </div>
            <Switch
              checked={prefs.scanAutoOpen}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, scanAutoOpen: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">Enfocar input automáticamente</Label>
            <Switch
              checked={prefs.scanAutoFocus}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, scanAutoFocus: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">Confirmar scan con Enter</Label>
            <Switch
              checked={prefs.scanEnterConfirm}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, scanEnterConfirm: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">Sonido al escanear correctamente</Label>
            <Switch
              checked={prefs.soundOnScanSuccess}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, soundOnScanSuccess: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">Sonido de error</Label>
            <Switch
              checked={prefs.soundOnScanError}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, soundOnScanError: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">Highlight visual al detectar código</Label>
            <Switch
              checked={prefs.highlightOnScan}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, highlightOnScan: v }))}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <div>
              <Label className="text-sm font-medium">
                Confirmación antes de guardar resultados
              </Label>
            </div>
            <Switch
              checked={prefs.confirmBeforeSave}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, confirmBeforeSave: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* 4) Impresora / Estación */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Printer className="size-4 text-zinc-500" />
            Impresora y estación
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Trazabilidad: quién procesó qué desde qué equipo.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="printer">Impresora predeterminada</Label>
            <Input
              id="printer"
              placeholder="Seleccionar impresora"
              className="rounded-lg"
              defaultValue=""
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="station">Nombre de estación</Label>
              <Input
                id="station"
                placeholder="Ej. Estación 1"
                className="rounded-lg"
                defaultValue=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                placeholder="Ej. Lab. Química"
                className="rounded-lg"
                defaultValue=""
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reader">Puerto del lector de códigos</Label>
            <Input
              id="reader"
              placeholder="Opcional"
              className="rounded-lg font-mono"
              defaultValue=""
            />
          </div>
          <Button variant="outline" size="sm" className="rounded-full">
            <Printer className="size-3.5 mr-1.5" />
            Probar impresora
          </Button>
        </CardContent>
      </Card>

      {/* 5) Seguridad */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4 text-zinc-500" />
            Seguridad
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Cierre automático, bloqueo por inactividad, confirmar antes de enviar resultados.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <div>
              <Label className="text-sm font-medium">Cierre de sesión automático</Label>
              <p className="text-muted-foreground text-xs">Minutos de inactividad</p>
            </div>
            <Input
              type="number"
              min={5}
              max={120}
              className="w-20 rounded-lg text-center"
              value={prefs.autoLogoutMins}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, autoLogoutMins: Number(e.target.value) || 30 }))
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">Bloquear tras inactividad</Label>
            <Switch
              checked={prefs.lockAfterInactivity}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, lockAfterInactivity: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">
              Requerir confirmación para enviar resultados
            </Label>
            <Switch
              checked={prefs.confirmBeforeSendResults}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, confirmBeforeSendResults: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* 6) Soporte */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="size-4 text-zinc-500" />
            Soporte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-full">
              Reportar incidencia
            </Button>
            <Button variant="outline" size="sm" className="rounded-full">
              Enviar feedback
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Estado del sistema · Versión LabCore (POC)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
