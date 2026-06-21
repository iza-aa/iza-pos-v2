import type { AIInsight, OwnerInsightCategory } from "./insightSchema";
import type {
  RecommendationAllowedIssue,
  RecommendationMetric,
  RecommendationSnapshot,
} from "./recommendationSnapshotTypes";

const getMetricNumber = (
  metrics: Record<string, RecommendationMetric> | undefined,
  key: string,
) => {
  const value = metrics?.[key]?.value;
  return typeof value === "number" ? value : 0;
};

const getInsightText = (insight: AIInsight) =>
  [
    insight.title,
    insight.problem,
    insight.recommendation,
    insight.expectedImpact,
    ...insight.evidence,
  ]
    .join(" ")
    .toLowerCase();

const hasBasicMetricContradiction = (
  insight: AIInsight,
  metrics: Record<string, RecommendationMetric>,
) => {
  const text = getInsightText(insight);
  const totalRevenue = getMetricNumber(metrics, "totalRevenue");
  const totalOrders = getMetricNumber(metrics, "totalOrders");

  if (totalRevenue > 0 && /\bzero revenue\b|\bno revenue\b|\b0 revenue\b/.test(text)) {
    return true;
  }

  if (totalOrders > 0 && /\bzero orders\b|\bno orders\b|\b0 orders\b/.test(text)) {
    return true;
  }

  return false;
};

const unsupportedMenuExamples = [
  "pastry",
  "pastries",
  "dessert",
  "desserts",
  "sandwich",
  "sandwiches",
  "snack",
  "snacks",
  "cake",
  "cakes",
  "cookie",
  "cookies",
];

const replaceUnsupportedMenuExamples = (
  text: string,
  snapshotText: string,
) => {
  let result = text;

  unsupportedMenuExamples.forEach((example) => {
    if (snapshotText.includes(example)) return;

    const replacement = example.endsWith("s")
      ? "available add-ons"
      : "an available add-on";

    result = result.replace(
      new RegExp(`\\b(?:a|an|the)?\\s*${example}\\b`, "gi"),
      replacement,
    );
  });

  return result;
};

const sanitizeUnsupportedMenuExamples = (
  insight: AIInsight,
  snapshot: Record<string, unknown>,
): AIInsight => {
  const snapshotText = JSON.stringify(snapshot).toLowerCase();

  return {
    ...insight,
    title: replaceUnsupportedMenuExamples(insight.title, snapshotText),
    problem: replaceUnsupportedMenuExamples(insight.problem, snapshotText),
    recommendation: replaceUnsupportedMenuExamples(
      insight.recommendation,
      snapshotText,
    ),
    expectedImpact: replaceUnsupportedMenuExamples(
      insight.expectedImpact,
      snapshotText,
    ),
  };
};

const buildAnchoredProblem = (issue: RecommendationAllowedIssue) =>
  `${issue.problem} ${issue.evidence.join(" ")}`;

const anchorInsightToIssue = (
  insight: AIInsight,
  issue: RecommendationAllowedIssue,
): AIInsight => ({
  ...insight,
  id: issue.id,
  priority: issue.priority,
  confidence: issue.confidence,
  evidence: issue.evidence,
});

export function validateAllowedIssueInsights(
  insights: AIInsight[],
  snapshot: Record<string, unknown>,
) {
  const typedSnapshot = snapshot as Partial<RecommendationSnapshot>;
  const allowedIssues = typedSnapshot.allowedIssues ?? [];

  if (!allowedIssues.length) return insights;

  const metrics = typedSnapshot.metrics ?? {};

  return insights
    .map((insight) => {
      const issue = allowedIssues.find((item) => item.id === insight.id);
      return issue ? anchorInsightToIssue(insight, issue) : null;
    })
    .filter((insight): insight is AIInsight => Boolean(insight))
    .map((insight) => sanitizeUnsupportedMenuExamples(insight, snapshot))
    .filter((insight) => !hasBasicMetricContradiction(insight, metrics))
    .slice(0, 5);
}

export function buildDeterministicIssueFallback(
  snapshot: Record<string, unknown>,
): AIInsight | null {
  const typedSnapshot = snapshot as Partial<RecommendationSnapshot>;
  const issue = typedSnapshot.allowedIssues?.[0];
  const category = typedSnapshot.category as OwnerInsightCategory | undefined;

  if (!issue || !category) return null;

  const actionByCategory: Record<
    OwnerInsightCategory,
    { label: string; href: string }
  > = {
    overview: { label: "Review Overview", href: "/owner/dashboard?tab=overview" },
    sales: { label: "Review Sales", href: "/owner/dashboard?tab=sales" },
    rewards: { label: "Review Customer", href: "/owner/dashboard?tab=customer" },
    inventory: { label: "Review Inventory", href: "/owner/dashboard?tab=inventory" },
    staff: { label: "Review Staff", href: "/owner/dashboard?tab=staff" },
    operations: { label: "Review Operations", href: "/owner/dashboard?tab=operations" },
    activity_log: { label: "Review Activity Log", href: "/owner/activitylog" },
  };
  const action = actionByCategory[category];

  return {
    id: issue.id,
    category,
    title: issue.title,
    priority: issue.priority,
    confidence: issue.confidence,
    problem: buildAnchoredProblem(issue),
    evidence: issue.evidence,
    recommendation: issue.recommendationHint,
    expectedImpact: issue.expectedImpact,
    actionLabel: action.label,
    actionHref: action.href,
  };
}
