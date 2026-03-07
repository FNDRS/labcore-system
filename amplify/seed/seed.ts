/**
 * MEGA seed for LIS operational + BI scenarios.
 *
 * Purpose:
 * - Populate enough realistic data for end-to-end flow:
 *   reception -> technician -> supervisor validation -> BI insights
 * - Cover 7 days of activity with mixed statuses and incidents
 * - Feed all implemented supervisor routes:
 *   resultados, auditoria, incidencias, analitica
 *
 * Run:
 *   npx ampx sandbox seed
 */

import { readFile } from "node:fs/promises";
import { addToUserGroup, createAndSignUpUser } from "@aws-amplify/seed";
import { Amplify } from "aws-amplify";
import * as auth from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../data/resource";

const SEED_USERS = [
  // { username: "vas.claudio15+admin@icloud.com", group: "admin" },
  // { username: "vas.claudio15+recepcion@icloud.com", group: "recepcion" },
  // { username: "vas.claudio15+tecnico@icloud.com", group: "tecnico" },
  // { username: "vas.claudio15+supervisor@icloud.com", group: "supervisor" },
  { username: "marlongeo1999+admin@gmail.com", group: "admin" },
  { username: "marlongeo1999+recepcion@gmail.com", group: "recepcion" },
  { username: "marlongeo1999+tecnico@gmail.com", group: "tecnico" },
  { username: "marlongeo1999+supervisor@gmail.com", group: "supervisor" },
] as const;

const SEED_PASSWORD = "Cambio123@@";

const AUDIT_ACTIONS = {
  ORDER_CREATED: "ORDER_CREATED",
  SPECIMENS_GENERATED: "SPECIMENS_GENERATED",
  LABEL_PRINTED: "LABEL_PRINTED",
  LABEL_REPRINTED: "LABEL_REPRINTED",
  ORDER_READY_FOR_LAB: "ORDER_READY_FOR_LAB",
  SPECIMEN_SCANNED: "SPECIMEN_SCANNED",
  SPECIMEN_RECEIVED: "SPECIMEN_RECEIVED",
  SPECIMEN_IN_PROGRESS: "SPECIMEN_IN_PROGRESS",
  SPECIMEN_COMPLETED: "SPECIMEN_COMPLETED",
  SPECIMEN_REJECTED: "SPECIMEN_REJECTED",
  EXAM_STARTED: "EXAM_STARTED",
  EXAM_RESULTS_SAVED: "EXAM_RESULTS_SAVED",
  EXAM_SENT_TO_VALIDATION: "EXAM_SENT_TO_VALIDATION",
  EXAM_APPROVED: "EXAM_APPROVED",
  EXAM_REJECTED: "EXAM_REJECTED",
  INCIDENCE_CREATED: "INCIDENCE_CREATED",
} as const;

const AUDIT_ENTITY_TYPES = {
  WORK_ORDER: "WorkOrder",
  SAMPLE: "Sample",
  EXAM: "Exam",
} as const;

type Priority = "routine" | "urgent" | "stat";
type WorkOrderStatus = "pending" | "inprogress" | "completed";
type SampleStatus =
  | "pending"
  | "labeled"
  | "ready_for_lab"
  | "received"
  | "inprogress"
  | "completed"
  | "rejected";
type ExamStatus =
  | "pending"
  | "inprogress"
  | "completed"
  | "review"
  | "ready_for_validation"
  | "approved"
  | "rejected";
type Scenario = "reception_only" | "ready_for_lab" | "processing" | "validation_queue" | "terminal";
type Signal = "normal" | "attention" | "critical";

const CONFIG = {
  seed: 20260225,
  daysBack: 7,
  totalPatients: 35,
  totalWorkOrders: 55,
} as const;

// Schemas aligned with docs/Reportes de laboratorio Claudio.pdf

const UROANALYSIS_SCHEMA = {
  sections: [
    {
      id: "macroscopico",
      label: "Examen Macroscopico",
      fields: [
        { key: "color", label: "Color", type: "string" },
        { key: "olor", label: "Olor", type: "string" },
        { key: "opacidad", label: "Opacidad", type: "string" },
      ],
    },
    {
      id: "quimico",
      label: "Examen Quimico",
      fields: [
        { key: "ph", label: "pH", type: "numeric", referenceRange: "5-6" },
        {
          key: "proteinas",
          label: "Proteinas",
          type: "enum",
          options: ["negativo", "trazas", "+", "++", "+++"],
          referenceRange: "negativo",
        },
        {
          key: "glucosa",
          label: "Glucosa",
          type: "enum",
          options: ["negativo", "trazas", "+", "++", "+++"],
          referenceRange: "negativo",
        },
        {
          key: "cetonas",
          label: "Cetonas",
          type: "enum",
          options: ["negativo", "trazas", "+", "++", "+++"],
          referenceRange: "negativo",
        },
        {
          key: "sangreOculta",
          label: "Sangre Oculta",
          type: "enum",
          options: ["negativo", "trazas", "+", "++", "+++"],
          referenceRange: "negativo",
        },
        {
          key: "bilirrubina",
          label: "Bilirrubina",
          type: "enum",
          options: ["negativo", "trazas", "+", "++", "+++"],
          referenceRange: "negativo",
        },
        {
          key: "urobilinogeno",
          label: "Urobilinogeno",
          type: "enum",
          options: ["negativo", "trazas", "+", "++", "+++"],
          referenceRange: "negativo",
        },
        {
          key: "nitritos",
          label: "Nitritos",
          type: "enum",
          options: ["negativo", "trazas", "+", "++", "+++"],
          referenceRange: "negativo",
        },
        {
          key: "esterasaLeucocitaria",
          label: "Esterasa Leucocitaria",
          type: "enum",
          options: ["negativo", "trazas", "+", "++", "+++"],
          referenceRange: "negativo",
        },
        {
          key: "gravedadEspecifica",
          label: "Gravedad Especifica",
          type: "numeric",
          referenceRange: "1.005-1.030",
        },
      ],
    },
    {
      id: "microscopico",
      label: "Examen Microscopico",
      fields: [
        { key: "leucocitos", label: "Leucocitos", type: "numeric", referenceRange: "0-4" },
        { key: "eritrocitos", label: "Eritrocitos", type: "numeric", referenceRange: "0-4" },
        {
          key: "celulasEpiteliales",
          label: "Celulas Epiteliales",
          type: "numeric",
          referenceRange: "0-4",
        },
        { key: "cristales", label: "Cristales", type: "string" },
        { key: "cilindros", label: "Cilindros", type: "string" },
        { key: "bacterias", label: "Bacterias", type: "string" },
        { key: "levaduras", label: "Levaduras", type: "string" },
        { key: "estructurasMicoticas", label: "Estructuras Micoticas", type: "string" },
        { key: "parasitos", label: "Parasitos", type: "string" },
        { key: "otrasObservaciones", label: "Otras Observaciones", type: "string" },
      ],
    },
  ],
};

