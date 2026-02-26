import { defineFunction } from "@aws-amplify/backend";

/**
 * Thin trigger Lambda invoked by runSeed mutation.
 * Asynchronously invokes seedData and returns immediately (fire-and-forget).
 */
export const runSeed = defineFunction({
  name: "run-seed",
  entry: "./handler.ts",
});
