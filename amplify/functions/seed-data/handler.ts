/**
 * MEGA seed Lambda handler.
 * Mirrors amplify/seed/seed.ts for deployment environments where the CLI seed cannot run.
 */
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/seed-data";
import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

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
  daysBack: 40,
  totalPatients: 140,
  totalWorkOrders: 220,
} as const;

const UROANALYSIS_SCHEMA = {
  sections: [
    {
      id: "quimico",
      label: "Quimico",
      fields: [
        { key: "ph", label: "pH", type: "numeric", referenceRange: "5-6" },
        {
          key: "glucosa",
          label: "Glucosa",
          type: "enum",
          options: ["negativo", "trazas", "+", "++", "+++"],
          referenceRange: "negativo",
        },
        {
          key: "proteinas",
          label: "Proteinas",
          type: "enum",
          options: ["negativo", "trazas", "+", "++", "+++"],
          referenceRange: "negativo",
        },
        { key: "flag", label: "Flag", type: "string" },
      ],
    },
  ],
};

const CBC_SCHEMA = {
  sections: [
    {
      id: "hemograma",
      label: "Hemograma",
      fields: [
        { key: "rbc", label: "RBC", type: "numeric", unit: "x10^6/uL", referenceRange: "4.0-5.5" },
        { key: "hb", label: "Hb", type: "numeric", unit: "g/dL", referenceRange: "12.0-17.5" },
        { key: "wbc", label: "WBC", type: "numeric", unit: "x10^3/uL", referenceRange: "4.0-11.0" },
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
          label: "Glucosa",
          type: "numeric",
          unit: "mg/dL",
          referenceRange: "70-99",
        },
        {
          key: "creatinina",
          label: "Creatinina",
          type: "numeric",
          unit: "mg/dL",
          referenceRange: "0.6-1.2",
        },
        {
          key: "colesterolTotal",
          label: "Colesterol",
          type: "numeric",
          unit: "mg/dL",
          referenceRange: "120-200",
        },
      ],
    },
  ],
};

