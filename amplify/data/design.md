# Laboratory Information System (LIS) — Data Model Design

## Executive Summary

This design proposes a flexible, schema-on-read data model for a Laboratory Information System (LIS) using AWS Amplify Gen 2. It leverages DynamoDB's NoSQL capabilities—particularly `a.json()` for dynamic exam fields—combined with relational patterns (`belongsTo`/`hasMany`) to support multiple exam types (Uroanálisis, Coproanálisis, Hemograma, Química Sanguínea, etc.) without requiring a table per exam type.

---

## Requirements (from docs/Reportes de laboratorio Claudio.pdf)

| Exam Type | Sample Type | Key Characteristics |
|-----------|-------------|---------------------|
| **Uroanálisis** | Orina | Macroscópico (color, olor, opacidad), Químico (pH, proteínas, glucosa, etc.), Microscópico (leucocitos, eritrocitos, cristales, etc.) |
| **Coproanálisis** | Heces | Macroscópico (consistencia, color, aspecto), Microscópico (huevos, parásitos), optional Química fecal |
| **Hemograma** | Sangre con EDTA | Serie roja, serie blanca, serie plaquetaria — numeric values with reference ranges |
| **Química Sanguínea** | Suero | Numeric results with units (e.g., glucosa 22 mg/dL) |

All exam types have:
- Variable field sets per type
- Reference ranges and units
- Qualitative scales (negativo, trazas, +, ++, +++)
- Section groupings (Macroscópico, Químico, Microscópico)

---

## Design Principles

1. **Single table for exams** — Store all exam types in one `Examen` model; field definitions live in `TipoExamen` metadata.
2. **Dynamic fields via JSON** — Use Amplify's `a.json()` for `fieldSchema` (metadata) and `resultados` (actual values). DynamoDB natively supports flexible JSON documents.
3. **Relational integrity** — WorkOrder → Patient, WorkOrder → Muestras, Muestra → Exámenes, Examen → TipoExamen.
4. **Schema-on-read** — Frontend fetches `TipoExamen.fieldSchema` to render forms and validate; results stored as JSON in `Examen.resultados`.

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   Patient   │       │    WorkOrder     │       │   Muestra   │
│             │       │  (Orden Trabajo)│       │   (Sample)  │
├─────────────┤       ├──────────────────┤       ├─────────────┤
│ id          │◄──────│ patientId        │       │ id          │
│ firstName   │       │ id               │──────►│ workOrderId │
│ lastName    │       │ status           │       │ tipoExamenId│◄─────┐
│ ...         │       │ ...              │       │ ...         │      │
└─────────────┘       └──────────────────┘       └─────────────┘      │
                              │                         │             │
                              │                         ▼             │
                              │                  ┌──────────┐        │
                              │                  │  Examen  │        │
                              │                  ├──────────┤        │
                              │                  │ id       │        │
                              │                  │ muestraId│        │
                              │                  │ tipoExamenId───────┤
                              │                  │ status   │        │
                              │                  │ resultados (JSON)  │
                              │                  └──────────┘        │
                              │                                       │
                              │                         ┌─────────────────┐
                              └─────────────────────────│   TipoExamen    │
                                                        │  (Exam Type)    │
                                                        ├─────────────────┤
                                                        │ id              │
                                                        │ codigo          │
                                                        │ nombre          │
                                                        │ tipoMuestra     │
                                                        │ fieldSchema     │
                                                        │   (JSON)        │
                                                        └─────────────────┘
