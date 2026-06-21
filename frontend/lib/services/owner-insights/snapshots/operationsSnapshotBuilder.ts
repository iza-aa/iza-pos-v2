import type { SupabaseClient } from "@supabase/supabase-js";
import { average, buildMetric } from "../domain/metricSnapshotBuilder";
import {
  buildRecommendationPeriodContext,
  isDateInPeriod,
} from "../domain/periodService";
import {
  applyInsightOrderCorrections,
  type InsightOrderCorrectionRow,
} from "../domain/orderCorrectionUtils";
import type {
  OwnerInsightPeriod,
  RecommendationAllowedIssue,
  RecommendationChartPoint,
  RecommendationMetric,
  RecommendationSnapshot,
} from "../domain/recommendationSnapshotTypes";

type OperationOrderRow = {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  fulfillment_method?: string | null;
  order_date?: string | null;
  order_time?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

type OperationOrderItemRow = {
  order_id?: string | null;
  ready_at?: string | null;
  served_at?: string | null;
};

const normalizeOperationStatus = (status: string | null | undefined) => {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "preparing" || normalized === "on-process" || normalized === "on process") {
    return "on-process";
  }
  if (normalized === "partially-served" || normalized === "partially served") {
    return "partially-served";
  }
  if (normalized === "served" || normalized === "completed") return "completed";
  return normalized === "new" ? "new" : "new";
};

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

  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    hour: getPart("hour") === "24" ? "00" : getPart("hour").padStart(2, "0"),
  };
};

const getBusinessDateFromTimestamp = (value: string | null | undefined) =>
  getJakartaDateParts(value)?.date ?? "";

const getBusinessHourFromTimestamp = (value: string | null | undefined) =>
  getJakartaDateParts(value)?.hour ?? "00";

const getOrderBusinessDate = (order: OperationOrderRow) =>
  getBusinessDateFromTimestamp(order.created_at) || String(order.order_date ?? "");

const getOrderBusinessHour = (order: OperationOrderRow) =>
  getBusinessHourFromTimestamp(order.created_at) ||
  String(order.order_time ?? "00").slice(0, 2).padStart(2, "0");

const getOrderDateCandidates = (order: OperationOrderRow) =>
  Array.from(
    new Set(
      [
        getOrderBusinessDate(order),
        order.order_date ?? "",
        getBusinessDateFromTimestamp(order.created_at),
        getBusinessDateFromTimestamp(order.completed_at),
      ].filter(Boolean),
    ),
  );

const getMinutesBetween = (
  start: string | null | undefined,
  end: string | null | undefined,
) => {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  const minutes = (endTime - startTime) / 60_000;
  if (minutes < 0 || minutes > 240) return null;
  return minutes;
};

const formatEvidenceNumber = (value: number | string | null, unit: string) => {
  if (value === null) return "not available";
  if (typeof value === "string") return value;
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "minutes") return `${value.toFixed(1)} min`;
  return Math.round(value).toLocaleString("id-ID");
};

const buildServiceEvents = (
  orders: OperationOrderRow[],
  orderItems: OperationOrderItemRow[],
) => {
  const completedOrders = orders.filter(
    (order) => normalizeOperationStatus(order.status) === "completed",
  );
  const orderById = new Map(orders.map((order) => [order.id, order]));

  return [
    ...completedOrders
      .map((order) => {
        const finishedAt = order.completed_at;
        const minutes = getMinutesBetween(order.created_at, finishedAt);
        if (minutes === null || !finishedAt) return null;

        return {
          completedAt: finishedAt,
          orderDateCandidates: getOrderDateCandidates(order),
          orderHour: getOrderBusinessHour(order),
          minutes,
        };
      })
      .filter((event): event is {
        completedAt: string;
        orderDateCandidates: string[];
        orderHour: string;
        minutes: number;
      } => event !== null),
    ...orderItems
      .filter((item) => item.order_id && orderById.has(item.order_id) && item.served_at)
      .map((item) => {
        const order = item.order_id ? orderById.get(item.order_id) : undefined;
        if (!order || !item.served_at) return null;
        const startedAt = item.ready_at ?? order.created_at;
        const minutes = getMinutesBetween(startedAt, item.served_at);
        if (minutes === null) return null;

        return {
          completedAt: item.served_at,
          orderDateCandidates: getOrderDateCandidates(order),
          orderHour: getOrderBusinessHour(order),
          minutes,
        };
      })
      .filter((event): event is {
        completedAt: string;
        orderDateCandidates: string[];
        orderHour: string;
        minutes: number;
      } => event !== null),
  ];
};

