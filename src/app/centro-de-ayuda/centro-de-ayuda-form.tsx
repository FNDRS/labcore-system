"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_SUBJECT = "Centro de ayuda - LabCore LIS";

type Props = { supportEmail: string };

export function CentroDeAyudaForm({ supportEmail }: Props) {
  const [asunto, setAsunto] = useState(DEFAULT_SUBJECT);
  const [mensaje, setMensaje] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(asunto.trim() || DEFAULT_SUBJECT);
    const body = encodeURIComponent(mensaje.trim() || "—");
    const mailto = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="centro-asunto">Asunto</Label>
        <Input
          id="centro-asunto"
          type="text"
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          placeholder="Resumen de su consulta"
          className="rounded-lg border-zinc-200"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="centro-mensaje">Mensaje</Label>
        <Textarea
          id="centro-mensaje"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Describa su consulta o problema con el mayor detalle posible..."
          rows={6}
          className="resize-y min-h-[120px] rounded-lg border-zinc-200"
          required
        />
      </div>
      <Button type="submit" className="rounded-full w-full sm:w-auto">
        Abrir correo para enviar
      </Button>
    </form>
  );
}
