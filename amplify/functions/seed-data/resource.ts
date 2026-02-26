import { defineFunction } from "@aws-amplify/backend";

/**
 * Long-running Lambda that executes the MEGA seed logic.
 * Max timeout 15 min (Lambda limit), 2GB RAM for data-heavy operations.
 * Granted data access via schema authorization.
 */
export const seedData = defineFunction({
  name: "seed-data",
  entry: "./handler.ts",
  timeoutSeconds: 900,
  memoryMB: 2048,
});
