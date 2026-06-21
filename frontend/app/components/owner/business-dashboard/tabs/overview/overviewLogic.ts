import type { DateRangeValue } from "../DateRangeFilter";
import type { DashboardData, OrderRow } from "../shared/dashboardTypes";
import type { BookkeepingSummary } from "@/lib/services/bookkeeping/bookkeepingTypes";
import {
  getBusinessDateFromTimestamp,
  getDatesBetween,
  getOrderBusinessDate,
  getOrderBusinessHour,
  isValidSalesOrder,
  toNumber,
} from "../shared/dashboardUtils";

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
  "grossSales" | "netSales" | "discounts" | "estimatedCogs" | "netProfitEstimate"
>;

export type BusinessAreaOverview = {
  sales: {
    netSales: number;
    validOrders: number;
    averageOrderValue: number;
    discountRate: number | null;
    previousNetSales: number;
    previousValidOrders: number;
    score: number;
  };
  customer: {
    validOrders: number;
    repeatCustomerRate: number;
    memberShare: number;
    discountRatio: number;
    score: number;
  };
  inventory: {
    criticalItems: number;
    totalItems: number;
    dataIssues: number;
    pendingReports: number;
    score: number;
  };
  staff: {
    activeStaff: number;
    attendanceRecords: number;
    attendanceRate: number;
    lateRate: number;
    overtimeRate: number;
    score: number;
  };
  operations: {
    totalOrders: number;
    completionRate: number;
    cancelledRate: number;
    serviceMinutes: number | null;
    serviceSampleSize: number;
    score: number;
  };
};

export type BusinessAreaTrendRow = {
  label: string;
  sales: number;
  customer: number;
  inventory: number;
  staff: number;
  operations: number;
};

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

const isCancelledOrder = (status: string | null | undefined) =>
  ["cancelled", "canceled", "void", "refunded"].includes(
    String(status ?? "").toLowerCase(),
  );

const isCompletedOrder = (status: string | null | undefined) =>
  ["completed", "served", "paid"].includes(String(status ?? "").toLowerCase());

const getOrdersInRange = (orders: OrderRow[], range: DateRangeValue) =>
  orders.filter((order) => {
    const date = getOrderBusinessDate(order);
    return date >= range.startDate && date <= range.endDate;
  });

const getValidOrdersInRange = (orders: OrderRow[], range: DateRangeValue) =>
  getOrdersInRange(orders, range).filter(isValidSalesOrder);

const getSalesSummaryFromOrders = (orders: OrderRow[]) => {
  const revenue = orders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const discounts = orders.reduce((sum, order) => sum + toNumber(order.discount), 0);

  return {
    revenue,
    discounts,
    orderCount: orders.length,
    averageOrderValue: orders.length ? revenue / orders.length : 0,
    discountRate: revenue > 0 ? (discounts / revenue) * 100 : null,
  };
};

const getCustomerSummary = (allOrders: OrderRow[], range: DateRangeValue) => {
  const validOrders = allOrders.filter(isValidSalesOrder);
  const rangeOrders = getOrdersInRange(validOrders, range);
  const memberOrders = rangeOrders.filter((order) => Boolean(order.customer_id));
  const activeCustomerIds = new Set(
    memberOrders.map((order) => order.customer_id).filter(Boolean),
  );
  const lifetimeByCustomer = new Map<string, number>();

  validOrders
    .filter((order) => getOrderBusinessDate(order) <= range.endDate)
    .forEach((order) => {
      const customerId = order.customer_id;
      if (!customerId) return;
      lifetimeByCustomer.set(customerId, (lifetimeByCustomer.get(customerId) ?? 0) + 1);
    });

  const repeatCustomers = Array.from(activeCustomerIds).filter(
    (customerId) => (lifetimeByCustomer.get(customerId ?? "") ?? 0) >= 2,
  ).length;
  const revenue = rangeOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const discountCost = rangeOrders.reduce((sum, order) => sum + toNumber(order.discount), 0);

  return {
    validOrders: rangeOrders.length,
    repeatCustomerRate: activeCustomerIds.size
      ? (repeatCustomers / activeCustomerIds.size) * 100
      : 0,
    memberShare: rangeOrders.length ? (memberOrders.length / rangeOrders.length) * 100 : 0,
    discountRatio: revenue ? (discountCost / revenue) * 100 : 0,
  };
};

