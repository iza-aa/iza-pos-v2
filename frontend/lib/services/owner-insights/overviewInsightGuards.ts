import type { AIInsight } from "./insightSchema";
import {
  buildDeterministicIssueFallback,
  validateAllowedIssueInsights,
} from "./allowedIssueInsightGuards";

export function validateOverviewInsights(
  insights: AIInsight[],
  snapshot: Record<string, unknown>,
) {
  return validateAllowedIssueInsights(insights, snapshot);
}

export function buildOverviewDeterministicFallback(
  snapshot: Record<string, unknown>,
): AIInsight | null {
  return buildDeterministicIssueFallback(snapshot);
}
