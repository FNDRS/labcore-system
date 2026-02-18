/**
 * LIS Sandbox Seed
 *
 * Populates Amplify sandbox with ExamTypes, Patients, WorkOrders, Samples, and Exams.
 * Based on docs/Reportes de laboratorio Claudio.pdf
 *
 * @see https://docs.amplify.aws/react/deploy-and-host/sandbox-environments/seed
 *
 * Prerequisites:
 * - Active sandbox: npx ampx sandbox
 * - Permissions: npx ampx sandbox seed generate-policy > seed-policy.json
 *
 * Run: npx ampx sandbox seed
 */

import { readFile } from "node:fs/promises";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../data/resource";

// amplify_outputs.json may not exist until sandbox is created
const url = new URL("../../amplify_outputs.json", import.meta.url);
console.log("[DEBUG] Loading amplify_outputs from:", url.pathname);
const outputs = JSON.parse(await readFile(url, { encoding: "utf8" }));
console.log("[DEBUG] Amplify outputs keys:", Object.keys(outputs));
Amplify.configure(outputs);

const client = generateClient<Schema>();
console.log("[DEBUG] Data client initialized");

// ─── ExamType fieldSchemas (from Reportes de laboratorio Claudio.pdf) ────────

const UROANALISIS_FIELD_SCHEMA = {
	sections: [
		{
			id: "macroscopico",
			label: "Examen Macroscópico",
			fields: [
				{ key: "color", label: "Color", type: "string" },
				{ key: "olor", label: "Olor", type: "string" },
				{ key: "opacidad", label: "Opacidad", type: "string" },
			],
		},
		{
			id: "quimico",
			label: "Examen Químico",
			fields: [
				{
					key: "ph",
					label: "pH",
					type: "numeric",
					referenceRange: "5-6",
				},
				{
					key: "proteinas",
					label: "Proteínas",
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
					label: "Urobilinógeno",
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
					label: "Gravedad Específica",
					type: "numeric",
					referenceRange: "1.005-1.030",
				},
			],
		},
		{
			id: "microscopico",
			label: "Examen Microscópico",
			fields: [
				{
					key: "leucocitos",
					label: "Leucocitos",
					type: "string",
					referenceRange: "0-4 por campo",
				},
				{
					key: "eritrocitos",
					label: "Eritrocitos",
					type: "string",
					referenceRange: "0-4 por campo",
				},
				{
					key: "celulasEpiteliales",
					label: "Células Epiteliales",
					type: "string",
					referenceRange: "0-4 por campo",
				},
				{ key: "cristales", label: "Cristales", type: "string" },
				{ key: "cilindros", label: "Cilindros", type: "string" },
				{ key: "bacterias", label: "Bacterias", type: "string" },
				{ key: "levaduras", label: "Levaduras", type: "string" },
				{
					key: "otrasObservaciones",
					label: "Otras Observaciones",
					type: "string",
				},
			],
		},
	],
};

const COPROANALISIS_FIELD_SCHEMA = {
	sections: [
		{
			id: "macroscopico",
			label: "Macroscópico",
			fields: [
				{
					key: "consistencia",
					label: "Consistencia",
					type: "enum",
					options: [
						"Formada",
						"Semiformada",
						"Pastosa",
						"Diarreica",
						"Líquida",
					],
				},
				{ key: "color", label: "Color", type: "string" },
				{
					key: "aspecto",
					label: "Aspecto",
					type: "enum",
					options: [
						"Homogéneo",
						"Mucoso",
						"Sangre",
						"Restos Alimentarios",
					],
				},
				{
					key: "parasitosMacroscopicos",
					label: "Parásitos Macroscópicos",
					type: "string",
				},
			],
		},
		{
			id: "microscopico",
			label: "Análisis Microscópico",
			fields: [
				{ key: "huevos", label: "Huevos", type: "string" },
				{ key: "parasitos", label: "Parásitos", type: "string" },
				{ key: "eritrocitos", label: "Eritrocitos", type: "string" },
				{ key: "leucocitos", label: "Leucocitos", type: "string" },
			],
		},
	],
};

