export type ClinicBranding = {
  name: string;
  logoUrl: string | null;
};

export const CLINIC_BRANDING: ClinicBranding = {
  name: process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Clínica Dignitas",
  logoUrl: process.env.NEXT_PUBLIC_CLINIC_LOGO_URL ?? null,
};

export function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "D";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
  return `${first}${second ?? ""}`.toUpperCase();
}

