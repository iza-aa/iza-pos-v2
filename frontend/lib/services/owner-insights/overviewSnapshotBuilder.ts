import type { SupabaseClient } from "@supabase/supabase-js";
import {
  average,
  buildMetric,
  toNumber,
} from "./metricSnapshotBuilder";
import {
  buildRecommendationPeriodContext,
  isDateInPeriod,
} from "./periodService";
import type {
  OwnerInsightPeriod,
  RecommendationAllowedIssue,
  RecommendationMetric,
  RecommendationPeriodContext,
  RecommendationSnapshot,
} from "./recommendationSnapshotTypes";

type OverviewOrderRow = {
  id: string;
  total?: number | string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  order_date?: string | null;
  order_time?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  ready_at?: string | null;
  served_at?: string | null;
  fulfillment_method?: string | null;
  customer_id?: string | null;
  reward_redemption_id?: string | null;
};

const OVERVIEW_BASE_ORDER_SELECT =
  "id,status,payment_status,payment_method,total,discount,order_date,order_time,created_at,fulfillment_method,customer_id,reward_redemption_id";
const OVERVIEW_COMPLETED_ORDER_SELECT = `${OVERVIEW_BASE_ORDER_SELECT},completed_at`;
const OVERVIEW_SERVICE_ORDER_SELECT = `${OVERVIEW_COMPLETED_ORDER_SELECT},ready_at,served_at`;

const cancelledStatuses = new Set(["cancelled", "canceled", "void", "refunded"]);
const invalidPaymentStatuses = new Set([
  "cancelled",
  "canceled",
  "failed",
  "refunded",
  "void",
  "unpaid",
  "pending",
]);

const getJakartaDateParts = (value: string | null | undefined) => {
  if (!value) return null;

  const normalizedValue = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");

  if (!year || !month || !day) return null;

  return {
    date: `${year}-${month}-${day}`,
    hour: hour === "24" ? "00" : hour.padStart(2, "0"),
  };
};

const getOrderBusinessDate = (order: OverviewOrderRow) =>
  getJakartaDateParts(order.created_at)?.date || String(order.order_date ?? "");

const getOrderBusinessHour = (order: OverviewOrderRow) => {
  const localHour = getJakartaDateParts(order.created_at)?.hour;
  if (localHour) return localHour;

  return String(order.order_time ?? "00").slice(0, 2).padStart(2, "0");
};

const isValidSalesOrder = (order: OverviewOrderRow) => {
  const status = String(order.status ?? "").toLowerCase();
  const payment = String(order.payment_status ?? "").toLowerCase();

  if (cancelledStatuses.has(status)) return false;
  if (invalidPaymentStatuses.has(payment)) return false;

  return true;
};

const getMinutesBetween = (
  start: string | null | undefined,
  end: string | null | undefined,
) => {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  const minutes = (endTime - startTime) / 60_000;
  if (minutes <= 0 || minutes > 240) return null;
  return minutes;
};

const summarizeOrders = (orders: OverviewOrderRow[]) => {
  const validOrders = orders.filter(isValidSalesOrder);
  const revenue = validOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const completed = orders.filter((order) =>
    ["completed", "served", "paid"].includes(
      String(order.status ?? "").toLowerCase(),
    ),
  ).length;
  const cancelled = orders.filter((order) =>
    cancelledStatuses.has(String(order.status ?? "").toLowerCase()),
  ).length;
  const serviceDurations = orders
    .map((order) =>
      getMinutesBetween(
        order.created_at,
        order.completed_at ?? order.served_at ?? order.ready_at,
      ),
    )
    .filter((value): value is number => value !== null);

  return {
    revenue,
    validOrderCount: validOrders.length,
    averageOrderValue: validOrders.length ? revenue / validOrders.length : 0,
    completed,
    cancelled,
    completionRate: orders.length ? (completed / orders.length) * 100 : 0,
    cancelledRate: orders.length ? (cancelled / orders.length) * 100 : 0,
    averageServiceMinutes: serviceDurations.length
      ? average(serviceDurations)
      : null,
    serviceSampleSize: serviceDurations.length,
  };
};

