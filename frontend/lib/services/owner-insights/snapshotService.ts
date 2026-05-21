import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  addDaysToDateString,
  getJakartaLocalDate,
} from "./date";
import type { OwnerInsightCategory } from "./insightSchema";

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
};

type OrderItemRow = {
  order_id?: string | null;
  product_name?: string | null;
  quantity?: number | string | null;
  total_price?: number | string | null;
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

export function createOwnerInsightSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase URL/key is not configured.");
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

async function getSalesSnapshot(supabase: SupabaseClient) {
  const today = getJakartaLocalDate();
  const yesterday = addDaysToDateString(today, -1);

  const ordersResult = await safeSelect<OrderRow>(
    supabase,
    "orders",
    "id,order_number,status,payment_status,payment_method,total,discount,order_date,order_time,created_at,customer_id,fulfillment_method,reward_redemption_id",
  );
  const orders = ordersResult.rows.filter((order) =>
    [today, yesterday].includes(String(order.order_date ?? "")),
  );
  const validOrders = orders.filter((order) => {
    const status = String(order.status ?? "").toLowerCase();
    const payment = String(order.payment_status ?? "").toLowerCase();
    return status !== "cancelled" && payment !== "unpaid";
  });

  const todayOrders = validOrders.filter((order) => order.order_date === today);
  const yesterdayOrders = validOrders.filter((order) => order.order_date === yesterday);
  const todayIds = new Set(todayOrders.map((order) => order.id));
  const yesterdayIds = new Set(yesterdayOrders.map((order) => order.id));

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
      itemsResult.rows.filter((item) => item.order_id && todayIds.has(item.order_id)),
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
      itemsResult.rows.filter((item) => item.order_id && yesterdayIds.has(item.order_id)),
      (item) => item.product_name || "Unknown",
    ).entries(),
  )
    .map(([name, rows]) => ({
      name,
      yesterdayQuantity: rows.reduce((sum, row) => sum + toNumber(row.quantity), 0),
      todayQuantity:
        topProducts.find((product) => product.name === name)?.quantity ?? 0,
    }))
    .filter((product) => product.yesterdayQuantity > product.todayQuantity)
    .slice(0, 5);

  const paymentMix = Array.from(
    groupBy(todayOrders, (order) => order.payment_method || "Unknown").entries(),
  ).map(([method, rows]) => ({
    method,
    count: rows.length,
    revenue: rows.reduce((sum, row) => sum + toNumber(row.total), 0),
  }));

  const peakHours = Array.from(
    groupBy(todayOrders, (order) => String(order.order_time ?? "00:00").slice(0, 2)).entries(),
  )
    .map(([hour, rows]) => ({ hour: `${hour}:00`, orders: rows.length }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 3);

  const todaySummary = summarizeOrders(todayOrders);
  const yesterdaySummary = summarizeOrders(yesterdayOrders);

  return {
    period: { today, yesterday },
    errors: [ordersResult.error, itemsResult.error].filter(Boolean),
    today: todaySummary,
    yesterday: yesterdaySummary,
    changes: {
      revenuePct: percentChange(todaySummary.revenue, yesterdaySummary.revenue),
      orderCountPct: percentChange(todaySummary.orderCount, yesterdaySummary.orderCount),
      aovPct: percentChange(
        todaySummary.averageOrderValue,
        yesterdaySummary.averageOrderValue,
      ),
    },
    topProducts,
    weakProducts,
    paymentMix,
    peakHours,
  };
}

async function getRewardsSnapshot(supabase: SupabaseClient) {
  const today = getJakartaLocalDate();
  const yesterday = addDaysToDateString(today, -1);
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

  const paidOrders = ordersResult.rows.filter((order) => {
    const payment = String(order.payment_status ?? "").toLowerCase();
    return payment === "paid" || payment === "completed";
  });
  const todayOrders = paidOrders.filter((order) => order.order_date === today);
  const memberOrders = todayOrders.filter((order) => Boolean(order.customer_id));
  const guestOrders = todayOrders.filter((order) => !order.customer_id);
  const rewardOrders = todayOrders.filter((order) => Boolean(order.reward_redemption_id));

  return {
    period: { today, yesterday },
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
    todayFinancials: {
      memberRevenue: memberOrders.reduce((sum, row) => sum + toNumber(row.total), 0),
      guestRevenue: guestOrders.reduce((sum, row) => sum + toNumber(row.total), 0),
      rewardOrderCount: rewardOrders.length,
      discountCost: todayOrders.reduce((sum, row) => sum + toNumber(row.discount), 0),
    },
  };
}