const CBC_SCHEMA = {
  sections: [
    {
      id: "serieRoja",
      label: "Serie Roja",
      fields: [
        {
          key: "rbc",
          label: "Eritrocitos (RBC)",
          type: "numeric",
          unit: "x10^6/uL",
          referenceRange: "4.0-5.5",
        },
        {
          key: "hb",
          label: "Hemoglobina (Hb)",
          type: "numeric",
          unit: "g/dL",
          referenceRange: "12.0-17.5",
        },
        {
          key: "hto",
          label: "Hematocrito (Hto)",
          type: "numeric",
          unit: "%",
          referenceRange: "36-52",
        },
        { key: "vcm", label: "VCM", type: "numeric", unit: "fL", referenceRange: "80-100" },
        { key: "hcm", label: "HCM", type: "numeric", unit: "pg", referenceRange: "27-33" },
        { key: "chcm", label: "CHCM", type: "numeric", unit: "g/dL", referenceRange: "32-36" },
        { key: "rdwCV", label: "RDW-CV", type: "numeric", unit: "%", referenceRange: "11.5-14.5" },
        { key: "rdwSD", label: "RDW-SD", type: "numeric", unit: "fL" },
      ],
    },
    {
      id: "serieBlanca",
      label: "Serie Blanca",
      fields: [
        {
          key: "wbc",
          label: "Leucocitos totales (WBC)",
          type: "numeric",
          unit: "x10^3/uL",
          referenceRange: "4.0-11.0",
        },
      ],
    },
    {
      id: "diferencialPorcentual",
      label: "Diferencial Porcentual",
      fields: [
        {
          key: "neutrofilosPct",
          label: "Neutrofilos",
          type: "numeric",
          unit: "%",
          referenceRange: "40-70",
        },
        {
          key: "linfocitosPct",
          label: "Linfocitos",
          type: "numeric",
          unit: "%",
          referenceRange: "20-45",
        },
        {
          key: "monocitosPct",
          label: "Monocitos",
          type: "numeric",
          unit: "%",
          referenceRange: "2-10",
        },
        {
          key: "eosinofilosPct",
          label: "Eosinofilos",
          type: "numeric",
          unit: "%",
          referenceRange: "1-6",
        },
        {
          key: "basofilosPct",
          label: "Basofilos",
          type: "numeric",
          unit: "%",
          referenceRange: "0-2",
        },
      ],
    },
    {
      id: "diferencialAbsoluto",
      label: "Diferencial Absoluto",
      fields: [
        {
          key: "neutrofilosAbs",
          label: "Neutrofilos abs",
          type: "numeric",
          unit: "x10^3/uL",
          referenceRange: "1.8-7.5",
        },
        {
          key: "linfocitosAbs",
          label: "Linfocitos abs",
          type: "numeric",
          unit: "x10^3/uL",
          referenceRange: "1.0-4.0",
        },
        {
          key: "monocitosAbs",
          label: "Monocitos abs",
          type: "numeric",
          unit: "x10^3/uL",
          referenceRange: "0.2-0.8",
        },
        {
          key: "eosinofilosAbs",
          label: "Eosinofilos abs",
          type: "numeric",
          unit: "x10^3/uL",
          referenceRange: "0.05-0.5",
        },
        {
          key: "basofilosAbs",
          label: "Basofilos abs",
          type: "numeric",
          unit: "x10^3/uL",
          referenceRange: "0-0.2",
        },
      ],
    },
    {
      id: "seriePlaquetaria",
      label: "Serie Plaquetaria",
      fields: [
        {
          key: "plt",
          label: "Plaquetas (PLT)",
          type: "numeric",
          unit: "x10^3/uL",
          referenceRange: "150-450",
        },
        { key: "vpm", label: "VPM (MPV)", type: "numeric", unit: "fL", referenceRange: "7.5-11.5" },
        { key: "pdw", label: "PDW", type: "numeric", unit: "fL", referenceRange: "9-17" },
        {
          key: "pct",
          label: "Plaquetocrito (PCT)",
          type: "numeric",
          unit: "%",
          referenceRange: "0.15-0.40",
        },
      ],
    },
  ],
};

const CHEMISTRY_SCHEMA = {
  sections: [
    {
      id: "quimica",
      label: "Quimica Sanguinea",
      fields: [
        {
          key: "glucosaAyunas",
          label: "Glucosa en ayunas",
          type: "numeric",
          unit: "mg/dL",
          referenceRange: "70-99",
        },
        {
          key: "glucosaPostprandial",
          label: "Glucosa postprandial",
          type: "numeric",
          unit: "mg/dL",
        },
        { key: "urea", label: "Urea", type: "numeric", unit: "mg/dL" },
        { key: "bun", label: "Nitrogeno ureico (BUN)", type: "numeric", unit: "mg/dL" },
        {
          key: "creatinina",
          label: "Creatinina",
          type: "numeric",
          unit: "mg/dL",
          referenceRange: "0.6-1.2",
        },
        { key: "acidoUrico", label: "Acido urico", type: "numeric", unit: "mg/dL" },
        { key: "alt", label: "ALT (TGP)", type: "numeric", unit: "U/L" },
        { key: "ast", label: "AST (TGO)", type: "numeric", unit: "U/L" },
        {
          key: "fosfatasaAlcalina",
          label: "Fosfatasa alcalina (FA)",
          type: "numeric",
          unit: "U/L",
        },
        { key: "ggt", label: "Gamma-glutamil transferasa (GGT)", type: "numeric", unit: "U/L" },
        { key: "bilirrubinaTotal", label: "Bilirrubina total", type: "numeric", unit: "mg/dL" },
        { key: "bilirrubinaDirecta", label: "Bilirrubina directa", type: "numeric", unit: "mg/dL" },
        { key: "proteinasTotales", label: "Proteinas totales", type: "numeric", unit: "g/dL" },
        { key: "albumina", label: "Albumina", type: "numeric", unit: "g/dL" },
        {
          key: "colesterolTotal",
          label: "Colesterol total",
          type: "numeric",
          unit: "mg/dL",
          referenceRange: "120-200",
        },
        { key: "colesterolHDL", label: "Colesterol HDL", type: "numeric", unit: "mg/dL" },
        { key: "colesterolLDL", label: "Colesterol LDL", type: "numeric", unit: "mg/dL" },
        { key: "trigliceridos", label: "Trigliceridos", type: "numeric", unit: "mg/dL" },
        { key: "sodio", label: "Sodio (Na+)", type: "numeric", unit: "mEq/L" },
        { key: "potasio", label: "Potasio (K+)", type: "numeric", unit: "mEq/L" },
        { key: "cloro", label: "Cloro (Cl-)", type: "numeric", unit: "mEq/L" },
        { key: "calcioTotal", label: "Calcio total", type: "numeric", unit: "mg/dL" },
      ],
    },
  ],
};