const HEMOGRAMA_FIELD_SCHEMA = {
	sections: [
		{
			id: "serieRoja",
			label: "Serie Roja",
			fields: [
				{
					key: "rbc",
					label: "Eritrocitos (RBC)",
					type: "numeric",
					unit: "x10⁶/μL",
					referenceRange: "4.0 – 5.5",
				},
				{
					key: "hb",
					label: "Hemoglobina (Hb)",
					type: "numeric",
					unit: "g/dL",
					referenceRange: "12.0 – 17.5",
				},
				{
					key: "hto",
					label: "Hematocrito (Hto)",
					type: "numeric",
					unit: "%",
					referenceRange: "36 – 52",
				},
				{
					key: "vcm",
					label: "VCM",
					type: "numeric",
					unit: "fL",
					referenceRange: "80 – 100",
				},
				{
					key: "hcm",
					label: "HCM",
					type: "numeric",
					unit: "pg",
					referenceRange: "27 – 33",
				},
				{
					key: "chcm",
					label: "CHCM",
					type: "numeric",
					unit: "g/dL",
					referenceRange: "32 – 36",
				},
				{
					key: "rdwCv",
					label: "RDW-CV",
					type: "numeric",
					unit: "%",
					referenceRange: "11.5 – 14.5",
				},
			],
		},
		{
			id: "serieBlanca",
			label: "Serie Blanca",
			fields: [
				{
					key: "wbc",
					label: "Leucocitos (WBC)",
					type: "numeric",
					unit: "x10³/μL",
					referenceRange: "4.0 – 11.0",
				},
				{
					key: "neutrofilosPct",
					label: "Neutrófilos %",
					type: "numeric",
					unit: "%",
					referenceRange: "40 – 70",
				},
				{
					key: "linfocitosPct",
					label: "Linfocitos %",
					type: "numeric",
					unit: "%",
					referenceRange: "20 – 45",
				},
				{
					key: "monocitosPct",
					label: "Monocitos %",
					type: "numeric",
					unit: "%",
					referenceRange: "2 – 10",
				},
				{
					key: "eosinofilosPct",
					label: "Eosinófilos %",
					type: "numeric",
					unit: "%",
					referenceRange: "1 – 6",
				},
				{
					key: "basofilosPct",
					label: "Basófilos %",
					type: "numeric",
					unit: "%",
					referenceRange: "0 – 2",
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
					unit: "x10³/μL",
					referenceRange: "150 – 450",
				},
				{
					key: "mpv",
					label: "MPV",
					type: "numeric",
					unit: "fL",
					referenceRange: "7.5 – 11.5",
				},
				{
					key: "pdw",
					label: "PDW",
					type: "numeric",
					unit: "fL",
					referenceRange: "9 – 17",
				},
				{
					key: "pct",
					label: "Plaquetocrito (PCT)",
					type: "numeric",
					unit: "%",
					referenceRange: "0.15 – 0.40",
				},
			],
		},
	],
};

const QUIMICA_SANGUINEA_FIELD_SCHEMA = {
	sections: [
		{
			id: "bioquimica",
			label: "Química Sanguínea",
			fields: [
				{
					key: "glucosaAyunas",
					label: "Glucosa en ayunas",
					type: "numeric",
					unit: "mg/dL",
				},
				{
					key: "glucosaPostprandial",
					label: "Glucosa postprandial",
					type: "numeric",
					unit: "mg/dL",
				},
				{ key: "urea", label: "Urea", type: "numeric", unit: "mg/dL" },
				{ key: "bun", label: "BUN", type: "numeric", unit: "mg/dL" },
				{
					key: "creatinina",
					label: "Creatinina",
					type: "numeric",
					unit: "mg/dL",
				},
				{
					key: "acidoUrico",
					label: "Ácido úrico",
					type: "numeric",
					unit: "mg/dL",
				},
				{ key: "alt", label: "ALT/TGP", type: "numeric", unit: "U/L" },
				{ key: "ast", label: "AST/TGO", type: "numeric", unit: "U/L" },
				{
					key: "fa",
					label: "Fosfatasa alcalina",
					type: "numeric",
					unit: "U/L",
				},
				{
					key: "bilirrubinaTotal",
					label: "Bilirrubina total",
					type: "numeric",
					unit: "mg/dL",
				},
				{
					key: "proteinasTotales",
					label: "Proteínas totales",
					type: "numeric",
					unit: "g/dL",
				},
				{
					key: "albumina",
					label: "Albúmina",
					type: "numeric",
					unit: "g/dL",
				},
				{
					key: "colesterolTotal",
					label: "Colesterol total",
					type: "numeric",
					unit: "mg/dL",
				},
				{
					key: "trigliceridos",
					label: "Triglicéridos",
					type: "numeric",
					unit: "mg/dL",
				},
				{
					key: "sodio",
					label: "Sodio",
					type: "numeric",
					unit: "mEq/L",
				},
				{
					key: "potasio",
					label: "Potasio",
					type: "numeric",
					unit: "mEq/L",
				},
				{
					key: "cloro",
					label: "Cloro",
					type: "numeric",
					unit: "mEq/L",
				},
				{
					key: "calcioTotal",
					label: "Calcio total",
					type: "numeric",
					unit: "mg/dL",
				},
			],
		},
	],
};

