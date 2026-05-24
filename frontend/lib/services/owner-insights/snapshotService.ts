import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  addDaysToDateString,
  getJakartaLocalDate,
} from "./date";
import type { OwnerInsightCategory } from "./insightSchema";
import { buildCustomerRecommendationSnapshot } from "./customerSnapshotBuilder";
import { buildOverviewRecommendationSnapshot } from "./overviewSnapshotBuilder";
import { buildSalesRecommendationSnapshot } from "./salesSnapshotBuilder";
import type { OwnerInsightPeriod } from "./recommendationSnapshotTypes";

export type { OwnerInsightPeriod } from "./recommendationSnapshotTypes";

type OrderRow = {
  id: string;
  order_number?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  total?: number | string | null;
  discount?: number | string | null;
  order_date?: string | null;
  order_time?: string | null;
  created_at?: string | null;
  customer_id?: string | null;
  fulfillment_method?: string | null;
  reward_redemption_id?: string | null;
  completed_at?: string | null;
  ready_at?: string | null;
  served_at?: string | null;
  created_by?: string | null;
};

type OrderItemRow = {
  order_id?: string | null;
  product_name?: string | null;
  quantity?: number | string | null;
  total_price?: number | string | null;
  ready_at?: string | null;
  served_at?: string | null;
  served_by?: string | null;
};

type ProductRow = {
  id: string;
  name?: string | null;
  stock?: number | string | null;
  available?: boolean | null;
  type?: string | null;
};

type RewardRow = {
  id: string;
  name?: string | null;
  is_active?: boolean | null;
  used_count?: number | null;
  points_required?: number | null;
};

type RedemptionRow = {
  id: string;
  status?: string | null;
  points_spent?: number | null;
  redeemed_at?: string | null;
  used_at?: string | null;
};

type PointTransactionRow = {
  transaction_type?: string | null;
  points?: number | null;
};

type InventoryItemRow = {
  id: string;
  name?: string | null;
  current_stock?: number | string | null;
  reorder_level?: number | string | null;
  unit?: string | null;
  category?: string | null;
};

type AttendanceRow = {
  id: string;
  clock_in_at?: string | null;
  clock_out_at?: string | null;
  check_in_status?: string | null;
  check_out_status?: string | null;
  staff_id?: string | null;
  shift_id?: string | null;
};

const OWNER_INSIGHT_PROMPT_VERSION = "v10";

const cancelledStatuses = new Set(["cancelled", "canceled", "void", "refunded"]);
const invalidPaymentStatuses = new Set(["cancelled", "canceled", "failed", "refunded", "void", "unpaid", "pending"]);

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

const getOrderDate = (order: OrderRow) => {
  return getJakartaDateParts(order.created_at)?.date || String(order.order_date ?? "");
};

const getOrderHour = (order: OrderRow) => {
  const localHour = getJakartaDateParts(order.created_at)?.hour;
  if (localHour) return localHour;

  if (order.order_time) return String(order.order_time).slice(0, 2).padStart(2, "0");
  return "00";
};

const isValidSalesOrder = (order: OrderRow) => {
  const status = String(order.status ?? "").toLowerCase();
  const payment = String(order.payment_status ?? "").toLowerCase();
  if (cancelledStatuses.has(status)) return false;
  if (invalidPaymentStatuses.has(payment)) return false;
  return true;
};

const getMinutesBetween = (start: string | null | undefined, end: string | null | undefined) => {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  const minutes = (endTime - startTime) / 60_000;
  if (minutes < 0 || minutes > 240) return null;
  return minutes;
};

const toNumber = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const percentChange = (today: number, yesterday: number) => {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return ((today - yesterday) / yesterday) * 100;
};

const groupBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  });
  return map;
};

const isDateString = (value: string | undefined) =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

export const buildOwnerInsightPeriodKey = (period?: OwnerInsightPeriod) => {
  if (!period || !isDateString(period.startDate) || !isDateString(period.endDate)) {
    return `today_vs_yesterday_${OWNER_INSIGHT_PROMPT_VERSION}`;
  }

  return `${period.startDate}_${period.endDate}_${OWNER_INSIGHT_PROMPT_VERSION}`;
};

const getPeriodLabel = (period: OwnerInsightPeriod) =>
  period.startDate === period.endDate
    ? period.startDate
    : `${period.startDate} to ${period.endDate}`;