const STOOL_SCHEMA = {
  sections: [
    {
      id: "macroscopico",
      label: "Macroscopico",
      fields: [
        {
          key: "consistencia",
          label: "Consistencia",
          type: "enum",
          options: ["Formada", "Semiformada", "Pastosa", "Diarreica", "Liquida"],
        },
        { key: "color", label: "Color", type: "string" },
        {
          key: "aspecto",
          label: "Aspecto",
          type: "enum",
          options: ["Homogeneo", "Mucoso", "Sangre", "Restos Alimentarios"],
        },
        { key: "parasitosMacroscopicos", label: "Parasitos Macroscopicos", type: "string" },
      ],
    },
    {
      id: "microscopico",
      label: "Analisis Microscopico",
      fields: [
        { key: "huevos", label: "Huevos", type: "string" },
        { key: "parasitos", label: "Parasitos", type: "string" },
        { key: "eritrocitos", label: "Eritrocitos", type: "string" },
        { key: "leucocitos", label: "Leucocitos", type: "string" },
      ],
    },
  ],
};

const EXAM_TYPE_SPECS = [
  { code: "URO", name: "Uroanalisis", sampleType: "urine", fieldSchema: UROANALYSIS_SCHEMA },
  { code: "COP", name: "Coproanalisis", sampleType: "stool", fieldSchema: STOOL_SCHEMA },
  { code: "HEM", name: "Hemograma", sampleType: "wholebloodedta", fieldSchema: CBC_SCHEMA },
  { code: "QS", name: "Quimica Sanguinea", sampleType: "serum", fieldSchema: CHEMISTRY_SCHEMA },
] as const;

const FIRST_NAMES = [
  "Ana",
  "Carlos",
  "Daniela",
  "Eduardo",
  "Fernanda",
  "Gabriel",
  "Helena",
  "Ignacio",
  "Javiera",
  "Kevin",
  "Laura",
  "Marco",
  "Natalia",
  "Oscar",
  "Paula",
  "Rene",
  "Sofia",
  "Tomas",
  "Valeria",
  "Ximena",
];

const LAST_NAMES = [
  "Gonzalez",
  "Rodriguez",
  "Martinez",
  "Silva",
  "Perez",
  "Soto",
  "Diaz",
  "Ramirez",
  "Vargas",
  "Torres",
  "Lopez",
  "Munoz",
  "Fuentes",
  "Rojas",
  "Contreras",
  "Herrera",
  "Molina",
  "Castro",
  "Alvarez",
  "Morales",
];

const DOCTORS = [
  "Dr. Alvarez",
  "Dra. Morales",
  "Dr. Perez",
  "Dra. Soto",
  "Dr. Silva",
  "Dra. Rojas",
  "Dr. Vega",
  "Dra. Reyes",
  "Dr. Castro",
  "Dra. Mena",
];

const TECHNICIANS = [
  "tecnico-norte",
  "tecnico-sur",
  "tecnico-hematologia",
  "tecnico-quimica",
  "tecnico-uro",
  "tecnico-copro",
  "tecnico-guardia-1",
  "tecnico-guardia-2",
];

const SUPERVISORS = ["supervisor-am", "supervisor-pm", "supervisor-weekend"];

const REJECTION_REASONS = [
  "Muestra hemolizada",
  "Volumen insuficiente",
  "Muestra coagulada",
  "Contaminacion de muestra",
  "Error preanalitico",
  "Interferencia analitica",
];

const INCIDENCE_TYPES = ["critical_value", "delay", "quality_alert", "rework"];

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function chance(rng: () => number, p: number): boolean {
  return rng() < p;
}

function pickOne<T>(rng: () => number, values: readonly T[]): T {
  return values[randomInt(rng, 0, values.length - 1)];
}

