export type TrendDirection = "up" | "down" | "flat";

export interface TrendResult {
  direction: TrendDirection;
  percentage: number;
}

/**
 * Computes trend between current and previous period for KPI cards.
 * Returns direction (up/down/flat) and percentage change.
 * - previous = 0 and current > 0 → "up", 100%
 * - previous = 0 and current = 0 → "flat", 0%
 * - current > previous → "up", positive %
 * - current < previous → "down", positive % (magnitude of decrease)
 * - current = previous → "flat", 0%
 */
export function computeTrend(current: number, previous: number): TrendResult {
  if (previous === 0) {
    if (current > 0) return { direction: "up", percentage: 100 };
    return { direction: "flat", percentage: 0 };
  }

  if (current === previous) {
    return { direction: "flat", percentage: 0 };
  }

  const change = Math.abs(current - previous);
  const percentage = Number(((change / previous) * 100).toFixed(1));

  if (current > previous) {
    return { direction: "up", percentage };
  }

  return { direction: "down", percentage };
}
