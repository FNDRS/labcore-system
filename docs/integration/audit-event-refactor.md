# AuditEvent Schema Refactor — Relationship Integration

How to eliminate the "irreducible" AuditEvent round trips identified in the [data-fetching-optimization-definitive](./data-fetching-optimization-definitive.md) by adding schema-level relationships between `AuditEvent` and the core domain models.

---

## 1. Problem Statement

`AuditEvent` is the only model with **no schema relationships**. It uses a generic `entityType`/`entityId` pair to reference WorkOrders, Samples, and Exams. This forces every AuditEvent query into separate `AuditEvent.list({ filter })` calls that cannot be collapsed via Amplify's `selectionSet` eager loading.

### Impact by Query Site

| Repository | Function | Extra AuditEvent Round Trips | Notes |
|------------|----------|:----------------------------:|-------|
| `technician` | `getSampleDetail` | 3+ (sample + WO + exam×N) | 2nd waterfall after main entity query |
| `audit` | `getAuditTimelineForWorkOrder` | 1 + N_samples + M_exams | Worst case: 10+ parallel queries |
| `audit` | `getRecentAuditActivity` | 1 full scan + 4 entity scans | In-memory join across all tables |
| `technician` | `getCompletedTodayCount` | 1 | Action+timestamp filter; not entity-bound |
| `supervisor` | `getDashboardStats` | 1 | Action filter (INCIDENCE_CREATED) |
| `incidence` | `listAllIncidentAuditEvents` | 1 (paginated) | Action filter with timestamp range |
| `analytics` | `fetchAnalyticsBaseData` | 1 full scan | Broad analytics aggregation |

The first two (entity-bound queries) are directly solvable with schema relationships. The rest are action/timestamp-based queries that benefit from composite indexes.

---

## 2. Current Schema

```typescript
// amplify/data/resource.ts (lines 101–116)
AuditEvent: a
  .model({
    entityType: a.string().required(),  // "WorkOrder" | "Sample" | "Exam"
    entityId: a.string().required(),    // ID of the referenced entity
    action: a.string().required(),      // e.g., "ORDER_CREATED"
    userId: a.string().required(),
    timestamp: a.datetime().required(),
    metadata: a.json(),
  })
  .secondaryIndexes((index) => [
    index("entityType"),   // partition-key-only
    index("entityId"),     // partition-key-only
    index("userId"),       // partition-key-only
    index("timestamp"),    // partition-key-only
  ])
  .authorization((allow) => [allow.authenticated(), allow.guest()])
```

### Why This Design Falls Short

1. **No `selectionSet` traversal.** Without `belongsTo`/`hasMany`, you can't write `"samples.auditEvents.*"` in a parent query's selection set. Every audit fetch is a separate GraphQL resolver invocation.

2. **Separate single-key indexes.** The four individual indexes mean DynamoDB can use ONE index per query, then must post-filter. The most common query pattern (`entityType + entityId`) has no composite index — it uses the `entityType` index then filters by `entityId` in the resolver.

3. **No aggregate root linkage.** To get "all audit events for a work order" (including its samples and exams), you must first resolve all sample and exam IDs, then issue N+M parallel `AuditEvent.list` calls.

### Current Write Sites

| Service | entityType | Direct FK Available at Write Time |
|---------|-----------|----------------------------------|
| `specimen-generation-service` | `WorkOrder` | `workOrderId` ✓ |
| `sample-status-service` | `Sample` | `sampleId` ✓, `sample.workOrderId` ✓ |
| `exam-result-service` | `Exam` | `examId` ✓, `exam.sampleId` ✓ |
| `validation-service` | `Exam` | `examId` ✓, `exam.sampleId` ✓ |
| `validation-service` (terminal sync) | `Sample` | `sampleId` ✓ |
| `seed.ts` / `seed-data/handler.ts` | All | All IDs available ✓ |

All write sites already have the entity IDs needed to populate FK fields.

---

## 3. Proposed Schema Change

