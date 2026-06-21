import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OwnerInsightPeriod,
  RecommendationAllowedIssue,
  RecommendationMetric,
  RecommendationSnapshot,
} from "../domain/recommendationSnapshotTypes";
import { buildCustomerRecommendationSnapshot } from "./customerSnapshotBuilder";
import { buildInventoryRecommendationSnapshot } from "./inventorySnapshotBuilder";
import { buildOperationsRecommendationSnapshot } from "./operationsSnapshotBuilder";
import { buildSalesRecommendationSnapshot } from "./salesSnapshotBuilder";
import { buildStaffRecommendationSnapshot } from "./staffSnapshotBuilder";

const priorityWeight: Record<RecommendationAllowedIssue["priority"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const copyMetric = (
  metric: RecommendationMetric,
  displayLabel: string,
): RecommendationMetric => ({
  ...metric,
  displayLabel,
});

const getAreaIssue = (
  area: string,
  snapshot: RecommendationSnapshot,
): RecommendationAllowedIssue | null => {
  const issue = [...snapshot.allowedIssues].sort(
    (left, right) =>
      priorityWeight[right.priority] - priorityWeight[left.priority],
  )[0];

  if (!issue) return null;

  return {
    ...issue,
    title: `${area}: ${issue.title}`,
  };
};

export async function buildOverviewRecommendationSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
): Promise<RecommendationSnapshot> {
  const [sales, customer, inventory, staff, operations] = await Promise.all([
    buildSalesRecommendationSnapshot(supabase, insightPeriod),
    buildCustomerRecommendationSnapshot(supabase, insightPeriod),
    buildInventoryRecommendationSnapshot(supabase, insightPeriod),
    buildStaffRecommendationSnapshot(supabase, insightPeriod),
    buildOperationsRecommendationSnapshot(supabase, insightPeriod),
  ]);

  const metrics = {
    salesNetSales: copyMetric(
      sales.metrics.totalRevenue,
      "Sales - Net Sales",
    ),
    salesTotalOrders: copyMetric(
      sales.metrics.totalOrders,
      "Sales - Total Orders",
    ),
    salesAverageOrderValue: copyMetric(
      sales.metrics.averageOrderValue,
      "Sales - Average Order Value",
    ),
    salesEstimatedProfit: copyMetric(
      sales.metrics.netProfitEstimate,
      "Sales - Estimated Profit",
    ),
    customerRepeatRate: copyMetric(
      customer.metrics.repeatCustomerRate,
      "Customer - Repeat Customer Rate",
    ),
    customerMemberShare: copyMetric(
      customer.metrics.memberShare,
      "Customer - Member Share",
    ),
    inventoryCriticalItems: copyMetric(
      inventory.metrics.criticalItems,
      "Inventory - Critical Items",
    ),
    inventoryDataIssues: copyMetric(
      inventory.metrics.dataIssues,
      "Inventory - Data Issues",
    ),
    staffAttendanceRate: copyMetric(
      staff.metrics.attendanceScore,
      "Staff - Attendance Rate",
    ),
    staffLateCount: copyMetric(
      staff.metrics.lateCount,
      "Staff - Late Count",
    ),
    operationsCompletionRate: copyMetric(
      operations.metrics.completionRate,
      "Operations - Completion Rate",
    ),
    operationsActiveOrders: copyMetric(
      operations.metrics.activeOrders,
      "Operations - Active Orders",
    ),
    // Compatibility aliases keep shared contradiction guards accurate.
    totalRevenue: copyMetric(sales.metrics.totalRevenue, "Net Sales"),
    totalOrders: copyMetric(sales.metrics.totalOrders, "Total Orders"),
  } satisfies Record<string, RecommendationMetric>;

  const areaIssues = [
    getAreaIssue("Sales", sales),
    getAreaIssue("Customer", customer),
    getAreaIssue("Inventory", inventory),
    getAreaIssue("Staff", staff),
    getAreaIssue("Operations", operations),
  ]
    .filter((issue): issue is RecommendationAllowedIssue => Boolean(issue))
    .sort(
      (left, right) =>
        priorityWeight[right.priority] - priorityWeight[left.priority],
    );

  return {
    category: "overview",
    period: sales.period,
    metrics,
    charts: {
      businessAreas: {
        title: "Five Business Area Summary",
        description:
          "The same headline metrics shown by the Overview cards for the selected period.",
        points: [
          {
            area: "Sales",
            value: metrics.salesNetSales.value,
            unit: metrics.salesNetSales.unit,
          },
          {
            area: "Customer",
            value: metrics.customerRepeatRate.value,
            unit: metrics.customerRepeatRate.unit,
          },
          {
            area: "Inventory",
            value: metrics.inventoryCriticalItems.value,
            unit: metrics.inventoryCriticalItems.unit,
          },
          {
            area: "Staff",
            value: metrics.staffAttendanceRate.value,
            unit: metrics.staffAttendanceRate.unit,
          },
          {
            area: "Operations",
            value: metrics.operationsCompletionRate.value,
            unit: metrics.operationsCompletionRate.unit,
          },
        ],
      },
    },
    tables: {
      areaPriorities: {
        title: "Main Issue By Business Area",
        description:
          "One highest-priority supported issue from each owner dashboard area.",
        rows: areaIssues.map((issue) => ({
          issueId: issue.id,
          title: issue.title,
          priority: issue.priority,
          confidence: issue.confidence,
        })),
      },
    },
    allowedIssues: areaIssues.slice(0, 5),
    dataQuality: {
      missingFields: Array.from(
        new Set([
          ...sales.dataQuality.missingFields,
          ...customer.dataQuality.missingFields,
          ...inventory.dataQuality.missingFields,
          ...staff.dataQuality.missingFields,
          ...operations.dataQuality.missingFields,
        ]),
      ),
      unsupportedClaims: [
        "Overview must summarize Sales, Customer, Inventory, Staff, and Operations rather than behaving like a second Sales tab.",
        "Use salesNetSales, customerRepeatRate, inventoryCriticalItems, staffAttendanceRate, and operationsCompletionRate as the five headline signals.",
        "Only discuss an area problem when it is represented in allowedIssues.",
        "Do not invent product names, customer names, staff names, inventory items, or operational causes.",
        "Use selected-period wording instead of today or yesterday unless the selected period contains one date.",
      ],
      warnings: Array.from(
        new Set([
          ...sales.dataQuality.warnings,
          ...customer.dataQuality.warnings,
          ...inventory.dataQuality.warnings,
          ...staff.dataQuality.warnings,
          ...operations.dataQuality.warnings,
        ]),
      ),
    },
    diagnostics: {
      sourceAreas: 5,
      supportedAreaIssues: areaIssues.length,
    },
  };
}
