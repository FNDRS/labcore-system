import { cache } from "react";
import { cookieBasedClient } from "@/utils/amplifyServerUtils";

export function parseResults(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

export function buildPatientFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Desconocido";
}

export function ageFromDateOfBirth(dob: string | null | undefined): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Per-request cached ExamType code→name map.
 * Shared across repository functions within a single RSC render via React.cache().
 */
export const getExamTypeCodeMap = cache(async (): Promise<Map<string, string>> => {
  const { data, errors } = await cookieBasedClient.models.ExamType.list({
    selectionSet: ["code", "name"] as const,
  });
  if (errors?.length) {
    console.error("[getExamTypeCodeMap] Amplify errors:", errors);
  }
  return new Map((data ?? []).map((et) => [et.code, et.name]));
});
