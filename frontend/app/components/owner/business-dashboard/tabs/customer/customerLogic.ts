import type { DateRangeValue } from "../DateRangeFilter";
import type { OrderRow } from "../shared/dashboardTypes";
import {
  getDatesBetween,
  getOrderBusinessDate,
  getOrderBusinessHour,
  groupBy,
  isValidSalesOrder,
  toNumber,
} from "../shared/dashboardUtils";

export function getOrdersInRange(orders: OrderRow[], range: DateRangeValue) {
  return orders.filter(
    (order) =>
      getOrderBusinessDate(order) >= range.startDate &&
      getOrderBusinessDate(order) <= range.endDate,
  );
}

function getAov(orders: OrderRow[]) {
  const revenue = orders.reduce((sum, order) => sum + toNumber(order.total), 0);
  return orders.length ? revenue / orders.length : 0;
}

function getOrderBucket(order: OrderRow, useHourlyBucket: boolean) {
  const orderDate = getOrderBusinessDate(order);
  if (!orderDate) return "";
  return useHourlyBucket ? `${orderDate} ${getOrderBusinessHour(order)}:00` : orderDate;
}

export function buildCustomerPerformance(orders: OrderRow[], range: DateRangeValue) {
  const validOrders = orders.filter(isValidSalesOrder);
  const rangeOrders = getOrdersInRange(validOrders, range);
  const memberOrders = rangeOrders.filter((order) => Boolean(order.customer_id));
  const guestOrders = rangeOrders.filter((order) => !order.customer_id);
  const rewardOrders = rangeOrders.filter((order) => Boolean(order.reward_redemption_id));
  const memberRevenue = memberOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const guestRevenue = guestOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const discountCost = rangeOrders.reduce((sum, order) => sum + toNumber(order.discount), 0);
  const memberAov = getAov(memberOrders);
  const guestAov = getAov(guestOrders);
  const lifetimeMemberOrdersUntilEndDate = validOrders.filter(
    (order) =>
      Boolean(order.customer_id) &&
      getOrderBusinessDate(order) <= range.endDate,
  );
  const lifetimeCustomerOrderGroups = groupBy(
    lifetimeMemberOrdersUntilEndDate,
    (order) => order.customer_id ?? "unknown",
  );
  const activeCustomerIds = new Set(
    memberOrders.map((order) => order.customer_id).filter(Boolean),
  );
  const repeatCustomerCount = Array.from(activeCustomerIds).filter((customerId) => {
    return (lifetimeCustomerOrderGroups.get(customerId ?? "")?.length ?? 0) >= 2;
  }).length;
  const uniqueCustomerCount = activeCustomerIds.size;
  const repeatCustomerRate = uniqueCustomerCount
    ? (repeatCustomerCount / uniqueCustomerCount) * 100
    : 0;
  const rewardUsageRate = rangeOrders.length
    ? (rewardOrders.length / rangeOrders.length) * 100
    : 0;
  const discountRatio = memberRevenue + guestRevenue
    ? (discountCost / (memberRevenue + guestRevenue)) * 100
    : 0;

  return {
    rangeOrders,
    memberOrders,
    guestOrders,
    rewardOrders,
    memberRevenue,
    guestRevenue,
    discountCost,
    memberAov,
    guestAov,
    repeatCustomerCount,
    uniqueCustomerCount,
    repeatCustomerRate,
    rewardUsageRate,
    discountRatio,
    memberShare: rangeOrders.length ? (memberOrders.length / rangeOrders.length) * 100 : 0,
  };
}

export function buildNewReturningTrend(orders: OrderRow[], range: DateRangeValue) {
  const useHourlyBucket = range.startDate === range.endDate;
  const validMemberOrders = orders
    .filter(isValidSalesOrder)
    .filter((order) => Boolean(order.customer_id));
  const firstOrderBucketByCustomer = new Map<string, string>();

  validMemberOrders.forEach((order) => {
    const customerId = order.customer_id;
    const orderBucket = getOrderBucket(order, useHourlyBucket);
    if (!customerId || !orderBucket) return;

    const currentFirstBucket = firstOrderBucketByCustomer.get(customerId);
    if (!currentFirstBucket || orderBucket < currentFirstBucket) {
      firstOrderBucketByCustomer.set(customerId, orderBucket);
    }
  });

  if (useHourlyBucket) {
    return Array.from({ length: 24 }, (_, hour) => {
      const hourKey = String(hour).padStart(2, "0");
      const bucket = `${range.startDate} ${hourKey}:00`;
      const hourOrders = validMemberOrders.filter(
        (order) => getOrderBucket(order, true) === bucket,
      );
      const customerIds = Array.from(
        new Set(hourOrders.map((order) => order.customer_id).filter(Boolean)),
      ) as string[];

      return {
        date: `${hourKey}:00`,
        newCustomers: customerIds.filter(
          (customerId) => firstOrderBucketByCustomer.get(customerId) === bucket,
        ).length,
        returningCustomers: customerIds.filter(
          (customerId) => firstOrderBucketByCustomer.get(customerId) !== bucket,
        ).length,
      };
    });
  }

  return getDatesBetween(range.startDate, range.endDate).map((date) => {
    const dayOrders = validMemberOrders.filter((order) => getOrderBusinessDate(order) === date);
    const customerIds = Array.from(
      new Set(dayOrders.map((order) => order.customer_id).filter(Boolean)),
    ) as string[];

    return {
      date: date.slice(5),
      newCustomers: customerIds.filter(
        (customerId) => firstOrderBucketByCustomer.get(customerId) === date,
      ).length,
      returningCustomers: customerIds.filter(
        (customerId) => firstOrderBucketByCustomer.get(customerId) !== date,
      ).length,
    };
  });
}

export function getLoyaltyInsightSummary(
  metrics: ReturnType<typeof buildCustomerPerformance>,
) {
  if (!metrics.rangeOrders.length) {
    return {
      status: "Needs Data",
      summary: "No valid customer orders are available for the selected period.",
    };
  }

  if (metrics.repeatCustomerRate >= 35 && metrics.memberAov >= metrics.guestAov) {
    return {
      status: "Healthy",
      summary:
        "Loyalty looks healthy: repeat customer rate is strong and member AOV is at least as good as guest AOV.",
    };
  }

  if (metrics.rewardUsageRate > 0 && metrics.memberAov < metrics.guestAov) {
    return {
      status: "Watch",
      summary:
        "Rewards are being used, but member AOV is lower than guest AOV. Review discount rules and minimum spend.",
    };
  }

  return {
    status: "Needs Attention",
    summary:
      "Customer loyalty needs stronger retention signals. Prioritize repeat visits and track whether members spend more than guests.",
  };
}
