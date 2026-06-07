import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRecommendationPeriodContext } from "./periodService";
import type {
  MetricUnit,
  OwnerInsightPeriod,
  RecommendationAllowedIssue,
  RecommendationMetric,
  RecommendationSnapshot,
} from "./recommendationSnapshotTypes";

type ActivityLogRow = {
  id: string;
  timestamp: string;
  user_name: string | null;
  user_role: string | null;
  action: string | null;
  action_category: string | null;
  action_description: string | null;
  resource_type: string | null;
  resource_name: string | null;
  severity: string | null;
  changes_summary: string[] | null;
};

const SELECT_COLUMNS =
  "id,timestamp,user_name,user_role,action,action_category,action_description,resource_type,resource_name,severity,changes_summary";
const FETCH_LIMIT = 2000;
const DESTRUCTIVE_ACTIONS = new Set([
  "DELETE",
  "VOID",
  "REFUND",
  "ADJUST",
  "ARCHIVE_DELETED",
]);
const HIGH_RISK_CATEGORIES = new Set([
  "INVENTORY",
  "FINANCIAL",
  "STAFF",
  "SYSTEM",
]);

const toPeriodBounds = (period: OwnerInsightPeriod) => ({
  startIso: new Date(`${period.startDate}T00:00:00+07:00`).toISOString(),
  endIso: new Date(`${period.endDate}T23:59:59.999+07:00`).toISOString(),
});

const buildMetric = ({
  value,
  previousValue,
  unit = "count",
  source,
  displayLabel,
}: {
  value: number | string | null;
  previousValue?: number | string | null;
  unit?: MetricUnit;
  source: string;
  displayLabel: string;
}): RecommendationMetric => {
  const currentNumber = typeof value === "number" ? value : null;
  const previousNumber = typeof previousValue === "number" ? previousValue : null;
  const changePct =
    currentNumber !== null && previousNumber !== null && previousNumber !== 0
      ? ((currentNumber - previousNumber) / Math.abs(previousNumber)) * 100
      : null;

  return {
    value,
    previousValue,
    changePct,
    unit,
    source,
    displayLabel,
  };
};

