import { OperationalHeader } from "@/components/operational-header";
import { ReceptionInboxClient } from "./recepcion-inbox-client";

export default function ReceptionPage() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <OperationalHeader roleLabel="Recepción" userLabel="Recepción · Demo sin auth" />
      <ReceptionInboxClient />
    </div>
  );
}