const getInventoryCriticalCount = (data: DashboardData) =>
  data.inventoryItems.filter((item) => {
    const current = toNumber(item.current_stock);
    const minimum = toNumber(item.reorder_level);
    return minimum > 0 && current <= minimum;
  }).length;

const getInventoryDataIssueCount = (data: DashboardData) =>
  data.inventoryItems.filter((item) => {
    const current = toNumber(item.current_stock);
    const minimum = toNumber(item.reorder_level);
    return current < 0 || minimum <= 0 || !item.unit;
  }).length;

const isPendingStockReport = (status: string | null | undefined) => {
  const normalized = String(status ?? "").toLowerCase();
  return !["resolved", "closed", "approved", "completed", "done"].includes(normalized);
};

const getStaffSummary = (data: DashboardData, range: DateRangeValue) => {
  const activeStaff = data.staff.filter((staff) => staff.status !== "inactive");
  const activeStaffIds = new Set(activeStaff.map((staff) => staff.id));
  const attendance = data.attendance.filter(
    (row) =>
      row.attendance_date &&
      row.attendance_date >= range.startDate &&
      row.attendance_date <= range.endDate &&
      row.staff_id &&
      activeStaffIds.has(row.staff_id),
  );
  const operatingDays = new Set(attendance.map((row) => row.attendance_date).filter(Boolean)).size;
  const expectedRecords = activeStaff.length * operatingDays;
  const clockedIn = attendance.filter((row) => row.clock_in_at).length;
  const late = attendance.filter((row) => row.check_in_status === "late").length;
  const overtime = attendance.filter((row) => row.check_out_status === "overtime").length;

  return {
    activeStaff: activeStaff.length,
    attendanceRecords: attendance.length,
    attendanceRate: expectedRecords ? (clockedIn / expectedRecords) * 100 : 0,
    lateRate: attendance.length ? (late / attendance.length) * 100 : 0,
    overtimeRate: attendance.length ? (overtime / attendance.length) * 100 : 0,
  };
};

const getOperationsSummary = (orders: OrderRow[]) => {
  const completedOrders = orders.filter((order) => isCompletedOrder(order.status));
  const cancelledOrders = orders.filter((order) => isCancelledOrder(order.status));
  const service = getAverageServiceMinutes(orders);

  return {
    totalOrders: orders.length,
    completionRate: orders.length ? (completedOrders.length / orders.length) * 100 : 0,
    cancelledRate: orders.length ? (cancelledOrders.length / orders.length) * 100 : 0,
    serviceMinutes: service.minutes,
    serviceSampleSize: service.sampleSize,
  };
};

