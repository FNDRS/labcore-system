# Flujo End-to-End de Laboratorio (LabCore)

Este documento describe el flujo operativo completo desde el origen de la orden hasta la trazabilidad final de resultados, con enfoque por rol y etapas del proceso.

## Objetivo

Definir un flujo realista para clínicas/laboratorios donde el trabajo del técnico **no inicia el proceso**, sino que comienza después de la creación de orden y generación de muestras.

---

## Diagrama de Flujo Principal

```mermaid
flowchart TD
    A1[Recepcion/Supervisor crea orden] --> A2[Scan de orden de trabajo]
    A2 --> A3[Generar specimens e imprimir stickers]
    A3 --> A4[Recoleccion fisica y pegado de stickers]
    A4 --> B1[Laboratorio escanea sticker de muestra]
    B1 --> B2[Sistema muestra analisis y formulario]
    B2 --> B3[Ingreso de resultados]
    B3 --> B4[Enviar examen a validacion]
    B4 --> D1{Todos los examenes del specimen listos?}
    D1 -- No --> B1
    D1 -- Si --> B5[Specimen completado]
    B5 --> C1[Supervisor valida o rechaza]
    C1 --> C2[Generar y entregar reporte]
```

---

## Flujo por Etapas y Roles

## A) Origen del trabajo (pre-técnico)

### A1. Crear orden
- **Rol:** Recepción o Supervisor.
- **Vista:** `Nueva Orden` (Order Intake).
- **Datos capturados:** paciente, médico (opcional), prioridad, exámenes, notas.
- **DB:** `orders`, `order_tests`.
- **Audit:** `ORDER_CREATED`, `ORDER_TESTS_ADDED`.

### A2. Escanear orden de trabajo
- **Rol:** Recepción.
- **Vista:** `Scan Orden de Trabajo`.
- **Entrada:** código de orden / work order.
- **Acción:** el sistema levanta la orden y carga exámenes pendientes para preparar muestras.
- **Audit:** `WORK_ORDER_SCANNED`.

### A3. Generar muestras e imprimir stickers
- **Rol:** Recepción.
- **Vista:** `Preparación de Muestras`.
- **Regla clave:** agrupar exámenes compatibles por tipo de tubo/contenedor.
- **DB:** `specimens`, `order_tests.specimen_id`, `specimens.status = LABELED`.
- **Audit:** `SPECIMENS_GENERATED`, `LABELS_PRINTED`, `ORDER_TEST_ASSIGNED_TO_SPECIMEN`.

### A4. Recolección física
- **Rol:** Recepción / toma de muestra.
- **Acción física:** pegar sticker en tubo/contenedor y completar recolección.
- **DB:** `specimens.status = READY_FOR_LAB`.
- **Audit:** `SPECIMEN_READY`.

> Aquí nace la cola operativa del laboratorio técnico.

---

## B) Flujo del Técnico (operación)

### B1. Login
- **Rol:** Técnico.
- **Vista:** `Login`.
- **Audit:** `AUTH_LOGIN`.

### B2. Dashboard técnico
- **Vista:** `Dashboard Técnico`.
- **Muestra:** pendientes, urgentes, prioridades.
- **Audit:** `VIEW_DASHBOARD`.

### B3. Escaneo de sticker en laboratorio
- **Vista:** `Muestras` (scan) o modal de escaneo.
- **Entrada:** `specimen_code` (sticker del tubo/contenedor).
- **Resultado:** el sistema indica qué análisis hacer para esa muestra y habilita el formulario.
- **DB:** `specimens.status = RECEIVED` (si aplica), `specimen_scan_events` o `audit_events`.
- **Audit:** `SPECIMEN_SCANNED`, `SPECIMEN_RECEIVED`.

### B4. Selección de análisis y formulario
- **Vista:** `Detalle de muestra`.
- **Acción:** abrir el/los análisis asociados y capturar valores del formulario.
- **Audit:** `SPECIMEN_VIEWED`, `ORDER_TEST_OPENED`.