const buildOrderDensity = (orders: OperationOrderRow[]) => {
  const operationSlots = Array.from(
    { length: 12 },
    (_, index) => `${String(index + 9).padStart(2, "0")}:00`,
  );

  return operationSlots.map((slot) => {
    const [slotHour] = slot.split(":");
    return {
      slot,
      count: orders.filter((order) => getOrderBusinessHour(order) === slotHour).length,
    };
  });
};

const buildCompletionTrend = (
  orders: OperationOrderRow[],
  period: ReturnType<typeof buildRecommendationPeriodContext>,
): RecommendationChartPoint[] => {
  if (period.selected.granularity === "hour") {
    return Array.from({ length: 24 }, (_, hour) => {
      const hourKey = String(hour).padStart(2, "0");
      const rows = orders.filter((order) => getOrderBusinessHour(order) === hourKey);
      return {
        period: `${hourKey}:00`,
        active: rows.filter((order) =>
          ["new", "on-process", "partially-served"].includes(
            normalizeOperationStatus(order.status),
          ),
        ).length,
        completed: rows.filter(
          (order) => normalizeOperationStatus(order.status) === "completed",
        ).length,
      };
    });
  }

  const dates = Array.from(
    new Set(orders.flatMap((order) => getOrderDateCandidates(order))),
  ).sort();

  return dates.map((date) => {
    const rows = orders.filter((order) => getOrderDateCandidates(order).includes(date));
    return {
      period: date,
      active: rows.filter((order) =>
        ["new", "on-process", "partially-served"].includes(
          normalizeOperationStatus(order.status),
        ),
      ).length,
      completed: rows.filter(
        (order) => normalizeOperationStatus(order.status) === "completed",
      ).length,
    };
  });
};

const buildServiceTrend = (
  serviceEvents: ReturnType<typeof buildServiceEvents>,
  period: ReturnType<typeof buildRecommendationPeriodContext>,
): RecommendationChartPoint[] => {
  if (period.selected.granularity === "hour") {
    return Array.from({ length: 24 }, (_, hour) => {
      const hourKey = String(hour).padStart(2, "0");
      const rows = serviceEvents
        .filter(
          (event) =>
            getBusinessHourFromTimestamp(event.completedAt) === hourKey ||
            event.orderHour === hourKey,
        )
        .map((event) => event.minutes);

      return {
        period: `${hourKey}:00`,
        averageMinutes: rows.length ? Number(average(rows).toFixed(1)) : 0,
      };
    });
  }

  const dates = Array.from(
    new Set(serviceEvents.flatMap((event) => event.orderDateCandidates)),
  ).sort();

  return dates.map((date) => {
    const rows = serviceEvents
      .filter(
        (event) =>
          getBusinessDateFromTimestamp(event.completedAt) === date ||
          event.orderDateCandidates.includes(date),
      )
      .map((event) => event.minutes);

    return {
      period: date,
      averageMinutes: rows.length ? Number(average(rows).toFixed(1)) : 0,
    };
  });
};

const countBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item) || "Unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