export function buildBusinessAreaOverview(
  data: DashboardData,
  range: DateRangeValue,
  previousRange: DateRangeValue,
  financials?: BusinessHealthFinancials | null,
): BusinessAreaOverview {
  const currentValidOrders = getValidOrdersInRange(data.orders, range);
  const previousValidOrders = getValidOrdersInRange(data.orders, previousRange);
  const sales = getSalesSummaryFromOrders(currentValidOrders);
  const previousSales = getSalesSummaryFromOrders(previousValidOrders);
  const netSales = financials?.netSales ?? (
    financials?.grossSales
      ? financials.grossSales - (financials.discounts ?? 0)
      : sales.revenue
  );
  const discountRate = financials?.grossSales
    ? ((financials.discounts ?? 0) / financials.grossSales) * 100
    : sales.discountRate;
  const customer = getCustomerSummary(data.orders, range);
  const criticalItems = getInventoryCriticalCount(data);
  const dataIssues = getInventoryDataIssueCount(data);
  const pendingReports = data.stockReports.filter((report) =>
    isPendingStockReport(report.status),
  ).length;
  const staff = getStaffSummary(data, range);
  const ordersInRange = getOrdersInRange(data.orders, range);
  const operations = getOperationsSummary(ordersInRange);
  const inventoryTotal = data.inventoryItems.length;
  const stockRiskRatio = inventoryTotal ? (criticalItems / inventoryTotal) * 100 : 0;
  const dataIssueRatio = inventoryTotal ? (dataIssues / inventoryTotal) * 100 : 0;
  const pendingReportRatio = inventoryTotal ? (pendingReports / inventoryTotal) * 100 : 0;
  const serviceScore =
    operations.serviceMinutes === null
      ? ordersInRange.length > 0
        ? 40
        : 0
      : clampScore(100 - Math.max(0, operations.serviceMinutes - 10) * 3);

  return {
    sales: {
      netSales,
      validOrders: currentValidOrders.length,
      averageOrderValue: sales.averageOrderValue,
      discountRate,
      previousNetSales: previousSales.revenue,
      previousValidOrders: previousValidOrders.length,
      score: averageScores([
        scoreMovement(netSales, previousSales.revenue),
        scoreMovement(currentValidOrders.length, previousValidOrders.length),
        scorePercentageLowerIsBetter(discountRate, 5, 15),
      ]) ?? 0,
    },
    customer: {
      ...customer,
      score: averageScores([
        scorePercentageHigherIsBetter(customer.repeatCustomerRate, 35, 0),
        scorePercentageHigherIsBetter(customer.memberShare, 50, 0),
        scorePercentageLowerIsBetter(customer.discountRatio, 5, 15),
      ]) ?? 0,
    },
    inventory: {
      criticalItems,
      totalItems: inventoryTotal,
      dataIssues,
      pendingReports,
      score: averageScores([
        scorePercentageLowerIsBetter(stockRiskRatio, 0, 30),
        scorePercentageLowerIsBetter(dataIssueRatio, 0, 20),
        scorePercentageLowerIsBetter(pendingReportRatio, 0, 15),
      ]) ?? 0,
    },
    staff: {
      ...staff,
      score: averageScores([
        scorePercentageHigherIsBetter(staff.attendanceRate, 95, 50),
        scorePercentageLowerIsBetter(staff.lateRate, 5, 20),
        scorePercentageLowerIsBetter(staff.overtimeRate, 10, 30),
      ]) ?? 0,
    },
    operations: {
      ...operations,
      score: averageScores([
        scorePercentageHigherIsBetter(operations.completionRate, 95, 50),
        scorePercentageLowerIsBetter(operations.cancelledRate, 2, 10),
        serviceScore,
      ]) ?? 0,
    },
  };
}

const getTrendBuckets = (range: DateRangeValue) => {
  if (range.startDate === range.endDate) {
    return Array.from({ length: 24 }, (_, hour) => {
      const hourKey = String(hour).padStart(2, "0");
      return {
        label: `${hourKey}:00`,
        startDate: range.startDate,
        endDate: range.endDate,
        hour: hourKey,
      };
    });
  }

  const dates = getDatesBetween(range.startDate, range.endDate);
  const maxBuckets = 14;
  const step = Math.max(1, Math.ceil(dates.length / maxBuckets));
  const buckets: Array<{
    label: string;
    startDate: string;
    endDate: string;
    hour: string | null;
  }> = [];

  for (let index = 0; index < dates.length; index += step) {
    const bucketDates = dates.slice(index, index + step);
    const first = bucketDates[0];
    const last = bucketDates[bucketDates.length - 1];

    buckets.push({
      label: first === last ? first.slice(5) : `${first.slice(5)}-${last.slice(5)}`,
      startDate: first,
      endDate: last,
      hour: null,
    });
  }

  return buckets;
};

export function buildBusinessAreaTrends(
  data: DashboardData,
  range: DateRangeValue,
): BusinessAreaTrendRow[] {
  const activeStaffIds = new Set(
    data.staff.filter((staff) => staff.status !== "inactive").map((staff) => staff.id),
  );
  const totalInventoryItems = Math.max(1, data.inventoryItems.length);

  const rows = getTrendBuckets(range).map((bucket) => {
    const bucketOrders = data.orders.filter((order) => {
      const date = getOrderBusinessDate(order);
      const hour = getOrderBusinessHour(order);

      return (
        date >= bucket.startDate &&
        date <= bucket.endDate &&
        (!bucket.hour || hour === bucket.hour)
      );
    });
    const validOrders = bucketOrders.filter(isValidSalesOrder);
    const salesRevenue = validOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
    const customer = getCustomerSummary(data.orders, {
      startDate: bucket.startDate,
      endDate: bucket.endDate,
    });
    const stockRiskReports = data.stockReports.filter((report) => {
      const date = getBusinessDateFromTimestamp(report.created_at);
      return (
        date >= bucket.startDate &&
        date <= bucket.endDate &&
        isPendingStockReport(report.status)
      );
    }).length;
    const attendance = data.attendance.filter(
      (row) =>
        row.attendance_date &&
        row.attendance_date >= bucket.startDate &&
        row.attendance_date <= bucket.endDate &&
        row.staff_id &&
        activeStaffIds.has(row.staff_id),
    );
    const attendanceDays = new Set(attendance.map((row) => row.attendance_date).filter(Boolean)).size;
    const expectedAttendance = activeStaffIds.size * attendanceDays;
    const attendanceRate = expectedAttendance
      ? (attendance.filter((row) => row.clock_in_at).length / expectedAttendance) * 100
      : 0;
    const operations = getOperationsSummary(bucketOrders);

    return {
      label: bucket.label,
      salesRevenue,
      customer: clampScore(customer.repeatCustomerRate),
      inventory: clampScore(100 - (stockRiskReports / totalInventoryItems) * 100),
      staff: clampScore(attendanceRate),
      operations: clampScore(operations.completionRate),
    };
  });
  const highestSalesRevenue = Math.max(0, ...rows.map((row) => row.salesRevenue));

  return rows.map(({ salesRevenue, ...row }) => ({
    ...row,
    sales: highestSalesRevenue
      ? clampScore((salesRevenue / highestSalesRevenue) * 100)
      : 0,
  }));
}

