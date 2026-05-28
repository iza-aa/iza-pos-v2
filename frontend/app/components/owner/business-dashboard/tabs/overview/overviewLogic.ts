import type { DateRangeValue } from "../DateRangeFilter";
import type { OrderRow } from "../shared/dashboardTypes";
import type { BookkeepingSummary } from "@/lib/services/bookkeeping/bookkeepingTypes";
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
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const scorePercentageHigherIsBetter = (value: number | null, target: number, floor = 0) => {
  if (value === null || target <= 0) return null;
  return clampScore(((value - floor) / (target - floor)) * 100);
};

const scorePercentageLowerIsBetter = (value: number | null, healthy: number, risk: number) => {
  if (value === null) return null;
  if (value <= healthy) return 100;
  if (value >= risk) return 0;
  return clampScore(100 - ((value - healthy) / (risk - healthy)) * 100);
};

const scoreGrowth = (value: number | null) => {
  if (value === null) return null;
  return clampScore(50 + value / 2);
};

const scoreMovement = (
  current: number,
  previous: number,
  {
    noCurrentScore = 0,
    newActivityScore = 55,
  }: { noCurrentScore?: number; newActivityScore?: number } = {},
) => {
  if (current <= 0) return noCurrentScore;
  if (previous <= 0) return newActivityScore;
  return scoreGrowth(percentChange(current, previous));
};

const averageScores = (scores: Array<number | null>) => {
  const availableScores = scores.filter((score): score is number => score !== null);
  if (!availableScores.length) return null;
  return availableScores.reduce((sum, score) => sum + score, 0) / availableScores.length;
};

const getScoreLabel = (score: number | null) => {
  if (score === null) return "No Data";
  if (score >= 80) return "Good";
  if (score >= 60) return "Stable";
  if (score >= 40) return "Watch";
  return "Risk";
};

const getLowestDriver = (drivers: Array<{ label: string; score: number | null }>) => {
  const availableDrivers = drivers.filter(
    (driver): driver is { label: string; score: number } => driver.score !== null,
  );

  if (!availableDrivers.length) return "Data Confidence";

  return availableDrivers.reduce((lowest, driver) =>
    driver.score < lowest.score ? driver : lowest,
  ).label;
};

export type BusinessHealthFinancials = Pick<
  BookkeepingSummary,
  "grossSales" | "discounts" | "estimatedCogs" | "netProfitEstimate"
>;

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
  financials?: BusinessHealthFinancials | null,
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
  const currentAov = currentValidOrders.length ? currentRevenue / currentValidOrders.length : 0;
  const previousAov = previousValidOrders.length ? previousRevenue / previousValidOrders.length : 0;
  const aovGrowth = percentChange(currentAov, previousAov);
  const hasFinancials = Boolean(financials);
  const grossSales = financials?.grossSales ?? currentRevenue;
  const netProfitMargin =
    financials?.netProfitEstimate === null ||
    financials?.netProfitEstimate === undefined ||
    grossSales <= 0
      ? null
      : (financials.netProfitEstimate / grossSales) * 100;
  const foodCostRatio =
    financials?.estimatedCogs === null ||
    financials?.estimatedCogs === undefined ||
    grossSales <= 0
      ? null
      : (financials.estimatedCogs / grossSales) * 100;
  const discountRate =
    hasFinancials && grossSales > 0 ? ((financials?.discounts ?? 0) / grossSales) * 100 : null;
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
      ? currentOrders.length > 0
        ? 40
        : 0
      : clampScore(100 - Math.max(0, service.minutes - 10) * 3);
  const demandScore =
    averageScores([
      scoreMovement(currentRevenue, previousRevenue),
      scoreMovement(currentValidOrders.length, previousValidOrders.length),
    ]) ?? 0;
  const transactionQualityScore =
    currentValidOrders.length > 0
      ? (scoreMovement(currentAov, previousAov, {
          noCurrentScore: 0,
          newActivityScore: 50,
        }) ?? 50)
      : null;
  const profitQualityScore = averageScores([
    scorePercentageHigherIsBetter(netProfitMargin, 20, -10),
    scorePercentageLowerIsBetter(foodCostRatio, 35, 55),
    scorePercentageLowerIsBetter(discountRate, 5, 15),
  ]);
  const operationalFlowScore =
    currentOrders.length > 0
      ? (averageScores([
          completionRate,
          clampScore(100 - cancelledRate * 3),
          serviceScore,
        ]) ?? 0)
      : null;
  const dataConfidenceScore =
    currentValidOrders.length >= 10
      ? 100
      : currentValidOrders.length >= 5
        ? 70
        : currentValidOrders.length >= 3
          ? 50
          : currentValidOrders.length === 2
            ? 35
            : currentValidOrders.length === 1
              ? 25
              : 0;
  const effectiveProfitQualityScore = profitQualityScore ?? 50;
  const effectiveOperationalFlowScore = operationalFlowScore ?? 0;
  const uncappedScore = clampScore(
    demandScore * 0.3 +
      effectiveProfitQualityScore * 0.35 +
      effectiveOperationalFlowScore * 0.25 +
      dataConfidenceScore * 0.1,
  );
  const sampleCap =
    currentValidOrders.length >= 10
      ? 100
      : currentValidOrders.length >= 5
        ? 80
        : currentValidOrders.length >= 3
          ? 65
          : currentValidOrders.length === 2
            ? 55
            : currentValidOrders.length === 1
              ? 45
              : 30;
  const score = Math.min(uncappedScore, sampleCap);
  const confidence =
    currentValidOrders.length >= 10
      ? "Reliable"
      : currentValidOrders.length >= 5
        ? "Moderate"
        : currentValidOrders.length > 0
          ? "Low Data"
          : "No Signal";
  const status =
    currentValidOrders.length > 0 && currentValidOrders.length < 5
      ? "Low Data"
      : score >= 80
        ? "Healthy"
        : score >= 60
          ? "Watch"
          : "Needs Attention";

  return {
    score,
    status,
    confidence,
    weakestDriver: getLowestDriver([
      { label: "Demand", score: demandScore },
      { label: "Transaction Quality", score: transactionQualityScore },
      { label: "Profit Quality", score: profitQualityScore },
      { label: "Operational Flow", score: operationalFlowScore },
    ]),
    validOrderCount: currentValidOrders.length,
    totalOrderCount: currentOrders.length,
    dataConfidenceScore,
    demandScore,
    transactionQualityScore,
    profitQualityScore,
    operationalFlowScore,
    averageOrderValue: currentAov,
    aovGrowth,
    netProfitEstimate: financials?.netProfitEstimate ?? null,
    netProfitMargin,
    foodCostRatio,
    discountRate,
    revenueGrowth,
    orderGrowth,
    completionRate,
    cancelledRate,
    serviceMinutes: service.minutes,
    serviceSampleSize: service.sampleSize,
    labels: {
      demand: getScoreLabel(demandScore),
      transactionQuality: getScoreLabel(transactionQualityScore),
      profitQuality: getScoreLabel(profitQualityScore),
      operationalFlow: getScoreLabel(operationalFlowScore),
    },
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