const buildRevenueTrend = (
  orders: OverviewOrderRow[],
  period: RecommendationPeriodContext["selected"],
) => {
  const validOrders = orders.filter(isValidSalesOrder);

  if (period.granularity === "hour") {
    return Array.from({ length: 24 }, (_, hour) => {
      const hourKey = String(hour).padStart(2, "0");
      const rows = validOrders.filter(
        (order) =>
          getOrderBusinessDate(order) === period.startDate &&
          getOrderBusinessHour(order) === hourKey,
      );

      return {
        bucket: `${hourKey}:00`,
        revenue: rows.reduce((sum, order) => sum + toNumber(order.total), 0),
        orders: rows.length,
      };
    });
  }

  const map = new Map<string, OverviewOrderRow[]>();
  validOrders.forEach((order) => {
    const date = getOrderBusinessDate(order);
    map.set(date, [...(map.get(date) ?? []), order]);
  });

  return Array.from(map.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, rows]) => ({
      bucket: date,
      revenue: rows.reduce((sum, order) => sum + toNumber(order.total), 0),
      orders: rows.length,
    }));
};

const getTopPaymentMethod = (orders: OverviewOrderRow[]) => {
  const map = new Map<string, OverviewOrderRow[]>();

  orders.filter(isValidSalesOrder).forEach((order) => {
    const method = order.payment_method || "Unknown";
    map.set(method, [...(map.get(method) ?? []), order]);
  });

  return Array.from(map.entries())
    .map(([method, rows]) => ({ method, count: rows.length }))
    .sort((a, b) => b.count - a.count)[0] ?? { method: "-", count: 0 };
};

const getBusinessHealthScore = (summary: ReturnType<typeof summarizeOrders>) => {
  const serviceScore =
    summary.averageServiceMinutes === null
      ? summary.validOrderCount > 0
        ? 50
        : 0
      : Math.max(0, Math.min(100, 100 - Math.max(0, summary.averageServiceMinutes - 10) * 3));
  const sampleCap =
    summary.validOrderCount >= 10
      ? 100
      : summary.validOrderCount >= 5
        ? 80
        : summary.validOrderCount >= 3
          ? 70
          : summary.validOrderCount >= 1
            ? 55
            : 35;

  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        summary.completionRate * 0.4 +
          Math.max(0, 100 - summary.cancelledRate * 3) * 0.35 +
          serviceScore * 0.25,
      ),
    ),
  );

  return Math.min(score, sampleCap);
};

const formatEvidenceNumber = (value: number | string | null, unit: string) => {
  if (value === null) return "not available";
  if (typeof value === "string") return value;
  if (unit === "IDR") return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "minutes") return `${value.toFixed(1)} minutes`;
  return Math.round(value).toLocaleString("id-ID");
};

const getMetricNumber = (
  metrics: Record<string, RecommendationMetric>,
  key: string,
) => {
  const value = metrics[key]?.value;
  return typeof value === "number" ? value : 0;
};

const getMetricPreviousNumber = (
  metrics: Record<string, RecommendationMetric>,
  key: string,
) => {
  const value = metrics[key]?.previousValue;
  return typeof value === "number" ? value : 0;
};

