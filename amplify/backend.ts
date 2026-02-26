import { defineBackend } from "@aws-amplify/backend";
import * as iam from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { runSeed } from "./functions/run-seed/resource";
import { seedData } from "./functions/seed-data/resource";

const backend = defineBackend({
  auth,
  data,
  runSeed,
  seedData,
});

const runSeedLambda = backend.runSeed.resources.lambda;
const seedDataLambda = backend.seedData.resources.lambda;

backend.runSeed.addEnvironment("SEED_DATA_FUNCTION_NAME", seedDataLambda.functionName);

runSeedLambda.addToRolePolicy(
  new iam.PolicyStatement({
    sid: "InvokeSeedData",
    actions: ["lambda:InvokeFunction"],
    resources: [seedDataLambda.functionArn],
  })
);
