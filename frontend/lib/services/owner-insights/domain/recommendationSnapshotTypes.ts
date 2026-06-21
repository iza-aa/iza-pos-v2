import type { OwnerInsightCategory } from "./insightSchema";

export type OwnerInsightPeriod = {
  startDate: string;
  endDate: string;
};

export type RecommendationGranularity = "hour" | "day" | "week" | "month";

export type RecommendationPeriodContext = {
  selected: OwnerInsightPeriod & {
    label: string;
    granularity: RecommendationGranularity;
  };
  comparison: OwnerInsightPeriod & {
    label: string;
  };
  timezone: "Asia/Jakarta";
};

export type MetricUnit = "IDR" | "count" | "percent" | "minutes" | "text";

export type RecommendationMetric = {
  value: number | string | null;
  previousValue?: number | string | null;
  changePct?: number | null;
  unit: MetricUnit;
  source: string;
  displayLabel: string;
};

export type RecommendationChartPoint = Record<string, number | string | null>;

export type RecommendationChartSnapshot = {
  title: string;
  description: string;
  points: RecommendationChartPoint[];
};

export type RecommendationTableSnapshot = {
  title: string;
  description: string;
  rows: Array<Record<string, number | string | null>>;
};

export type RecommendationDataQuality = {
  missingFields: string[];
  unsupportedClaims: string[];
  warnings: string[];
};

export type RecommendationAllowedIssue = {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  problem: string;
  evidence: string[];
  recommendationHint: string;
  expectedImpact: string;
  metricKeys: string[];
};

export type RecommendationSnapshot = {
  category: OwnerInsightCategory;
  period: RecommendationPeriodContext;
  metrics: Record<string, RecommendationMetric>;
  charts: Record<string, RecommendationChartSnapshot>;
  tables: Record<string, RecommendationTableSnapshot>;
  allowedIssues: RecommendationAllowedIssue[];
  dataQuality: RecommendationDataQuality;
  diagnostics?: Record<string, number | string | null>;
};
