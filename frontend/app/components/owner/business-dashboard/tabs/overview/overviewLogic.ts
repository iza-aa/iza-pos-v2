import type { DateRangeValue } from "../DateRangeFilter";
import type { OrderRow } from "../shared/dashboardTypes";
import {
  getDatesBetween,
  getOrderBusinessDate,
  getOrderBusinessHour,
  getPreviousDateRange,
  isValidSalesOrder,
  toNumber,
} from "../shared/dashboardUtils";

export function buildRevenueTrendForRange(
  orders: OrderRow[],
  range: DateRangeValue,
) {
  const validOrders = orders.filter(isValidSalesOrder);

  if (range.startDate === range.endDate) {
    return Array.from({ length: 24 }, (_, hour) => {
      const hourLabel = `${String(hour).padStart(2, "0")}:00`;
      const rows = validOrders.filter(
        (order) =>
          getOrderBusinessDate(order) === range.startDate &&
          getOrderBusinessHour(order) === String(hour).padStart(2, "0"),
      );

      return {
        date: hourLabel,
        revenue: rows.reduce((sum, order) => sum + toNumber(order.total), 0),
        orders: rows.length,
      };
    });
  }

  return getDatesBetween(range.startDate, range.endDate).map((date) => {
    const rows = validOrders.filter((order) => getOrderBusinessDate(order) === date);
    return {
      date: date.slice(5),
      revenue: rows.reduce((sum, order) => sum + toNumber(order.total), 0),
      orders: rows.length,
    };
  });
}

function calculateAov(orders: OrderRow[]) {
  const validOrders = orders.filter(isValidSalesOrder);
  const revenue = validOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  return validOrders.length ? revenue / validOrders.length : 0;
}

export function buildAovTrendComparison(
  orders: OrderRow[],
  range: DateRangeValue,
) {
  if (range.startDate === range.endDate) {
    const previousDate = getPreviousDateRange(range).startDate;

    return Array.from({ length: 24 }, (_, hour) => {
      const hourKey = String(hour).padStart(2, "0");
      const getRows = (date: string) =>
        orders.filter(
          (order) =>
            getOrderBusinessDate(order) === date &&
            getOrderBusinessHour(order) === hourKey,
        );

      return {
        date: `${hourKey}:00`,
        current: Math.round(calculateAov(getRows(range.startDate))),
        previous: Math.round(calculateAov(getRows(previousDate))),
      };
    });
  }

  const currentDates = getDatesBetween(range.startDate, range.endDate);
  const previousRange = getPreviousDateRange(range);
  const previousDates = getDatesBetween(previousRange.startDate, previousRange.endDate);

  return currentDates.map((date, index) => {
    const previousDate = previousDates[index];

    return {
      date: date.slice(5),
      current: Math.round(
        calculateAov(orders.filter((order) => getOrderBusinessDate(order) === date)),
      ),
      previous: Math.round(
        calculateAov(orders.filter((order) => getOrderBusinessDate(order) === previousDate)),
      ),
    };
  });
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getAverageServiceMinutes(orders: OrderRow[]) {
  const durations = orders
    .map((order) => {
      const start = order.created_at ? new Date(order.created_at).getTime() : 0;
      const finishValue = order.completed_at ?? order.served_at ?? order.ready_at;
      const finish = finishValue ? new Date(finishValue).getTime() : 0;
      const minutes = (finish - start) / 60_000;
      return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
    })
    .filter((value): value is number => value !== null);

  if (!durations.length) {
    return { minutes: null, sampleSize: 0 };
  }

  return {
    minutes: durations.reduce((sum, value) => sum + value, 0) / durations.length,
    sampleSize: durations.length,
  };
}

export function buildBusinessHealth(
  currentOrders: OrderRow[],
  previousOrders: OrderRow[],
) {
  const currentValidOrders = currentOrders.filter(isValidSalesOrder);
  const previousValidOrders = previousOrders.filter(isValidSalesOrder);
  const currentRevenue = currentValidOrders.reduce(
    (sum, order) => sum + toNumber(order.total),
    0,
  );
  const previousRevenue = previousValidOrders.reduce(
    (sum, order) => sum + toNumber(order.total),
    0,
  );
  const revenueGrowth = percentChange(currentRevenue, previousRevenue);
  const orderGrowth = percentChange(currentValidOrders.length, previousValidOrders.length);
  const completedOrders = currentOrders.filter((order) =>
    ["completed", "served", "paid"].includes(String(order.status ?? "").toLowerCase()),
  ).length;
  const cancelledOrders = currentOrders.filter((order) =>
    ["cancelled", "canceled"].includes(String(order.status ?? "").toLowerCase()),
  ).length;
  const completionRate = currentOrders.length
    ? (completedOrders / currentOrders.length) * 100
    : 0;
  const cancelledRate = currentOrders.length
    ? (cancelledOrders / currentOrders.length) * 100
    : 0;
  const service = getAverageServiceMinutes(currentOrders);
  const serviceScore =
    service.minutes === null
      ? 70
      : clampScore(100 - Math.max(0, service.minutes - 10) * 3);
  const score = clampScore(
    clampScore(50 + revenueGrowth / 2) * 0.25 +
      clampScore(50 + orderGrowth / 2) * 0.2 +
      completionRate * 0.25 +
      clampScore(100 - cancelledRate * 3) * 0.2 +
      serviceScore * 0.1,
  );
  const status =
    score >= 80 ? "Healthy" : score >= 60 ? "Watch" : "Needs Attention";

  return {
    score,
    status,
    revenueGrowth,
    orderGrowth,
    completionRate,
    cancelledRate,
    serviceMinutes: service.minutes,
    serviceSampleSize: service.sampleSize,
  };
}

export function buildPaymentMix(orders: OrderRow[]) {
  const map = new Map<string, OrderRow[]>();

  orders.filter(isValidSalesOrder).forEach((order) => {
    const key = order.payment_method ?? "Unknown";
    map.set(key, [...(map.get(key) ?? []), order]);
  });

  return Array.from(map.entries())
    .map(([name, rows]) => ({ name, value: rows.length }))
    .sort((a, b) => b.value - a.value);
}
