import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMetric, toNumber } from "./metricSnapshotBuilder";
import {
  buildRecommendationPeriodContext,
  isDateInPeriod,
} from "./periodService";
import {
  applyInsightOrderCorrections,
  type InsightOrderCorrectionRow,
} from "./orderCorrectionUtils";
import type {
  OwnerInsightPeriod,
  RecommendationAllowedIssue,
  RecommendationChartPoint,
  RecommendationMetric,
  RecommendationSnapshot,
} from "./recommendationSnapshotTypes";

type CustomerOrderRow = {
  id: string;
  total?: number | string | null;
  discount?: number | string | null;
  status?: string | null;
  payment_status?: string | null;
  order_date?: string | null;
  order_time?: string | null;
  created_at?: string | null;
  customer_id?: string | null;
  reward_redemption_id?: string | null;
};

type RewardRow = {
  id: string;
  name?: string | null;
  is_active?: boolean | null;
  used_count?: number | string | null;
  points_required?: number | string | null;
};

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

  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    hour: getPart("hour") === "24" ? "00" : getPart("hour").padStart(2, "0"),
  };
};

const getOrderBusinessDate = (order: CustomerOrderRow) =>
  getJakartaDateParts(order.created_at)?.date || String(order.order_date ?? "");

const getOrderBusinessHour = (order: CustomerOrderRow) =>
  getJakartaDateParts(order.created_at)?.hour ||
  String(order.order_time ?? "00").slice(0, 2).padStart(2, "0");

const isValidSalesOrder = (order: CustomerOrderRow) => {
  const status = String(order.status ?? "").toLowerCase();
  const payment = String(order.payment_status ?? "").toLowerCase();

  if (cancelledStatuses.has(status)) return false;
  if (invalidPaymentStatuses.has(payment)) return false;

  return true;
};

const formatEvidenceNumber = (value: number | string | null, unit: string) => {
  if (value === null) return "not available";
  if (typeof value === "string") return value;
  if (unit === "IDR") return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
  if (unit === "percent") return `${value.toFixed(1)}%`;
  return Math.round(value).toLocaleString("id-ID");
};

const getAov = (orders: CustomerOrderRow[]) => {
  const revenue = orders.reduce((sum, order) => sum + toNumber(order.total), 0);
  return orders.length ? revenue / orders.length : 0;
};

const groupBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item) || "Unknown";
    map.set(key, [...(map.get(key) ?? []), item]);
  });
  return map;
};

const getBucket = (order: CustomerOrderRow, useHourlyBucket: boolean) => {
  const date = getOrderBusinessDate(order);
  if (!date) return "";
  return useHourlyBucket ? `${date} ${getOrderBusinessHour(order)}:00` : date;
};

const buildCustomerSummary = (
  allValidOrders: CustomerOrderRow[],
  selectedOrders: CustomerOrderRow[],
  endDate: string,
) => {
  const memberOrders = selectedOrders.filter((order) => Boolean(order.customer_id));
  const guestOrders = selectedOrders.filter((order) => !order.customer_id);
  const rewardOrders = selectedOrders.filter((order) =>
    Boolean(order.reward_redemption_id),
  );
  const memberRevenue = memberOrders.reduce(
    (sum, order) => sum + toNumber(order.total),
    0,
  );
  const guestRevenue = guestOrders.reduce(
    (sum, order) => sum + toNumber(order.total),
    0,
  );
  const totalRevenue = memberRevenue + guestRevenue;
  const discountCost = selectedOrders.reduce(
    (sum, order) => sum + toNumber(order.discount),
    0,
  );
  const activeCustomerIds = new Set(
    memberOrders.map((order) => order.customer_id).filter(Boolean),
  );
  const lifetimeCustomerGroups = groupBy(
    allValidOrders.filter(
      (order) =>
        Boolean(order.customer_id) && getOrderBusinessDate(order) <= endDate,
    ),
    (order) => order.customer_id ?? "unknown",
  );
  const repeatCustomers = Array.from(activeCustomerIds).filter(
    (customerId) => (lifetimeCustomerGroups.get(customerId ?? "")?.length ?? 0) >= 2,
  ).length;

  return {
    totalOrders: selectedOrders.length,
    totalRevenue,
    memberOrders: memberOrders.length,
    guestOrders: guestOrders.length,
    rewardOrders: rewardOrders.length,
    memberRevenue,
    guestRevenue,
    discountCost,
    memberAov: getAov(memberOrders),
    guestAov: getAov(guestOrders),
    uniqueMembers: activeCustomerIds.size,
    repeatCustomers,
    memberShare: selectedOrders.length
      ? (memberOrders.length / selectedOrders.length) * 100
      : 0,
    repeatCustomerRate: activeCustomerIds.size
      ? (repeatCustomers / activeCustomerIds.size) * 100
      : 0,
    rewardUsageRate: selectedOrders.length
      ? (rewardOrders.length / selectedOrders.length) * 100
      : 0,
    discountRatio: totalRevenue ? (discountCost / totalRevenue) * 100 : 0,
  };
};

