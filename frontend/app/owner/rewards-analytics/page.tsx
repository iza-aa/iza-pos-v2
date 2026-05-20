"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import {
  ArrowPathIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  GiftIcon,
  PresentationChartLineIcon,
  TicketIcon,
  TrophyIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsTab = "overview" | "reward-performance" | "loyal-customers";

type RewardRelation = {
  id: string | null;
  name: string | null;
  points_required: number | null;
  discount_type: string | null;
  discount_value: number | string | null;
};

type CustomerRelation = {
  id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
};

type OrderRelation = {
  id: string | null;
  order_number: string | null;
  subtotal: number | string | null;
  discount: number | string | null;
  total: number | string | null;
  customer_id: string | null;
};

type RewardRow = {
  id: string;
  name: string;
  points_required: number;
  discount_type: string | null;
  discount_value: number | string | null;
  used_count: number | null;
  is_active: boolean;
};

type RedemptionRow = {
  id: string;
  customer_id: string;
  reward_id: string;
  points_spent: number;
  code: string;
  status: string;
  redeemed_at: string;
  used_at: string | null;
  used_order_id: string | null;
  rewards?: RewardRelation | RewardRelation[] | null;
  customers?: CustomerRelation | CustomerRelation[] | null;
  orders?: OrderRelation | OrderRelation[] | null;
};

type OrderRow = {
  id: string;
  customer_id: string | null;
  subtotal: number | string | null;
  discount: number | string | null;
  total: number | string | null;
  payment_status: string | null;
  reward_redemption_id: string | null;
  created_at: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  loyalty_points: number | null;
  total_spent: number | string | null;
  visit_count: number | null;
  member_since: string | null;
};

type PointTransactionRow = {
  transaction_type: string;
  points: number;
};

type RewardPerformance = {
  rewardId: string;
  rewardName: string;
  pointsRequired: number;
  usedCount: number;
  availableCount: number;
  expiredCount: number;
  totalRedemptions: number;
  totalDiscountCost: number;
  revenueGenerated: number;
  netRevenue: number;
  usedRate: number;
  discountRatio: number;
};

type LoyalCustomer = {
  customerId: string;
  name: string;
  contact: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  totalRedemptions: number;
  usedRedemptions: number;
  discountReceived: number;
  memberSince: string | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getRelationObject<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}


function formatMultiplier(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "N/A";
  }

  return `${value.toFixed(1)}x`;
}

const CHART_COLORS = {
  navy: "#111827",
  slate: "#94A3B8",
  sky: "#7DD3FC",
  indigo: "#A5B4FC",
  emerald: "#86EFAC",
  amber: "#FCD34D",
  rose: "#FDA4AF",
  violet: "#C4B5FD",
};

function formatChartCurrency(value: number | string): string {
  return formatCurrency(toNumber(value));
}

function formatChartNumber(value: number | string): string {
  return formatNumber(toNumber(value));
}