const getSnapshotPeriod = (period?: OwnerInsightPeriod): OwnerInsightPeriod => {
  if (
    period &&
    isDateString(period.startDate) &&
    isDateString(period.endDate) &&
    period.startDate <= period.endDate
  ) {
    return period;
  }

  const today = getJakartaLocalDate();
  return { startDate: today, endDate: today };
};

const getDateDistance = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
};

const getPreviousSnapshotPeriod = (period: OwnerInsightPeriod): OwnerInsightPeriod => {
  const length = getDateDistance(period.startDate, period.endDate) + 1;
  const endDate = addDaysToDateString(period.startDate, -1);
  const startDate = addDaysToDateString(endDate, -(length - 1));
  return { startDate, endDate };
};

const isDateInPeriod = (date: string, period: OwnerInsightPeriod) =>
  date >= period.startDate && date <= period.endDate;

const isOrderInPeriod = (order: OrderRow, period: OwnerInsightPeriod) =>
  isDateInPeriod(getOrderDate(order), period);

export function createOwnerInsightSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Owner AI recommendations require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function safeSelect<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
) {
  const { data, error } = await supabase.from(table).select(select);

  if (error) {
    return { rows: [] as T[], error: error.message };
  }

  return { rows: (data ?? []) as T[], error: null };
}

