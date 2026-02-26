import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { Schema } from "../../data/resource";
import { env } from "$amplify/env/run-seed";

const lambda = new LambdaClient({});
const SEED_DATA_FUNCTION_NAME = env.SEED_DATA_FUNCTION_NAME; 

export const handler: Schema["runSeed"]["functionHandler"] = async (event, context) => {
  if (!SEED_DATA_FUNCTION_NAME) {
    throw new Error("SEED_DATA_FUNCTION_NAME env not configured");
  }

  await lambda.send(
    new InvokeCommand({
      FunctionName: SEED_DATA_FUNCTION_NAME,
      InvocationType: "Event",
    })
  );

  return { started: true };
};