```

---

## Model Definitions

### 1. Patient
*Unchanged from current schema.*
```typescript
Patient: a.model({
  firstName: a.string(),
  lastName: a.string(),
  dateOfBirth: a.date(),
  gender: a.enum(["M", "F"]),
  phone: a.phone(),
  email: a.email(),
  extraData: a.json(),
  workOrders: a.hasMany("WorkOrder", "patientId"),
})
```

### 2. WorkOrder (Orden de Trabajo)
```typescript
WorkOrder: a.model({
  status: a.enum(["pending", "in-progress", "completed"]),
  patientId: a.id().required(),
  patient: a.belongsTo("Patient", "patientId"),
  muestras: a.hasMany("Muestra", "workOrderId"),
  // Optional: metadata, requested date, priority, etc.
  requestedAt: a.datetime(),
  notes: a.string(),
})
```

### 3. TipoExamen (Exam Type — Metadata Catalog)
**Purpose:** Defines exam types and their field schemas. One record per exam type (Uroanálisis, Coproanálisis, Hemograma, etc.).

```typescript
TipoExamen: a.model({
  codigo: a.string().required(),        // e.g. "URO", "COP", "HEM", "QS"
  nombre: a.string().required(),        // e.g. "Uroanálisis"
  tipoMuestra: a.enum(["orina", "heces", "sangre_edta", "suero", "otro"]),
  fieldSchema: a.json().required(),      // Dynamic field definition — see below
  unidadesDefault: a.string(),          // Optional default unit (e.g. "mg/dL")
  activo: a.boolean().default(true),
  examenes: a.hasMany("Examen", "tipoExamenId"),
})
```

**`fieldSchema` JSON structure** (flexible, validated at app layer):

```json
{
  "sections": [
    {
      "id": "macroscopico",
      "label": "Examen Macroscópico",
      "fields": [
        { "key": "color", "label": "Color", "type": "string" },
        { "key": "olor", "label": "Olor", "type": "string" },
        { "key": "opacidad", "label": "Opacidad", "type": "string" }
      ]
    },
    {
      "id": "quimico",
      "label": "Examen Químico",
      "fields": [
        { "key": "ph", "label": "pH", "type": "numeric", "unit": "", "referenceRange": "5-6" },
        { "key": "proteinas", "label": "Proteínas", "type": "enum", "options": ["negativo", "trazas", "+", "++", "+++"], "referenceRange": "negativo" },
        { "key": "glucosa", "label": "Glucosa", "type": "enum", "options": ["negativo", "trazas", "+", "++", "+++"], "referenceRange": "negativo" }
      ]
    },
    {
      "id": "microscopico",
      "label": "Examen Microscópico",
      "fields": [
        { "key": "leucocitos", "label": "Leucocitos", "type": "string", "referenceRange": "0-4 por campo" },
        { "key": "eritrocitos", "label": "Eritrocitos", "type": "string", "referenceRange": "0-4 por campo" }
      ]
    }
  ]
}
```

**Supported field types in `fieldSchema`:**
- `string` — Free text
- `numeric` — Number with optional unit
- `enum` — Dropdown from `options`
- `qualitative` — Scale (negativo → +++)

---

### 4. Muestra (Sample)
**Purpose:** Physical sample collected from a patient, linked to a work order. References the type of exam requested.

```typescript
Muestra: a.model({
  workOrderId: a.id().required(),
  workOrder: a.belongsTo("WorkOrder", "workOrderId"),
  tipoExamenId: a.id().required(),
  tipoExamen: a.belongsTo("TipoExamen", "tipoExamenId"),
  codigoMuestra: a.string(),            // Lab barcode / tracking ID
  fechaRecoleccion: a.datetime(),
  estado: a.enum(["pendiente", "recibida", "en-proceso", "completada"]),
  observaciones: a.string(),
  examenes: a.hasMany("Examen", "muestraId"),
})
.secondaryIndexes((index) => [
  index("workOrderId"),
  index("tipoExamenId"),
])
```

**Note:** A single physical sample can sometimes require multiple exam types (e.g., Coproanálisis + Química Fecal). In that case, create multiple `Muestra` records with the same `workOrderId` but different `tipoExamenId`, or introduce a `MuestraExamen` join model if you prefer one Muestra → many Examen types. The current design uses **one Muestra per exam type** for simplicity.

---

### 5. Examen (Exam — Actual Results)
**Purpose:** The analysis performed on a sample. Results stored dynamically in `resultados` JSON, keyed by field keys from `TipoExamen.fieldSchema`.

```typescript
Examen: a.model({
  muestraId: a.id().required(),
  muestra: a.belongsTo("Muestra", "muestraId"),
  tipoExamenId: a.id().required(),
  tipoExamen: a.belongsTo("TipoExamen", "tipoExamenId"),
  status: a.enum(["pendiente", "en-proceso", "completado", "revision"]),
  resultados: a.json(),                  // Dynamic results — see below
  fechaInicio: a.datetime(),
  fechaResultado: a.datetime(),
  realizadoPor: a.string(),              // Technician/user ID
  observaciones: a.string(),
})
.secondaryIndexes((index) => [
  index("muestraId"),
  index("tipoExamenId"),
  index("status"),
])
```

**`resultados` JSON structure** (matches field keys from `fieldSchema`):

```json
{
  "color": "Amarillo",
  "olor": "Normal",
  "opacidad": "Ligeramente turbia",
  "ph": 5.5,
  "proteinas": "negativo",
  "glucosa": "negativo",
  "leucocitos": "2-3 por campo",
  "eritrocitos": "0-2 por campo"
}
```

The frontend:
1. Loads `TipoExamen` by `tipoExamenId` to get `fieldSchema`.
2. Renders form/UI from `fieldSchema.sections[].fields`.
3. Saves user input as `resultados` with matching keys.

---

## DynamoDB & NoSQL Considerations

| Aspect | Approach |
|--------|----------|
| **Flexible schema** | `a.json()` for `fieldSchema` and `resultados` — DynamoDB stores as Map/List types, no schema change needed for new exam types. |
| **Single table** | One `Examen` table for all exam types; differentiation via `tipoExamenId` and `resultados` structure. |
| **Query patterns** | Secondary indexes on `workOrderId`, `muestraId`, `tipoExamenId`, `status` for efficient filtering. |
| **Item size** | DynamoDB item limit 400KB — `resultados` for typical exams (≈50–100 fields) stays well under limit. |

---

## Alternative: One Muestra → Many Exam Types

If one physical sample can be used for multiple exam types (e.g., one stool for Coproanálisis + Química Fecal), use a **join model** `MuestraExamen`:

```typescript
Muestra: a.model({
  workOrderId: a.id().required(),
  workOrder: a.belongsTo("WorkOrder", "workOrderId"),
  codigoMuestra: a.string(),
  fechaRecoleccion: a.datetime(),
  // No tipoExamenId — sample is generic
  examenes: a.hasMany("MuestraExamen", "muestraId"),
}),