async function getSalesSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
) {
  const period = getSnapshotPeriod(insightPeriod);
  const previousPeriod = getPreviousSnapshotPeriod(period);
  const periodContext = {
    selectedPeriod: period,
    selectedPeriodLabel: getPeriodLabel(period),
    comparisonPeriod: previousPeriod,
    comparisonPeriodLabel: getPeriodLabel(previousPeriod),
    timezone: "Asia/Jakarta",
  };

  const ordersResult = await safeSelect<OrderRow>(
    supabase,
    "orders",
    "id,order_number,status,payment_status,payment_method,total,discount,order_date,order_time,created_at,customer_id,fulfillment_method,reward_redemption_id",
  );
  const orders = ordersResult.rows.filter(
    (order) => isOrderInPeriod(order, period) || isOrderInPeriod(order, previousPeriod),
  );
  const validOrders = orders.filter(isValidSalesOrder);

  const currentOrders = validOrders.filter((order) => isOrderInPeriod(order, period));
  const previousOrders = validOrders.filter((order) => isOrderInPeriod(order, previousPeriod));
  const currentIds = new Set(currentOrders.map((order) => order.id));
  const previousIds = new Set(previousOrders.map((order) => order.id));

  const itemsResult = await safeSelect<OrderItemRow>(
    supabase,
    "order_items",
    "order_id,product_name,quantity,total_price",
  );

  const summarizeOrders = (rows: OrderRow[]) => {
    const revenue = rows.reduce((sum, order) => sum + toNumber(order.total), 0);
    return {
      revenue,
      orderCount: rows.length,
      averageOrderValue: rows.length ? revenue / rows.length : 0,
    };
  };

  const topProducts = Array.from(
    groupBy(
      itemsResult.rows.filter((item) => item.order_id && currentIds.has(item.order_id)),
      (item) => item.product_name || "Unknown",
    ).entries(),
  )
    .map(([name, rows]) => ({
      name,
      quantity: rows.reduce((sum, row) => sum + toNumber(row.quantity), 0),
      revenue: rows.reduce((sum, row) => sum + toNumber(row.total_price), 0),
    }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5);

  const weakProducts = Array.from(
    groupBy(
      itemsResult.rows.filter((item) => item.order_id && previousIds.has(item.order_id)),
      (item) => item.product_name || "Unknown",
    ).entries(),
  )
    .map(([name, rows]) => ({
      name,
      comparisonQuantity: rows.reduce((sum, row) => sum + toNumber(row.quantity), 0),
      selectedPeriodQuantity:
        topProducts.find((product) => product.name === name)?.quantity ?? 0,
    }))
    .filter((product) => product.comparisonQuantity > product.selectedPeriodQuantity)
    .slice(0, 5);

  const paymentMix = Array.from(
    groupBy(currentOrders, (order) => order.payment_method || "Unknown").entries(),
  ).map(([method, rows]) => ({
    method,
    count: rows.length,
    revenue: rows.reduce((sum, row) => sum + toNumber(row.total), 0),
  }));

  const peakHours = Array.from(
    groupBy(currentOrders, getOrderHour).entries(),
  )
    .map(([hour, rows]) => ({ hour: `${hour}:00`, orders: rows.length }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 3);

  const currentSummary = summarizeOrders(currentOrders);
  const previousSummary = summarizeOrders(previousOrders);

  return {
    period: periodContext,
    errors: [ordersResult.error, itemsResult.error].filter(Boolean),
    selectedPeriodSummary: currentSummary,
    comparisonPeriodSummary: previousSummary,
    changes: {
      revenuePct: percentChange(currentSummary.revenue, previousSummary.revenue),
      orderCountPct: percentChange(currentSummary.orderCount, previousSummary.orderCount),
      aovPct: percentChange(
        currentSummary.averageOrderValue,
        previousSummary.averageOrderValue,
      ),
    },
    topProducts,
    weakProducts,
    paymentMix,
    peakHours,
  };
}

async function getRewardsSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
) {
  const period = getSnapshotPeriod(insightPeriod);
  const previousPeriod = getPreviousSnapshotPeriod(period);
  const periodContext = {
    selectedPeriod: period,
    selectedPeriodLabel: getPeriodLabel(period),
    comparisonPeriod: previousPeriod,
    comparisonPeriodLabel: getPeriodLabel(previousPeriod),
    timezone: "Asia/Jakarta",
  };
  const rewardsResult = await safeSelect<RewardRow>(
    supabase,
    "rewards",
    "id,name,is_active,used_count,points_required",
  );
  const redemptionsResult = await safeSelect<RedemptionRow>(
    supabase,
    "customer_reward_redemptions",
    "id,status,points_spent,redeemed_at,used_at",
  );
  const pointResult = await safeSelect<PointTransactionRow>(
    supabase,
    "customer_point_transactions",
    "transaction_type,points",
  );
  const ordersResult = await safeSelect<OrderRow>(
    supabase,
    "orders",
    "id,total,discount,customer_id,reward_redemption_id,payment_status,status,order_date",
  );

  const paidOrders = ordersResult.rows.filter(isValidSalesOrder);
  const currentOrders = paidOrders.filter((order) => isOrderInPeriod(order, period));
  const previousOrders = paidOrders.filter((order) => isOrderInPeriod(order, previousPeriod));
  const memberOrders = currentOrders.filter((order) => Boolean(order.customer_id));
  const guestOrders = currentOrders.filter((order) => !order.customer_id);
  const rewardOrders = currentOrders.filter((order) => Boolean(order.reward_redemption_id));
  const uniqueMemberIds = new Set(memberOrders.map((order) => order.customer_id).filter(Boolean));
  const lifetimeMemberGroups = groupBy(
    paidOrders.filter((order) => Boolean(order.customer_id) && getOrderDate(order) <= period.endDate),
    (order) => order.customer_id ?? "unknown",
  );
  const repeatCustomers = Array.from(uniqueMemberIds).filter(
    (customerId) => (lifetimeMemberGroups.get(customerId ?? "")?.length ?? 0) >= 2,
  ).length;

  return {
    period: periodContext,
    errors: [
      rewardsResult.error,
      redemptionsResult.error,
      pointResult.error,
      ordersResult.error,
    ].filter(Boolean),
    rewards: {
      total: rewardsResult.rows.length,
      active: rewardsResult.rows.filter((reward) => reward.is_active).length,
      topUsed: rewardsResult.rows
        .map((reward) => ({
          name: reward.name ?? "Reward",
          usedCount: reward.used_count ?? 0,
          pointsRequired: reward.points_required ?? 0,
        }))
        .sort((a, b) => b.usedCount - a.usedCount)
        .slice(0, 5),
    },
    redemptions: {
      available: redemptionsResult.rows.filter((row) => row.status === "available").length,
      used: redemptionsResult.rows.filter((row) => row.status === "used").length,
      expired: redemptionsResult.rows.filter((row) => row.status === "expired").length,
      cancelled: redemptionsResult.rows.filter((row) => row.status === "cancelled").length,
    },
    points: {
      earned: pointResult.rows
        .filter((row) => row.transaction_type === "earned")
        .reduce((sum, row) => sum + toNumber(row.points), 0),
      redeemed: Math.abs(
        pointResult.rows
          .filter((row) => row.transaction_type === "redeemed")
          .reduce((sum, row) => sum + toNumber(row.points), 0),
      ),
    },
    selectedPeriodFinancials: {
      memberRevenue: memberOrders.reduce((sum, row) => sum + toNumber(row.total), 0),
      guestRevenue: guestOrders.reduce((sum, row) => sum + toNumber(row.total), 0),
      rewardOrderCount: rewardOrders.length,
      discountCost: currentOrders.reduce((sum, row) => sum + toNumber(row.discount), 0),
      memberAov: memberOrders.length
        ? memberOrders.reduce((sum, row) => sum + toNumber(row.total), 0) / memberOrders.length
        : 0,
      guestAov: guestOrders.length
        ? guestOrders.reduce((sum, row) => sum + toNumber(row.total), 0) / guestOrders.length
        : 0,
      repeatCustomerRate: uniqueMemberIds.size ? (repeatCustomers / uniqueMemberIds.size) * 100 : 0,
      rewardUsageRate: currentOrders.length ? (rewardOrders.length / currentOrders.length) * 100 : 0,
      comparisonPeriodOrderCount: previousOrders.length,
    },
  };
}

async function getInventorySnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
) {
  const period = getSnapshotPeriod(insightPeriod);
  const periodContext = {
    selectedPeriod: period,
    selectedPeriodLabel: getPeriodLabel(period),
    timezone: "Asia/Jakarta",
  };
  const productsResult = await safeSelect<ProductRow>(
    supabase,
    "products",
    "id,name,stock,available,type",
  );
  const inventoryResult = await safeSelect<InventoryItemRow>(
    supabase,
    "inventory_items",
    "id,name,current_stock,reorder_level,unit,category",
  );

  const lowStockProducts = productsResult.rows
    .filter((product) => toNumber(product.stock) <= 5)
    .map((product) => ({
      name: product.name ?? "Product",
      stock: toNumber(product.stock),
      available: product.available ?? false,
    }))
    .slice(0, 8);

  const lowStockMaterials = inventoryResult.rows
    .filter((item) => toNumber(item.current_stock) <= toNumber(item.reorder_level))
    .map((item) => ({
      name: item.name ?? "Inventory item",
      currentStock: toNumber(item.current_stock),
      reorderLevel: toNumber(item.reorder_level),
      unit: item.unit ?? "",
    }))
    .slice(0, 8);

  return {
    period: periodContext,
    errors: [productsResult.error, inventoryResult.error].filter(Boolean),
    products: {
      total: productsResult.rows.length,
      unavailable: productsResult.rows.filter((product) => product.available === false).length,
      lowStock: lowStockProducts,
    },
    rawMaterials: {
      total: inventoryResult.rows.length,
      lowStock: lowStockMaterials,
      outOfStock: inventoryResult.rows.filter((item) => toNumber(item.current_stock) <= 0).length,
    },
  };
}