async function getInventorySnapshot(supabase: SupabaseClient) {
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

async function getStaffSnapshot(supabase: SupabaseClient) {
  const today = getJakartaLocalDate();
  const staffResult = await safeSelect<{ id: string; name?: string; status?: string; shift_id?: string | null }>(
    supabase,
    "staff",
    "id,name,status,shift_id",
  );
  const attendanceResult = await safeSelect<AttendanceRow>(
    supabase,
    "attendance",
    "id,staff_id,shift_id,clock_in_at,clock_out_at,check_in_status,check_out_status,attendance_date",
  );
  const todayAttendance = attendanceResult.rows.filter((row) =>
    String((row as AttendanceRow & { attendance_date?: string }).attendance_date ?? "") === today,
  );

  return {
    period: { today },
    errors: [staffResult.error, attendanceResult.error].filter(Boolean),
    staff: {
      active: staffResult.rows.filter((row) => row.status === "active").length,
      withoutShift: staffResult.rows.filter((row) => row.status === "active" && !row.shift_id).length,
    },
    attendance: {
      records: todayAttendance.length,
      clockedIn: todayAttendance.filter((row) => row.clock_in_at).length,
      clockedOut: todayAttendance.filter((row) => row.clock_out_at).length,
      late: todayAttendance.filter((row) => row.check_in_status === "late").length,
      earlyLeave: todayAttendance.filter((row) => row.check_out_status === "early_leave").length,
      overtime: todayAttendance.filter((row) => row.check_out_status === "overtime").length,
    },
  };
}

async function getOperationsSnapshot(supabase: SupabaseClient) {
  const today = getJakartaLocalDate();
  const ordersResult = await safeSelect<OrderRow>(
    supabase,
    "orders",
    "id,status,payment_status,fulfillment_method,total,order_date,created_at",
  );
  const todayOrders = ordersResult.rows.filter((order) => order.order_date === today);

  const countBy = (key: keyof OrderRow) =>
    Array.from(groupBy(todayOrders, (order) => String(order[key] ?? "unknown")).entries()).map(
      ([label, rows]) => ({ label, count: rows.length }),
    );

  return {
    period: { today },
    errors: [ordersResult.error].filter(Boolean),
    orders: {
      total: todayOrders.length,
      statusDistribution: countBy("status"),
      paymentDistribution: countBy("payment_status"),
      fulfillmentDistribution: countBy("fulfillment_method"),
      unpaid: todayOrders.filter((order) => String(order.payment_status ?? "").toLowerCase() === "unpaid").length,
      active: todayOrders.filter((order) =>
        ["new", "preparing", "partially-served", "served"].includes(String(order.status ?? "")),
      ).length,
    },
  };
}

export async function buildOwnerInsightSnapshot(
  category: OwnerInsightCategory,
  supabase = createOwnerInsightSupabaseClient(),
): Promise<Record<string, unknown>> {
  if (category === "sales") return getSalesSnapshot(supabase);
  if (category === "rewards") return getRewardsSnapshot(supabase);
  if (category === "inventory") return getInventorySnapshot(supabase);
  if (category === "staff") return getStaffSnapshot(supabase);
  if (category === "operations") return getOperationsSnapshot(supabase);

  const [sales, rewards, inventory, staff, operations] = await Promise.all([
    getSalesSnapshot(supabase),
    getRewardsSnapshot(supabase),
    getInventorySnapshot(supabase),
    getStaffSnapshot(supabase),
    getOperationsSnapshot(supabase),
  ]);

  return { sales, rewards, inventory, staff, operations };
}