### 3.1 Add Optional FK Fields + Relationships

```typescript
AuditEvent: a
  .model({
    // Existing fields (kept for backward compat + action-based queries)
    entityType: a.string().required(),
    entityId: a.string().required(),
    action: a.string().required(),
    userId: a.string().required(),
    timestamp: a.datetime().required(),
    metadata: a.json(),

    // NEW: optional relationship FKs
    workOrderId: a.id(),
    workOrder: a.belongsTo("WorkOrder", "workOrderId"),
    sampleId: a.id(),
    sample: a.belongsTo("Sample", "sampleId"),
    examId: a.id(),
    exam: a.belongsTo("Exam", "examId"),
  })
  .secondaryIndexes((index) => [
    // UPGRADED: composite indexes for common query patterns
    index("entityType").sortKeys(["entityId"]),
    index("action").sortKeys(["timestamp"]),
    // FK indexes for relationship-based queries
    index("workOrderId").sortKeys(["timestamp"]),
    index("sampleId").sortKeys(["timestamp"]),
    index("examId").sortKeys(["timestamp"]),
    // Keep userId for user-centric audit views
    index("userId").sortKeys(["timestamp"]),
  ])
  .authorization((allow) => [allow.authenticated(), allow.guest()])
```

### 3.2 Add `hasMany` on Parent Models

```typescript
WorkOrder: a.model({
  // ...existing fields...
  auditEvents: a.hasMany("AuditEvent", "workOrderId"),
})

Sample: a.model({
  // ...existing fields...
  auditEvents: a.hasMany("AuditEvent", "sampleId"),
})

Exam: a.model({
  // ...existing fields...
  auditEvents: a.hasMany("AuditEvent", "examId"),
})
```

### 3.3 FK Population Strategy

Each AuditEvent gets **all applicable FKs** populated (denormalized), not just the direct entity FK. This enables "get all events for a work order" without resolving intermediate IDs.

| entityType | `workOrderId` | `sampleId` | `examId` |
|-----------|:-------------:|:----------:|:--------:|
| WorkOrder | `entityId` | — | — |
| Sample | `sample.workOrderId` | `entityId` | — |
| Exam | resolve via chain | `exam.sampleId` | `entityId` |