async function getStaffSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
) {
  const period = getSnapshotPeriod(insightPeriod);
  const periodContext = {
    selectedPeriod: period,
    selectedPeriodLabel: getPeriodLabel(period),
    timezone: "Asia/Jakarta",
  };
  const staffResult = await safeSelect<{ id: string; name?: string; status?: string; role?: string; shift_id?: string | null }>(
    supabase,
    "staff",
    "id,name,status,role,shift_id",
  );
  const attendanceResult = await safeSelect<AttendanceRow>(
    supabase,
    "attendance",
    "id,staff_id,shift_id,clock_in_at,clock_out_at,check_in_status,check_out_status,attendance_date",
  );
  const currentAttendance = attendanceResult.rows.filter((row) =>
    isDateInPeriod(
      String((row as AttendanceRow & { attendance_date?: string }).attendance_date ?? ""),
      period,
    ),
  );
  const activeStaff = staffResult.rows.filter(
    (row) => row.status === "active" && String(row.role ?? "").toLowerCase() !== "owner",
  );
  const ordersResult = await safeSelect<OrderRow>(
    supabase,
    "orders",
    "id,status,payment_status,order_date,created_at,created_by",
  );
  const orderItemsResult = await safeSelect<OrderItemRow>(
    supabase,
    "order_items",
    "order_id,ready_at,served_at,served_by",
  );
  const currentOrders = ordersResult.rows.filter((order) => isOrderInPeriod(order, period));
  const handledByStaff = new Map<string, Set<string>>();
  currentOrders.forEach((order) => {
    if (!order.created_by) return;
    handledByStaff.set(order.created_by, handledByStaff.get(order.created_by) ?? new Set());
    handledByStaff.get(order.created_by)?.add(order.id);
  });
  const currentOrderIds = new Set(currentOrders.map((order) => order.id));
  orderItemsResult.rows.forEach((item) => {
    if (!item.order_id || !item.served_by || !currentOrderIds.has(item.order_id)) return;
    handledByStaff.set(item.served_by, handledByStaff.get(item.served_by) ?? new Set());
    handledByStaff.get(item.served_by)?.add(item.order_id);
  });
  const serviceDurations = orderItemsResult.rows
    .filter((item) => item.order_id && currentOrderIds.has(item.order_id))
    .map((item) => getMinutesBetween(item.ready_at, item.served_at))
    .filter((minutes): minutes is number => minutes !== null);

  return {
    period: periodContext,
    errors: [staffResult.error, attendanceResult.error, ordersResult.error, orderItemsResult.error].filter(Boolean),
    staff: {
      active: activeStaff.length,
      withoutShift: activeStaff.filter((row) => !row.shift_id).length,
    },
    attendance: {
      records: currentAttendance.length,
      clockedIn: currentAttendance.filter((row) => row.clock_in_at).length,
      clockedOut: currentAttendance.filter((row) => row.clock_out_at).length,
      late: currentAttendance.filter((row) => row.check_in_status === "late").length,
      earlyLeave: currentAttendance.filter((row) => row.check_out_status === "early_leave").length,
      overtime: currentAttendance.filter((row) => row.check_out_status === "overtime").length,
    },
    productivity: {
      staffWithOrderAttribution: Array.from(handledByStaff.values()).filter((set) => set.size > 0).length,
      totalAttributedOrders: Array.from(handledByStaff.values()).reduce((sum, set) => sum + set.size, 0),
      averageServiceMinutes: serviceDurations.length
        ? serviceDurations.reduce((sum, minutes) => sum + minutes, 0) / serviceDurations.length
        : null,
      serviceSampleSize: serviceDurations.length,
    },
  };
}