const buildOperationsAllowedIssues = ({
  metrics,
  peakSlot,
}: {
  metrics: Record<string, RecommendationMetric>;
  peakSlot: { slot: string; count: number } | undefined;
}): RecommendationAllowedIssue[] => {
  const issues: RecommendationAllowedIssue[] = [];
  const totalOrders = Number(metrics.totalOrders.value ?? 0);
  const activeOrders = Number(metrics.activeOrders.value ?? 0);
  const completionRate = Number(metrics.completionRate.value ?? 0);
  const averageServiceMinutes = metrics.averageServiceMinutes.value;
  const serviceSampleSize = Number(metrics.serviceSampleSize.value ?? 0);
  const unpaidOrders = Number(metrics.unpaidOrders.value ?? 0);
  const partiallyServed = Number(metrics.partiallyServedOrders.value ?? 0);

  if (totalOrders === 0) {
    issues.push({
      id: "operations-no-orders",
      title: "No Operational Orders Recorded",
      priority: "medium",
      confidence: "high",
      problem: "No operational orders were found in the selected period.",
      evidence: [`Total Orders is ${formatEvidenceNumber(totalOrders, "count")}.`],
      recommendationHint:
        "Verify whether the store was operating and whether order records are being saved into the POS flow.",
      expectedImpact:
        "Confirming order capture prevents the owner from reading missing data as operational stability.",
      metricKeys: ["totalOrders"],
    });
  }

  if (activeOrders > 0) {
    issues.push({
      id: "operations-active-backlog",
      title: "Active Order Backlog Exists",
      priority: activeOrders >= 5 ? "high" : "medium",
      confidence: "high",
      problem: "Some orders are still active in the operational flow.",
      evidence: [
        `Active Orders is ${formatEvidenceNumber(activeOrders, "count")}.`,
        `Completion Rate is ${formatEvidenceNumber(completionRate, "percent")}.`,
      ],
      recommendationHint:
        "Review the open order queue and clear new, on-process, or partially-served orders before they become service bottlenecks.",
      expectedImpact:
        "Clearing active backlog improves service flow and reduces confusion between kitchen and cashier operations.",
      metricKeys: ["activeOrders", "completionRate"],
    });
  }

  if (totalOrders > 0 && completionRate < 80) {
    issues.push({
      id: "operations-completion-rate-low",
      title: "Completion Rate Needs Attention",
      priority: completionRate < 60 ? "high" : "medium",
      confidence: "high",
      problem: "The completed share of operational orders is below the healthy range.",
      evidence: [
        `Completion Rate is ${formatEvidenceNumber(completionRate, "percent")}.`,
        `Total Orders is ${formatEvidenceNumber(totalOrders, "count")}.`,
      ],
      recommendationHint:
        "Check whether completed orders are being marked correctly and whether active statuses are stuck in the order flow.",
      expectedImpact:
        "Improving completion tracking gives the owner a cleaner view of real operational throughput.",
      metricKeys: ["completionRate", "totalOrders"],
    });
  }

  if (partiallyServed > 0) {
    issues.push({
      id: "operations-partial-service",
      title: "Partially Served Orders Need Follow-Up",
      priority: "medium",
      confidence: "high",
      problem: "Some orders are in partially-served status.",
      evidence: [
        `Partially Served Orders is ${formatEvidenceNumber(partiallyServed, "count")}.`,
        `Active Orders is ${formatEvidenceNumber(activeOrders, "count")}.`,
      ],
      recommendationHint:
        "Review item-level service completion so partially-served orders are closed once all items are delivered.",
      expectedImpact:
        "Closing partial orders improves table visibility and prevents unresolved fulfillment states.",
      metricKeys: ["partiallyServedOrders", "activeOrders"],
    });
  }

  if (unpaidOrders > 0) {
    issues.push({
      id: "operations-unpaid-orders",
      title: "Unpaid Orders Need Reconciliation",
      priority: unpaidOrders >= 3 ? "high" : "medium",
      confidence: "high",
      problem: "Some orders still have unpaid payment status.",
      evidence: [
        `Unpaid Orders is ${formatEvidenceNumber(unpaidOrders, "count")}.`,
        `Total Orders is ${formatEvidenceNumber(totalOrders, "count")}.`,
      ],
      recommendationHint:
        "Reconcile unpaid orders with cashier activity and payment method records before closing the business day.",
      expectedImpact:
        "Payment reconciliation protects revenue accuracy and reduces reporting mismatch.",
      metricKeys: ["unpaidOrders", "totalOrders"],
    });
  }

  if (serviceSampleSize === 0) {
    issues.push({
      id: "operations-service-time-data-gap",
      title: "Service Time Needs Timestamp Data",
      priority: "low",
      confidence: "high",
      problem: "Average service time cannot be calculated because timestamp samples are unavailable.",
      evidence: [
        `Service Sample Size is ${formatEvidenceNumber(serviceSampleSize, "count")}.`,
        `Average Service Time is ${formatEvidenceNumber(averageServiceMinutes ?? null, "minutes")}.`,
      ],
      recommendationHint:
        "Ensure created_at, ready_at, served_at, and completed_at are saved consistently before using service-time recommendations.",
      expectedImpact:
        "Complete timestamp data lets the owner identify real service bottlenecks instead of guessing.",
      metricKeys: ["serviceSampleSize", "averageServiceMinutes"],
    });
  }

  if (typeof averageServiceMinutes === "number" && averageServiceMinutes > 20) {
    issues.push({
      id: "operations-service-time-high",
      title: "Average Service Time Is High",
      priority: averageServiceMinutes > 30 ? "high" : "medium",
      confidence: "high",
      problem: "Completed orders are taking longer than the target service window.",
      evidence: [
        `Average Service Time is ${formatEvidenceNumber(averageServiceMinutes, "minutes")}.`,
        `Service Sample Size is ${formatEvidenceNumber(serviceSampleSize, "count")}.`,
      ],
      recommendationHint:
        "Review kitchen handoff, item readiness, and order completion habits during the periods with longer service time.",
      expectedImpact:
        "Reducing service time can improve throughput and customer experience during busy periods.",
      metricKeys: ["averageServiceMinutes", "serviceSampleSize"],
    });
  }

  if (peakSlot && peakSlot.count > 0) {
    issues.push({
      id: "operations-peak-pressure",
      title: "Peak Order Pressure Identified",
      priority: "low",
      confidence: "medium",
      problem: "One operating slot has the highest order pressure in the selected period.",
      evidence: [
        `${peakSlot.slot} has ${formatEvidenceNumber(peakSlot.count, "count")} orders.`,
        `Total Orders is ${formatEvidenceNumber(totalOrders, "count")}.`,
      ],
      recommendationHint:
        "Use the peak slot to plan staff readiness, kitchen prep, and cashier focus before demand builds up.",
      expectedImpact:
        "Preparing around peak pressure helps reduce active backlog and service delays.",
      metricKeys: ["orderDensity", "totalOrders"],
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "operations-monitor-baseline",
      title: "Operations Flow Is Stable",
      priority: "low",
      confidence: "medium",
      problem: "No critical operation issue was detected from selected-period metrics.",
      evidence: [
        `Total Orders is ${formatEvidenceNumber(totalOrders, "count")}.`,
        `Completion Rate is ${formatEvidenceNumber(completionRate, "percent")}.`,
        `Active Orders is ${formatEvidenceNumber(activeOrders, "count")}.`,
      ],
      recommendationHint:
        "Keep monitoring active orders, completion rate, unpaid orders, and service timestamp coverage.",
      expectedImpact:
        "A stable operations baseline helps the owner focus on real bottlenecks when they appear.",
      metricKeys: ["totalOrders", "completionRate", "activeOrders"],
    });
  }

  return issues.slice(0, 5);
};