export function buildBusinessHealth(
  currentOrders: OrderRow[],
  previousOrders: OrderRow[],
  financials?: BusinessHealthFinancials | null,
  areas?: BusinessAreaOverview | null,
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
  const availableAreaCount = areas
    ? [
        areas.sales.validOrders > 0,
        areas.customer.validOrders > 0,
        areas.inventory.totalItems > 0,
        areas.staff.activeStaff > 0 && areas.staff.attendanceRecords > 0,
        areas.operations.totalOrders > 0,
      ].filter(Boolean).length
    : 0;
  const dataConfidenceScore = areas
    ? availableAreaCount * 20
    : currentValidOrders.length >= 10
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
  const effectiveTransactionQualityScore = transactionQualityScore ?? 0;
  const salesAreaScore = areas?.sales.score ?? demandScore;
  const customerAreaScore = areas?.customer.score ?? effectiveTransactionQualityScore;
  const inventoryAreaScore = areas?.inventory.score ?? effectiveProfitQualityScore;
  const staffAreaScore = areas?.staff.score ?? dataConfidenceScore;
  const operationsAreaScore = areas?.operations.score ?? effectiveOperationalFlowScore;
  const uncappedScore = areas
    ? clampScore(
        salesAreaScore * 0.25 +
          customerAreaScore * 0.15 +
          inventoryAreaScore * 0.2 +
          staffAreaScore * 0.15 +
          operationsAreaScore * 0.25,
      )
    : clampScore(
        demandScore * 0.25 +
          effectiveTransactionQualityScore * 0.15 +
          effectiveProfitQualityScore * 0.3 +
          effectiveOperationalFlowScore * 0.2 +
          dataConfidenceScore * 0.1,
      );
  const sampleCap = areas
    ? ([30, 45, 60, 75, 90, 100][availableAreaCount] ?? 30)
    : currentValidOrders.length >= 10
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
  const confidence = areas
    ? availableAreaCount === 5
      ? "Reliable"
      : availableAreaCount >= 3
        ? "Moderate"
        : availableAreaCount > 0
          ? "Low Data"
          : "No Signal"
    : currentValidOrders.length >= 10
      ? "Reliable"
      : currentValidOrders.length >= 5
        ? "Moderate"
        : currentValidOrders.length > 0
          ? "Low Data"
          : "No Signal";
  const status =
    (areas ? availableAreaCount > 0 && availableAreaCount < 3 : currentValidOrders.length > 0 && currentValidOrders.length < 5)
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
      { label: "Sales", score: salesAreaScore },
      { label: "Customer", score: customerAreaScore },
      { label: "Inventory", score: inventoryAreaScore },
      { label: "Staff", score: staffAreaScore },
      { label: "Operations", score: operationsAreaScore },
    ]),
    validOrderCount: currentValidOrders.length,
    totalOrderCount: currentOrders.length,
    dataConfidenceScore,
    availableAreaCount,
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
    areas,
    salesAreaScore,
    customerAreaScore,
    inventoryAreaScore,
    staffAreaScore,
    operationsAreaScore,
    labels: {
      sales: getScoreLabel(salesAreaScore),
      customer: getScoreLabel(customerAreaScore),
      inventory: getScoreLabel(inventoryAreaScore),
      staff: getScoreLabel(staffAreaScore),
      operations: getScoreLabel(operationsAreaScore),
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