async function getOperationsSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
) {
  const period = getSnapshotPeriod(insightPeriod);
  const periodContext = {
    selectedPeriod: period,
    selectedPeriodLabel: getPeriodLabel(period),
    timezone: "Asia/Jakarta",
  };
  const ordersResult = await safeSelect<OrderRow>(
    supabase,
    "orders",
    "id,status,payment_status,fulfillment_method,total,order_date,created_at",
  );
  const currentOrders = ordersResult.rows.filter((order) => isOrderInPeriod(order, period));

  const countBy = (key: keyof OrderRow) =>
    Array.from(groupBy(currentOrders, (order) => String(order[key] ?? "unknown")).entries()).map(
      ([label, rows]) => ({ label, count: rows.length }),
    );

  return {
    period: periodContext,
    errors: [ordersResult.error].filter(Boolean),
    orders: {
      total: currentOrders.length,
      statusDistribution: countBy("status"),
      paymentDistribution: countBy("payment_status"),
      fulfillmentDistribution: countBy("fulfillment_method"),
      unpaid: currentOrders.filter((order) => String(order.payment_status ?? "").toLowerCase() === "unpaid").length,
      active: currentOrders.filter((order) =>
        ["new", "preparing", "on-process", "partially-served"].includes(String(order.status ?? "")),
      ).length,
      completed: currentOrders.filter((order) =>
        ["served", "completed"].includes(String(order.status ?? "").toLowerCase()),
      ).length,
    },
  };
}

export async function buildOwnerInsightSnapshot(
  category: OwnerInsightCategory,
  insightPeriod?: OwnerInsightPeriod,
  supabase = createOwnerInsightSupabaseClient(),
): Promise<Record<string, unknown>> {
  if (category === "overview") {
    return buildOverviewRecommendationSnapshot(supabase, insightPeriod);
  }
  if (category === "sales") {
    return buildSalesRecommendationSnapshot(supabase, insightPeriod);
  }
  if (category === "rewards") {
    return buildCustomerRecommendationSnapshot(supabase, insightPeriod);
  }
  if (category === "inventory") return getInventorySnapshot(supabase, insightPeriod);
  if (category === "staff") return getStaffSnapshot(supabase, insightPeriod);
  if (category === "operations") return getOperationsSnapshot(supabase, insightPeriod);

  const [sales, rewards, inventory, staff, operations] = await Promise.all([
    getSalesSnapshot(supabase, insightPeriod),
    getRewardsSnapshot(supabase, insightPeriod),
    getInventorySnapshot(supabase, insightPeriod),
    getStaffSnapshot(supabase, insightPeriod),
    getOperationsSnapshot(supabase, insightPeriod),
  ]);

  return { sales, rewards, inventory, staff, operations };
}