export async function buildOperationsRecommendationSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
): Promise<RecommendationSnapshot> {
  const period = buildRecommendationPeriodContext(insightPeriod);
  const [ordersResult, orderItemsResult, orderCorrectionsResult] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id,status,payment_status,fulfillment_method,order_date,order_time,created_at,completed_at",
      )
      .order("created_at", { ascending: true }),
    supabase.from("order_items").select("order_id,ready_at,served_at"),
    supabase.from("order_corrections").select("id,order_id,status,physical_status,note"),
  ]);

  if (ordersResult.error) {
    throw new Error(
      `Owner AI could not read operation orders: ${ordersResult.error.message}`,
    );
  }

  if (orderItemsResult.error) {
    throw new Error(
      `Owner AI could not read operation order items: ${orderItemsResult.error.message}`,
    );
  }

  if (orderCorrectionsResult.error) {
    throw new Error(
      `Owner AI could not read operation order corrections: ${orderCorrectionsResult.error.message}`,
    );
  }

  const orders = applyInsightOrderCorrections(
    (ordersResult.data ?? []) as OperationOrderRow[],
    (orderCorrectionsResult.data ?? []) as InsightOrderCorrectionRow[],
  );
  const orderItems = (orderItemsResult.data ?? []) as OperationOrderItemRow[];
  const selectedOrders = orders.filter((order) =>
    getOrderDateCandidates(order).some((date) => isDateInPeriod(date, period.selected)),
  );
  const flow = [
    { status: "new", label: "New Order" },
    { status: "on-process", label: "On Process" },
    { status: "partially-served", label: "Partially Served" },
    { status: "completed", label: "Completed" },
  ].map((stage) => ({
    ...stage,
    count: selectedOrders.filter(
      (order) => normalizeOperationStatus(order.status) === stage.status,
    ).length,
  }));
  const activeOrders = selectedOrders.filter((order) =>
    ["new", "on-process", "partially-served"].includes(
      normalizeOperationStatus(order.status),
    ),
  );
  const completedOrders = selectedOrders.filter(
    (order) => normalizeOperationStatus(order.status) === "completed",
  );
  const partiallyServedOrders = selectedOrders.filter(
    (order) => normalizeOperationStatus(order.status) === "partially-served",
  );
  const unpaidOrders = selectedOrders.filter(
    (order) => String(order.payment_status ?? "").toLowerCase() === "unpaid",
  );
  const serviceEvents = buildServiceEvents(selectedOrders, orderItems);
  const serviceMinutes = serviceEvents.map((event) => event.minutes);
  const averageServiceMinutes = serviceMinutes.length ? average(serviceMinutes) : null;
  const orderDensity = buildOrderDensity(selectedOrders);
  const peakSlot = [...orderDensity].sort((a, b) => b.count - a.count)[0];
  const completionRate = selectedOrders.length
    ? (completedOrders.length / selectedOrders.length) * 100
    : 0;
  const metrics = {
    totalOrders: buildMetric({
      value: selectedOrders.length,
      previousValue: null,
      unit: "count",
      source: "orders in selected period using operation date candidates",
      displayLabel: "Total Orders",
    }),
    activeOrders: buildMetric({
      value: activeOrders.length,
      previousValue: null,
      unit: "count",
      source: "orders with new, on-process, or partially-served status",
      displayLabel: "Active Orders",
    }),
    completedOrders: buildMetric({
      value: completedOrders.length,
      previousValue: null,
      unit: "count",
      source: "orders with completed or served status",
      displayLabel: "Completed Orders",
    }),
    partiallyServedOrders: buildMetric({
      value: partiallyServedOrders.length,
      previousValue: null,
      unit: "count",
      source: "orders with partially-served status",
      displayLabel: "Partially Served Orders",
    }),
    completionRate: buildMetric({
      value: completionRate,
      previousValue: null,
      unit: "percent",
      source: "completedOrders divided by totalOrders",
      displayLabel: "Completion Rate",
    }),
    unpaidOrders: buildMetric({
      value: unpaidOrders.length,
      previousValue: null,
      unit: "count",
      source: "orders with payment_status unpaid",
      displayLabel: "Unpaid Orders",
    }),
    averageServiceMinutes: buildMetric({
      value: averageServiceMinutes,
      previousValue: null,
      unit: "minutes",
      source: "orders.created_at to orders.completed_at and order_items.ready_at to order_items.served_at",
      displayLabel: "Average Service Time",
    }),
    serviceSampleSize: buildMetric({
      value: serviceMinutes.length,
      previousValue: null,
      unit: "count",
      source: "valid service duration samples",
      displayLabel: "Service Sample Size",
    }),
    peakSlotOrders: buildMetric({
      value: peakSlot?.count ?? 0,
      previousValue: null,
      unit: "count",
      source: "highest order count in 09:00-20:00 operating slots",
      displayLabel: "Peak Slot Orders",
    }),
  } satisfies Record<string, RecommendationMetric>;

  return {
    category: "operations",
    period,
    metrics,
    charts: {
      orderFlowFunnel: {
        title: "Order Flow Funnel",
        description: "Order count across operational stages.",
        points: flow,
      },
      orderDensityHeatmap: {
        title: "Order Density Heatmap",
        description: "Operating slots with order pressure.",
        points: orderDensity,
      },
      serviceTimeTrend: {
        title: "Average Service Time",
        description: "Created-to-completed duration for completed orders.",
        points: buildServiceTrend(serviceEvents, period),
      },
      activeCompletedTrend: {
        title: "Active vs Completed Trend",
        description: "Flow balance over the selected period.",
        points: buildCompletionTrend(selectedOrders, period),
      },
      paymentStatus: {
        title: "Payment Status",
        description: "Payment status distribution for operational orders.",
        points: countBy(selectedOrders, (order) => order.payment_status || "unknown"),
      },
      fulfillmentMethod: {
        title: "Fulfillment Method",
        description: "Fulfillment method distribution for operational orders.",
        points: countBy(selectedOrders, (order) => order.fulfillment_method || "unknown"),
      },
    },
    tables: {},
    allowedIssues: buildOperationsAllowedIssues({
      metrics,
      peakSlot,
    }),
    dataQuality: {
      missingFields: serviceMinutes.length ? [] : ["completed_at", "ready_at", "served_at"],
      unsupportedClaims: [
        "Do not discuss service time when serviceSampleSize is 0 or averageServiceMinutes is null.",
        "Do not treat served as the only completed state; completed and served both map to completed flow.",
        "Do not infer customer wait satisfaction because customer feedback data is not included.",
        "Do not infer staff performance here; staff-specific data belongs to the Staff tab.",
      ],
      warnings: serviceMinutes.length
        ? []
        : ["No valid service-time samples were found for operations."],
    },
    diagnostics: {
      fetchedOrderRows: orders.length,
      selectedOrderRows: selectedOrders.length,
      fetchedOrderItemRows: orderItems.length,
      serviceSampleSize: serviceMinutes.length,
    },
  };
}