const buildOverviewAllowedIssues = (
  metrics: Record<string, RecommendationMetric>,
  serviceSampleSize: number,
  sourceOrderCount: number,
): RecommendationAllowedIssue[] => {
  const issues: RecommendationAllowedIssue[] = [];
  const revenue = getMetricNumber(metrics, "totalRevenue");
  const revenuePrevious = getMetricPreviousNumber(metrics, "totalRevenue");
  const revenueChange = metrics.totalRevenue.changePct ?? 0;
  const orders = getMetricNumber(metrics, "totalOrders");
  const ordersPrevious = getMetricPreviousNumber(metrics, "totalOrders");
  const ordersChange = metrics.totalOrders.changePct ?? 0;
  const aov = getMetricNumber(metrics, "averageOrderValue");
  const aovPrevious = getMetricPreviousNumber(metrics, "averageOrderValue");
  const aovChange = metrics.averageOrderValue.changePct ?? 0;
  const completionRate = getMetricNumber(metrics, "completionRate");
  const cancelledRate = getMetricNumber(metrics, "cancelledRate");
  const businessHealthScore = getMetricNumber(metrics, "businessHealthScore");

  if (sourceOrderCount === 0) {
    issues.push({
      id: "overview-data-access-check",
      title: "Dashboard Data Needs Verification",
      priority: "medium",
      confidence: "medium",
      problem:
        "The recommendation snapshot could not read any order records from the server-side data source.",
      evidence: [
        "Fetched order rows is 0.",
        "The Overview AI snapshot cannot confirm revenue until server-side data access is fixed.",
      ],
      recommendationHint:
        "Ask the developer to verify the server-side Supabase key, RLS access, and API environment before using AI recommendations.",
      expectedImpact:
        "Fixing server-side data access prevents the owner from receiving incorrect zero-sales recommendations.",
      metricKeys: ["totalRevenue", "totalOrders"],
    });
  } else if (revenue === 0 && orders === 0) {
    issues.push({
      id: "overview-zero-activity",
      title: "No Sales Activity Recorded",
      priority: "high",
      confidence: "high",
      problem: "No valid orders or revenue were recorded in the selected period.",
      evidence: [
        `Total Revenue is ${formatEvidenceNumber(revenue, "IDR")}.`,
        `Total Orders is ${formatEvidenceNumber(orders, "count")}.`,
      ],
      recommendationHint:
        "Check whether the store was operating, whether orders were entered into POS, and whether payment/order statuses are being recorded correctly.",
      expectedImpact:
        "Confirming the source of zero activity protects the owner from missing real sales or operational downtime.",
      metricKeys: ["totalRevenue", "totalOrders"],
    });
  }

  if (orders > 0 && orders < 5) {
    issues.push({
      id: "overview-low-order-sample",
      title: "Business Health Has Low Data",
      priority: "low",
      confidence: "high",
      problem:
        "The selected period has too few valid orders for the health score to be treated as a strong performance signal.",
      evidence: [
        `Total Orders is ${formatEvidenceNumber(orders, "count")}.`,
        `Business Health Score is ${formatEvidenceNumber(businessHealthScore, "count")} / 100.`,
      ],
      recommendationHint:
        "Use the score as a monitoring signal only, and wait for more orders before concluding the business is healthy or unhealthy.",
      expectedImpact:
        "Separating low data from true performance prevents the owner from overreacting to one or two orders.",
      metricKeys: ["totalOrders", "businessHealthScore"],
    });
  }

  if (revenue > 0 && revenuePrevious > 0 && revenueChange <= -15) {
    issues.push({
      id: "overview-revenue-decline",
      title: "Revenue Declined Versus Comparison Period",
      priority: revenueChange <= -30 ? "high" : "medium",
      confidence: "high",
      problem: "Revenue is lower than the comparison period.",
      evidence: [
        `Total Revenue is ${formatEvidenceNumber(revenue, "IDR")}.`,
        `Comparison revenue was ${formatEvidenceNumber(revenuePrevious, "IDR")}.`,
        `Revenue change is ${revenueChange.toFixed(1)}%.`,
      ],
      recommendationHint:
        ordersChange <= aovChange
          ? "Prioritize order recovery first because order volume is the stronger drag on revenue. Check operating hours, store availability, checkout flow, and demand signals before using discounts."
          : "Prioritize basket quality first because AOV is the stronger drag on revenue. Review bundling, add-ons, and cashier prompts before adding broad discounts.",
      expectedImpact:
        "Finding the revenue driver helps the owner decide whether the issue is demand, transaction quality, or operations.",
      metricKeys: ["totalRevenue", "totalOrders", "averageOrderValue"],
    });
  }

  if (orders > 0 && ordersPrevious > 0 && ordersChange <= -15) {
    issues.push({
      id: "overview-order-decline",
      title: "Order Volume Declined",
      priority: ordersChange <= -30 ? "high" : "medium",
      confidence: "high",
      problem: "Valid order count is lower than the comparison period.",
      evidence: [
        `Total Orders is ${formatEvidenceNumber(orders, "count")}.`,
        `Comparison orders were ${formatEvidenceNumber(ordersPrevious, "count")}.`,
        `Order change is ${ordersChange.toFixed(1)}%.`,
      ],
      recommendationHint:
        "Start with demand and availability checks: confirm store operating hours, product availability, and checkout/payment flow during the selected period before adding promotions.",
      expectedImpact:
        "Restoring order volume improves revenue without relying only on discounting.",
      metricKeys: ["totalOrders", "totalRevenue"],
    });
  }

  if (aov > 0 && aovPrevious > 0 && aovChange <= -10) {
    issues.push({
      id: "overview-aov-decline",
      title: "Average Order Value Declined",
      priority: "medium",
      confidence: "high",
      problem: "Average transaction quality is weaker than the comparison period.",
      evidence: [
        `Average Order Value is ${formatEvidenceNumber(aov, "IDR")}.`,
        `Comparison AOV was ${formatEvidenceNumber(aovPrevious, "IDR")}.`,
        `AOV change is ${aovChange.toFixed(1)}%.`,
      ],
      recommendationHint:
        "Improve basket size before increasing traffic spend: review product bundling, add-on prompts, and the menu mix that can lift transaction value.",
      expectedImpact:
        "Improving AOV can lift revenue even when order count is stable.",
      metricKeys: ["averageOrderValue", "totalRevenue"],
    });
  }

  if (orders > 0 && completionRate < 80) {
    issues.push({
      id: "overview-low-completion-rate",
      title: "Completion Rate Needs Attention",
      priority: completionRate < 60 ? "high" : "medium",
      confidence: "high",
      problem: "The share of orders reaching completed/served/paid status is below a healthy threshold.",
      evidence: [
        `Completion Rate is ${formatEvidenceNumber(completionRate, "percent")}.`,
        `Total Orders is ${formatEvidenceNumber(orders, "count")}.`,
      ],
      recommendationHint:
        "Audit order status flow from new order to completed, and check whether staff are marking fulfilled orders correctly.",
      expectedImpact:
        "Cleaner completion flow improves operational visibility and owner confidence in the dashboard.",
      metricKeys: ["completionRate", "completedOrders", "totalOrders"],
    });
  }

  if (orders > 0 && cancelledRate >= 10) {
    issues.push({
      id: "overview-high-cancelled-rate",
      title: "Cancelled Rate Is Elevated",
      priority: cancelledRate >= 20 ? "high" : "medium",
      confidence: "high",
      problem: "Cancelled orders are high enough to create revenue leakage risk.",
      evidence: [
        `Cancelled Rate is ${formatEvidenceNumber(cancelledRate, "percent")}.`,
        `Cancelled Orders is ${formatEvidenceNumber(getMetricNumber(metrics, "cancelledOrders"), "count")}.`,
      ],
      recommendationHint:
        "Review cancellation reasons, product availability, payment failures, and staff handling during busy periods.",
      expectedImpact:
        "Reducing avoidable cancellations protects revenue and improves customer experience.",
      metricKeys: ["cancelledRate", "cancelledOrders", "totalOrders"],
    });
  }

  if (businessHealthScore < 70) {
    issues.push({
      id: "overview-business-health-watch",
      title: "Business Health Score Needs Attention",
      priority: businessHealthScore < 55 ? "high" : "medium",
      confidence: "medium",
      problem: "The combined operational score is below the healthy range.",
      evidence: [
        `Business Health Score is ${formatEvidenceNumber(businessHealthScore, "count")} / 100.`,
        `Completion Rate is ${formatEvidenceNumber(completionRate, "percent")}.`,
        `Cancelled Rate is ${formatEvidenceNumber(cancelledRate, "percent")}.`,
      ],
      recommendationHint:
        "Prioritize the weakest contributing metric first: completion flow, cancellation control, or service-time tracking.",
      expectedImpact:
        "A focused operational fix should improve the owner score and make dashboard signals easier to trust.",
      metricKeys: ["businessHealthScore", "completionRate", "cancelledRate"],
    });
  }

  if (serviceSampleSize === 0 && orders > 0) {
    issues.push({
      id: "overview-service-time-missing",
      title: "Service-Time Data Is Missing",
      priority: "low",
      confidence: "high",
      problem: "Average service time cannot be measured because no usable timestamp samples exist.",
      evidence: [
        `Service-time sample size is ${serviceSampleSize}.`,
        `Total Orders is ${formatEvidenceNumber(orders, "count")}.`,
      ],
      recommendationHint:
        "Ensure order created, ready, served, and completed timestamps are written consistently in the order flow.",
      expectedImpact:
        "Reliable timestamps allow the owner to measure speed and identify operational bottlenecks.",
      metricKeys: ["averageServiceTime", "totalOrders"],
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "overview-monitor-healthy-baseline",
      title: "Overview Metrics Are Stable",
      priority: "low",
      confidence: "medium",
      problem: "No critical overview issue was detected from the selected metrics.",
      evidence: [
        `Total Revenue is ${formatEvidenceNumber(revenue, "IDR")}.`,
        `Total Orders is ${formatEvidenceNumber(orders, "count")}.`,
        `Business Health Score is ${formatEvidenceNumber(businessHealthScore, "count")} / 100.`,
      ],
      recommendationHint:
        "Keep monitoring revenue, order volume, completion rate, and service-time data quality before making major changes.",
      expectedImpact:
        "Maintaining the current baseline helps the owner react only when a real metric changes.",
      metricKeys: ["totalRevenue", "totalOrders", "businessHealthScore"],
    });
  }

  return issues.slice(0, 5);
};

