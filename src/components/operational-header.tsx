"use client";

import Image from "next/image";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/auth-context";

const ROLE_LABEL: Record<string, string> = {
  tecnico: "Técnico",
  supervisor: "Supervisor",
  admin: "Admin",
};

type OperationalHeaderProps = {
  roleLabel?: string;
  userLabel?: string;
};

export function OperationalHeader({ roleLabel, userLabel }: OperationalHeaderProps = {}) {
  const { state } = useAuth();
  const currentRole =
    roleLabel ?? (state.groups[0] ? (ROLE_LABEL[state.groups[0]] ?? state.groups[0]) : "Usuario");
  const displayName = userLabel ?? state.userName ?? state.userEmail ?? "Laboratorio";

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white backdrop-blur ">
      <div className="mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/images/logo-black.png" alt="LabCore" width={20} height={20} />
          <span className="text-lg font-semibold tracking-tight text-zinc-900">LabCore</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {currentRole}
            </p>
            <p className="max-w-44 truncate text-xs text-zinc-700">{displayName}</p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Notificaciones"
                className="text-zinc-700 hover:text-zinc-900"
              >
                <Bell className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Notificaciones</p>
              </div>
              <p className="text-muted-foreground px-4 py-5 text-sm">Sin notificaciones nuevas.</p>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