const buildNewReturningTrend = (
  validOrders: CustomerOrderRow[],
  selectedOrders: CustomerOrderRow[],
  granularity: string,
) => {
  const useHourlyBucket = granularity === "hour";
  const validMemberOrders = validOrders.filter((order) => Boolean(order.customer_id));
  const selectedMemberOrders = selectedOrders.filter((order) =>
    Boolean(order.customer_id),
  );
  const firstBucketByCustomer = new Map<string, string>();

  validMemberOrders.forEach((order) => {
    const customerId = order.customer_id;
    const bucket = getBucket(order, useHourlyBucket);
    if (!customerId || !bucket) return;

    const current = firstBucketByCustomer.get(customerId);
    if (!current || bucket < current) firstBucketByCustomer.set(customerId, bucket);
  });

  return Array.from(
    groupBy(selectedMemberOrders, (order) => getBucket(order, useHourlyBucket)).entries(),
  )
    .map(([bucket, rows]): RecommendationChartPoint => {
      const customerIds = Array.from(
        new Set(rows.map((order) => order.customer_id).filter(Boolean)),
      ) as string[];

      return {
        period: useHourlyBucket ? bucket.slice(11) : bucket,
        newCustomers: customerIds.filter(
          (customerId) => firstBucketByCustomer.get(customerId) === bucket,
        ).length,
        returningCustomers: customerIds.filter(
          (customerId) => firstBucketByCustomer.get(customerId) !== bucket,
        ).length,
      };
    })
    .sort((a, b) => String(a.period).localeCompare(String(b.period)));
};