For Exam events, the write site already has `exam.sampleId` available (it's passed in metadata today). The `workOrderId` requires one extra lookup — but the calling code (`exam-result-service`, `validation-service`) already fetches the exam, so we can chain to get the sample's `workOrderId` with one additional read. Alternatively, we can skip `workOrderId` on Exam events and accept that the `WorkOrder.auditEvents` relationship only returns WO-level and Sample-level events (Exam events are reachable via `WorkOrder → samples → exam → auditEvents`).

**Recommended: populate `workOrderId` on all events.** The extra read cost is amortized — services already load the exam, and Sample has `workOrderId` as a required field. The gain is a single `WorkOrder.auditEvents` query returning the complete timeline.

---

## 4. Index Strategy

### 4.1 Composite Secondary Indexes

Replace the four single-key indexes with composite indexes optimized for actual query patterns:

| Index | Partition Key | Sort Key | Query Pattern |
|-------|-------------|----------|---------------|
| `byEntityTypeAndId` | `entityType` | `entityId` | Entity-specific timeline (legacy queries) |
| `byActionAndTimestamp` | `action` | `timestamp` | Action-based metrics (completed today, incidence list) |
| `byWorkOrderId` | `workOrderId` | `timestamp` | All events for a work order (chronological) |
| `bySampleId` | `sampleId` | `timestamp` | All events for a sample (chronological) |
| `byExamId` | `examId` | `timestamp` | All events for an exam (chronological) |
| `byUserId` | `userId` | `timestamp` | User activity audit |

### 4.2 Why Composite Indexes Matter

**Current**: `getCompletedTodayCount` filters by `action + entityType + timestamp`. With separate single-key indexes, DynamoDB picks one (say `action`), retrieves all `SPECIMEN_COMPLETED` events, then post-filters by `entityType` and `timestamp` range in the resolver. Expensive at scale.

**After**: The `byActionAndTimestamp` composite index gives DynamoDB a partition (`action = SPECIMEN_COMPLETED`) and a sort key range (`timestamp BETWEEN start AND end`). No post-filtering needed.

### 4.3 Amplify GSI Limits

DynamoDB allows up to 20 GSIs per table. The proposed 6 indexes are well within limits. Each GSI adds write cost (DynamoDB replicates writes to each GSI), but AuditEvent writes are low-frequency (one per user action, not per page view) so the overhead is negligible.

---

## 5. Read-Side Optimization

### 5.1 `getSampleDetail` — 4+ trips → 1 trip

**Before** (current implementation, `technician-repository.ts` lines 302–396):

```
Sample.get(id)
  → Promise.all([WO.get, ExamType.get, AuditEvent.list(sample), Exam.list])
    → Promise.all([AuditEvent.list(WO), AuditEvent.list(exam1), ...AuditEvent.list(examN)])
      → Patient.get
= 4+ sequential round trips
```

**After** (with selectionSet + relationships):

```typescript
const SAMPLE_DETAIL_SELECTION = [
  "id", "barcode", "workOrderId", "examTypeId", "status",
  "receivedAt", "collectedAt",
  // WorkOrder → Patient
  "workOrder.id", "workOrder.priority", "workOrder.patientId",
  "workOrder.patient.id", "workOrder.patient.firstName", "workOrder.patient.lastName",
  // ExamType
  "examType.id", "examType.name", "examType.sampleType",
  // Exam
  "exam.id",
  // AuditEvents for this sample (NEW)
  "auditEvents.id", "auditEvents.action", "auditEvents.timestamp",
  "auditEvents.userId", "auditEvents.metadata",
  // WorkOrder audit events (NEW — via workOrder relationship)
  "workOrder.auditEvents.id", "workOrder.auditEvents.action",
  "workOrder.auditEvents.timestamp", "workOrder.auditEvents.userId",
  "workOrder.auditEvents.metadata",
  // Exam audit events (NEW)
  "exam.auditEvents.id", "exam.auditEvents.action",
  "exam.auditEvents.timestamp", "exam.auditEvents.userId",
  "exam.auditEvents.metadata",
] as const;

const { data: sample, errors } = await client.models.Sample.get(
  { id: sampleId },
  { selectionSet: SAMPLE_DETAIL_SELECTION }
);
```

**Result: 1 round trip.** All audit events come back in the same GraphQL response nested under their parent entities. No separate `AuditEvent.list` calls needed.

### 5.2 `getAuditTimelineForWorkOrder` — N+M trips → 1-2 trips

**Before** (`audit-repository.ts` lines 124–269):

```
WorkOrder.get(id)
  → Promise.all([Patient.get, Sample.list])
    → Promise.all([Exam.list × N, ExamType.get × M])
      → Promise.all([AuditEvent.list × (1 + N + M)])   // ← worst bottleneck
= 4+ sequential rounds, last round can be 10+ parallel queries
```

**After** (with relationships):

```typescript
const WO_TIMELINE_SELECTION = [
  "id", "accessionNumber", "requestedAt", "priority", "referringDoctor",
  // Patient
  "patient.id", "patient.firstName", "patient.lastName",
  // WO-level audit events (NEW)
  "auditEvents.id", "auditEvents.action", "auditEvents.entityType",
  "auditEvents.entityId", "auditEvents.timestamp", "auditEvents.userId",
  "auditEvents.metadata",
  // Samples + their events
  "samples.id", "samples.barcode", "samples.status", "samples.examTypeId",
  "samples.auditEvents.id", "samples.auditEvents.action",
  "samples.auditEvents.entityType", "samples.auditEvents.entityId",
  "samples.auditEvents.timestamp", "samples.auditEvents.userId",
  "samples.auditEvents.metadata",
  // Sample → Exam + exam events
  "samples.exam.id", "samples.exam.sampleId", "samples.exam.examTypeId",
  "samples.exam.status",
  "samples.exam.auditEvents.id", "samples.exam.auditEvents.action",
  "samples.exam.auditEvents.entityType", "samples.exam.auditEvents.entityId",
  "samples.exam.auditEvents.timestamp", "samples.exam.auditEvents.userId",
  "samples.exam.auditEvents.metadata",
  // ExamType for display
  "samples.examType.id", "samples.examType.code", "samples.examType.name",
] as const;

const { data: workOrder, errors } = await client.models.WorkOrder.get(
  { id: workOrderId },
  { selectionSet: WO_TIMELINE_SELECTION }
);
```

**Result: 1 round trip.** The entire work order timeline — patient info, all samples, their exams, all audit events at every level, and exam types — comes back in a single GraphQL response.

### 5.3 `getRecentAuditActivity` — 5 full scans → 1 indexed query

**Before**: Scans AuditEvent + Sample + Exam + WorkOrder + Patient tables, then joins in memory.

**After** (with `workOrderId` FK + composite index):

```typescript
// Option A: Use the byWorkOrderId index with recent timestamp range
const { data: recentEvents } = await client.models.AuditEvent.list({
  filter: {
    timestamp: { ge: cutoffTimestamp },
  },
  selectionSet: [
    "id", "action", "timestamp", "workOrderId",
    "workOrder.id", "workOrder.accessionNumber",
    "workOrder.patient.id", "workOrder.patient.firstName",
    "workOrder.patient.lastName",
  ],
});
```

The `workOrder` relationship traversal eliminates the need to scan Sample, Exam, WorkOrder, and Patient tables separately. The in-memory `resolveWorkOrderId()` function (which manually chains Exam → Sample → WorkOrder) becomes unnecessary.

### 5.4 Action-Based Queries — Index Optimization Only

These queries filter by `action` and/or `timestamp`, not by entity relationships. They benefit from the **composite `(action, timestamp)` index**, not from FK relationships:

| Function | Current Filter | Index Used |
|----------|---------------|-----------|
| `getCompletedTodayCount` | `action = SPECIMEN_COMPLETED AND entityType = SAMPLE AND timestamp BETWEEN` | `byActionAndTimestamp` (partition: action, range: timestamp) |
| `getDashboardStats` | `action = INCIDENCE_CREATED` | `byActionAndTimestamp` |
| `listAllIncidentAuditEvents` | `action IN (EXAM_REJECTED, SPECIMEN_REJECTED, INCIDENCE_CREATED) AND timestamp BETWEEN` | `byActionAndTimestamp` per action value |

Note: DynamoDB's `or` filter doesn't use indexes — the incidence query filters by 3 action values, so it would need 3 parallel index queries or a single scan with filter. The composite index still helps by making each individual action query efficient.

---

## 6. Write-Side Changes

### 6.1 Unified `emitAudit` Helper

Replace the 4 independent `emitAudit` functions (one per service file) with a shared helper that populates FK fields:

```typescript
// src/lib/services/audit-helpers.ts

type AuditEventInput = {
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  metadata?: Record<string, unknown>;
  // FK context — caller provides what it has
  workOrderId?: string;
  sampleId?: string;
  examId?: string;
};

export async function emitAudit(input: AuditEventInput): Promise<void> {
  const now = new Date().toISOString();
  const serializedMetadata =
    input.metadata == null ? undefined : JSON.stringify(input.metadata);

  const { errors, data } = await cookieBasedClient.models.AuditEvent.create({
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    userId: input.userId,
    timestamp: now,
    metadata: serializedMetadata,
    // Populate FK fields
    workOrderId: input.workOrderId ?? undefined,
    sampleId: input.sampleId ?? undefined,
    examId: input.examId ?? undefined,
  });

  if (errors?.length || !data?.id) {
    console.error("[emitAudit] Failed:", errors);
    throw new Error(errors?.[0]?.message ?? "Failed to create audit event");
  }
}
```

### 6.2 Service-Level Changes

Each service needs to pass the FK context it already has:

**`specimen-generation-service.ts`** — WorkOrder events:

```typescript
// Before
await cookieBasedClient.models.AuditEvent.create({
  entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
  entityId: workOrderId,
  action: AUDIT_ACTIONS.SPECIMENS_GENERATED,
  userId,
  timestamp: now,
  metadata: ...,
});

// After
await emitAudit({
  entityType: AUDIT_ENTITY_TYPES.WORK_ORDER,
  entityId: workOrderId,
  action: AUDIT_ACTIONS.SPECIMENS_GENERATED,
  userId,
  metadata: { sampleIds: createdSampleIds, barcodes: createdBarcodes, ... },
  workOrderId,   // ← direct: entityId IS the workOrderId
});
```

**`sample-status-service.ts`** — Sample events:

```typescript
// Before (sample already fetched at top of function)
await emitAudit(AUDIT_ENTITY_TYPES.SAMPLE, sampleId, action, userId);

// After — sample.workOrderId is available from the Sample.get at function start
await emitAudit({
  entityType: AUDIT_ENTITY_TYPES.SAMPLE,
  entityId: sampleId,
  action,
  userId,
  sampleId,                        // ← direct: entityId IS the sampleId
  workOrderId: sample.workOrderId, // ← from the Sample.get already performed
});
```

**`exam-result-service.ts`** and **`validation-service.ts`** — Exam events:

```typescript
// Before (exam already fetched at top of function)
await emitAudit(AUDIT_ENTITY_TYPES.EXAM, examId, action, userId, {
  sampleId: exam.sampleId,
});

// After — need to resolve sample.workOrderId (one extra read, or cache)
const { data: parentSample } = await client.models.Sample.get(
  { id: exam.sampleId },
  { selectionSet: ["id", "workOrderId"] }
);

await emitAudit({
  entityType: AUDIT_ENTITY_TYPES.EXAM,
  entityId: examId,
  action,
  userId,
  metadata: { sampleId: exam.sampleId },
  examId,                                   // ← direct
  sampleId: exam.sampleId,                  // ← from exam
  workOrderId: parentSample?.workOrderId,   // ← one extra read
});
```

> **Optimization**: The exam services already call `Exam.get` at function start. If we expand that to use a selectionSet including `"sample.workOrderId"`, we can get the `workOrderId` without an extra round trip:
>
> ```typescript
> const { data: exam } = await client.models.Exam.get(
>   { id: examId },
>   { selectionSet: ["id", "status", "sampleId", "sample.workOrderId", ...] }
> );
> // exam.sample.workOrderId is now available — no extra read needed
> ```

### 6.3 Seed Data Changes

Both `amplify/seed/seed.ts` and `amplify/functions/seed-data/handler.ts` use a `createAuditEvent()` helper. Update to include FK fields:

```typescript
async function createAuditEvent(params: {
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  // NEW FK fields
  workOrderId?: string;
  sampleId?: string;
  examId?: string;
}) {
  const result = await client.models.AuditEvent.create({
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    userId: params.userId,
    timestamp: params.timestamp,
    metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    workOrderId: params.workOrderId,
    sampleId: params.sampleId,
    examId: params.examId,
  });
  // ...
}
```

The seed scripts already have all entity IDs available when creating audit events, so populating the FKs is straightforward.

---

## 7. Full Schema Diff

```diff
 // amplify/data/resource.ts

 WorkOrder: a
   .model({
     // ...existing fields...
     samples: a.hasMany("Sample", "workOrderId"),
+    auditEvents: a.hasMany("AuditEvent", "workOrderId"),
   })
   .authorization((allow) => [allow.authenticated(), allow.guest()]),

 Sample: a
   .model({
     // ...existing fields...
     exam: a.hasOne("Exam", "sampleId"),
+    auditEvents: a.hasMany("AuditEvent", "sampleId"),
   })
   .secondaryIndexes((index) => [index("workOrderId"), index("examTypeId"), index("status")])
   .authorization((allow) => [allow.authenticated(), allow.guest()]),

 Exam: a
   .model({
     // ...existing fields...
+    auditEvents: a.hasMany("AuditEvent", "examId"),
   })
   .secondaryIndexes((index) => [index("sampleId"), index("examTypeId"), index("status")])
   .authorization((allow) => [allow.authenticated(), allow.guest()]),

 AuditEvent: a
   .model({
     entityType: a.string().required(),
     entityId: a.string().required(),
     action: a.string().required(),
     userId: a.string().required(),
     timestamp: a.datetime().required(),
     metadata: a.json(),
+    // Relationship FKs (optional — populated based on entityType)
+    workOrderId: a.id(),
+    workOrder: a.belongsTo("WorkOrder", "workOrderId"),
+    sampleId: a.id(),
+    sample: a.belongsTo("Sample", "sampleId"),
+    examId: a.id(),
+    exam: a.belongsTo("Exam", "examId"),
   })
   .secondaryIndexes((index) => [
-    index("entityType"),
-    index("entityId"),
-    index("userId"),
-    index("timestamp"),
+    index("entityType").sortKeys(["entityId"]),
+    index("action").sortKeys(["timestamp"]),
+    index("workOrderId").sortKeys(["timestamp"]),
+    index("sampleId").sortKeys(["timestamp"]),
+    index("examId").sortKeys(["timestamp"]),
+    index("userId").sortKeys(["timestamp"]),
   ])
   .authorization((allow) => [allow.authenticated(), allow.guest()]),
```

---

## 8. Performance Impact Summary

### Round Trip Reduction

| Function | Before | After (with data-fetching optimization) | After (+ this refactor) | Technique |
|----------|:------:|:--------------------------------------:|:----------------------:|-----------|
| `getSampleDetail` | 4+ | 2 (1 entity + 1 audit batch) | **1** | AuditEvents via `selectionSet` |
| `getAuditTimelineForWorkOrder` | 4+ (up to 15 parallel) | same (audit is the bottleneck) | **1** | Deep `selectionSet` with all relationships |
| `getRecentAuditActivity` | 5 full scans | same | **1** | `workOrder` traversal in selectionSet + timestamp index |
| `getCompletedTodayCount` | 1 | 1 | **1** (faster) | `(action, timestamp)` composite index |
| `listAllIncidentAuditEvents` | 1 (paginated, slow filter) | 1 | **1** (faster) | `(action, timestamp)` composite index |

### Estimated Latency Improvement

| Function | Current Latency | After Refactor | Savings |
|----------|:--------------:|:--------------:|:-------:|
| `getSampleDetail` | ~900ms (3 sequential rounds @ 300ms) | ~300ms (1 round) | **67%** |
| `getAuditTimelineForWorkOrder` | ~1200ms+ (4 sequential rounds) | ~400ms (1 round, larger payload) | **67%** |
| `getRecentAuditActivity` | ~600ms (2 sequential rounds of parallel scans) | ~300ms (1 indexed query) | **50%** |

---

## 9. Payload Size Considerations

Adding `auditEvents` to deep selection sets increases GraphQL response sizes. Mitigation strategies:

1. **Select only needed AuditEvent fields.** Don't use `"auditEvents.*"` — select specific fields (`id`, `action`, `timestamp`, `userId`, `metadata`). This excludes the FK fields and `entityType`/`entityId` from the response since they're redundant when loaded via relationship.

2. **Amplify `hasMany` default limits.** Amplify's GraphQL resolvers apply a default limit (typically 100 items) on `hasMany` results. For work orders with extensive audit history, this is sufficient. If a single entity exceeds 100 events, use the `workOrderId` index directly instead of the relationship.

3. **Separate audit-heavy views from entity-detail views.** The technician's `getSampleDetail` shows a brief history (last 10-15 events). The supervisor's full audit timeline is a dedicated view. Use different selection sets for each:

   ```typescript
   // Technician detail: lightweight audit history
   const SAMPLE_DETAIL_SELECTION = [
     // ...entity fields...
     "auditEvents.id", "auditEvents.action", "auditEvents.timestamp",
   ] as const;

   // Supervisor audit timeline: full audit data
   const WO_TIMELINE_SELECTION = [
     // ...entity fields + deep audit with metadata...
   ] as const;
   ```

4. **Strategic Suspense boundaries.** For pages like the supervisor audit timeline, wrap the audit-heavy section in a Suspense boundary so the entity data streams first and audit data loads independently.

---

## 10. Migration Strategy

### Phase 1: Schema + Indexes (no data migration needed)

1. Add the FK fields (`workOrderId`, `sampleId`, `examId`) and `belongsTo`/`hasMany` relationships to the schema.
2. Replace the 4 single-key indexes with 6 composite indexes.
3. Deploy. Amplify handles the DynamoDB table alterations and GSI creation.

FK fields are optional (`a.id()` without `.required()`), so existing AuditEvent records remain valid — their FK fields will be `null`.

### Phase 2: Write-side update

1. Create shared `emitAudit` helper in `src/lib/services/audit-helpers.ts`.
2. Update all 4 service files to use the shared helper and pass FK context.
3. Update seed scripts to populate FK fields.
4. Deploy. All **new** AuditEvents will have FK fields populated.

### Phase 3: Backfill existing data

Run a one-time backfill script (as a Lambda or seed mutation) that:

```typescript
// Pseudocode for backfill
const allAudits = await paginateAll(client.models.AuditEvent.list());

for (const audit of allAudits) {
  const updates: Partial<AuditEvent> = {};

  if (audit.entityType === "WorkOrder") {
    updates.workOrderId = audit.entityId;
  } else if (audit.entityType === "Sample") {
    updates.sampleId = audit.entityId;
    const sample = sampleCache.get(audit.entityId);
    if (sample) updates.workOrderId = sample.workOrderId;
  } else if (audit.entityType === "Exam") {
    updates.examId = audit.entityId;
    const exam = examCache.get(audit.entityId);
    if (exam) {
      updates.sampleId = exam.sampleId;
      const sample = sampleCache.get(exam.sampleId);
      if (sample) updates.workOrderId = sample.workOrderId;
    }
  }

  if (Object.keys(updates).length > 0) {
    await client.models.AuditEvent.update({ id: audit.id, ...updates });
  }
}
```

Pre-load Sample and Exam tables into maps before iterating to avoid N+1.

### Phase 4: Read-side optimization

1. Update `getSampleDetail` to use relationship-based selection set (eliminate AuditEvent queries).
2. Rewrite `getAuditTimelineForWorkOrder` to use single deep selection set.
3. Optimize `getRecentAuditActivity` to use `workOrder` traversal.
4. Update action-based queries to leverage composite indexes.

### Phase 5: Cleanup (optional)

Once all reads use FK-based queries:
- `entityType`/`entityId` fields can be marked as deprecated but kept for debugging.
- The `byEntityTypeAndId` composite index can be removed if no queries use it.
- Remove the old `listAuditEventsByEntity` function.

---

## 11. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **6 GSIs add write amplification** | Low | AuditEvent writes are low-frequency (1 per user action). DynamoDB replicates to each GSI, but at this volume it's negligible. |
| **Deep selection sets return large payloads** | Medium | Use field-level selection (not `.*`). Apply Amplify's default `hasMany` limits. Separate audit-heavy views behind Suspense. |
| **Backfill script for existing data** | Low | One-time operation. Can be run as a Lambda with batch processing. Failure is non-blocking — FK fields stay null for old events, and legacy `entityType`/`entityId` queries still work. |
| **Write-side complexity (resolving workOrderId for Exam events)** | Low | Expand existing `Exam.get` selection set to include `"sample.workOrderId"` — zero extra round trips. |
| **Amplify `hasMany` in subscriptions redacts relational data** | Low | Per Amplify docs, subscription results redact relational fields when authorization rules differ. Our authorization is uniform (`authenticated + guest`) across all models, so redaction should not apply. |
| **Breaking change to AuditEvent model shape** | None | FK fields are additive (optional). No existing fields are removed or renamed. |

---

## 12. Alternative Considered: Composite Index Only (No Relationships)

Instead of adding FK relationships, we could add only the composite `(entityType, entityId)` index and keep AuditEvent as a standalone model.

**Pros:**
- Simpler schema change (no FK fields, no `belongsTo`/`hasMany`).
- No write-side changes needed.

**Cons:**
- Cannot use `selectionSet` for eager loading — AuditEvent queries remain separate round trips.
- `getSampleDetail` stays at 2 round trips (vs 1 with relationships).
- `getAuditTimelineForWorkOrder` stays at 4+ rounds (vs 1 with relationships).
- Individual queries are faster (composite index vs post-filter), but the number of queries is unchanged.

**Verdict:** Composite indexes alone improve query efficiency but don't eliminate round trips. The relationship approach eliminates entire query stages, which is the higher-impact optimization.

---

## 13. Files Affected

### Schema
- `amplify/data/resource.ts` — AuditEvent model + WorkOrder/Sample/Exam `hasMany`

### Services (write-side)
- `src/lib/services/audit-helpers.ts` — **new** shared `emitAudit` helper
- `src/lib/services/specimen-generation-service.ts` — pass `workOrderId` FK
- `src/lib/services/sample-status-service.ts` — pass `sampleId` + `workOrderId` FKs
- `src/lib/services/exam-result-service.ts` — pass `examId` + `sampleId` + `workOrderId` FKs
- `src/lib/services/validation-service.ts` — pass `examId` + `sampleId` + `workOrderId` FKs

### Repositories (read-side)
- `src/lib/repositories/technician-repository.ts` — `getSampleDetail` selection set
- `src/lib/repositories/audit-repository.ts` — `getAuditTimelineForWorkOrder`, `getRecentAuditActivity`
- `src/lib/repositories/supervisor-repository.ts` — `getDashboardStats` (index optimization)
- `src/lib/repositories/incidence-repository.ts` — `listAllIncidentAuditEvents` (index optimization)
- `src/lib/repositories/analytics-repository.ts` — `fetchAnalyticsBaseData` (index optimization)

### Seed
- `amplify/seed/seed.ts` — populate FK fields
- `amplify/functions/seed-data/handler.ts` — populate FK fields

### Types (no changes needed)
- `src/lib/contracts.ts` — `AUDIT_ENTITY_TYPES` unchanged
- `src/lib/types/audit-timeline-types.ts` — interfaces unchanged

---

## 14. Relationship to Data Fetching Optimization

This refactor is **additive** to the [data-fetching-optimization-definitive](./data-fetching-optimization-definitive.md). It addresses the caveat noted in Section 8.2:

> "AuditEvent queries remain separate (no schema relationship), but are parallelized via `Promise.all`."
> "2 round trips instead of 4+. The AuditEvent queries are irreducible without a schema change."

With this schema change, the AuditEvent queries **are** reducible. The optimization plan should be updated:

| Function | Definitive Doc Target | With This Refactor |
|----------|:--------------------:|:-----------------:|
| `getSampleDetail` | 1+1 (entity + audit batch) | **1** (single selectionSet) |
| `getAuditTimelineForWorkOrder` | Not in scope (audit-specific) | **1** (single selectionSet) |
| `getRecentAuditActivity` | Not in scope (audit-specific) | **1** (indexed + relationship traversal) |

This makes Phase 1 of the optimization plan fully complete — zero "irreducible" multi-round-trip functions remain.
