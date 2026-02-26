import type {
  AnalyticsRangePreset,
  AnalyticsTimeRange,
} from "@/lib/types/analytics-types";

export function computePresetRange(
  preset: Exclude<AnalyticsRangePreset, "custom">,
): { from: string; to: string } {
  const now = new Date();
  const to = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString();

  if (preset === "today") {
    return {
      from: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).toISOString(),
      to,
    };
  }

  const days = preset === "last7d" ? 7 : 30;
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - days);
  fromDate.setHours(0, 0, 0, 0);
  return { from: fromDate.toISOString(), to };
}

export function createDefaultTimeRange(
  preset: AnalyticsRangePreset = "last7d",
): AnalyticsTimeRange {
  if (preset === "custom") {
    const range = computePresetRange("last7d");
    return { ...range, preset: "custom" };
  }
  return { ...computePresetRange(preset), preset };
}