const EXAM_TYPES = [
	{
		code: "URO",
		name: "Uroanálisis",
		sampleType: "urine" as const,
		fieldSchema: UROANALISIS_FIELD_SCHEMA,
	},
	{
		code: "COP",
		name: "Coproanálisis",
		sampleType: "stool" as const,
		fieldSchema: COPROANALISIS_FIELD_SCHEMA,
	},
	{
		code: "HEM",
		name: "Hemograma",
		sampleType: "wholebloodedta" as const,
		fieldSchema: HEMOGRAMA_FIELD_SCHEMA,
	},
	{
		code: "QS",
		name: "Química Sanguínea",
		sampleType: "serum" as const,
		fieldSchema: QUIMICA_SANGUINEA_FIELD_SCHEMA,
	},
];

const PATIENTS = [
	{
		firstName: "María",
		lastName: "González Pérez",
		dateOfBirth: "1985-03-15",
		gender: "F" as const,
		email: "maria.gonzalez@example.com",
	},
	{
		firstName: "Carlos",
		lastName: "Rodríguez López",
		dateOfBirth: "1972-08-22",
		gender: "M" as const,
		email: "carlos.rodriguez@example.com",
	},
	{
		firstName: "Ana",
		lastName: "Martínez Silva",
		dateOfBirth: "1990-11-07",
		gender: "F" as const,
		email: "ana.martinez@example.com",
	},
];

const WORK_ORDER_SPECS = [
	{
		patientIndex: 0,
		examCodes: ["URO", "HEM"],
		accessionNumber: "ORD-2025-001",
		priority: "routine" as const,
	},
	{
		patientIndex: 1,
		examCodes: ["COP", "QS"],
		accessionNumber: "ORD-2025-002",
		priority: "urgent" as const,
	},
	{
		patientIndex: 2,
		examCodes: ["URO", "COP", "HEM"],
		accessionNumber: "ORD-2025-003",
		priority: "routine" as const,
	},
];

function generateBarcode(prefix: string, index: number): string {
	return `${prefix}-${Date.now().toString(36).toUpperCase()}-${String(index).padStart(3, "0")}`;
}

console.log("🌱 Starting LIS sandbox seed...\n");
console.log("[DEBUG] Seed data - EXAM_TYPES count:", EXAM_TYPES.length);
console.log("[DEBUG] Seed data - PATIENTS count:", PATIENTS.length);
console.log("[DEBUG] Seed data - WORK_ORDER_SPECS count:", WORK_ORDER_SPECS.length);

console.log("[DEBUG] 1. Seeding ExamTypes...");
const examTypeIds: Record<string, string> = {};
const { data: existingTypes, errors: listErrors } =
	await client.models.ExamType.list();
console.log("[DEBUG] Existing ExamTypes:", existingTypes?.length ?? 0, listErrors ? `errors: ${JSON.stringify(listErrors)}` : "");
if (existingTypes?.length) {
	console.log("[DEBUG] Existing types:", existingTypes.map((t) => ({ id: t.id, code: t.code })));
}

for (const spec of EXAM_TYPES) {
	console.log("[DEBUG] Processing ExamType:", spec.code, spec.name);
	const found = existingTypes?.find((t) => t.code === spec.code);
	if (found) {
		examTypeIds[spec.code] = found.id;
		console.log(`   ✓ ${spec.code} (${spec.name}) already exists [id=${found.id}]`);
	} else {
		const input = {
			code: spec.code,
			name: spec.name,
			sampleType: spec.sampleType,
			fieldSchema: JSON.stringify(spec.fieldSchema),
		};
		console.log("[DEBUG] Creating ExamType:", input);
		const { data, errors } = await client.models.ExamType.create(input);
		if (errors?.length) {
			throw new Error(`ExamType create failed: ${JSON.stringify(errors)}`);
		}
		if (!data?.id) throw new Error("ExamType create returned no data");
		examTypeIds[spec.code] = data.id;
		console.log(`   ✓ Created ${spec.code} (${spec.name}) [id=${data.id}]`);
	}
}
console.log("[DEBUG] examTypeIds:", examTypeIds);

