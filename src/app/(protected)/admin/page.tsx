import { AdminClient } from "./admin-client";

export default function AdminPage() {
  return (
    <div className="max-w-4xl">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administración del sistema y utilidades.
        </p>
        <div className="mt-6">
          <h2 className="text-sm font-medium text-zinc-700">Generar datos de prueba</h2>
          <AdminClient />
        </div>
      </div>
    </div>
  );
}
