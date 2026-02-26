"use server";

import { requireAuthWithGroup } from "@/lib/auth-server";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { cookies } from "next/headers";

export async function runSeedAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (ctx) => requireAuthWithGroup(ctx, "admin"),
  });

  try {
    const { data, errors } = await cookieBasedClient.mutations.runSeed({});
    if (errors?.length) {
      return { ok: false, error: errors[0].message ?? "Error desconocido" };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
