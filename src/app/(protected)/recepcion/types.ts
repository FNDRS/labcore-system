export type Priority = "Urgente" | "Rutina";
export type ReceptionStatus = "Sin muestras" | "Muestras creadas" | "Procesando";
export type QuickFilter = "Todas" | "Hoy" | "Urgentes" | "Sin muestras" | "Listas";
export type PrintState = "pending" | "generating" | "printed" | "error";

export type ReceptionOrder = {
  /** Backend WorkOrder.id — use for mutations. */
  id: string;
  /** Display label (accession or short id). */
  displayId: string;
  patientName: string;
  patientAge: number;
  doctor: string;
  tests: string[];
  priority: Priority;
  status: ReceptionStatus;
  notes: string;
  createdAt: string;
  isNew?: boolean;
};

export type GeneratedSpecimen = {
  tubeLabel: string;
  examCount: number;
  specimenCode: string;
};

export type GenerationModalState = {
  open: boolean;
  orderId: string;
  displayId: string;
  patientName: string;
  specimens: GeneratedSpecimen[];
  printState: PrintState;
  printAttempts: number;
};
