import { DoctorDashboardClient } from "./doctor-dashboard-client";

const MOCK_STATS = {
  nuevos: 12,
  criticos: 2,
  pendientes: 5,
};

const MOCK_PATIENTS = [
  { id: "1", patientName: "María García", study: "Hemograma completo", status: "Listo", statusVariant: "normal" as const, date: "2025-02-20" },
  { id: "2", patientName: "Juan Pérez", study: "Perfil lipídico", status: "Crítico", statusVariant: "critical" as const, date: "2025-02-20" },
  { id: "3", patientName: "Ana López", study: "Glucosa", status: "Atención", statusVariant: "warning" as const, date: "2025-02-19" },
  { id: "4", patientName: "Carlos Ruiz", study: "TSH", status: "Listo", statusVariant: "normal" as const, date: "2025-02-19" },
];

export default function DoctorPage() {
  return (
    <div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
      <DoctorDashboardClient stats={MOCK_STATS} patients={MOCK_PATIENTS} />
    </div>
  );
}
