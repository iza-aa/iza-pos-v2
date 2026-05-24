import type { RecommendationMetric } from "./recommendationSnapshotTypes";

export function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function buildMetric({
  value,
  previousValue,
  unit,
  source,
  displayLabel,
}: Omit<RecommendationMetric, "changePct">): RecommendationMetric {
  const canCalculateChange =
    typeof value === "number" && typeof previousValue === "number";

  return {
    value,
    previousValue,
    changePct: canCalculateChange ? percentChange(value, previousValue) : null,
    unit,
    source,
    displayLabel,
  };
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