const patientIds: string[] = [];
console.log("\n[DEBUG] 2. Seeding Patients...");
console.log("[DEBUG] Patients to create:", PATIENTS.length);
for (let i = 0; i < PATIENTS.length; i++) {
	const p = PATIENTS[i];
	console.log("[DEBUG] Creating patient:", i, p.firstName, p.lastName);
	const input = {
		firstName: p.firstName,
		lastName: p.lastName,
		dateOfBirth: p.dateOfBirth,
		gender: p.gender,
		email: p.email,
	};
	const { data, errors } = await client.models.Patient.create(input);
	if (errors?.length) throw new Error(`Patient create failed: ${JSON.stringify(errors)}`);
	if (!data?.id) throw new Error("Patient create returned no data");
	patientIds.push(data.id);
	console.log(`   ✓ Created ${p.firstName} ${p.lastName} [id=${data.id}]`);
}
console.log("[DEBUG] patientIds:", patientIds);

console.log("\n[DEBUG] 3. Seeding WorkOrders, Samples, Exams...");
const now = new Date().toISOString();
console.log("[DEBUG] requestedAt:", now);
console.log("[DEBUG] WORK_ORDER_SPECS:", WORK_ORDER_SPECS);

for (let woIndex = 0; woIndex < WORK_ORDER_SPECS.length; woIndex++) {
	const spec = WORK_ORDER_SPECS[woIndex];
	const patientId = patientIds[spec.patientIndex];
	console.log("[DEBUG] WorkOrder", woIndex, "spec:", spec, "patientId:", patientId);

	const workOrderInput = {
		patientId,
		status: "pending" as const,
		accessionNumber: spec.accessionNumber,
		priority: spec.priority,
		requestedAt: now,
		notes: `Seed work order ${woIndex + 1}`,
	};
	console.log("[DEBUG] Creating WorkOrder:", workOrderInput);
	const { data: workOrder, errors: woErrors } =
		await client.models.WorkOrder.create(workOrderInput);
	if (woErrors?.length) throw new Error(`WorkOrder create failed: ${JSON.stringify(woErrors)}`);
	if (!workOrder?.id) throw new Error("WorkOrder create returned no data");

	console.log(
		`   ✓ WorkOrder ${spec.accessionNumber} for ${PATIENTS[spec.patientIndex].firstName} [id=${workOrder.id}]`,
	);

	for (let exIndex = 0; exIndex < spec.examCodes.length; exIndex++) {
		const code = spec.examCodes[exIndex];
		const examTypeId = examTypeIds[code];
		if (!examTypeId) {
			console.error("[DEBUG] ExamType not found:", code, "examTypeIds:", examTypeIds);
			throw new Error(`ExamType ${code} not found`);
		}

		const barcode = generateBarcode("SMP", woIndex * 10 + exIndex);
		console.log("[DEBUG] Creating Sample:", { workOrderId: workOrder!.id, examTypeId, barcode });

		const { data: sample, errors: sampleErrors } =
			await client.models.Sample.create({
				workOrderId: workOrder.id,
				examTypeId,
				barcode,
				status: "pending",
			});
		if (sampleErrors?.length) throw new Error(`Sample create failed: ${JSON.stringify(sampleErrors)}`);
		if (!sample?.id) throw new Error("Sample create returned no data");

		const { data: exam, errors: examErrors } = await client.models.Exam.create({
			sampleId: sample.id,
			examTypeId,
			status: "pending",
		});
		if (examErrors?.length) throw new Error(`Exam create failed: ${JSON.stringify(examErrors)}`);
		if (!exam?.id) throw new Error("Exam create returned no data");

		console.log(`      → Sample ${barcode} (${code}) [sampleId=${sample.id}, examId=${exam.id}]`);
	}
}

console.log("\n✅ Seed complete. 3 work orders with all dependencies created.");
console.log("[DEBUG] Summary - examTypeIds:", examTypeIds);
console.log("[DEBUG] Summary - patientIds:", patientIds);
