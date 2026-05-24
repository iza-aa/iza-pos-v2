import {
  addDaysToDateString,
  getJakartaLocalDate,
  JAKARTA_TIME_ZONE,
} from "./date";
import type {
  OwnerInsightPeriod,
  RecommendationGranularity,
  RecommendationPeriodContext,
} from "./recommendationSnapshotTypes";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: string | undefined): value is string {
  return Boolean(value && DATE_PATTERN.test(value));
}

export function getPeriodLabel(period: OwnerInsightPeriod) {
  return period.startDate === period.endDate
    ? period.startDate
    : `${period.startDate} to ${period.endDate}`;
}

export function getDateDistance(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function getPeriodLengthDays(period: OwnerInsightPeriod) {
  return getDateDistance(period.startDate, period.endDate) + 1;
}

export function normalizeInsightPeriod(
  period?: Partial<OwnerInsightPeriod>,
): OwnerInsightPeriod {
  if (
    period &&
    isDateString(period.startDate) &&
    isDateString(period.endDate) &&
    period.startDate <= period.endDate
  ) {
    return {
      startDate: period.startDate,
      endDate: period.endDate,
    };
  }

  const today = getJakartaLocalDate();
  return { startDate: today, endDate: today };
}

export function getComparisonPeriod(period: OwnerInsightPeriod): OwnerInsightPeriod {
  const length = getPeriodLengthDays(period);
  const endDate = addDaysToDateString(period.startDate, -1);
  const startDate = addDaysToDateString(endDate, -(length - 1));
  return { startDate, endDate };
}

export function getRecommendationGranularity(
  period: OwnerInsightPeriod,
): RecommendationGranularity {
  const length = getPeriodLengthDays(period);

  if (length <= 1) return "hour";
  if (length <= 60) return "day";
  if (length <= 180) return "week";
  return "month";
}

export function buildRecommendationPeriodContext(
  period?: Partial<OwnerInsightPeriod>,
): RecommendationPeriodContext {
  const selected = normalizeInsightPeriod(period);
  const comparison = getComparisonPeriod(selected);

  return {
    selected: {
      ...selected,
      label: getPeriodLabel(selected),
      granularity: getRecommendationGranularity(selected),
    },
    comparison: {
      ...comparison,
      label: getPeriodLabel(comparison),
    },
    timezone: JAKARTA_TIME_ZONE,
  };
}

export function isDateInPeriod(date: string, period: OwnerInsightPeriod) {
  return date >= period.startDate && date <= period.endDate;
}