const STOOL_SCHEMA = {
  sections: [
    {
      id: "copro",
      label: "Coproanalisis",
      fields: [
        { key: "consistencia", label: "Consistencia", type: "string" },
        { key: "parasitos", label: "Parasitos", type: "string" },
        { key: "eritrocitos", label: "Eritrocitos", type: "string" },
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
  if (scenario === "terminal")
    return chance(rng, 0.12) ? "stat" : chance(rng, 0.42) ? "urgent" : "routine";
  if (scenario === "validation_queue")
    return chance(rng, 0.18) ? "stat" : chance(rng, 0.45) ? "urgent" : "routine";
  if (scenario === "processing") return chance(rng, 0.35) ? "urgent" : "routine";
  if (scenario === "ready_for_lab") return chance(rng, 0.28) ? "urgent" : "routine";
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
  if (scenario === "ready_for_lab") return Array.from({ length: examCount }, () => "pending");
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
    if (!statuses.some((s) => s === "ready_for_validation")) statuses[0] = "ready_for_validation";
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
    return scenario === "ready_for_lab"
      ? chance(rng, 0.35)
        ? "labeled"
        : "ready_for_lab"
      : "ready_for_lab";
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
  if (examStatus === "ready_for_validation") return chance(rng, 0.55) ? "attention" : "normal";
  if (examStatus === "review") return "attention";
  return "normal";
}

function resultPayloadForExam(
  code: string,
  signal: Signal,
  rng: () => number
): Record<string, unknown> {
  if (code === "HEM") {
    if (signal === "normal")
      return { rbc: 4.7 + rng() * 0.5, hb: 13.5 + rng() * 2, wbc: 5.2 + rng() * 3.2 };
    if (signal === "attention")
      return { rbc: 3.5 + rng() * 0.3, hb: 10.2 + rng() * 0.8, wbc: 12.2 + rng() * 1.2 };
    return {
      rbc: 2.8 + rng() * 0.2,
      hb: 7.1 + rng() * 0.6,
      wbc: 17.5 + rng() * 2.2,
      flag: "critico",
    };
  }
  if (code === "QS") {
    if (signal === "normal")
      return {
        glucosaAyunas: 82 + randomInt(rng, 0, 12),
        creatinina: 0.7 + rng() * 0.3,
        colesterolTotal: 160 + randomInt(rng, 0, 25),
      };
    if (signal === "attention")
      return {
        glucosaAyunas: 112 + randomInt(rng, 0, 25),
        creatinina: 1.3 + rng() * 0.3,
        colesterolTotal: 210 + randomInt(rng, 0, 40),
      };
    return {
      glucosaAyunas: 285 + randomInt(rng, 0, 45),
      creatinina: 2.2 + rng() * 0.6,
      colesterolTotal: 300 + randomInt(rng, 0, 40),
      flag: "valor critico",
    };
  }
  if (code === "URO") {
    if (signal === "normal")
      return { ph: 5.4 + rng() * 0.5, glucosa: "negativo", proteinas: "negativo", flag: "normal" };
    if (signal === "attention")
      return { ph: 7.2, glucosa: "+", proteinas: "trazas", flag: "atencion" };
    return { ph: 8.4, glucosa: "+++", proteinas: "+++", flag: "critico" };
  }
  if (signal === "critical")
    return {
      consistencia: "Liquida",
      parasitos: "Positivo",
      eritrocitos: "Abundantes",
      flag: "critico",
    };
  if (signal === "attention")
    return {
      consistencia: "Pastosa",
      parasitos: "Sospecha",
      eritrocitos: "Escasos",
      flag: "atencion",
    };
  return {
    consistencia: "Formada",
    parasitos: "No observados",
    eritrocitos: "No observados",
    flag: "normal",
  };
}

function processingDurations(
  priority: Priority,
  rng: () => number
): { preMinutes: number; analyticalMinutes: number; validationMinutes: number } {
  if (priority === "stat")
    return {
      preMinutes: randomInt(rng, 5, 35),
      analyticalMinutes: randomInt(rng, 8, 45),
      validationMinutes: randomInt(rng, 6, 40),
    };
  if (priority === "urgent")
    return {
      preMinutes: randomInt(rng, 15, 70),
      analyticalMinutes: randomInt(rng, 25, 120),
      validationMinutes: randomInt(rng, 12, 90),
    };
  return {
    preMinutes: randomInt(rng, 20, 120),
    analyticalMinutes: randomInt(rng, 40, 260),
    validationMinutes: randomInt(rng, 20, 220),
  };
}

async function runSeedLogic(): Promise<Record<string, unknown>> {
  const rng = mulberry32(CONFIG.seed);
  const counters = {
    patients: 0,
    workOrders: 0,
    samples: 0,
    exams: 0,
    auditEvents: 0,
    scenarioCounts: {} as Record<Scenario, number>,
    examStatusCounts: {} as Record<ExamStatus, number>,
  };
  const scenarioKeys: Scenario[] = [
    "reception_only",
    "ready_for_lab",
    "processing",
    "validation_queue",
    "terminal",
  ];
  const examStatusKeys: ExamStatus[] = [
    "pending",
    "inprogress",
    "completed",
    "review",
    "ready_for_validation",
    "approved",
    "rejected",
  ];
  scenarioKeys.forEach((s) => (counters.scenarioCounts[s] = 0));
  examStatusKeys.forEach((s) => (counters.examStatusCounts[s] = 0));

  const examTypeIdsByCode = new Map<string, string>();
  const { data: existingExamTypes } = await client.models.ExamType.list();
  for (const spec of EXAM_TYPE_SPECS) {
    const existing = (existingExamTypes ?? []).find((row) => row.code === spec.code);
    if (existing?.id) {
      examTypeIdsByCode.set(spec.code, existing.id);
      continue;
    }
    const created = await client.models.ExamType.create({
      code: spec.code,
      name: spec.name,
      sampleType: spec.sampleType,
      fieldSchema: JSON.stringify(spec.fieldSchema),
    });
    if (created.errors?.length || !created.data?.id) {
      throw new Error(`Failed creating ExamType ${spec.code}: ${JSON.stringify(created.errors)}`);
    }
    examTypeIdsByCode.set(spec.code, created.data.id);
  }

  const patientIds: string[] = [];
  for (let i = 0; i < CONFIG.totalPatients; i++) {
    const first = pickOne(rng, FIRST_NAMES);
    const lastA = pickOne(rng, LAST_NAMES);
    const lastB = pickOne(rng, LAST_NAMES);
    const gender = chance(rng, 0.52) ? "F" : "M";
    const year = randomInt(rng, 1948, 2018);
    const month = String(randomInt(rng, 1, 12)).padStart(2, "0");
    const day = String(randomInt(rng, 1, 28)).padStart(2, "0");
    const patient = await client.models.Patient.create({
      firstName: first,
      lastName: `${lastA} ${lastB}`,
      dateOfBirth: `${year}-${month}-${day}`,
      gender,
      email: `${first.toLowerCase()}.${lastA.toLowerCase()}.${i + 1}@seed.local`,
    });
    if (patient.errors?.length || !patient.data?.id) {
      throw new Error(`Failed creating patient #${i + 1}: ${JSON.stringify(patient.errors)}`);
    }
    patientIds.push(patient.data.id);
    counters.patients++;
  }

  async function createAuditEvent(params: {
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }) {
    const result = await client.models.AuditEvent.create({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId,
      timestamp: params.timestamp,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    });
    if (result.errors?.length || !result.data?.id) {
      throw new Error(
        `AuditEvent failed [${params.action}] ${params.entityType}/${params.entityId}: ${JSON.stringify(result.errors)}`
      );
    }
    counters.auditEvents++;
  }

  const examCodePool = EXAM_TYPE_SPECS.map((s) => s.code);
  const seenAccessionByDate = new Map<string, number>();

  for (let woIndex = 0; woIndex < CONFIG.totalWorkOrders; woIndex++) {
    const scenario = normalizeScenario(rng);
    counters.scenarioCounts[scenario]++;

    const requestedAt = randomTimestampInLastDays(rng, CONFIG.daysBack);
    const dateKey = toDateOnly(requestedAt).replaceAll("-", "");
    const seqForDate = (seenAccessionByDate.get(dateKey) ?? 0) + 1;
    seenAccessionByDate.set(dateKey, seqForDate);
    const accessionNumber = `LIS-${dateKey}-${String(seqForDate).padStart(4, "0")}`;
    const priority = priorityForScenario(rng, scenario);
    const orderStatus = workOrderStatusFromScenario(scenario);
    const patientId = pickOne(rng, patientIds);
    const referringDoctor = pickOne(rng, DOCTORS);
    const receptionUser = `recepcion-${randomInt(rng, 1, 4)}`;

    let examCount = randomInt(rng, 1, 3);
    if (scenario === "validation_queue" && examCount < 2) examCount = 2;
    const examCodes = pickManyUnique(rng, examCodePool, examCount);

    const workOrderResult = await client.models.WorkOrder.create({
      patientId,
      status: orderStatus,
      accessionNumber,
      priority,
      requestedAt,
      notes: `Seed ${scenario} #${woIndex + 1}`,
      requestedExamTypeCodes: examCodes,
      referringDoctor,
    });
    if (workOrderResult.errors?.length || !workOrderResult.data?.id) {
      throw new Error(
        `Failed creating WorkOrder ${accessionNumber}: ${JSON.stringify(workOrderResult.errors)}`
      );
    }
    const workOrderId = workOrderResult.data.id;
    counters.workOrders++;

    await createAuditEvent({
      entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
      entityId: workOrderId,
      action: AUDIT_ACTIONS.ORDER_CREATED,
      userId: receptionUser,
      timestamp: requestedAt,
      metadata: { accessionNumber, priority, examTypeCodes: examCodes },
    });

    if (scenario === "reception_only") continue;

    const examStatuses = examStatusesForScenario(rng, scenario, examCodes.length);
    const sampleIds: string[] = [];
    const barcodes: string[] = [];

    for (let i = 0; i < examCodes.length; i++) {
      const examCode = examCodes[i];
      const examTypeId = examTypeIdsByCode.get(examCode);
      if (!examTypeId) throw new Error(`Missing ExamType id for code ${examCode}`);

      const examStatus = examStatuses[i];
      counters.examStatusCounts[examStatus]++;
      const durations = processingDurations(priority, rng);

      const collectedAt = addMinutes(requestedAt, durations.preMinutes);
      const startedAt = addMinutes(collectedAt, randomInt(rng, 5, 40));
      const resultedAt = addMinutes(startedAt, durations.analyticalMinutes);
      const validatedAt = addMinutes(resultedAt, durations.validationMinutes);

      let sampleStatus = sampleStatusFromExamStatus(rng, examStatus, scenario);
      if (chance(rng, 0.04) && scenario !== "terminal") sampleStatus = "rejected";

      const receivedAt =
        sampleStatus === "ready_for_lab" || sampleStatus === "labeled" || sampleStatus === "pending"
          ? undefined
          : addMinutes(collectedAt, randomInt(rng, 10, 60));

      const barcode = `SMP-${accessionNumber}-${String(i + 1).padStart(2, "0")}`;
      barcodes.push(barcode);

      const sampleResult = await client.models.Sample.create({
        workOrderId,
        examTypeId,
        barcode,
        status: sampleStatus,
        collectedAt,
        receivedAt,
        specimenData: JSON.stringify({ source: "mega-seed", scenario, examCode }),
      });
      if (sampleResult.errors?.length || !sampleResult.data?.id) {
        throw new Error(
          `Failed creating Sample for ${accessionNumber}: ${JSON.stringify(sampleResult.errors)}`
        );
      }
      const sampleId = sampleResult.data.id;
      sampleIds.push(sampleId);
      counters.samples++;

      const signal = signalForExamStatus(rng, examStatus);
      const results = resultPayloadForExam(examCode, signal, rng);
      const technician = pickOne(rng, TECHNICIANS);
      const supervisor = pickOne(rng, SUPERVISORS);

      const examCreateResult = await client.models.Exam.create({
        sampleId,
        examTypeId,
        status: examStatus,
        results: examStatus === "pending" ? undefined : JSON.stringify(results),
        startedAt: examStatus === "pending" ? undefined : startedAt,
        resultedAt:
          examStatus === "pending" || examStatus === "inprogress" ? undefined : resultedAt,
        performedBy: examStatus === "pending" ? undefined : technician,
        validatedBy:
          examStatus === "approved" || examStatus === "rejected" ? supervisor : undefined,
        validatedAt:
          examStatus === "approved" || examStatus === "rejected" ? validatedAt : undefined,
        notes:
          examStatus === "rejected"
            ? "Rechazo por control de calidad"
            : examStatus === "review"
              ? "Enviado a revision por incidencia"
              : undefined,
      });
      if (examCreateResult.errors?.length || !examCreateResult.data?.id) {
        throw new Error(
          `Failed creating Exam for ${accessionNumber}: ${JSON.stringify(examCreateResult.errors)}`
        );
      }
      const examId = examCreateResult.data.id;
      counters.exams++;

      if (sampleStatus !== "labeled" && sampleStatus !== "pending") {
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.SAMPLE,
          entityId: sampleId,
          action: AUDIT_ACTIONS.SPECIMEN_SCANNED,
          userId: technician,
          timestamp: addMinutes(receivedAt ?? collectedAt, -1),
          metadata: { barcode },
        });
      }
      if (["received", "inprogress", "completed", "rejected"].includes(sampleStatus)) {
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.SAMPLE,
          entityId: sampleId,
          action: AUDIT_ACTIONS.SPECIMEN_RECEIVED,
          userId: technician,
          timestamp: receivedAt ?? collectedAt,
          metadata: { workOrderId, barcode },
        });
      }
      if (["inprogress", "completed", "rejected"].includes(sampleStatus)) {
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.SAMPLE,
          entityId: sampleId,
          action: AUDIT_ACTIONS.SPECIMEN_IN_PROGRESS,
          userId: technician,
          timestamp: addMinutes(receivedAt ?? collectedAt, 3),
          metadata: { workOrderId },
        });
      }
      if (sampleStatus === "completed") {
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.SAMPLE,
          entityId: sampleId,
          action: AUDIT_ACTIONS.SPECIMEN_COMPLETED,
          userId: technician,
          timestamp: ["approved", "rejected", "ready_for_validation", "review"].includes(examStatus)
            ? addMinutes(resultedAt, 8)
            : addMinutes(startedAt, 35),
          metadata: { trigger: "seed_flow" },
        });
      }
      if (sampleStatus === "rejected") {
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.SAMPLE,
          entityId: sampleId,
          action: AUDIT_ACTIONS.SPECIMEN_REJECTED,
          userId: technician,
          timestamp: addMinutes(receivedAt ?? collectedAt, 25),
          metadata: { reason: pickOne(rng, REJECTION_REASONS), workOrderId },
        });
      }
      if (examStatus !== "pending") {
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.EXAM,
          entityId: examId,
          action: AUDIT_ACTIONS.EXAM_STARTED,
          userId: technician,
          timestamp: startedAt,
          metadata: { sampleId, workOrderId },
        });
      }
      if (examStatus !== "pending" && examStatus !== "inprogress") {
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.EXAM,
          entityId: examId,
          action: AUDIT_ACTIONS.EXAM_RESULTS_SAVED,
          userId: technician,
          timestamp: addMinutes(startedAt, randomInt(rng, 10, 35)),
          metadata: { sampleId, draft: true },
        });
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.EXAM,
          entityId: examId,
          action: AUDIT_ACTIONS.EXAM_RESULTS_SAVED,
          userId: technician,
          timestamp: resultedAt,
          metadata: { sampleId, finalized: true },
        });
      } else if (examStatus === "inprogress") {
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.EXAM,
          entityId: examId,
          action: AUDIT_ACTIONS.EXAM_RESULTS_SAVED,
          userId: technician,
          timestamp: addMinutes(startedAt, randomInt(rng, 8, 25)),
          metadata: { sampleId, draft: true },
        });
      }
      if (["ready_for_validation", "approved", "rejected", "review"].includes(examStatus)) {
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.EXAM,
          entityId: examId,
          action: AUDIT_ACTIONS.EXAM_SENT_TO_VALIDATION,
          userId: technician,
          timestamp: addMinutes(resultedAt, 5),
          metadata: { sampleId, workOrderId },
        });
      }
      if (examStatus === "approved") {
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.EXAM,
          entityId: examId,
          action: AUDIT_ACTIONS.EXAM_APPROVED,
          userId: supervisor,
          timestamp: validatedAt,
          metadata: { sampleId, comments: "Aprobado por control supervisor" },
        });
      } else if (examStatus === "rejected") {
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.EXAM,
          entityId: examId,
          action: AUDIT_ACTIONS.EXAM_REJECTED,
          userId: supervisor,
          timestamp: validatedAt,
          metadata: {
            sampleId,
            reason: pickOne(rng, REJECTION_REASONS),
            comments: "Rechazo por criterio de validacion",
          },
        });
      }
      const shouldCreateIncidence =
        examStatus === "review" || chance(rng, examStatus === "ready_for_validation" ? 0.24 : 0.09);
      if (shouldCreateIncidence) {
        const incidenceType = examStatus === "review" ? "rework" : pickOne(rng, INCIDENCE_TYPES);
        await createAuditEvent({
          entityType: AUDIT_ENTITY_TYPES.EXAM,
          entityId: examId,
          action: AUDIT_ACTIONS.INCIDENCE_CREATED,
          userId: supervisor,
          timestamp:
            examStatus === "pending" || examStatus === "inprogress"
              ? addMinutes(startedAt, randomInt(rng, 15, 60))
              : addMinutes(resultedAt, randomInt(rng, 6, 45)),
          metadata: {
            sampleId,
            workOrderId,
            examId,
            type: incidenceType,
            description:
              incidenceType === "critical_value"
                ? "Resultado critico requiere doble verificacion"
                : incidenceType === "rework"
                  ? "Requiere retrabajo por discrepancia"
                  : incidenceType === "delay"
                    ? "Demora operacional detectada"
                    : "Alerta de calidad registrada",
          },
        });
      }
    }

    await createAuditEvent({
      entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
      entityId: workOrderId,
      action: AUDIT_ACTIONS.SPECIMENS_GENERATED,
      userId: receptionUser,
      timestamp: addMinutes(requestedAt, 4),
      metadata: { sampleIds, examTypeCodes: examCodes, barcodes },
    });
    await createAuditEvent({
      entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
      entityId: workOrderId,
      action: AUDIT_ACTIONS.LABEL_PRINTED,
      userId: receptionUser,
      timestamp: addMinutes(requestedAt, 6),
      metadata: { barcodes },
    });
    if (chance(rng, 0.12)) {
      await createAuditEvent({
        entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
        entityId: workOrderId,
        action: AUDIT_ACTIONS.LABEL_REPRINTED,
        userId: receptionUser,
        timestamp: addMinutes(requestedAt, 9),
        metadata: { barcodes: [pickOne(rng, barcodes)] },
      });
    }
    if (scenario !== "ready_for_lab") {
      await createAuditEvent({
        entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
        entityId: workOrderId,
        action: AUDIT_ACTIONS.ORDER_READY_FOR_LAB,
        userId: receptionUser,
        timestamp: addMinutes(requestedAt, 12),
        metadata: { sampleIds },
      });
    }
  }

  return {
    created: {
      patients: counters.patients,
      workOrders: counters.workOrders,
      samples: counters.samples,
      exams: counters.exams,
      auditEvents: counters.auditEvents,
    },
    scenarios: counters.scenarioCounts,
    examStatuses: counters.examStatusCounts,
    dateWindowDays: CONFIG.daysBack,
  };
}

export const handler = async (): Promise<Record<string, unknown>> => {
  const result = await runSeedLogic();
  return result;
};