const buildCustomerAllowedIssues = ({
  metrics,
  activeRewardCount,
}: {
  metrics: Record<string, RecommendationMetric>;
  activeRewardCount: number;
}): RecommendationAllowedIssue[] => {
  const issues: RecommendationAllowedIssue[] = [];
  const totalOrders = Number(metrics.totalOrders.value ?? 0);
  const totalRevenue = Number(metrics.totalRevenue.value ?? 0);
  const memberShare = Number(metrics.memberShare.value ?? 0);
  const repeatRate = Number(metrics.repeatCustomerRate.value ?? 0);
  const memberAov = Number(metrics.memberAov.value ?? 0);
  const guestAov = Number(metrics.guestAov.value ?? 0);
  const rewardUsage = Number(metrics.rewardUsageRate.value ?? 0);
  const discountRatio = Number(metrics.discountRatio.value ?? 0);
  const discountCost = Number(metrics.discountCost.value ?? 0);
  const previousRevenue = Number(metrics.totalRevenue.previousValue ?? 0);
  const revenueChange = metrics.totalRevenue.changePct ?? 0;

  if (totalOrders === 0 && totalRevenue === 0) {
    issues.push({
      id: "customer-no-activity",
      title: "No Customer Activity Recorded",
      priority: "high",
      confidence: "high",
      problem: "No valid customer orders were recorded in the selected period.",
      evidence: [
        `Total Orders is ${formatEvidenceNumber(totalOrders, "count")}.`,
        `Total Revenue is ${formatEvidenceNumber(totalRevenue, "IDR")}.`,
      ],
      recommendationHint:
        "Verify order recording, payment status, customer checkout flow, and whether customer-facing sales channels were operating.",
      expectedImpact:
        "Confirming data and operations first prevents loyalty actions from being based on missing sales records.",
      metricKeys: ["totalOrders", "totalRevenue"],
    });
  }

  if (totalRevenue > 0 && previousRevenue > 0 && revenueChange <= -15) {
    issues.push({
      id: "customer-revenue-decline",
      title: "Customer Revenue Declined",
      priority: revenueChange <= -30 ? "high" : "medium",
      confidence: "high",
      problem: "Customer revenue is lower than the comparison period.",
      evidence: [
        `Total Revenue is ${formatEvidenceNumber(totalRevenue, "IDR")}.`,
        `Comparison revenue was ${formatEvidenceNumber(previousRevenue, "IDR")}.`,
        `Revenue change is ${revenueChange.toFixed(1)}%.`,
      ],
      recommendationHint:
        "Separate whether the decline comes from fewer customer orders or lower spend quality before changing loyalty offers.",
      expectedImpact:
        "Diagnosing demand versus basket value helps the owner choose between retention, acquisition, or basket-size actions.",
      metricKeys: ["totalRevenue", "totalOrders", "memberAov", "guestAov"],
    });
  }

  if (totalOrders > 0 && memberShare < 35) {
    issues.push({
      id: "customer-member-share-low",
      title: "Member Share Is Low",
      priority: "medium",
      confidence: "high",
      problem: "Guest orders dominate the selected period, reducing loyalty visibility.",
      evidence: [
        `Member Share is ${formatEvidenceNumber(memberShare, "percent")}.`,
        `Total Orders is ${formatEvidenceNumber(totalOrders, "count")}.`,
      ],
      recommendationHint:
        "Improve member capture at checkout with a simple sign-in prompt or member benefit reminder before creating new discounts.",
      expectedImpact:
        "More identified customers gives the owner stronger retention data and more precise loyalty targeting.",
      metricKeys: ["memberShare", "totalOrders"],
    });
  }

  if (totalOrders > 0 && repeatRate < 25) {
    issues.push({
      id: "customer-repeat-rate-low",
      title: "Repeat Customer Rate Is Weak",
      priority: "medium",
      confidence: "high",
      problem: "The selected period has limited repeat customer activity.",
      evidence: [
        `Repeat Customer Rate is ${formatEvidenceNumber(repeatRate, "percent")}.`,
        `Unique Members is ${formatEvidenceNumber(metrics.uniqueMembers.value, "count")}.`,
      ],
      recommendationHint:
        "Prioritize a return-visit mechanic such as a targeted next-visit reward, but keep minimum spend aligned with current AOV.",
      expectedImpact:
        "A focused return trigger can improve retention without discounting every transaction.",
      metricKeys: ["repeatCustomerRate", "uniqueMembers"],
    });
  }

  if (guestAov > 0 && memberAov > 0 && memberAov < guestAov * 0.9) {
    issues.push({
      id: "customer-member-aov-below-guest",
      title: "Member AOV Is Below Guest AOV",
      priority: "medium",
      confidence: "high",
      problem: "Members are spending less per order than guests.",
      evidence: [
        `Member AOV is ${formatEvidenceNumber(memberAov, "IDR")}.`,
        `Guest AOV is ${formatEvidenceNumber(guestAov, "IDR")}.`,
      ],
      recommendationHint:
        "Review reward minimum spend, bundles, and member-only add-ons so loyalty increases basket size instead of only reducing price.",
      expectedImpact:
        "Improving member basket quality makes loyalty healthier for revenue and discount cost.",
      metricKeys: ["memberAov", "guestAov"],
    });
  }

  if (totalOrders > 0 && activeRewardCount > 0 && rewardUsage < 5) {
    issues.push({
      id: "customer-reward-usage-low",
      title: "Reward Usage Is Low",
      priority: "low",
      confidence: "medium",
      problem: "Active rewards exist, but few valid orders used a reward.",
      evidence: [
        `Reward Usage Rate is ${formatEvidenceNumber(rewardUsage, "percent")}.`,
        `Active Rewards is ${formatEvidenceNumber(activeRewardCount, "count")}.`,
      ],
      recommendationHint:
        "Review reward visibility and redemption friction before adding more reward types.",
      expectedImpact:
        "Better usage of existing rewards can improve loyalty effectiveness without increasing discount complexity.",
      metricKeys: ["rewardUsageRate", "activeRewards"],
    });
  }

  if (discountRatio >= 12 && discountCost > 0) {
    issues.push({
      id: "customer-discount-cost-high",
      title: "Discount Cost Needs Control",
      priority: discountRatio >= 20 ? "high" : "medium",
      confidence: "high",
      problem: "Discount cost is taking a meaningful share of customer revenue.",
      evidence: [
        `Discount Cost is ${formatEvidenceNumber(discountCost, "IDR")}.`,
        `Discount Ratio is ${formatEvidenceNumber(discountRatio, "percent")}.`,
      ],
      recommendationHint:
        "Tighten discount rules with minimum spend, eligibility, or reward limits before increasing promotion volume.",
      expectedImpact:
        "Controlling discount cost protects margin while keeping loyalty benefits available.",
      metricKeys: ["discountCost", "discountRatio"],
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "customer-loyalty-baseline",
      title: "Customer Loyalty Signals Are Stable",
      priority: "low",
      confidence: "medium",
      problem: "No critical customer loyalty issue was detected from selected-period metrics.",
      evidence: [
        `Member Share is ${formatEvidenceNumber(memberShare, "percent")}.`,
        `Repeat Customer Rate is ${formatEvidenceNumber(repeatRate, "percent")}.`,
        `Discount Ratio is ${formatEvidenceNumber(discountRatio, "percent")}.`,
      ],
      recommendationHint:
        "Keep monitoring member share, repeat customer rate, member AOV, guest AOV, and discount ratio before changing loyalty strategy.",
      expectedImpact:
        "A stable baseline helps the owner avoid unnecessary discounts and focus on real customer signals.",
      metricKeys: ["memberShare", "repeatCustomerRate", "discountRatio"],
    });
  }

  return issues.slice(0, 5);
};

