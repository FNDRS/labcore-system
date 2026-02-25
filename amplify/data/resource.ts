import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  WorkOrder: a
    .model({
      status: a.enum(["pending", "inprogress", "completed"]),
      accessionNumber: a.string(),
      priority: a.enum(["routine", "urgent", "stat"]),
      requestedAt: a.datetime(),
      patientId: a.id().required(),
      patient: a.belongsTo("Patient", "patientId"),
      samples: a.hasMany("Sample", "workOrderId"),
      notes: a.string(),
      /** Exam type codes requested for this order (e.g. ["URO","HEM"]). Drives specimen generation. */
      requestedExamTypeCodes: a.string().array(),
      /** Referring physician name or identifier. */
      referringDoctor: a.string(),
    })
    .authorization((allow) => [allow.authenticated(), allow.guest()]),

  Patient: a
    .model({
      firstName: a.string(),
      lastName: a.string(),
      dateOfBirth: a.date(),
      gender: a.enum(["M", "F"]),
      phone: a.phone(),
      email: a.email(),
      extraData: a.json(),
      workOrders: a.hasMany("WorkOrder", "patientId"),
    })
    .authorization((allow) => [allow.authenticated(), allow.guest()]),

  ExamType: a
    .model({
      code: a.string().required(),
      name: a.string().required(),
      sampleType: a.enum(["urine", "stool", "wholebloodedta", "serum", "other"]),
      fieldSchema: a.json().required(),
      isActive: a.boolean().default(true),
      version: a.integer().default(1),
      samples: a.hasMany("Sample", "examTypeId"),
      exams: a.hasMany("Exam", "examTypeId"),
    })
    .secondaryIndexes((index) => [index("code")])
    .authorization((allow) => [allow.authenticated(), allow.guest()]),

  Sample: a
    .model({
      workOrderId: a.id().required(),
      workOrder: a.belongsTo("WorkOrder", "workOrderId"),
      examTypeId: a.id().required(),
      examType: a.belongsTo("ExamType", "examTypeId"),
      barcode: a.string(),
      collectedAt: a.datetime(),
      receivedAt: a.datetime(),
      status: a.enum([
        "pending",
        "labeled",
        "ready_for_lab",
        "received",
        "inprogress",
        "completed",
        "rejected",
      ]),
      specimenData: a.json(),
      exam: a.hasOne("Exam", "sampleId"),
    })
    .secondaryIndexes((index) => [index("workOrderId"), index("examTypeId"), index("status")])
    .authorization((allow) => [allow.authenticated(), allow.guest()]),

  Exam: a
    .model({
      sampleId: a.id().required(),
      sample: a.belongsTo("Sample", "sampleId"),
      examTypeId: a.id().required(),
      examType: a.belongsTo("ExamType", "examTypeId"),
      status: a.enum([
        "pending",
        "inprogress",
        "completed",
        "review",
        "ready_for_validation",
        "approved",
        "rejected",
      ]),
      results: a.json(),
      startedAt: a.datetime(),
      resultedAt: a.datetime(),
      performedBy: a.string(),
      notes: a.string(),
      validatedBy: a.string(),
      validatedAt: a.datetime(),
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
    })
    .secondaryIndexes((index) => [
      index("entityType"),
      index("entityId"),
      index("userId"),
      index("timestamp"),
    ])
    .authorization((allow) => [allow.authenticated(), allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
