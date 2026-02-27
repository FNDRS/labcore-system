"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  FileCheck,
  Key,
  LayoutDashboard,
  Shield,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SupervisorSettingsClient() {
  const [prefs, setPrefs] = useState({
    validationSortOrder: "pending" as "pending" | "critical" | "oldest",
    showClinicalFlagsFirst: true,
    notifyCriticalResults: true,
    notifyNewIncidents: true,
    dashboardDefaultRange: "30d" as "7d" | "30d" | "90d",
    autoLogoutMins: 30,
    lockAfterInactivity: true,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Preferencias del panel de validación y supervisión.
        </p>
      </div>

      {/* Perfil */}
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
                placeholder="Nombre del supervisor"
                className="rounded-lg border-zinc-200"
                defaultValue=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="id">ID interno</Label>
              <Input
                id="id"
                placeholder="Ej. SUP-001"
                className="rounded-lg border-zinc-200 font-mono"
                defaultValue=""
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" className="rounded-full">
              <Key className="size-3.5 mr-1.5" />
              Cambiar contraseña
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validación */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck className="size-4 text-zinc-500" />
            Validación
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Cómo se ordena la cola de resultados pendientes de validar.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Orden por defecto en cola</Label>
            <select
              className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
              value={prefs.validationSortOrder}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  validationSortOrder: e.target.value as "pending" | "critical" | "oldest",
                }))
              }
            >
              <option value="pending">Más recientes primero</option>
              <option value="critical">Críticos primero</option>
              <option value="oldest">Más antiguos primero</option>
            </select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">
              Destacar resultados con flag clínico (Atención/Crítico)
            </Label>
            <Switch
              checked={prefs.showClinicalFlagsFirst}
              onCheckedChange={(v) =>
                setPrefs((p) => ({ ...p, showClinicalFlagsFirst: v }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notificaciones */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4 text-zinc-500" />
            Notificaciones
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Alertas y avisos en el panel.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">
              Avisar cuando haya resultados críticos pendientes
            </Label>
            <Switch
              checked={prefs.notifyCriticalResults}
              onCheckedChange={(v) =>
                setPrefs((p) => ({ ...p, notifyCriticalResults: v }))
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">
              Avisar cuando se abra una nueva incidencia
            </Label>
            <Switch
              checked={prefs.notifyNewIncidents}
              onCheckedChange={(v) =>
                setPrefs((p) => ({ ...p, notifyNewIncidents: v }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Dashboard y analítica */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="size-4 text-zinc-500" />
            Dashboard y analítica
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Rango de fechas por defecto en gráficos y KPIs.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Rango por defecto</Label>
            <select
              className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
              value={prefs.dashboardDefaultRange}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  dashboardDefaultRange: e.target.value as "7d" | "30d" | "90d",
                }))
              }
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Seguridad */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4 text-zinc-500" />
            Seguridad
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Cierre de sesión y bloqueo por inactividad.
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
              className="w-20 rounded-lg border-zinc-200 text-center"
              value={prefs.autoLogoutMins}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  autoLogoutMins: Number(e.target.value) || 30,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <Label className="text-sm font-medium">Bloquear tras inactividad</Label>
            <Switch
              checked={prefs.lockAfterInactivity}
              onCheckedChange={(v) =>
                setPrefs((p) => ({ ...p, lockAfterInactivity: v }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Soporte */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Soporte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link href="/supervisor/incidencias">Ver incidencias</Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link href="/support">Centro de ayuda</Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            LabCore LIS · Versión POC
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