export async function buildCustomerRecommendationSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
): Promise<RecommendationSnapshot> {
  const period = buildRecommendationPeriodContext(insightPeriod);
  const [ordersResult, rewardsResult, orderCorrectionsResult] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id,total,discount,status,payment_status,order_date,order_time,created_at,customer_id,reward_redemption_id",
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("rewards")
      .select("id,name,is_active,used_count,points_required")
      .order("name", { ascending: true }),
    supabase.from("order_corrections").select("id,order_id,status,physical_status,note"),
  ]);

  if (ordersResult.error) {
    throw new Error(
      `Owner AI could not read customer orders: ${ordersResult.error.message}`,
    );
  }

  if (orderCorrectionsResult.error) {
    throw new Error(
      `Owner AI could not read customer order corrections: ${orderCorrectionsResult.error.message}`,
    );
  }

  const orders = applyInsightOrderCorrections(
    (ordersResult.data ?? []) as CustomerOrderRow[],
    (orderCorrectionsResult.data ?? []) as InsightOrderCorrectionRow[],
  );
  const rewards = (rewardsResult.data ?? []) as RewardRow[];

  if (orders.length === 0) {
    throw new Error(
      "Owner AI server-side customer query returned 0 order rows. Verify SUPABASE_SERVICE_ROLE_KEY is available to the API runtime.",
    );
  }

  const validOrders = orders.filter(isValidSalesOrder);
  const selectedOrders = validOrders.filter((order) =>
    isDateInPeriod(getOrderBusinessDate(order), period.selected),
  );
  const comparisonOrders = validOrders.filter((order) =>
    isDateInPeriod(getOrderBusinessDate(order), period.comparison),
  );
  const selectedSummary = buildCustomerSummary(
    validOrders,
    selectedOrders,
    period.selected.endDate,
  );
  const comparisonSummary = buildCustomerSummary(
    validOrders,
    comparisonOrders,
    period.comparison.endDate,
  );
  const activeRewardCount = rewards.filter((reward) => reward.is_active).length;
  const metrics = {
    totalRevenue: buildMetric({
      value: selectedSummary.totalRevenue,
      previousValue: comparisonSummary.totalRevenue,
      unit: "IDR",
      source: "orders.total filtered with Customer Performance valid-order rules",
      displayLabel: "Total Revenue",
    }),
    totalOrders: buildMetric({
      value: selectedSummary.totalOrders,
      previousValue: comparisonSummary.totalOrders,
      unit: "count",
      source: "orders.id filtered with Customer Performance valid-order rules",
      displayLabel: "Total Orders",
    }),
    memberOrders: buildMetric({
      value: selectedSummary.memberOrders,
      previousValue: comparisonSummary.memberOrders,
      unit: "count",
      source: "orders.customer_id present in selected valid orders",
      displayLabel: "Member Orders",
    }),
    guestOrders: buildMetric({
      value: selectedSummary.guestOrders,
      previousValue: comparisonSummary.guestOrders,
      unit: "count",
      source: "orders.customer_id missing in selected valid orders",
      displayLabel: "Guest Orders",
    }),
    memberShare: buildMetric({
      value: selectedSummary.memberShare,
      previousValue: comparisonSummary.memberShare,
      unit: "percent",
      source: "memberOrders divided by totalOrders",
      displayLabel: "Member Share",
    }),
    repeatCustomerRate: buildMetric({
      value: selectedSummary.repeatCustomerRate,
      previousValue: comparisonSummary.repeatCustomerRate,
      unit: "percent",
      source:
        "selected unique customer_id count with at least two lifetime valid orders until period end",
      displayLabel: "Repeat Customer Rate",
    }),
    uniqueMembers: buildMetric({
      value: selectedSummary.uniqueMembers,
      previousValue: comparisonSummary.uniqueMembers,
      unit: "count",
      source: "unique customer_id in selected valid orders",
      displayLabel: "Unique Members",
    }),
    memberAov: buildMetric({
      value: selectedSummary.memberAov,
      previousValue: comparisonSummary.memberAov,
      unit: "IDR",
      source: "member revenue divided by member order count",
      displayLabel: "Member AOV",
    }),
    guestAov: buildMetric({
      value: selectedSummary.guestAov,
      previousValue: comparisonSummary.guestAov,
      unit: "IDR",
      source: "guest revenue divided by guest order count",
      displayLabel: "Guest AOV",
    }),
    rewardUsageRate: buildMetric({
      value: selectedSummary.rewardUsageRate,
      previousValue: comparisonSummary.rewardUsageRate,
      unit: "percent",
      source: "orders with reward_redemption_id divided by valid orders",
      displayLabel: "Reward Usage Rate",
    }),
    discountCost: buildMetric({
      value: selectedSummary.discountCost,
      previousValue: comparisonSummary.discountCost,
      unit: "IDR",
      source: "sum of orders.discount for valid orders",
      displayLabel: "Discount Cost",
    }),
    discountRatio: buildMetric({
      value: selectedSummary.discountRatio,
      previousValue: comparisonSummary.discountRatio,
      unit: "percent",
      source: "discountCost divided by totalRevenue",
      displayLabel: "Discount Ratio",
    }),
    activeRewards: buildMetric({
      value: activeRewardCount,
      previousValue: null,
      unit: "count",
      source: "rewards.is_active count",
      displayLabel: "Active Rewards",
    }),
  } satisfies Record<string, RecommendationMetric>;

  return {
    category: "rewards",
    period,
    metrics,
    charts: {
      customerMix: {
        title: "Customer Mix",
        description: "Member and guest order composition.",
        points: [
          { name: "Member", orders: selectedSummary.memberOrders },
          { name: "Guest", orders: selectedSummary.guestOrders },
        ],
      },
      memberGuestAov: {
        title: "Member vs Guest AOV",
        description: "Compares spend quality between identified customers and guests.",
        points: [
          { name: "Member", aov: selectedSummary.memberAov },
          { name: "Guest", aov: selectedSummary.guestAov },
        ],
      },
      newReturningTrend: {
        title: "New vs Returning Customer Trend",
        description:
          "Shows whether member activity is driven by new or returning customers.",
        points: buildNewReturningTrend(
          validOrders,
          selectedOrders,
          period.selected.granularity,
        ),
      },
    },
    tables: {
      topRewards: {
        title: "Top Rewards",
        description: "Most used reward configurations when reward data is available.",
        rows: rewards
          .map((reward) => ({
            name: reward.name || "Reward",
            isActive: reward.is_active ? "yes" : "no",
            usedCount: toNumber(reward.used_count),
            pointsRequired: toNumber(reward.points_required),
          }))
          .sort((a, b) => Number(b.usedCount) - Number(a.usedCount))
          .slice(0, 5),
      },
    },
    allowedIssues: buildCustomerAllowedIssues({
      metrics,
      activeRewardCount,
    }),
    dataQuality: {
      missingFields: rewardsResult.error ? ["rewards"] : [],
      unsupportedClaims: [
        "Do not mention customer names because the snapshot only contains aggregate customer metrics.",
        "Do not claim loyalty improved or declined unless comparison metrics are included in metrics.",
        "Do not recommend broad discounts unless discountCost, discountRatio, and rewardUsageRate support it.",
        "Do not claim campaign performance because campaign-level attribution is not included.",
      ],
      warnings: rewardsResult.error
        ? [`Reward table was unavailable: ${rewardsResult.error.message}`]
        : [],
    },
    diagnostics: {
      fetchedOrderRows: orders.length,
      selectedValidOrderRows: selectedOrders.length,
      comparisonValidOrderRows: comparisonOrders.length,
      activeRewardCount,
    },
  };
}
