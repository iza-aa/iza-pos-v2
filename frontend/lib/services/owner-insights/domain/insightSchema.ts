export const OWNER_INSIGHT_CATEGORIES = [
  "overview",
  "sales",
  "rewards",
  "inventory",
  "staff",
  "operations",
  "activity_log",
] as const;

export type OwnerInsightCategory = (typeof OWNER_INSIGHT_CATEGORIES)[number];

export type InsightPriority = "high" | "medium" | "low";
export type InsightConfidence = "high" | "medium" | "low";

export type AIInsight = {
  id: string;
  category: OwnerInsightCategory;
  title: string;
  priority: InsightPriority;
  confidence: InsightConfidence;
  problem: string;
  evidence: string[];
  recommendation: string;
  expectedImpact: string;
  actionLabel?: string;
  actionHref?: string;
};

export type OwnerInsightRecord = {
  id: string;
  owner_id: string;
  category: OwnerInsightCategory;
  local_date: string;
  period_key: string;
  insights_json: AIInsight[];
  snapshot_json: Record<string, unknown>;
  generated_at: string;
  expires_at: string;
  generation_count: number;
};

export const isOwnerInsightCategory = (
  value: string | null | undefined,
): value is OwnerInsightCategory => {
  return OWNER_INSIGHT_CATEGORIES.includes(value as OwnerInsightCategory);
};

export const normalizePriority = (value: unknown): InsightPriority => {
  return value === "high" || value === "low" ? value : "medium";
};

export const normalizeConfidence = (value: unknown): InsightConfidence => {
  return value === "high" || value === "low" ? value : "medium";
};

const ALLOWED_ACTION_HREFS = new Set([
  "/owner/dashboard?tab=sales",
  "/owner/dashboard?tab=customer",
  "/owner/dashboard?tab=inventory",
  "/owner/dashboard?tab=staff",
  "/owner/dashboard?tab=operations",
  "/owner/activitylog",
]);

const trimText = (value: unknown, maxLength: number) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
};

export function extractJsonArray(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error("AI response is not valid JSON array.");
  }
}

export function sanitizeInsights(
  value: unknown,
  category: OwnerInsightCategory,
): AIInsight[] {
  if (!Array.isArray(value)) return [];

  const insights: AIInsight[] = [];

  value.forEach((item, index) => {
    if (!item || typeof item !== "object" || insights.length >= 5) return;

    const record = item as Record<string, unknown>;
    const problem = trimText(record.problem, 420);
    const recommendation = trimText(record.recommendation, 520);
    const evidence = Array.isArray(record.evidence)
      ? record.evidence
          .map((entry) => trimText(entry, 220))
          .filter(Boolean)
          .slice(0, 4)
      : [];

    if (!problem || !recommendation || evidence.length === 0) return;

    const actionHref = trimText(record.actionHref, 160);

    insights.push({
      id:
        trimText(record.id, 64) ||
        `${category}-insight-${String(index + 1).padStart(2, "0")}`,
      category,
      title: trimText(record.title, 120) || "Business insight",
      priority: normalizePriority(record.priority),
      confidence: normalizeConfidence(record.confidence),
      problem,
      evidence,
      recommendation,
      expectedImpact:
        trimText(record.expectedImpact, 320) ||
        "Impact should be monitored through the metrics in this category.",
      actionLabel: trimText(record.actionLabel, 80) || undefined,
      actionHref: ALLOWED_ACTION_HREFS.has(actionHref) ? actionHref : undefined,
    });
  });

  return insights;
}

export function buildDataSummaryInsight(
  category: OwnerInsightCategory,
  snapshot: Record<string, unknown>,
): AIInsight {
  const metricCount = Object.keys(snapshot).length;

  return {
    id: `${category}-data-summary`,
    category,
    title: "Data Summary is ready",
    priority: "medium",
    confidence: "medium",
    problem:
      "The AI recommendation could not be generated yet, but the data snapshot for this category is ready.",
    evidence: [
      `The ${category} snapshot contains ${metricCount} metric groups.`,
      "Use the visual summary on this tab while trying to generate again.",
    ],
    recommendation:
      "Review the key metrics on this tab and regenerate once the Gemini connection or configuration is available.",
    expectedImpact:
      "The owner can still read the basic business condition without waiting for the AI call to succeed.",
    actionLabel: "View this tab",
      actionHref:
        category === "overview"
          ? "/owner/dashboard?tab=sales"
          : category === "rewards"
            ? "/owner/dashboard?tab=customer"
            : category === "activity_log"
              ? "/owner/activitylog"
            : `/owner/dashboard?tab=${category}`,
  };
}