const countBy = (rows: ActivityLogRow[], key: keyof ActivityLogRow) =>
  rows.reduce(
    (acc, row) => {
      const value = String(row[key] || "Unknown");
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

const topEntries = (counts: Record<string, number>, limit = 5) =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

async function fetchActivityLogsForPeriod(
  supabase: SupabaseClient,
  period: OwnerInsightPeriod,
) {
  const { startIso, endIso } = toPeriodBounds(period);
  const { data, error, count } = await supabase
    .from("activity_logs")
    .select(SELECT_COLUMNS, { count: "exact" })
    .gte("timestamp", startIso)
    .lte("timestamp", endIso)
    .order("timestamp", { ascending: false })
    .limit(FETCH_LIMIT);

  if (error) {
    throw new Error(`Owner AI could not read activity logs: ${error.message}`);
  }

  return {
    rows: (data ?? []) as ActivityLogRow[],
    count: count ?? 0,
  };
}

const buildActivityLogIssues = ({
  totalLogs,
  criticalCount,
  warningCount,
  destructiveCount,
  highRiskCount,
  missingChangeSummaryCount,
  topUser,
  topUserRole,
}: {
  totalLogs: number;
  criticalCount: number;
  warningCount: number;
  destructiveCount: number;
  highRiskCount: number;
  missingChangeSummaryCount: number;
  topUser?: [string, number];
  topUserRole?: string | null;
}): RecommendationAllowedIssue[] => {
  const issues: RecommendationAllowedIssue[] = [];

  if (totalLogs === 0) {
    issues.push({
      id: "activity-log-no-activity",
      title: "No audit activity recorded",
      priority: "medium",
      confidence: "high",
      problem: "No activity log events were recorded in the selected period.",
      evidence: ["Total Activity Logs is 0."],
      recommendationHint:
        "Confirm the selected date range first. If the store was operating, ask the developer to verify whether key actions are writing to activity_logs.",
      expectedImpact:
        "A reliable audit trail is needed before the owner can review sensitive store actions.",
      metricKeys: ["totalLogs"],
    });
    return issues;
  }

  if (criticalCount > 0 || destructiveCount > 0) {
    issues.push({
      id: "activity-log-high-risk-actions",
      title: "High-risk activity needs review",
      priority: "high",
      confidence: "high",
      problem:
        "The selected period includes critical or destructive actions in the audit trail.",
      evidence: [
        `Critical Activity is ${criticalCount}.`,
        `Destructive Actions is ${destructiveCount}.`,
      ],
      recommendationHint:
        "Open the critical, delete, void, refund, and adjustment rows first. Verify the user, affected resource, notes, and change summary against approved operational decisions.",
      expectedImpact:
        "Reviewing high-risk audit rows helps prevent accidental deletes, incorrect stock corrections, and unapproved sensitive changes from being missed.",
      metricKeys: ["criticalLogs", "destructiveActions"],
    });
  }

  if (missingChangeSummaryCount > 0) {
    issues.push({
      id: "activity-log-missing-change-summary",
      title: "Audit details need clearer change summaries",
      priority: "medium",
      confidence: "high",
      problem:
        "Some sensitive update or correction events do not include a readable change summary.",
      evidence: [`Missing Change Summary Events is ${missingChangeSummaryCount}.`],
      recommendationHint:
        "Inspect the rows without change summaries and confirm whether the detail modal still contains previous and new values. Improve the event writer for any feature that saves unclear logs.",
      expectedImpact:
        "Clear change summaries make owner review faster and reduce guesswork during stock, sales, or staff investigations.",
      metricKeys: ["missingChangeSummaryEvents"],
    });
  }

  if (warningCount > 0 || highRiskCount > 0) {
    issues.push({
      id: "activity-log-warning-follow-up",
      title: "Warning activity should be followed up",
      priority: "medium",
      confidence: "medium",
      problem:
        "The selected period includes warning activity or events from high-risk operational categories.",
      evidence: [
        `Warning Activity is ${warningCount}.`,
        `High-Risk Category Events is ${highRiskCount}.`,
      ],
      recommendationHint:
        "Review warning rows and high-risk categories after peak hours, especially inventory, financial, staff, and system changes.",
      expectedImpact:
        "Light but regular follow-up keeps the audit process useful without treating normal daily actions as emergencies.",
      metricKeys: ["warningLogs", "highRiskCategoryEvents"],
    });
  }

  if (
    topUser &&
    String(topUserRole ?? "").toLowerCase() !== "owner" &&
    totalLogs >= 10 &&
    topUser[1] / totalLogs >= 0.7
  ) {
    issues.push({
      id: "activity-log-user-concentration",
      title: "Audit activity is concentrated on one user",
      priority: "low",
      confidence: "medium",
      problem:
        "Most activity log events in the selected period were performed by one user.",
      evidence: [`${topUser[0]} performed ${topUser[1]} of ${totalLogs} events.`],
      recommendationHint:
        "Check whether this concentration matches the work schedule and role responsibilities before changing permissions.",
      expectedImpact:
        "This helps the owner distinguish normal role concentration from unusual account usage.",
      metricKeys: ["topUserShare"],
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "activity-log-stable-baseline",
      title: "Activity log looks stable",
      priority: "low",
      confidence: "medium",
      problem:
        "No critical, destructive, or warning-heavy activity stood out in the selected audit range.",
      evidence: [`Total Activity Logs is ${totalLogs}.`],
      recommendationHint:
        "Keep the current audit rhythm and use filters only when a specific operational question needs deeper review.",
      expectedImpact:
        "A stable audit baseline lets the owner focus attention only when sensitive operational signals appear.",
      metricKeys: ["totalLogs"],
    });
  }

  return issues.slice(0, 5);
};

export async function buildActivityLogRecommendationSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
): Promise<RecommendationSnapshot> {
  const period = buildRecommendationPeriodContext(insightPeriod);
  const [selectedResult, comparisonResult] = await Promise.all([
    fetchActivityLogsForPeriod(supabase, period.selected),
    fetchActivityLogsForPeriod(supabase, period.comparison),
  ]);

  const rows = selectedResult.rows;
  const comparisonRows = comparisonResult.rows;
  const totalLogs = selectedResult.count;
  const comparisonTotalLogs = comparisonResult.count;
  const criticalCount = rows.filter((row) => row.severity === "critical").length;
  const warningCount = rows.filter((row) => row.severity === "warning").length;
  const destructiveRows = rows.filter((row) =>
    DESTRUCTIVE_ACTIONS.has(String(row.action || "")),
  );
  const highRiskRows = rows.filter((row) =>
    HIGH_RISK_CATEGORIES.has(String(row.action_category || "")),
  );
  const missingChangeSummaryRows = rows.filter((row) => {
    const action = String(row.action || "");
    return (
      ["UPDATE", "DELETE", "ADJUST", "VOID", "REFUND"].includes(action) &&
      (!row.changes_summary || row.changes_summary.length === 0)
    );
  });
  const topUsers = topEntries(countBy(rows, "user_name"));
  const topActions = topEntries(countBy(rows, "action"));
  const topCategories = topEntries(countBy(rows, "action_category"));
  const topUser = topUsers[0];
  const topUserRole = topUser
    ? rows.find((row) => row.user_name === topUser[0])?.user_role ?? null
    : null;
  const topUserShare = topUser && totalLogs > 0 ? (topUser[1] / totalLogs) * 100 : 0;

  const severityCounts = countBy(rows, "severity");
  const categoryCounts = countBy(rows, "action_category");

  return {
    category: "activity_log",
    period,
    metrics: {
      totalLogs: buildMetric({
        value: totalLogs,
        previousValue: comparisonTotalLogs,
        source: "activity_logs rows in selected period",
        displayLabel: "Total Activity Logs",
      }),
      criticalLogs: buildMetric({
        value: criticalCount,
        previousValue: comparisonRows.filter((row) => row.severity === "critical").length,
        source: "activity_logs.severity = critical",
        displayLabel: "Critical Activity",
      }),
      warningLogs: buildMetric({
        value: warningCount,
        previousValue: comparisonRows.filter((row) => row.severity === "warning").length,
        source: "activity_logs.severity = warning",
        displayLabel: "Warning Activity",
      }),
      destructiveActions: buildMetric({
        value: destructiveRows.length,
        source: "activity_logs.action in DELETE, VOID, REFUND, ADJUST, ARCHIVE_DELETED",
        displayLabel: "Destructive Actions",
      }),
      highRiskCategoryEvents: buildMetric({
        value: highRiskRows.length,
        source: "activity_logs.action_category in INVENTORY, FINANCIAL, STAFF, SYSTEM",
        displayLabel: "High-Risk Category Events",
      }),
      missingChangeSummaryEvents: buildMetric({
        value: missingChangeSummaryRows.length,
        source: "sensitive activity_logs rows without changes_summary",
        displayLabel: "Missing Change Summary Events",
      }),
      topUserShare: buildMetric({
        value: Math.round(topUserShare),
        unit: "percent",
        source: "largest user_name share in selected activity_logs",
        displayLabel: "Top User Share",
      }),
    },
    charts: {
      severityMix: {
        title: "Activity Severity Mix",
        description: "Counts activity log events by severity.",
        points: Object.entries(severityCounts).map(([severity, count]) => ({
          severity,
          count,
        })),
      },
      categoryMix: {
        title: "Activity Category Mix",
        description: "Counts activity log events by category.",
        points: Object.entries(categoryCounts).map(([category, count]) => ({
          category,
          count,
        })),
      },
    },
    tables: {
      highRiskEvents: {
        title: "High-Risk Activity Events",
        description:
          "Critical, destructive, or high-risk-category events from the selected period.",
        rows: [...new Map([...destructiveRows, ...highRiskRows].map((row) => [row.id, row])).values()]
          .slice(0, 20)
          .map((row) => ({
            timestamp: row.timestamp,
            userName: row.user_name || "Unknown",
            role: row.user_role || "Unknown",
            action: row.action || "Unknown",
            category: row.action_category || "Unknown",
            severity: row.severity || "Unknown",
            resourceType: row.resource_type || "Unknown",
            resourceName: row.resource_name || "-",
            description: row.action_description || "-",
          })),
      },
      topUsers: {
        title: "Top Activity Users",
        description: "Users with the highest number of audit events.",
        rows: topUsers.map(([userName, count]) => ({ userName, count })),
      },
      topActions: {
        title: "Top Activity Actions",
        description: "Most frequent action types in the selected period.",
        rows: topActions.map(([action, count]) => ({ action, count })),
      },
      topCategories: {
        title: "Top Activity Categories",
        description: "Most frequent activity categories in the selected period.",
        rows: topCategories.map(([category, count]) => ({ category, count })),
      },
      missingChangeSummary: {
        title: "Rows Missing Change Summary",
        description: "Sensitive events that need clearer audit details.",
        rows: missingChangeSummaryRows.slice(0, 20).map((row) => ({
          timestamp: row.timestamp,
          userName: row.user_name || "Unknown",
          action: row.action || "Unknown",
          category: row.action_category || "Unknown",
          resourceType: row.resource_type || "Unknown",
          resourceName: row.resource_name || "-",
        })),
      },
    },
    allowedIssues: buildActivityLogIssues({
      totalLogs,
      criticalCount,
      warningCount,
      destructiveCount: destructiveRows.length,
      highRiskCount: highRiskRows.length,
      missingChangeSummaryCount: missingChangeSummaryRows.length,
      topUser,
      topUserRole,
    }),
    dataQuality: {
      missingFields: [],
      unsupportedClaims: [
        "The activity log snapshot does not prove intent, fraud, or business loss.",
        "The snapshot only includes activity_logs data and does not inspect external systems.",
      ],
      warnings:
        totalLogs > rows.length
          ? [
              `Only ${rows.length} of ${totalLogs} selected activity rows were included in detailed tables.`,
            ]
          : [],
    },
    diagnostics: {
      fetchedSelectedRows: rows.length,
      selectedTotalRows: totalLogs,
      fetchedComparisonRows: comparisonRows.length,
      comparisonTotalRows: comparisonTotalLogs,
    },
  };
}