### B5. Workbench y captura de resultados
- **Vista:** `Procesar Examen`.
- **DB:** upsert en `results`; `order_tests.status = IN_PROGRESS`.
- **Audit:** `RESULT_UPDATED`, `ORDER_TEST_IN_PROGRESS`.

### B6. Enviar a validación
- **Vista:** confirmación de finalización.
- **DB:** `order_tests.status = READY_FOR_VALIDATION`, opcional `completed_at`.
- **Audit:** `ORDER_TEST_READY_FOR_VALIDATION`.

### B7. Completar muestra (automático)
- **Condición:** todos los `order_tests` del `specimen` en estado listo/aprobado.
- **DB:** `specimens.status = COMPLETED` (o `READY_FOR_VALIDATION` según modelo).
- **Audit:** `SPECIMEN_COMPLETED`.

---

## C) Post-técnico (cierre de ciclo)

### C1. Validación
- **Rol:** Supervisor.
- **Vista:** `Validación`.
- **Acciones:** aprobar, rechazar, comentar, devolver.
- **DB:** `order_tests.status = APPROVED | REJECTED`, `validated_by`, `validated_at`.
- **Audit:** `ORDER_TEST_APPROVED`, `ORDER_TEST_REJECTED`.

### C2. Reporte y entrega
- **Rol:** Recepción o Supervisor.
- **Vista:** `Reportes`.
- **Salida:** PDF de orden con branding del laboratorio.
- **Audit:** `REPORT_GENERATED`, `REPORT_DELIVERED` (opcional).

---

## Respuestas clave de negocio

- **Donde se origina todo:** en `Nueva Orden` y `Scan de Orden de Trabajo`.
- **El técnico inicia el flujo principal:** no; normalmente ejecuta trabajo ya creado.
- **Excepción permitida:** modo rapido de orden para laboratorios pequenos (walk-in), no recomendado como flujo base para clinicas.

---

## Vistas mínimas para MVP end-to-end

1. `Nueva Orden`
2. `Scan Orden de Trabajo + Generar stickers`
3. `Recolección física (pegar etiquetas y confirmar listo)`
4. `Muestras laboratorio (escaneo + detalle)`
5. `Procesar Examen (resultados + enviar a validación)`

Con estas 5 vistas se puede demostrar trazabilidad completa:

**orden -> scan orden -> stickers/recoleccion -> scan muestra -> resultados -> validación -> reporte**

---

## Notas de implementación sugeridas

- Mantener una maquina de estados explícita para `order_tests` y `specimens`.
- Registrar eventos de auditoría en cada transición relevante.
- Asegurar idempotencia en escaneo y actualización de resultados.
- Definir SLA/alertas para urgentes desde el dashboard técnico.

---

## Observación técnica: inicialización de telemetría (App Insights)

En `src/utils/logging.ts` existe esta protección para inicializar App Insights en primer log de servidor cuando no hay `request`:

```ts
// In standalone mode instrumentation does not run; ensure App Insights is inited on first server log (e.g. API routes).
if (!options?.request && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING?.trim() && !appInsightsEnsureStarted) {
  appInsightsEnsureStarted = import("@/lib/ensure-appinsights").then(() => {})
}
```

### Riesgo identificado

- La condición `!options?.request` no representa directamente "standalone mode"; realmente distingue logs fuera de middleware.
- La inicialización ocurre en el **primer log** de rutas de servidor (ej. API), no en un punto determinístico de arranque.
- Si entran varias requests simultáneamente antes de inicializar, puede haber carrera de inicialización o comportamiento inconsistente de telemetría temprana.

### Recomendación

- Mover la inicialización a un módulo dedicado de bootstrap/import temprano en el ciclo de vida del servidor.
- Dejar en `logging.ts` solo una verificación defensiva (fallback), no el mecanismo principal de arranque.
- Documentar explícitamente la intención: `request` en este contexto significa "llamada desde middleware/edge", no "modo standalone".