export default function OwnerRewardsAnalyticsPage() {
  useSessionValidation();

  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [pointTransactions, setPointTransactions] = useState<PointTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalyticsData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    }

    setError("");

    try {
      const [
        rewardsResult,
        redemptionsResult,
        ordersResult,
        customersResult,
        pointTransactionsResult,
      ] = await Promise.all([
        supabase
          .from("rewards")
          .select("id, name, points_required, discount_type, discount_value, used_count, is_active")
          .order("created_at", { ascending: false }),
        supabase
          .from("customer_reward_redemptions")
          .select(
            `
            id,
            customer_id,
            reward_id,
            points_spent,
            code,
            status,
            redeemed_at,
            used_at,
            used_order_id,
            rewards(id, name, points_required, discount_type, discount_value),
            customers(id, name, phone, email),
            orders:used_order_id(id, order_number, subtotal, discount, total, customer_id)
          `,
          )
          .order("redeemed_at", { ascending: false }),
        supabase
          .from("orders")
          .select("id, customer_id, subtotal, discount, total, payment_status, reward_redemption_id, created_at")
          .eq("payment_status", "paid")
          .order("created_at", { ascending: false }),
        supabase
          .from("customers")
          .select("id, name, phone, email, loyalty_points, total_spent, visit_count, member_since")
          .order("total_spent", { ascending: false }),
        supabase
          .from("customer_point_transactions")
          .select("transaction_type, points"),
      ]);

      if (rewardsResult.error) throw rewardsResult.error;
      if (redemptionsResult.error) throw redemptionsResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (customersResult.error) throw customersResult.error;
      if (pointTransactionsResult.error) throw pointTransactionsResult.error;

      setRewards((rewardsResult.data ?? []) as RewardRow[]);
      setRedemptions((redemptionsResult.data ?? []) as RedemptionRow[]);
      setOrders((ordersResult.data ?? []) as OrderRow[]);
      setCustomers((customersResult.data ?? []) as CustomerRow[]);
      setPointTransactions((pointTransactionsResult.data ?? []) as PointTransactionRow[]);
    } catch (fetchError) {
      console.error("Failed to load reward analytics:", fetchError);
      setError("Failed to load reward analytics. Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalyticsData(false);
  }, [fetchAnalyticsData]);

  const paidOrders = orders;

  const analytics = useMemo(() => {
    const rewardOrders = paidOrders.filter((order) => Boolean(order.reward_redemption_id));
    const memberOrders = paidOrders.filter((order) => Boolean(order.customer_id));
    const guestOrders = paidOrders.filter((order) => !order.customer_id);

    const revenueBeforeDiscount = paidOrders.reduce(
      (sum, order) => sum + toNumber(order.subtotal),
      0,
    );
    const revenueAfterDiscount = paidOrders.reduce(
      (sum, order) => sum + toNumber(order.total),
      0,
    );
    const totalDiscountGiven = paidOrders.reduce(
      (sum, order) => sum + toNumber(order.discount),
      0,
    );
    const rewardRevenueGenerated = rewardOrders.reduce(
      (sum, order) => sum + toNumber(order.total),
      0,
    );
    const memberRevenue = memberOrders.reduce(
      (sum, order) => sum + toNumber(order.total),
      0,
    );
    const guestRevenue = guestOrders.reduce(
      (sum, order) => sum + toNumber(order.total),
      0,
    );
    const pointsIssued = pointTransactions
      .filter((transaction) => transaction.transaction_type === "earned")
      .reduce((sum, transaction) => sum + Math.max(0, transaction.points), 0);
    const pointsRedeemed = pointTransactions
      .filter((transaction) => transaction.transaction_type === "redeemed")
      .reduce((sum, transaction) => sum + Math.abs(transaction.points), 0);

    const averageDiscountPerRewardOrder =
      rewardOrders.length > 0 ? totalDiscountGiven / rewardOrders.length : 0;
    const discountRatio =
      revenueBeforeDiscount > 0 ? (totalDiscountGiven / revenueBeforeDiscount) * 100 : 0;
    const rewardOrderRate =
      paidOrders.length > 0 ? (rewardOrders.length / paidOrders.length) * 100 : 0;
    const memberRevenueRate =
      revenueAfterDiscount > 0 ? (memberRevenue / revenueAfterDiscount) * 100 : 0;

    return {
      totalPaidOrders: paidOrders.length,
      rewardOrderCount: rewardOrders.length,
      memberOrderCount: memberOrders.length,
      guestOrderCount: guestOrders.length,
      revenueBeforeDiscount,
      revenueAfterDiscount,
      totalDiscountGiven,
      rewardRevenueGenerated,
      discountRatio,
      memberRevenue,
      guestRevenue,
      pointsIssued,
      pointsRedeemed,
      averageDiscountPerRewardOrder,
      rewardOrderRate,
      memberRevenueRate,
      activeRewardCount: rewards.filter((reward) => reward.is_active).length,
      totalMemberCount: customers.length,
    };
  }, [customers.length, paidOrders, pointTransactions, rewards]);

  const rewardPerformance = useMemo<RewardPerformance[]>(() => {
    const map = new Map<string, RewardPerformance>();

    rewards.forEach((reward) => {
      map.set(reward.id, {
        rewardId: reward.id,
        rewardName: reward.name,
        pointsRequired: reward.points_required,
        usedCount: 0,
        availableCount: 0,
        expiredCount: 0,
        totalRedemptions: 0,
        totalDiscountCost: 0,
        revenueGenerated: 0,
        netRevenue: 0,
        usedRate: 0,
        discountRatio: 0,
      });
    });

    redemptions.forEach((redemption) => {
      const reward = getRelationObject(redemption.rewards);
      const order = getRelationObject(redemption.orders);
      const rewardId = redemption.reward_id;

      const current =
        map.get(rewardId) ??
        ({
          rewardId,
          rewardName: reward?.name ?? "Reward",
          pointsRequired: reward?.points_required ?? redemption.points_spent,
          usedCount: 0,
          availableCount: 0,
          expiredCount: 0,
          totalRedemptions: 0,
          totalDiscountCost: 0,
          revenueGenerated: 0,
          netRevenue: 0,
          usedRate: 0,
          discountRatio: 0,
        } satisfies RewardPerformance);

      current.totalRedemptions += 1;

      if (redemption.status === "used") {
        current.usedCount += 1;
        current.totalDiscountCost += toNumber(order?.discount);
        current.revenueGenerated += toNumber(order?.total);
      } else if (redemption.status === "available") {
        current.availableCount += 1;
      } else if (redemption.status === "expired") {
        current.expiredCount += 1;
      }

      map.set(rewardId, current);
    });

    return Array.from(map.values())
      .map((performance) => {
        const usedRate =
          performance.totalRedemptions > 0
            ? (performance.usedCount / performance.totalRedemptions) * 100
            : 0;
        const discountRatio =
          performance.revenueGenerated > 0
            ? (performance.totalDiscountCost / performance.revenueGenerated) * 100
            : 0;

        return {
          ...performance,
          netRevenue: performance.revenueGenerated,
          usedRate,
          discountRatio,
        };
      })
      .sort((a, b) => {
        if (b.usedCount !== a.usedCount) {
          return b.usedCount - a.usedCount;
        }

        return b.totalDiscountCost - a.totalDiscountCost;
      });
  }, [redemptions, rewards]);

  const loyalCustomers = useMemo<LoyalCustomer[]>(() => {
    const map = new Map<string, LoyalCustomer>();

    customers.forEach((customer) => {
      map.set(customer.id, {
        customerId: customer.id,
        name: customer.name,
        contact: customer.phone || customer.email || "-",
        loyaltyPoints: customer.loyalty_points ?? 0,
        totalSpent: toNumber(customer.total_spent),
        visitCount: customer.visit_count ?? 0,
        totalRedemptions: 0,
        usedRedemptions: 0,
        discountReceived: 0,
        memberSince: customer.member_since,
      });
    });

    redemptions.forEach((redemption) => {
      const customer = getRelationObject(redemption.customers);
      const order = getRelationObject(redemption.orders);
      const customerId = redemption.customer_id;

      const current =
        map.get(customerId) ??
        ({
          customerId,
          name: customer?.name ?? "Unknown Customer",
          contact: customer?.phone || customer?.email || "-",
          loyaltyPoints: 0,
          totalSpent: 0,
          visitCount: 0,
          totalRedemptions: 0,
          usedRedemptions: 0,
          discountReceived: 0,
          memberSince: null,
        } satisfies LoyalCustomer);

      current.totalRedemptions += 1;

      if (redemption.status === "used") {
        current.usedRedemptions += 1;
        current.discountReceived += toNumber(order?.discount);
      }

      map.set(customerId, current);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalSpent !== a.totalSpent) {
        return b.totalSpent - a.totalSpent;
      }

      return b.visitCount - a.visitCount;
    });
  }, [customers, redemptions]);

  const memberVsGuestRows = [
    {
      label: "Member",
      orders: analytics.memberOrderCount,
      revenue: analytics.memberRevenue,
      averageOrderValue:
        analytics.memberOrderCount > 0
          ? analytics.memberRevenue / analytics.memberOrderCount
          : 0,
      share:
        analytics.revenueAfterDiscount > 0
          ? (analytics.memberRevenue / analytics.revenueAfterDiscount) * 100
          : 0,
    },
    {
      label: "Guest",
      orders: analytics.guestOrderCount,
      revenue: analytics.guestRevenue,
      averageOrderValue:
        analytics.guestOrderCount > 0
          ? analytics.guestRevenue / analytics.guestOrderCount
          : 0,
      share:
        analytics.revenueAfterDiscount > 0
          ? (analytics.guestRevenue / analytics.revenueAfterDiscount) * 100
          : 0,
    },
  ];

  const revenueImpactChartData = [
    {
      label: "Gross Revenue",
      value: analytics.revenueBeforeDiscount,
      fill: CHART_COLORS.sky,
    },
    {
      label: "Reward Discount",
      value: analytics.totalDiscountGiven,
      fill: CHART_COLORS.rose,
    },
    {
      label: "Net Revenue",
      value: analytics.revenueAfterDiscount,
      fill: CHART_COLORS.emerald,
    },
  ];

  const memberGuestRevenueChartData = memberVsGuestRows.map((row) => ({
    segment: row.label,
    revenue: row.revenue,
    orders: row.orders,
    averageOrderValue: row.averageOrderValue,
    fill: row.label === "Member" ? CHART_COLORS.indigo : CHART_COLORS.slate,
  }));

  const memberGuestRevenueShareData = memberVsGuestRows.map((row) => ({
    name: row.label,
    value: row.revenue,
    fill: row.label === "Member" ? CHART_COLORS.indigo : CHART_COLORS.slate,
  }));

  const pointsFlowChartData = [
    {
      label: "Issued",
      value: analytics.pointsIssued,
      fill: CHART_COLORS.violet,
    },
    {
      label: "Redeemed",
      value: analytics.pointsRedeemed,
      fill: CHART_COLORS.amber,
    },
  ];

  const rewardUsageChartData = rewardPerformance.map((reward) => ({
    name: reward.rewardName,
    used: reward.usedCount,
    pending: reward.availableCount,
    expired: reward.expiredCount,
  }));

  const rewardFinancialChartData = rewardPerformance.map((reward) => ({
    name: reward.rewardName,
    revenue: reward.revenueGenerated,
    discount: reward.totalDiscountCost,
  }));

  const tabItems: Array<{
    id: AnalyticsTab;
    label: string;
    description: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }> = [
    {
      id: "overview",
      label: "Overview",
      description: "Business impact",
      icon: PresentationChartLineIcon,
    },
    {
      id: "reward-performance",
      label: "Performance",
      description: "Reward usage",
      icon: TicketIcon,
    },
    {
      id: "loyal-customers",
      label: "Loyal Customers",
      description: "Top members",
      icon: UserGroupIcon,
    },
  ];

  return (
    <main className="h-[calc(100vh-64px)] overflow-hidden bg-white">
      <div className="flex h-full min-h-0">
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-4 lg:flex lg:flex-col">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Reward Analytics</h2>

          <div className="space-y-2">
            {tabItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full rounded-lg px-3 py-3 text-left transition ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-600"}`} />
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p
                        className={`mt-0.5 text-xs ${
                          isActive ? "text-gray-200" : "text-gray-400"
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
          <div className="flex shrink-0 flex-col gap-4 border-b border-gray-200 bg-white p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                Reward Analytics
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Analyze reward impact, discount cost, member revenue, and loyal customers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-xl border border-gray-200 bg-white p-1 lg:hidden">
                {tabItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      activeTab === item.id
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => fetchAnalyticsData(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid shrink-0 grid-cols-2 gap-3 px-6 py-4 xl:grid-cols-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Reward Orders</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatNumber(analytics.rewardOrderCount)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {analytics.rewardOrderRate.toFixed(1)}% of paid orders
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Discount Cost</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.totalDiscountGiven)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Reward discount given
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Member Revenue</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.memberRevenue)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {analytics.memberRevenueRate.toFixed(1)}% of revenue
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Points Issued</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatNumber(analytics.pointsIssued)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Earned by customers
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Points Redeemed</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatNumber(analytics.pointsRedeemed)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Spent on rewards
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            {activeTab === "overview" ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-5 flex items-center gap-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-900" />
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        Revenue Impact
                      </h2>
                      <p className="text-sm text-gray-500">
                        Gross revenue, reward discount cost, and net revenue in one view.
                      </p>
                    </div>
                  </div>

                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueImpactChartData} margin={{ top: 10, right: 18, left: 6, bottom: 18 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} />
                        <YAxis tickFormatter={(value) => formatChartCurrency(value)} tick={{ fontSize: 12, fill: "#6B7280" }} width={92} />
                        <Tooltip formatter={(value) => formatChartCurrency(value as number)} cursor={{ fill: "#F9FAFB" }} />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                          {revenueImpactChartData.map((entry) => (
                            <Cell key={entry.label} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-sky-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                        Reward Revenue
                      </p>
                      <p className="mt-2 text-sm font-bold text-gray-900">
                        {formatCurrency(analytics.rewardRevenueGenerated)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-rose-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                        Discount Ratio
                      </p>
                      <p className="mt-2 text-sm font-bold text-gray-900">
                        {analytics.discountRatio.toFixed(2)}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Avg. Discount
                      </p>
                      <p className="mt-2 text-sm font-bold text-gray-900">
                        {formatCurrency(analytics.averageDiscountPerRewardOrder)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-5 flex items-center gap-2">
                    <UserGroupIcon className="h-5 w-5 text-gray-900" />
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        Member vs Guest
                      </h2>
                      <p className="text-sm text-gray-500">
                        Revenue share with order and average order value comparison.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[0.85fr_1.15fr]">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={memberGuestRevenueShareData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={58}
                            outerRadius={92}
                            paddingAngle={3}
                          >
                            {memberGuestRevenueShareData.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatChartCurrency(value as number)} />
                          <Legend iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={memberGuestRevenueChartData} margin={{ top: 10, right: 18, left: 6, bottom: 18 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                          <XAxis dataKey="segment" tick={{ fontSize: 12, fill: "#6B7280" }} />
                          <YAxis tickFormatter={(value) => formatChartCurrency(value)} tick={{ fontSize: 12, fill: "#6B7280" }} width={88} />
                          <Tooltip formatter={(value) => formatChartCurrency(value as number)} cursor={{ fill: "#F9FAFB" }} />
                          <Bar dataKey="revenue" radius={[10, 10, 0, 0]}>
                            {memberGuestRevenueChartData.map((entry) => (
                              <Cell key={entry.segment} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {memberVsGuestRows.map((row) => (
                      <div key={row.label} className="rounded-xl border border-gray-200 p-4">
                        <p className="text-sm font-bold text-gray-900">{row.label}</p>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Orders</span>
                            <span className="font-semibold text-gray-900">{formatNumber(row.orders)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Revenue Share</span>
                            <span className="font-semibold text-gray-900">{row.share.toFixed(1)}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Avg. Order Value</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(row.averageOrderValue)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-2">
                  <div className="mb-5 flex items-center gap-2">
                    <GiftIcon className="h-5 w-5 text-gray-900" />
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        Points Flow
                      </h2>
                      <p className="text-sm text-gray-500">
                        Points earned by customers compared with points spent on rewards.
                      </p>
                    </div>
                  </div>

                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pointsFlowChartData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                        <XAxis type="number" tickFormatter={(value) => formatChartNumber(value)} tick={{ fontSize: 12, fill: "#6B7280" }} />
                        <YAxis dataKey="label" type="category" tick={{ fontSize: 12, fill: "#6B7280" }} width={90} />
                        <Tooltip formatter={(value) => formatChartNumber(value as number)} cursor={{ fill: "#F9FAFB" }} />
                        <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                          {pointsFlowChartData.map((entry) => (
                            <Cell key={entry.label} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "reward-performance" ? (
              <div className="space-y-4">
                <section className="rounded-2xl border border-gray-200 bg-white">
                  <div className="flex items-center gap-2 border-b border-gray-200 p-4">
                    <TicketIcon className="h-5 w-5 text-gray-900" />
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        Reward Usage Mix
                      </h2>
                      <p className="text-sm text-gray-500">
                        Visualize used, pending, and expired vouchers for each reward.
                      </p>
                    </div>
                  </div>

                  <div className="h-90 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rewardUsageChartData} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#6B7280" }} width={150} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="used" stackId="usage" name="Used" fill={CHART_COLORS.navy} radius={[0, 8, 8, 0]} />
                        <Bar dataKey="pending" stackId="usage" name="Pending" fill={CHART_COLORS.amber} radius={[0, 8, 8, 0]} />
                        <Bar dataKey="expired" stackId="usage" name="Expired" fill={CHART_COLORS.rose} radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white">
                  <div className="flex items-center gap-2 border-b border-gray-200 p-4">
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-900" />
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        Revenue vs Discount by Reward
                      </h2>
                      <p className="text-sm text-gray-500">
                        Compare revenue generated against reward discount cost.
                      </p>
                    </div>
                  </div>

                  <div className="h-95 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rewardFinancialChartData} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} angle={-10} textAnchor="end" height={70} />
                        <YAxis tickFormatter={(value) => formatChartCurrency(value)} tick={{ fontSize: 12, fill: "#6B7280" }} width={90} />
                        <Tooltip formatter={(value) => formatChartCurrency(value as number)} cursor={{ fill: "#F9FAFB" }} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue Generated" fill={CHART_COLORS.emerald} radius={[10, 10, 0, 0]} />
                        <Bar dataKey="discount" name="Discount Cost" fill={CHART_COLORS.rose} radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white">
                  <div className="flex items-center gap-2 border-b border-gray-200 p-4">
                    <ChartBarIcon className="h-5 w-5 text-gray-900" />
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        Reward Performance Detail
                      </h2>
                      <p className="text-sm text-gray-500">
                        Objective metrics only: usage, revenue, discount, and efficiency.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-270 text-left">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                          <th className="px-4 py-3 font-semibold">Reward</th>
                          <th className="px-4 py-3 font-semibold">Redeemed</th>
                          <th className="px-4 py-3 font-semibold">Used</th>
                          <th className="px-4 py-3 font-semibold">Pending</th>
                          <th className="px-4 py-3 font-semibold">Used Rate</th>
                          <th className="px-4 py-3 font-semibold">Revenue Generated</th>
                          <th className="px-4 py-3 font-semibold">Discount Cost</th>
                          <th className="px-4 py-3 font-semibold">Efficiency</th>
                        </tr>
                      </thead>

                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-sm text-gray-500">
                              Loading reward performance...
                            </td>
                          </tr>
                        ) : rewardPerformance.length > 0 ? (
                          rewardPerformance.map((reward) => (
                            <tr key={reward.rewardId} className="border-b border-gray-100 align-top">
                              <td className="px-4 py-4">
                                <p className="font-semibold text-gray-900">
                                  {reward.rewardName}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {reward.pointsRequired} points required
                                </p>
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                {reward.totalRedemptions}
                              </td>

                              <td className="px-4 py-4 text-sm text-gray-700">
                                {reward.usedCount}
                              </td>

                              <td className="px-4 py-4 text-sm text-gray-700">
                                {reward.availableCount}
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                {reward.usedRate.toFixed(0)}%
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                {formatCurrency(reward.revenueGenerated)}
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-rose-600">
                                {formatCurrency(reward.totalDiscountCost)}
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                {formatMultiplier(
                                  reward.totalDiscountCost > 0
                                    ? reward.revenueGenerated / reward.totalDiscountCost
                                    : 0,
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center">
                              <GiftIcon className="mx-auto h-8 w-8 text-gray-400" />
                              <p className="mt-3 text-sm font-semibold text-gray-800">
                                No reward performance data
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Reward usage will appear after customers redeem vouchers.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "loyal-customers" ? (
              <section className="rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center gap-2 border-b border-gray-200 p-4">
                  <TrophyIcon className="h-5 w-5 text-gray-900" />
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Loyal Customers
                    </h2>
                    <p className="text-sm text-gray-500">
                      Identify top customers by spending, visits, points, and reward usage.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-245 text-left">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Points</th>
                        <th className="px-4 py-3 font-semibold">Total Spent</th>
                        <th className="px-4 py-3 font-semibold">Visits</th>
                        <th className="px-4 py-3 font-semibold">Redemptions</th>
                        <th className="px-4 py-3 font-semibold">Discount Received</th>
                        <th className="px-4 py-3 font-semibold">Member Since</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-sm text-gray-500">
                            Loading loyal customers...
                          </td>
                        </tr>
                      ) : loyalCustomers.length > 0 ? (
                        loyalCustomers.map((customer, index) => (
                          <tr key={customer.customerId} className="border-b border-gray-100">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-800">
                                  #{index + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {customer.name}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {customer.contact}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-sm font-bold text-gray-900">
                              {formatNumber(customer.loyaltyPoints)}
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                              {formatCurrency(customer.totalSpent)}
                            </td>

                            <td className="px-4 py-4 text-sm text-gray-700">
                              {formatNumber(customer.visitCount)}
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-sm font-semibold text-gray-900">
                                {customer.totalRedemptions}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {customer.usedRedemptions} used
                              </p>
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                              {formatCurrency(customer.discountReceived)}
                            </td>

                            <td className="px-4 py-4 text-sm text-gray-600">
                              {formatDate(customer.memberSince)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center">
                            <ChartBarIcon className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-3 text-sm font-semibold text-gray-800">
                              No customer data
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Registered customer activity will appear here.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}