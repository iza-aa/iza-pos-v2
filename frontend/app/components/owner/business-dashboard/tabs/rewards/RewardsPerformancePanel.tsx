"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChartBarIcon,
  GiftIcon,
  TicketIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";
import GenerateRecommendationPanel from "../../ai/GenerateRecommendationPanel";
import {
  formatCurrency,
  formatDate,
  normalizeReward,
  toNumber,
  type Reward,
  type RewardRow,
} from "./rewardUtils";

type RedemptionRow = {
  id: string;
  customer_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  rewards?: { name: string | null } | { name: string | null }[] | null;
  orders?: { total: number | string | null; discount: number | string | null } | { total: number | string | null; discount: number | string | null }[] | null;
};

type CustomerRow = {
  id: string;
  name: string;
  loyalty_points: number | null;
  total_spent: number | string | null;
  visit_count: number | null;
  last_login_at: string | null;
};

type OrderRow = {
  id: string;
  customer_id: string | null;
  total: number | string | null;
  discount: number | string | null;
  reward_redemption_id: string | null;
  payment_status: string | null;
};

const relation = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

function MetricCard({
  label,
  value,
  icon: Icon,
  note,
}: {
  label: string;
  value: string;
  icon: typeof ChartBarIcon;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <Icon className="h-5 w-5 text-gray-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {note ? <p className="mt-1 text-xs text-gray-500">{note}</p> : null}
    </div>
  );
}

export default function RewardsPerformancePanel() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [rewardsResult, redemptionsResult, customersResult, ordersResult] =
      await Promise.all([
        supabase.from("rewards").select("*").order("created_at", { ascending: false }),
        supabase
          .from("customer_reward_redemptions")
          .select("id,customer_id,reward_id,points_spent,status,rewards(name),orders:used_order_id(total,discount)")
          .order("redeemed_at", { ascending: false }),
        supabase
          .from("customers")
          .select("id,name,loyalty_points,total_spent,visit_count,last_login_at")
          .order("total_spent", { ascending: false })
          .limit(10),
        supabase
          .from("orders")
          .select("id,customer_id,total,discount,reward_redemption_id,payment_status"),
      ]);

    setRewards(((rewardsResult.data ?? []) as RewardRow[]).map(normalizeReward));
    setRedemptions((redemptionsResult.data ?? []) as RedemptionRow[]);
    setCustomers((customersResult.data ?? []) as CustomerRow[]);
    setOrders((ordersResult.data ?? []) as OrderRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const metrics = useMemo(() => {
    const activeRewards = rewards.filter((reward) => reward.isActive).length;
    const usedVouchers = redemptions.filter((row) => row.status === "used").length;
    const availableVouchers = redemptions.filter((row) => row.status === "available").length;
    const paidOrders = orders.filter((order) => {
      const status = String(order.payment_status ?? "").toLowerCase();
      return status === "paid" || status === "completed";
    });
    const rewardOrders = paidOrders.filter((order) => order.reward_redemption_id);
    const discountCost = paidOrders.reduce((sum, order) => sum + toNumber(order.discount), 0);
    const memberRevenue = paidOrders
      .filter((order) => order.customer_id)
      .reduce((sum, order) => sum + toNumber(order.total), 0);
    const guestRevenue = paidOrders
      .filter((order) => !order.customer_id)
      .reduce((sum, order) => sum + toNumber(order.total), 0);

    return {
      activeRewards,
      usedVouchers,
      availableVouchers,
      rewardOrders: rewardOrders.length,
      discountCost,
      memberRevenue,
      guestRevenue,
    };
  }, [orders, redemptions, rewards]);

  const rewardPerformance = useMemo(() => {
    const map = new Map<string, { name: string; used: number; available: number; revenue: number; discount: number }>();
    rewards.forEach((reward) => {
      map.set(reward.id, {
        name: reward.name,
        used: 0,
        available: 0,
        revenue: 0,
        discount: 0,
      });
    });

    redemptions.forEach((redemption) => {
      const rewardName = relation(redemption.rewards)?.name ?? "Reward";
      const order = relation(redemption.orders);
      const current =
        map.get(redemption.reward_id) ??
        { name: rewardName, used: 0, available: 0, revenue: 0, discount: 0 };

      map.set(redemption.reward_id, {
        ...current,
        used: current.used + (redemption.status === "used" ? 1 : 0),
        available: current.available + (redemption.status === "available" ? 1 : 0),
        revenue: current.revenue + toNumber(order?.total),
        discount: current.discount + toNumber(order?.discount),
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.used - a.used || b.revenue - a.revenue)
      .slice(0, 6);
  }, [redemptions, rewards]);

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="rewards" />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <MetricCard label="Active Rewards" value={String(metrics.activeRewards)} icon={GiftIcon} />
        <MetricCard label="Reward Orders" value={String(metrics.rewardOrders)} icon={TicketIcon} />
        <MetricCard label="Used Vouchers" value={String(metrics.usedVouchers)} icon={TicketIcon} />
        <MetricCard label="Available" value={String(metrics.availableVouchers)} icon={TicketIcon} />
        <MetricCard label="Discount Cost" value={formatCurrency(metrics.discountCost)} icon={ChartBarIcon} />
        <MetricCard label="Member Revenue" value={formatCurrency(metrics.memberRevenue)} icon={UserGroupIcon} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <h2 className="text-base font-bold text-gray-900">Reward Effectiveness</h2>
            <p className="mt-1 text-sm text-gray-500">Reward yang dipakai, menghasilkan revenue, dan memakan discount cost.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Used</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Discount Cost</th>
                  <th className="px-4 py-3">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-sm text-gray-500">Loading reward performance...</td></tr>
                ) : rewardPerformance.length > 0 ? (
                  rewardPerformance.map((reward) => (
                    <tr key={reward.name} className="border-t border-gray-100">
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">{reward.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{reward.used}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{reward.available}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">{formatCurrency(reward.revenue)}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{formatCurrency(reward.discount)}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{reward.discount > 0 ? `${(reward.revenue / reward.discount).toFixed(1)}x` : "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="px-4 py-6 text-sm text-gray-500">Belum ada data reward.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Member Impact</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500">Member Revenue</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(metrics.memberRevenue)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500">Guest Revenue</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(metrics.guestRevenue)}</p>
            </div>
          </div>

          <h3 className="mt-5 text-sm font-bold text-gray-900">Top Loyal Customers</h3>
          <div className="mt-3 space-y-3">
            {customers.slice(0, 5).map((customer) => (
              <div key={customer.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{customer.name}</p>
                  <p className="mt-1 text-xs text-gray-500">Last active {formatDate(customer.last_login_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(toNumber(customer.total_spent))}</p>
                  <p className="mt-1 text-xs text-gray-500">{customer.loyalty_points ?? 0} pts</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