MuestraExamen: a.model({
  muestraId: a.id().required(),
  muestra: a.belongsTo("Muestra", "muestraId"),
  tipoExamenId: a.id().required(),
  tipoExamen: a.belongsTo("TipoExamen", "tipoExamenId"),
  examen: a.hasOne("Examen", "muestraExamenId"),
}),

Examen: a.model({
  muestraExamenId: a.id().required(),
  muestraExamen: a.belongsTo("MuestraExamen", "muestraExamenId"),
  tipoExamenId: a.id().required(),
  tipoExamen: a.belongsTo("TipoExamen", "tipoExamenId"),
  status: a.enum([...]),
  resultados: a.json(),
  ...
})
```

**Recommendation:** Start with the simpler **one Muestra per exam type** model; refactor to the join model if multi-exam samples become common.

---

## Implementation Workflow (Amplify Gen 2)

1. **Define schema** in `amplify/data/resource.ts` with the models above.
2. **Seed `TipoExamen`** — Create records for Uroanálisis, Coproanálisis, Hemograma, Química Sanguínea using the PDF definitions.
3. **Frontend** — Fetch `TipoExamen` by ID/code, use `fieldSchema` to render dynamic forms (e.g., react-hook-form + JSON schema).
4. **Validation** — Validate `resultados` against `fieldSchema` before save (client and/or Lambda).

---

## Summary

| Model | Role |
|-------|------|
| **Patient** | Subject of the work order |
| **WorkOrder** | Orders one or many samples for a patient |
| **Muestra** | Sample linked to work order and exam type |
| **TipoExamen** | Exam type catalog with `fieldSchema` (JSON) |
| **Examen** | Actual exam with `resultados` (JSON) |

This design uses Amplify’s relational model for navigation and DynamoDB’s JSON support for exam metadata and results, keeping the schema stable while allowing new exam types to be added via data only.