function pickManyUnique<T>(rng: () => number, values: readonly T[], count: number): T[] {
  const pool = [...values];
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const idx = randomInt(rng, 0, pool.length - 1);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function toDateOnly(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function randomTimestampInLastDays(rng: () => number, daysBack: number): string {
  // Skew a little toward recent activity while still spanning the full window.
  const dayOffset = Math.floor(Math.pow(rng(), 0.75) * daysBack);
  const now = new Date();
  const base = new Date(now);
  base.setDate(base.getDate() - dayOffset);
  base.setHours(randomInt(rng, 7, 19), randomInt(rng, 0, 59), randomInt(rng, 0, 59), 0);
  return base.toISOString();
}

function normalizeScenario(rng: () => number): Scenario {
  const roll = rng();
  if (roll < 0.08) return "reception_only";
  if (roll < 0.2) return "ready_for_lab";
  if (roll < 0.36) return "processing";
  if (roll < 0.58) return "validation_queue";
  return "terminal";
}

function priorityForScenario(rng: () => number, scenario: Scenario): Priority {
  if (scenario === "terminal") {
    if (chance(rng, 0.12)) return "stat";
    return chance(rng, 0.42) ? "urgent" : "routine";
  }
  if (scenario === "validation_queue") {
    if (chance(rng, 0.18)) return "stat";
    return chance(rng, 0.45) ? "urgent" : "routine";
  }
  if (scenario === "processing") {
    return chance(rng, 0.35) ? "urgent" : "routine";
  }
  if (scenario === "ready_for_lab") {
    return chance(rng, 0.28) ? "urgent" : "routine";
  }
  return "routine";
}

function workOrderStatusFromScenario(scenario: Scenario): WorkOrderStatus {
  if (scenario === "terminal") return "completed";
  if (scenario === "reception_only") return "pending";
  return "inprogress";
}

function examStatusesForScenario(
  rng: () => number,
  scenario: Scenario,
  examCount: number
): ExamStatus[] {
  if (scenario === "reception_only") return [];

  if (scenario === "ready_for_lab") {
    return Array.from({ length: examCount }, () => "pending");
  }

  if (scenario === "processing") {
    return Array.from({ length: examCount }, () => {
      const roll = rng();
      if (roll < 0.35) return "pending";
      if (roll < 0.75) return "inprogress";
      return "completed";
    });
  }

  if (scenario === "validation_queue") {
    const statuses: ExamStatus[] = [];
    for (let i = 0; i < examCount; i++) {
      const roll = rng();
      if (roll < 0.55) statuses.push("ready_for_validation");
      else if (roll < 0.78) statuses.push("approved");
      else if (roll < 0.95) statuses.push("rejected");
      else statuses.push("review");
    }
    if (!statuses.some((s) => s === "ready_for_validation")) {
      statuses[0] = "ready_for_validation";
    }
    return statuses;
  }

  return Array.from({ length: examCount }, () => (chance(rng, 0.82) ? "approved" : "rejected"));
}

function sampleStatusFromExamStatus(
  rng: () => number,
  examStatus: ExamStatus,
  scenario: Scenario
): SampleStatus {
  if (examStatus === "pending") {
    if (scenario === "ready_for_lab") return chance(rng, 0.35) ? "labeled" : "ready_for_lab";
    return "ready_for_lab";
  }
  if (examStatus === "inprogress") return "inprogress";
  if (examStatus === "completed") return "inprogress";
  if (examStatus === "review") return "inprogress";
  if (examStatus === "ready_for_validation") return "completed";
  return "completed";
}

function signalForExamStatus(rng: () => number, examStatus: ExamStatus): Signal {
  if (examStatus === "rejected") return chance(rng, 0.45) ? "critical" : "attention";
  if (examStatus === "approved") {
    const roll = rng();
    if (roll < 0.72) return "normal";
    if (roll < 0.92) return "attention";
    return "critical";
  }
  if (examStatus === "ready_for_validation") {
    return chance(rng, 0.55) ? "attention" : "normal";
  }
  if (examStatus === "review") return "attention";
  return "normal";
}

const URO_ENUM_OPTIONS = ["negativo", "trazas", "+", "++", "+++"] as const;

function resultPayloadForExam(
  code: string,
  signal: Signal,
  rng: () => number
): Record<string, unknown> {
  if (code === "HEM") {
    if (signal === "normal") {
      const rbc = 4.4 + rng() * 0.8;
      const hb = 12.5 + rng() * 3.5;
      const hto = 36 + (hb - 12) * 2.5;
      const wbc = 5.0 + rng() * 4.0;
      const neutPct = 50 + randomInt(rng, 5, 15);
      const linfPct = 30 + randomInt(rng, 5, 12);
      const plt = 200 + randomInt(rng, 50, 150);
      return {
        rbc: Math.round(rbc * 100) / 100,
        hb: Math.round(hb * 10) / 10,
        hto: Math.round(hto * 10) / 10,
        vcm: 85 + randomInt(rng, 0, 12),
        hcm: 28 + randomInt(rng, 0, 4),
        chcm: 33 + randomInt(rng, 0, 2),
        rdwCV: 12 + rng() * 2,
        wbc: Math.round(wbc * 10) / 10,
        neutrofilosPct: neutPct,
        linfocitosPct: linfPct,
        monocitosPct: 4 + randomInt(rng, 0, 4),
        eosinofilosPct: 2 + randomInt(rng, 0, 3),
        basofilosPct: randomInt(rng, 0, 1),
        neutrofilosAbs: Math.round(((wbc * neutPct) / 100) * 100) / 100,
        linfocitosAbs: Math.round(((wbc * linfPct) / 100) * 100) / 100,
        monocitosAbs: 0.3 + rng() * 0.3,
        eosinofilosAbs: 0.1 + rng() * 0.2,
        basofilosAbs: 0 + rng() * 0.1,
        plt,
        vpm: 9 + rng() * 1.5,
        pdw: 11 + rng() * 4,
        pct: Math.round(plt * 0.001 * 1000) / 1000,
      };
    }
    if (signal === "attention") {
      const rbc = 3.5 + rng() * 0.4;
      const hb = 10.0 + rng() * 1.0;
      const hto = 30 + (hb - 10) * 2.2;
      const wbc = 11.5 + rng() * 2.0;
      return {
        rbc: Math.round(rbc * 100) / 100,
        hb: Math.round(hb * 10) / 10,
        hto: Math.round(hto * 10) / 10,
        vcm: 82 + randomInt(rng, 0, 10),
        hcm: 27 + randomInt(rng, 0, 3),
        chcm: 32 + randomInt(rng, 0, 2),
        rdwCV: 13.5 + rng() * 1.5,
        wbc: Math.round(wbc * 10) / 10,
        neutrofilosPct: 72,
        linfocitosPct: 22,
        monocitosPct: 4,
        eosinofilosPct: 1.5,
        basofilosPct: 0.5,
        neutrofilosAbs: Math.round(wbc * 0.72 * 100) / 100,
        linfocitosAbs: Math.round(wbc * 0.22 * 100) / 100,
        monocitosAbs: 0.5,
        eosinofilosAbs: 0.2,
        basofilosAbs: 0.05,
        plt: 145 + randomInt(rng, 0, 30),
        vpm: 10 + rng() * 1,
        pdw: 14,
        pct: 0.18,
      };
    }
    const rbc = 2.6 + rng() * 0.4;
    const hb = 6.8 + rng() * 0.8;
    const hto = 22 + (hb - 6.8) * 2.2;
    const wbc = 17 + rng() * 4;
    return {
      rbc: Math.round(rbc * 100) / 100,
      hb: Math.round(hb * 10) / 10,
      hto: Math.round(hto * 10) / 10,
      vcm: 78 + randomInt(rng, 0, 8),
      hcm: 25,
      chcm: 31,
      rdwCV: 16,
      wbc: Math.round(wbc * 10) / 10,
      neutrofilosPct: 88,
      linfocitosPct: 9,
      monocitosPct: 2,
      eosinofilosPct: 0.5,
      basofilosPct: 0.5,
      neutrofilosAbs: Math.round(wbc * 0.88 * 100) / 100,
      linfocitosAbs: Math.round(wbc * 0.09 * 100) / 100,
      monocitosAbs: 0.3,
      eosinofilosAbs: 0.08,
      basofilosAbs: 0.08,
      plt: 110 + randomInt(rng, 0, 25),
      vpm: 11,
      pdw: 18,
      pct: 0.12,
    };
  }

  if (code === "QS") {
    if (signal === "normal") {
      return {
        glucosaAyunas: 82 + randomInt(rng, 0, 14),
        creatinina: 0.75 + rng() * 0.35,
        colesterolTotal: 165 + randomInt(rng, 0, 30),
        colesterolHDL: 45 + randomInt(rng, 5, 20),
        colesterolLDL: 95 + randomInt(rng, 0, 35),
        trigliceridos: 90 + randomInt(rng, 0, 50),
        urea: 35 + randomInt(rng, 0, 15),
        bun: 15 + randomInt(rng, 0, 8),
        acidoUrico: 4.5 + rng() * 2.5,
        alt: 25 + randomInt(rng, 0, 20),
        ast: 28 + randomInt(rng, 0, 18),
        fosfatasaAlcalina: 70 + randomInt(rng, 0, 40),
        ggt: 20 + randomInt(rng, 0, 25),
        bilirrubinaTotal: 0.8 + rng() * 0.6,
        bilirrubinaDirecta: 0.2 + rng() * 0.2,
        proteinasTotales: 6.8 + rng() * 0.6,
        albumina: 4.0 + rng() * 0.5,
        sodio: 138 + randomInt(rng, 0, 4),
        potasio: 4.0 + rng() * 0.6,
        cloro: 100 + randomInt(rng, 0, 4),
        calcioTotal: 9.2 + rng() * 0.5,
      };
    }
    if (signal === "attention") {
      return {
        glucosaAyunas: 115 + randomInt(rng, 0, 25),
        creatinina: 1.35 + rng() * 0.25,
        colesterolTotal: 225 + randomInt(rng, 0, 40),
        colesterolHDL: 38 + randomInt(rng, 0, 10),
        colesterolLDL: 145 + randomInt(rng, 0, 35),
        trigliceridos: 175 + randomInt(rng, 0, 75),
        urea: 48 + randomInt(rng, 0, 15),
        bun: 22 + randomInt(rng, 0, 8),
        acidoUrico: 6.5 + rng() * 1.5,
        alt: 48 + randomInt(rng, 0, 25),
        ast: 45 + randomInt(rng, 0, 22),
        fosfatasaAlcalina: 125 + randomInt(rng, 0, 50),
        ggt: 55 + randomInt(rng, 0, 30),
        bilirrubinaTotal: 1.4 + rng() * 0.4,
        bilirrubinaDirecta: 0.5 + rng() * 0.3,
        proteinasTotales: 6.5,
        albumina: 3.8,
        sodio: 142,
        potasio: 5.2,
        cloro: 104,
        calcioTotal: 9.8,
      };
    }
    return {
      glucosaAyunas: 285 + randomInt(rng, 0, 50),
      creatinina: 2.4 + rng() * 0.8,
      colesterolTotal: 310 + randomInt(rng, 0, 50),
      colesterolHDL: 30,
      colesterolLDL: 220,
      trigliceridos: 320,
      urea: 85,
      bun: 40,
      acidoUrico: 9.5,
      alt: 180,
      ast: 165,
      fosfatasaAlcalina: 280,
      ggt: 220,
      bilirrubinaTotal: 3.2,
      bilirrubinaDirecta: 2.1,
      proteinasTotales: 5.8,
      albumina: 3.2,
      sodio: 132,
      potasio: 6.2,
      cloro: 96,
      calcioTotal: 8.1,
    };
  }

  if (code === "URO") {
    const enumVal = (idx: number) => URO_ENUM_OPTIONS[Math.min(idx, URO_ENUM_OPTIONS.length - 1)];
    if (signal === "normal") {
      return {
        color: "Amarillo",
        olor: "Caracteristico",
        opacidad: "Limpia",
        ph: 5.5 + rng() * 0.4,
        proteinas: "negativo",
        glucosa: "negativo",
        cetonas: "negativo",
        sangreOculta: "negativo",
        bilirrubina: "negativo",
        urobilinogeno: "negativo",
        nitritos: "negativo",
        esterasaLeucocitaria: "negativo",
        gravedadEspecifica: 1.015 + rng() * 0.012,
        leucocitos: randomInt(rng, 0, 2),
        eritrocitos: randomInt(rng, 0, 2),
        celulasEpiteliales: randomInt(rng, 0, 3),
        cristales: "No se observan",
        cilindros: "No se observan",
        bacterias: "No se observan",
        levaduras: "No se observan",
        estructurasMicoticas: "No se observan",
        parasitos: "No se observan",
      };
    }
    if (signal === "attention") {
      return {
        color: "Amarillo oscuro",
        olor: "Suave",
        opacidad: "Ligeramente turbia",
        ph: 7.0 + rng() * 0.3,
        proteinas: "trazas",
        glucosa: "+",
        cetonas: "negativo",
        sangreOculta: "negativo",
        bilirrubina: "negativo",
        urobilinogeno: "negativo",
        nitritos: "negativo",
        esterasaLeucocitaria: enumVal(1),
        gravedadEspecifica: 1.02 + rng() * 0.008,
        leucocitos: 8 + randomInt(rng, 0, 6),
        eritrocitos: 6 + randomInt(rng, 0, 4),
        celulasEpiteliales: 5 + randomInt(rng, 0, 3),
        cristales: "Cristales de oxalato de calcio escasos",
        cilindros: "No se observan",
        bacterias: "Escasas bacterias en forma de baston",
        levaduras: "No se observan",
        estructurasMicoticas: "No se observan",
        parasitos: "No se observan",
      };
    }
    return {
      color: "Rojo",
      olor: "Fetido",
      opacidad: "Turbia",
      ph: 8.2 + rng() * 0.4,
      proteinas: "+++",
      glucosa: "+++",
      cetonas: enumVal(2),
      sangreOculta: "++",
      bilirrubina: enumVal(1),
      urobilinogeno: enumVal(1),
      nitritos: "++",
      esterasaLeucocitaria: "+++",
      gravedadEspecifica: 1.028,
      leucocitos: 25 + randomInt(rng, 0, 15),
      eritrocitos: 30 + randomInt(rng, 0, 20),
      celulasEpiteliales: 12,
      cristales: "Abundantes cristales de fosfato",
      cilindros: "Cilindros granulosos abundantes",
      bacterias: "Abundantes diplococos",
      levaduras: "Abundantes levaduras",
      estructurasMicoticas: "Escasas",
      parasitos: "No se observan",
    };
  }

  // COP (Coproanalisis)
  if (signal === "critical") {
    return {
      consistencia: "Liquida",
      color: "Verde oscuro",
      aspecto: "Restos Alimentarios",
      parasitosMacroscopicos: "No",
      huevos: "Huevos de Entamoeba histolytica observados",
      parasitos: "Trofozoitos identificados",
      eritrocitos: "Abundantes",
      leucocitos: "Abundantes",
    };
  }
  if (signal === "attention") {
    return {
      consistencia: "Pastosa",
      color: "Pardo",
      aspecto: "Mucoso",
      parasitosMacroscopicos: "No",
      huevos: "No observados",
      parasitos: "Sospecha de formas parasitarias",
      eritrocitos: "Escasos",
      leucocitos: "Escasos",
    };
  }
  return {
    consistencia: "Formada",
    color: "Pardo",
    aspecto: "Homogeneo",
    parasitosMacroscopicos: "No",
    huevos: "No observados",
    parasitos: "No observados",
    eritrocitos: "No observados",
    leucocitos: "No observados",
  };
}

function processingDurations(
  priority: Priority,
  rng: () => number
): {
  preMinutes: number;
  analyticalMinutes: number;
  validationMinutes: number;
} {
  if (priority === "stat") {
    return {
      preMinutes: randomInt(rng, 5, 35),
      analyticalMinutes: randomInt(rng, 8, 45),
      validationMinutes: randomInt(rng, 6, 40),
    };
  }
  if (priority === "urgent") {
    return {
      preMinutes: randomInt(rng, 15, 70),
      analyticalMinutes: randomInt(rng, 25, 120),
      validationMinutes: randomInt(rng, 12, 90),
    };
  }
  return {
    preMinutes: randomInt(rng, 20, 120),
    analyticalMinutes: randomInt(rng, 40, 260),
    validationMinutes: randomInt(rng, 20, 220),
  };
}

type SeedCounters = {
  patients: number;
  workOrders: number;
  samples: number;
  exams: number;
  auditEvents: number;
  scenarioCounts: Record<Scenario, number>;
  examStatusCounts: Record<ExamStatus, number>;
};

const counters: SeedCounters = {
  patients: 0,
  workOrders: 0,
  samples: 0,
  exams: 0,
  auditEvents: 0,
  scenarioCounts: {
    reception_only: 0,
    ready_for_lab: 0,
    processing: 0,
    validation_queue: 0,
    terminal: 0,
  },
  examStatusCounts: {
    pending: 0,
    inprogress: 0,
    completed: 0,
    review: 0,
    ready_for_validation: 0,
    approved: 0,
    rejected: 0,
  },
};

async function main() {
  const outputsUrl = new URL("../../amplify_outputs.json", import.meta.url);
  const outputs = JSON.parse(await readFile(outputsUrl, { encoding: "utf8" }));
  Amplify.configure(outputs);

  // Create seed users and add to groups
  for (const { username, group } of SEED_USERS) {
    try {
      await createAndSignUpUser({
        username,
        password: SEED_PASSWORD,
        signInAfterCreation: false,
        signInFlow: "Password",
      });
      console.log(`   created user: ${username}`);
    } catch (err) {
      const error = err as Error & { name?: string };
      if (error.name === "UsernameExistsException" || error.name === "UsernameExistsError") {
        console.log(`   user exists: ${username}`);
      } else {
        throw err;
      }
    }
    try {
      await addToUserGroup({ username }, group);
      console.log(`   added ${username} to group: ${group}`);
    } catch (err) {
      const error = err as Error;
      if (!error.message?.includes("already in") && !error.message?.includes("already exists")) {
        console.warn(`   warning: could not add ${username} to ${group}:`, error.message);
      }
    }

    await auth.signOut();
  }

  // const client = generateClient<Schema>({ authMode: "identityPool" });
  // const rng = mulberry32(CONFIG.seed);

  // console.log("🌱 MEGA seed started");
  // console.log(
  //   `   target: ${CONFIG.totalPatients} patients, ${CONFIG.totalWorkOrders} work orders, ${CONFIG.daysBack} days window`
  // );

  // const examTypeIdsByCode = new Map<string, string>();
  // const { data: existingExamTypes } = await client.models.ExamType.list();
  // for (const spec of EXAM_TYPE_SPECS) {
  //   const existing = (existingExamTypes ?? []).find((row) => row.code === spec.code);
  //   if (existing?.id) {
  //     examTypeIdsByCode.set(spec.code, existing.id);
  //     continue;
  //   }
  //   const created = await client.models.ExamType.create({
  //     code: spec.code,
  //     name: spec.name,
  //     sampleType: spec.sampleType,
  //     fieldSchema: JSON.stringify(spec.fieldSchema),
  //   });
  //   if (created.errors?.length || !created.data?.id) {
  //     throw new Error(`Failed creating ExamType ${spec.code}: ${JSON.stringify(created.errors)}`);
  //   }
  //   examTypeIdsByCode.set(spec.code, created.data.id);
  // }

  // const patientIds: string[] = [];
  // for (let i = 0; i < CONFIG.totalPatients; i++) {
  //   const first = pickOne(rng, FIRST_NAMES);
  //   const lastA = pickOne(rng, LAST_NAMES);
  //   const lastB = pickOne(rng, LAST_NAMES);
  //   const gender = chance(rng, 0.52) ? "F" : "M";
  //   const year = randomInt(rng, 1948, 2018);
  //   const month = String(randomInt(rng, 1, 12)).padStart(2, "0");
  //   const day = String(randomInt(rng, 1, 28)).padStart(2, "0");
  //   const patient = await client.models.Patient.create({
  //     firstName: first,
  //     lastName: `${lastA} ${lastB}`,
  //     dateOfBirth: `${year}-${month}-${day}`,
  //     gender,
  //     email: `${first.toLowerCase()}.${lastA.toLowerCase()}.${i + 1}@seed.local`,
  //   });
  //   if (patient.errors?.length || !patient.data?.id) {
  //     throw new Error(`Failed creating patient #${i + 1}: ${JSON.stringify(patient.errors)}`);
  //   }
  //   patientIds.push(patient.data.id);
  //   counters.patients++;
  // }

  // async function createAuditEvent(params: {
  //   entityType: string;
  //   entityId: string;
  //   action: string;
  //   userId: string;
  //   timestamp: string;
  //   metadata?: Record<string, unknown>;
  // }) {
  //   const result = await client.models.AuditEvent.create({
  //     entityType: params.entityType,
  //     entityId: params.entityId,
  //     action: params.action,
  //     userId: params.userId,
  //     timestamp: params.timestamp,
  //     metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
  //   });
  //   if (result.errors?.length || !result.data?.id) {
  //     throw new Error(
  //       `AuditEvent failed [${params.action}] ${params.entityType}/${params.entityId}: ${JSON.stringify(
  //         result.errors
  //       )}`
  //     );
  //   }
  //   counters.auditEvents++;
  // }

  // const examCodePool = EXAM_TYPE_SPECS.map((s) => s.code);
  // const seenAccessionByDate = new Map<string, number>();

  // for (let woIndex = 0; woIndex < CONFIG.totalWorkOrders; woIndex++) {
  //   const scenario = normalizeScenario(rng);
  //   counters.scenarioCounts[scenario]++;

  //   const requestedAt = randomTimestampInLastDays(rng, CONFIG.daysBack);
  //   const dateKey = toDateOnly(requestedAt).replaceAll("-", "");
  //   const seqForDate = (seenAccessionByDate.get(dateKey) ?? 0) + 1;
  //   seenAccessionByDate.set(dateKey, seqForDate);
  //   const accessionNumber = `LIS-${dateKey}-${String(seqForDate).padStart(4, "0")}`;
  //   const priority = priorityForScenario(rng, scenario);
  //   const orderStatus = workOrderStatusFromScenario(scenario);
  //   const patientId = pickOne(rng, patientIds);
  //   const referringDoctor = pickOne(rng, DOCTORS);
  //   const receptionUser = `recepcion-${randomInt(rng, 1, 4)}`;

  //   let examCount = randomInt(rng, 1, 3);
  //   if (scenario === "validation_queue" && examCount < 2) examCount = 2;
  //   const examCodes = pickManyUnique(rng, examCodePool, examCount);

  //   const workOrderResult = await client.models.WorkOrder.create({
  //     patientId,
  //     status: orderStatus,
  //     accessionNumber,
  //     priority,
  //     requestedAt,
  //     hasSamples: scenario !== "reception_only",
  //     hasSamplesKey: scenario !== "reception_only" ? "YES" : "NO",
  //     notes: `Seed ${scenario} #${woIndex + 1}`,
  //     requestedExamTypeCodes: examCodes,
  //     referringDoctor,
  //   });
  //   if (workOrderResult.errors?.length || !workOrderResult.data?.id) {
  //     throw new Error(
  //       `Failed creating WorkOrder ${accessionNumber}: ${JSON.stringify(workOrderResult.errors)}`
  //     );
  //   }
  //   const workOrderId = workOrderResult.data.id;
  //   counters.workOrders++;

  //   await createAuditEvent({
  //     entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
  //     entityId: workOrderId,
  //     action: AUDIT_ACTIONS.ORDER_CREATED,
  //     userId: receptionUser,
  //     timestamp: requestedAt,
  //     metadata: {
  //       accessionNumber,
  //       priority,
  //       examTypeCodes: examCodes,
  //     },
  //   });

  //   if (scenario === "reception_only") {
  //     continue;
  //   }

  //   const examStatuses = examStatusesForScenario(rng, scenario, examCodes.length);
  //   const sampleIds: string[] = [];
  //   const barcodes: string[] = [];

  //   for (let i = 0; i < examCodes.length; i++) {
  //     const examCode = examCodes[i];
  //     const examTypeId = examTypeIdsByCode.get(examCode);
  //     if (!examTypeId) {
  //       throw new Error(`Missing ExamType id for code ${examCode}`);
  //     }

  //     const examStatus = examStatuses[i];
  //     counters.examStatusCounts[examStatus]++;
  //     const durations = processingDurations(priority, rng);

  //     const collectedAt = addMinutes(requestedAt, durations.preMinutes);
  //     const startedAt = addMinutes(collectedAt, randomInt(rng, 5, 40));
  //     const resultedAt = addMinutes(startedAt, durations.analyticalMinutes);
  //     const validatedAt = addMinutes(resultedAt, durations.validationMinutes);

  //     let sampleStatus = sampleStatusFromExamStatus(rng, examStatus, scenario);
  //     if (chance(rng, 0.04) && scenario !== "terminal") {
  //       sampleStatus = "rejected";
  //     }

  //     const receivedAt =
  //       sampleStatus === "ready_for_lab" || sampleStatus === "labeled" || sampleStatus === "pending"
  //         ? undefined
  //         : addMinutes(collectedAt, randomInt(rng, 10, 60));

  //     const barcode = `SMP-${accessionNumber}-${String(i + 1).padStart(2, "0")}`;
  //     barcodes.push(barcode);

  //     const sampleResult = await client.models.Sample.create({
  //       workOrderId,
  //       examTypeId,
  //       barcode,
  //       status: sampleStatus,
  //       collectedAt,
  //       receivedAt,
  //       specimenData: JSON.stringify({
  //         source: "mega-seed",
  //         scenario,
  //         examCode,
  //       }),
  //     });
  //     if (sampleResult.errors?.length || !sampleResult.data?.id) {
  //       throw new Error(
  //         `Failed creating Sample for ${accessionNumber}: ${JSON.stringify(sampleResult.errors)}`
  //       );
  //     }
  //     const sampleId = sampleResult.data.id;
  //     sampleIds.push(sampleId);
  //     counters.samples++;

  //     const signal = signalForExamStatus(rng, examStatus);
  //     const results = resultPayloadForExam(examCode, signal, rng);
  //     const technician = pickOne(rng, TECHNICIANS);
  //     const supervisor = pickOne(rng, SUPERVISORS);

  //     const examCreateResult = await client.models.Exam.create({
  //       sampleId,
  //       examTypeId,
  //       status: examStatus,
  //       results: examStatus === "pending" ? undefined : JSON.stringify(results),
  //       startedAt: examStatus === "pending" ? undefined : startedAt,
  //       resultedAt:
  //         examStatus === "pending" || examStatus === "inprogress" ? undefined : resultedAt,
  //       performedBy: examStatus === "pending" ? undefined : technician,
  //       validatedBy:
  //         examStatus === "approved" || examStatus === "rejected" ? supervisor : undefined,
  //       validatedAt:
  //         examStatus === "approved" || examStatus === "rejected" ? validatedAt : undefined,
  //       notes:
  //         examStatus === "rejected"
  //           ? "Rechazo por control de calidad"
  //           : examStatus === "review"
  //             ? "Enviado a revision por incidencia"
  //             : undefined,
  //     });
  //     if (examCreateResult.errors?.length || !examCreateResult.data?.id) {
  //       throw new Error(
  //         `Failed creating Exam for ${accessionNumber}: ${JSON.stringify(examCreateResult.errors)}`
  //       );
  //     }
  //     const examId = examCreateResult.data.id;
  //     counters.exams++;

  //     // Sample-level audits
  //     if (sampleStatus !== "labeled" && sampleStatus !== "pending") {
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.SAMPLE,
  //         entityId: sampleId,
  //         action: AUDIT_ACTIONS.SPECIMEN_SCANNED,
  //         userId: technician,
  //         timestamp: addMinutes(receivedAt ?? collectedAt, -1),
  //         metadata: { barcode },
  //       });
  //     }

  //     if (
  //       sampleStatus === "received" ||
  //       sampleStatus === "inprogress" ||
  //       sampleStatus === "completed" ||
  //       sampleStatus === "rejected"
  //     ) {
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.SAMPLE,
  //         entityId: sampleId,
  //         action: AUDIT_ACTIONS.SPECIMEN_RECEIVED,
  //         userId: technician,
  //         timestamp: receivedAt ?? collectedAt,
  //         metadata: { workOrderId, barcode },
  //       });
  //     }

  //     if (
  //       sampleStatus === "inprogress" ||
  //       sampleStatus === "completed" ||
  //       sampleStatus === "rejected"
  //     ) {
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.SAMPLE,
  //         entityId: sampleId,
  //         action: AUDIT_ACTIONS.SPECIMEN_IN_PROGRESS,
  //         userId: technician,
  //         timestamp: addMinutes(receivedAt ?? collectedAt, 3),
  //         metadata: { workOrderId },
  //       });
  //     }

  //     if (sampleStatus === "completed") {
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.SAMPLE,
  //         entityId: sampleId,
  //         action: AUDIT_ACTIONS.SPECIMEN_COMPLETED,
  //         userId: technician,
  //         timestamp:
  //           examStatus === "approved" ||
  //           examStatus === "rejected" ||
  //           examStatus === "ready_for_validation" ||
  //           examStatus === "review"
  //             ? addMinutes(resultedAt, 8)
  //             : addMinutes(startedAt, 35),
  //         metadata: { trigger: "seed_flow" },
  //       });
  //     }

  //     if (sampleStatus === "rejected") {
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.SAMPLE,
  //         entityId: sampleId,
  //         action: AUDIT_ACTIONS.SPECIMEN_REJECTED,
  //         userId: technician,
  //         timestamp: addMinutes(receivedAt ?? collectedAt, 25),
  //         metadata: { reason: pickOne(rng, REJECTION_REASONS), workOrderId },
  //       });
  //     }

  //     // Exam-level audits
  //     if (examStatus !== "pending") {
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.EXAM,
  //         entityId: examId,
  //         action: AUDIT_ACTIONS.EXAM_STARTED,
  //         userId: technician,
  //         timestamp: startedAt,
  //         metadata: { sampleId, workOrderId },
  //       });
  //     }

  //     if (examStatus !== "pending" && examStatus !== "inprogress") {
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.EXAM,
  //         entityId: examId,
  //         action: AUDIT_ACTIONS.EXAM_RESULTS_SAVED,
  //         userId: technician,
  //         timestamp: addMinutes(startedAt, randomInt(rng, 10, 35)),
  //         metadata: { sampleId, draft: true },
  //       });

  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.EXAM,
  //         entityId: examId,
  //         action: AUDIT_ACTIONS.EXAM_RESULTS_SAVED,
  //         userId: technician,
  //         timestamp: resultedAt,
  //         metadata: { sampleId, finalized: true },
  //       });
  //     } else if (examStatus === "inprogress") {
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.EXAM,
  //         entityId: examId,
  //         action: AUDIT_ACTIONS.EXAM_RESULTS_SAVED,
  //         userId: technician,
  //         timestamp: addMinutes(startedAt, randomInt(rng, 8, 25)),
  //         metadata: { sampleId, draft: true },
  //       });
  //     }

  //     if (
  //       examStatus === "ready_for_validation" ||
  //       examStatus === "approved" ||
  //       examStatus === "rejected" ||
  //       examStatus === "review"
  //     ) {
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.EXAM,
  //         entityId: examId,
  //         action: AUDIT_ACTIONS.EXAM_SENT_TO_VALIDATION,
  //         userId: technician,
  //         timestamp: addMinutes(resultedAt, 5),
  //         metadata: { sampleId, workOrderId },
  //       });
  //     }

  //     if (examStatus === "approved") {
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.EXAM,
  //         entityId: examId,
  //         action: AUDIT_ACTIONS.EXAM_APPROVED,
  //         userId: supervisor,
  //         timestamp: validatedAt,
  //         metadata: { sampleId, comments: "Aprobado por control supervisor" },
  //       });
  //     } else if (examStatus === "rejected") {
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.EXAM,
  //         entityId: examId,
  //         action: AUDIT_ACTIONS.EXAM_REJECTED,
  //         userId: supervisor,
  //         timestamp: validatedAt,
  //         metadata: {
  //           sampleId,
  //           reason: pickOne(rng, REJECTION_REASONS),
  //           comments: "Rechazo por criterio de validacion",
  //         },
  //       });
  //     }

  //     // Explicit incidence coverage for feed, summary cards and patterns.
  //     const shouldCreateIncidence =
  //       examStatus === "review" || chance(rng, examStatus === "ready_for_validation" ? 0.24 : 0.09);
  //     if (shouldCreateIncidence) {
  //       const incidenceType = examStatus === "review" ? "rework" : pickOne(rng, INCIDENCE_TYPES);
  //       await createAuditEvent({
  //         entityType: AUDIT_ENTITY_TYPES.EXAM,
  //         entityId: examId,
  //         action: AUDIT_ACTIONS.INCIDENCE_CREATED,
  //         userId: supervisor,
  //         timestamp:
  //           examStatus === "pending" || examStatus === "inprogress"
  //             ? addMinutes(startedAt, randomInt(rng, 15, 60))
  //             : addMinutes(resultedAt, randomInt(rng, 6, 45)),
  //         metadata: {
  //           sampleId,
  //           workOrderId,
  //           examId,
  //           type: incidenceType,
  //           description:
  //             incidenceType === "critical_value"
  //               ? "Resultado critico requiere doble verificacion"
  //               : incidenceType === "rework"
  //                 ? "Requiere retrabajo por discrepancia"
  //                 : incidenceType === "delay"
  //                   ? "Demora operacional detectada"
  //                   : "Alerta de calidad registrada",
  //         },
  //       });
  //     }
  //   }

  //   // Order-level lifecycle audits after sample generation
  //   await createAuditEvent({
  //     entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
  //     entityId: workOrderId,
  //     action: AUDIT_ACTIONS.SPECIMENS_GENERATED,
  //     userId: receptionUser,
  //     timestamp: addMinutes(requestedAt, 4),
  //     metadata: { sampleIds, examTypeCodes: examCodes, barcodes },
  //   });

  //   await createAuditEvent({
  //     entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
  //     entityId: workOrderId,
  //     action: AUDIT_ACTIONS.LABEL_PRINTED,
  //     userId: receptionUser,
  //     timestamp: addMinutes(requestedAt, 6),
  //     metadata: { barcodes },
  //   });

  //   if (chance(rng, 0.12)) {
  //     await createAuditEvent({
  //       entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
  //       entityId: workOrderId,
  //       action: AUDIT_ACTIONS.LABEL_REPRINTED,
  //       userId: receptionUser,
  //       timestamp: addMinutes(requestedAt, 9),
  //       metadata: { barcodes: [pickOne(rng, barcodes)] },
  //     });
  //   }

  //   if (scenario !== "ready_for_lab") {
  //     await createAuditEvent({
  //       entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
  //       entityId: workOrderId,
  //       action: AUDIT_ACTIONS.ORDER_READY_FOR_LAB,
  //       userId: receptionUser,
  //       timestamp: addMinutes(requestedAt, 12),
  //       metadata: { sampleIds },
  //     });
  //   }
  // }

  // console.log("✅ MEGA seed completed");
  // console.log(
  //   JSON.stringify(
  //     {
  //       created: {
  //         patients: counters.patients,
  //         workOrders: counters.workOrders,
  //         samples: counters.samples,
  //         exams: counters.exams,
  //         auditEvents: counters.auditEvents,
  //       },
  //       scenarios: counters.scenarioCounts,
  //       examStatuses: counters.examStatusCounts,
  //       dateWindowDays: CONFIG.daysBack,
  //     },
  //     null,
  //     2
  //   )
  // );
}

await main();