export async function buildOverviewRecommendationSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
): Promise<RecommendationSnapshot> {
  const period = buildRecommendationPeriodContext(insightPeriod);
  const queryOrders = (select: string) =>
    supabase
      .from("orders")
      .select(select)
      .order("created_at", { ascending: true });
  const serviceResult = await queryOrders(OVERVIEW_SERVICE_ORDER_SELECT);
  const completedResult = serviceResult.error
    ? await queryOrders(OVERVIEW_COMPLETED_ORDER_SELECT)
    : serviceResult;
  const fallbackResult = completedResult.error
    ? await queryOrders(OVERVIEW_BASE_ORDER_SELECT)
    : completedResult;
  const orders = (fallbackResult.data ?? []) as OverviewOrderRow[];

  if (fallbackResult.error) {
    throw new Error(`Owner AI could not read orders: ${fallbackResult.error.message}`);
  }

  if (orders.length === 0) {
    throw new Error(
      "Owner AI server-side order query returned 0 rows. Restart the Next.js dev server and verify SUPABASE_SERVICE_ROLE_KEY is available to the API runtime.",
    );
  }

  const selectedOrders = orders.filter((order) =>
    isDateInPeriod(getOrderBusinessDate(order), period.selected),
  );
  const comparisonOrders = orders.filter((order) =>
    isDateInPeriod(getOrderBusinessDate(order), period.comparison),
  );
  const selectedSummary = summarizeOrders(selectedOrders);
  const comparisonSummary = summarizeOrders(comparisonOrders);
  const topPayment = getTopPaymentMethod(selectedOrders);
  const businessHealthScore = getBusinessHealthScore(selectedSummary);
  const warnings: string[] = [];

  if (serviceResult.error?.message) {
    warnings.push(
      "Some service-time columns are unavailable on orders, so service-time evidence may be limited.",
    );
  }
  if (!selectedOrders.length) warnings.push("No orders found in the selected period.");
  if (selectedSummary.serviceSampleSize === 0) {
    warnings.push("Service-time metrics are limited because timestamp samples are unavailable.");
  }

  const metrics = {
    totalRevenue: buildMetric({
      value: selectedSummary.revenue,
      previousValue: comparisonSummary.revenue,
      unit: "IDR",
      source: "orders.total filtered with the same Overview dashboard valid-order rules",
      displayLabel: "Total Revenue",
    }),
    totalOrders: buildMetric({
      value: selectedSummary.validOrderCount,
      previousValue: comparisonSummary.validOrderCount,
      unit: "count",
      source: "orders.id filtered with the same Overview dashboard valid-order rules",
      displayLabel: "Total Orders",
    }),
    averageOrderValue: buildMetric({
      value: selectedSummary.averageOrderValue,
      previousValue: comparisonSummary.averageOrderValue,
      unit: "IDR",
      source: "totalRevenue divided by totalOrders",
      displayLabel: "Average Order Value",
    }),
    completedOrders: buildMetric({
      value: selectedSummary.completed,
      previousValue: comparisonSummary.completed,
      unit: "count",
      source: "orders.status in completed, served, or paid",
      displayLabel: "Completed Orders",
    }),
    cancelledOrders: buildMetric({
      value: selectedSummary.cancelled,
      previousValue: comparisonSummary.cancelled,
      unit: "count",
      source: "orders.status in cancelled, canceled, void, or refunded",
      displayLabel: "Cancelled Orders",
    }),
    completionRate: buildMetric({
      value: selectedSummary.completionRate,
      previousValue: comparisonSummary.completionRate,
      unit: "percent",
      source: "completed orders divided by all orders in period",
      displayLabel: "Completion Rate",
    }),
    cancelledRate: buildMetric({
      value: selectedSummary.cancelledRate,
      previousValue: comparisonSummary.cancelledRate,
      unit: "percent",
      source: "cancelled orders divided by all orders in period",
      displayLabel: "Cancelled Rate",
    }),
    averageServiceTime: buildMetric({
      value: selectedSummary.averageServiceMinutes,
      previousValue: comparisonSummary.averageServiceMinutes,
      unit: "minutes",
      source: "created_at to completed_at, served_at, or ready_at when available",
      displayLabel: "Average Service Time",
    }),
    businessHealthScore: buildMetric({
      value: businessHealthScore,
      unit: "count",
      source: "weighted completion, cancellation, service-time, and low-order sample cap",
      displayLabel: "Business Health Score",
    }),
    topPaymentMethod: buildMetric({
      value: topPayment.method,
      previousValue: null,
      unit: "text",
      source: "dominant payment_method among valid orders",
      displayLabel: "Top Payment Method",
    }),
  } satisfies Record<string, RecommendationMetric>;

  return {
    category: "overview",
    period,
    metrics,
    charts: {
      revenueTrend: {
        title: "Revenue Trend",
        description:
          "Revenue and order movement using the selected dashboard period.",
        points: buildRevenueTrend(selectedOrders, period.selected),
      },
    },
    tables: {},
    allowedIssues: buildOverviewAllowedIssues(
      metrics,
      selectedSummary.serviceSampleSize,
      orders.length,
    ),
    dataQuality: {
      missingFields: [],
      unsupportedClaims: [
        "Do not claim zero revenue unless metrics.totalRevenue.value is 0.",
        "Do not claim today/yesterday unless the period labels are single-day labels.",
        "Do not mention products, categories, or staff because Overview snapshot does not include those dimensions.",
      ],
      warnings,
    },
    diagnostics: {
      fetchedOrderRows: orders.length,
      selectedOrderRows: selectedOrders.length,
      comparisonOrderRows: comparisonOrders.length,
    },
  };
}
