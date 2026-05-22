"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/config/supabaseClient";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import {
  OWNER_CHART_COLORS,
  OWNER_CHART_SERIES,
  OWNER_SEMANTIC_TONES,
} from "@/lib/constants/theme";
import GenerateRecommendationPanel from "../ai/GenerateRecommendationPanel";
import DateRangeFilter, {
  getDefaultDateRange,
  type DateRangeValue,
} from "./DateRangeFilter";
import {
  ChartCard,
  DonutChartWithLegend,
  EmptyState,
  MetricCard,
  StandardTooltip,
} from "./shared/DashboardPrimitives";
import type { DashboardData, OrderRow, RewardRow } from "./shared/dashboardTypes";
import {
  formatCurrency,
  formatNumber,
  getBusinessDateFromTimestamp,
  getBusinessHourFromTimestamp,
  getDatesBetween,
  getOrderBusinessDate,
  getOrderBusinessHour,
  getRangeLengthDays,
  groupBy,
  isValidSalesOrder,
  toNumber,
} from "./shared/dashboardUtils";
import useOwnerDashboardData from "./shared/useOwnerDashboardData";

function buildProductPerformance(data: DashboardData) {
  const validOrderIds = new Set(data.orders.filter(isValidSalesOrder).map((order) => order.id));

  return Array.from(
    groupBy(
      data.orderItems.filter((item) => item.order_id && validOrderIds.has(item.order_id)),
      (item) => item.product_name ?? "Unknown Menu",
    ).entries(),
  )
    .map(([name, rows]) => {
      const sold = rows.reduce((sum, row) => sum + toNumber(row.quantity), 0);
      const revenue = rows.reduce((sum, row) => sum + toNumber(row.total_price), 0);
      const estimatedCost = 0;
      const grossProfit = revenue - estimatedCost;
      const margin = revenue > 0 && estimatedCost > 0 ? (grossProfit / revenue) * 100 : 0;
      const status =
        sold >= 10 && margin >= 50
          ? "Star Menu"
          : sold >= 10
            ? "Needs Cost Data"
            : revenue > 0
              ? "Promote"
              : "Remove Candidate";

      return {
        name,
        category: "Menu",
        sold,
        revenue,
        estimatedCost,
        grossProfit,
        margin,
        status,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
}

function SalesDashboard() {
  const data = useOwnerDashboardData();
  const products = buildProductPerformance(data);
  const categoryRevenue = Array.from(
    groupBy(products, (item) => item.category).entries(),
  ).map(([name, rows]) => ({
    name,
    revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
  }));

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="sales" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Menu Quadrant" subtitle="Sales volume compared with available profit signals.">
          {products.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: -8, right: 16, top: 12, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis type="number" dataKey="sold" name="Sold" tickLine={false} axisLine={false} />
                  <YAxis type="number" dataKey="margin" name="Margin" tickLine={false} axisLine={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Scatter data={products} fill={OWNER_CHART_COLORS.INDIGO_BLUE} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="No menu sales data yet" />
          )}
        </ChartCard>

        <ChartCard title="Top Selling Menu" subtitle="Best selling items by quantity.">
          {products.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={products.slice(0, 6)} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Bar dataKey="sold" fill={OWNER_CHART_COLORS.INDIGO_BLUE} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="No top menu data yet" />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Revenue by Category" subtitle="Menu revenue grouped by category signal.">
        {categoryRevenue.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRevenue} margin={{ left: -8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip content={<StandardTooltip />} />
                <Bar dataKey="revenue" fill={OWNER_CHART_COLORS.SOFT_SKY_BLUE} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState label="No category revenue data yet" />
        )}
      </ChartCard>

      <ChartCard title="Profitability Table" subtitle="Cost fields are not assumed. Menus without cost data are marked clearly.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-3 pr-4">Menu Name</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Total Sold</th>
                <th className="py-3 pr-4">Revenue</th>
                <th className="py-3 pr-4">Estimated Cost</th>
                <th className="py-3 pr-4">Gross Profit</th>
                <th className="py-3 pr-4">Profit Margin</th>
                <th className="py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((item) => (
                <tr key={item.name} className="text-gray-700">
                  <td className="py-3 pr-4 font-semibold text-gray-900">{item.name}</td>
                  <td className="py-3 pr-4">{item.category}</td>
                  <td className="py-3 pr-4">{formatNumber(item.sold)}</td>
                  <td className="py-3 pr-4">{formatCurrency(item.revenue)}</td>
                  <td className="py-3 pr-4">{item.estimatedCost ? formatCurrency(item.estimatedCost) : "Cost data needed"}</td>
                  <td className="py-3 pr-4">{formatCurrency(item.grossProfit)}</td>
                  <td className="py-3 pr-4">{item.margin ? `${item.margin.toFixed(1)}%` : "Not available"}</td>
                  <td className="py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${OWNER_SEMANTIC_TONES.neutral.badgeClass}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!products.length ? (
                <tr>
                  <td className="py-6 text-center text-gray-500" colSpan={8}>
                    No profitability data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function CustomerDashboard() {
  const data = useOwnerDashboardData();
  const validOrders = data.orders.filter(isValidSalesOrder);
  const memberOrders = validOrders.filter((order) => Boolean(order.customer_id));
  const guestOrders = validOrders.filter((order) => !order.customer_id);
  const rewardOrders = validOrders.filter((order) => Boolean(order.reward_redemption_id));
  const memberRevenue = memberOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const guestRevenue = guestOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const discountCost = validOrders.reduce((sum, order) => sum + toNumber(order.discount), 0);
  const memberShare = validOrders.length
    ? Math.round((memberOrders.length / validOrders.length) * 100)
    : 0;
  const customerMix = [
    { name: "Member", value: memberOrders.length },
    { name: "Guest", value: guestOrders.length },
  ].filter((item) => item.value > 0);
  const revenueMix = [
    { name: "Member Revenue", value: memberRevenue },
    { name: "Guest Revenue", value: guestRevenue },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="rewards" />

      {data.error ? (
        <div className={`rounded-xl border p-3 text-sm font-medium ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}>
          Some customer and loyalty data could not be loaded. Available widgets will still render.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Member Orders"
          value={data.loading ? "Loading" : formatNumber(memberOrders.length)}
          helper="Orders linked to customers"
          tone="premium"
        />
        <MetricCard
          label="Guest Orders"
          value={data.loading ? "Loading" : formatNumber(guestOrders.length)}
          helper="Orders without customer identity"
          tone="neutral"
        />
        <MetricCard
          label="Member Revenue"
          value={data.loading ? "Loading" : formatCurrency(memberRevenue)}
          helper="Revenue from identified customers"
          tone="success"
        />
        <MetricCard
          label="Reward Orders"
          value={data.loading ? "Loading" : formatNumber(rewardOrders.length)}
          helper="Orders using reward redemption"
          tone="premium"
        />
        <MetricCard
          label="Discount Cost"
          value={data.loading ? "Loading" : formatCurrency(discountCost)}
          helper="Total discount impact"
          tone={discountCost > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Customer Mix" subtitle="Member and guest order composition.">
          <DonutChartWithLegend data={customerMix} emptyLabel="No customer order data yet" />
        </ChartCard>

        <ChartCard title="Revenue Contribution" subtitle="Revenue split between member and guest orders.">
          <DonutChartWithLegend data={revenueMix} emptyLabel="No customer revenue data yet" />
        </ChartCard>
      </div>

      <ChartCard title="Loyalty Health" subtitle="Signals that help owner evaluate whether loyalty decisions support revenue.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Member Share
            </p>
            <p className="mt-3 text-2xl font-bold text-gray-950">{memberShare}%</p>
            <p className="mt-2 text-sm text-gray-600">
              Share of valid orders linked to customers.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Reward Usage Rate
            </p>
            <p className="mt-3 text-2xl font-bold text-gray-950">
              {validOrders.length ? Math.round((rewardOrders.length / validOrders.length) * 100) : 0}%
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Share of valid orders that used rewards.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Discount Ratio
            </p>
            <p className="mt-3 text-2xl font-bold text-gray-950">
              {memberRevenue + guestRevenue
                ? `${Math.round((discountCost / (memberRevenue + guestRevenue)) * 100)}%`
                : "0%"}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Discount cost compared with valid revenue.
            </p>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

function CustomerDiscountDashboard() {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: "10",
    maxDiscountAmount: "",
    pointsRequired: "0",
    minimumOrderAmount: "0",
    validDays: "7",
    usageLimit: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
  });
  const defaultForm = {
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: "10",
    maxDiscountAmount: "",
    pointsRequired: "0",
    minimumOrderAmount: "0",
    validDays: "7",
    usageLimit: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
  };

  const loadRewards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rewards")
      .select("id,name,description,discount_type,discount_value,max_discount_amount,points_required,minimum_order_amount,valid_days,usage_limit,used_count,is_active,starts_at,ends_at")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      setFeedback(error.message);
    } else {
      setRewards((data ?? []) as RewardRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadRewards();
  }, []);

  const updateForm = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setEditingRewardId(null);
    setForm(defaultForm);
  };

  const startEdit = (reward: RewardRow) => {
    setEditingRewardId(reward.id);
    setFeedback("");
    setForm({
      name: reward.name ?? "",
      description: reward.description ?? "",
      discountType: reward.discount_type ?? "percentage",
      discountValue: String(toNumber(reward.discount_value) || 10),
      maxDiscountAmount: reward.max_discount_amount
        ? String(toNumber(reward.max_discount_amount))
        : "",
      pointsRequired: String(toNumber(reward.points_required)),
      minimumOrderAmount: String(toNumber(reward.minimum_order_amount)),
      validDays: reward.valid_days ? String(toNumber(reward.valid_days)) : "7",
      usageLimit: reward.usage_limit ? String(toNumber(reward.usage_limit)) : "",
      startsAt: reward.starts_at ? String(reward.starts_at).slice(0, 10) : "",
      endsAt: reward.ends_at ? String(reward.ends_at).slice(0, 10) : "",
      isActive: Boolean(reward.is_active),
    });
  };

  const deleteDiscount = async (reward: RewardRow) => {
    const confirmed = window.confirm(`Delete discount "${reward.name ?? "this discount"}"?`);
    if (!confirmed) return;

    setSaving(true);
    setFeedback("");

    const { error } = await supabase.from("rewards").delete().eq("id", reward.id);

    if (error) {
      setFeedback(error.message);
    } else {
      setFeedback("Discount deleted successfully.");
      if (editingRewardId === reward.id) {
        resetForm();
      }
      await loadRewards();
    }

    setSaving(false);
  };

  const saveDiscount = async () => {
    setSaving(true);
    setFeedback("");

    const discountValue = toNumber(form.discountValue);
    const pointsRequired = toNumber(form.pointsRequired);
    const minimumOrderAmount = toNumber(form.minimumOrderAmount);
    const maxDiscountAmount = form.maxDiscountAmount
      ? toNumber(form.maxDiscountAmount)
      : null;
    const usageLimit = form.usageLimit ? toNumber(form.usageLimit) : null;
    const validDays = form.validDays ? toNumber(form.validDays) : null;

    if (!form.name.trim()) {
      setFeedback("Discount name is required.");
      setSaving(false);
      return;
    }

    if (discountValue <= 0) {
      setFeedback("Discount value must be greater than 0.");
      setSaving(false);
      return;
    }

    if (form.discountType === "percentage" && discountValue > 100) {
      setFeedback("Percentage discount cannot be greater than 100%.");
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      reward_type: "discount",
      discount_type: form.discountType,
      discount_value: discountValue,
      max_discount_amount: maxDiscountAmount,
      points_required: pointsRequired,
      minimum_order_amount: minimumOrderAmount,
      valid_days: validDays,
      usage_limit: usageLimit,
      is_active: form.isActive,
      starts_at: form.startsAt || null,
      ends_at: form.endsAt || null,
    };
    const { error } = editingRewardId
      ? await supabase.from("rewards").update(payload).eq("id", editingRewardId)
      : await supabase.from("rewards").insert({ ...payload, used_count: 0 });

    if (error) {
      setFeedback(error.message);
    } else {
      setFeedback(editingRewardId ? "Discount updated successfully." : "Discount created successfully.");
      resetForm();
      await loadRewards();
    }

    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <ChartCard
        title={editingRewardId ? "Edit Discount" : "Create Discount"}
        subtitle="Create customer rewards or member discounts that can be redeemed from the customer rewards page."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">Discount Name</span>
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                  placeholder="Member Weekend Discount"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">Discount Type</span>
                <select
                  value={form.discountType}
                  onChange={(event) => updateForm("discountType", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-sm font-semibold text-gray-700">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                className="min-h-24 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                placeholder="Short explanation shown to customers."
              />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">Discount Value</span>
                <input
                  type="number"
                  min="0"
                  value={form.discountValue}
                  onChange={(event) => updateForm("discountValue", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">Max Discount</span>
                <input
                  type="number"
                  min="0"
                  value={form.maxDiscountAmount}
                  onChange={(event) => updateForm("maxDiscountAmount", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                  placeholder="Optional"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">Points Required</span>
                <input
                  type="number"
                  min="0"
                  value={form.pointsRequired}
                  onChange={(event) => updateForm("pointsRequired", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">Minimum Order</span>
                <input
                  type="number"
                  min="0"
                  value={form.minimumOrderAmount}
                  onChange={(event) => updateForm("minimumOrderAmount", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">Valid Days</span>
                <input
                  type="number"
                  min="1"
                  value={form.validDays}
                  onChange={(event) => updateForm("validDays", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">Usage Limit</span>
                <input
                  type="number"
                  min="0"
                  value={form.usageLimit}
                  onChange={(event) => updateForm("usageLimit", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                  placeholder="Optional"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">Start Date</span>
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={(event) => updateForm("startsAt", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">End Date</span>
                <input
                  type="date"
                  value={form.endsAt}
                  onChange={(event) => updateForm("endsAt", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm("isActive", event.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-semibold text-gray-700">
                Activate this discount immediately
              </span>
            </label>

            {feedback ? (
              <div className={`rounded-xl border p-3 text-sm font-semibold ${OWNER_SEMANTIC_TONES.waiting.badgeClass}`}>
                {feedback}
              </div>
            ) : null}

            <button
              type="button"
              onClick={saveDiscount}
              disabled={saving}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? editingRewardId
                  ? "Updating..."
                  : "Creating..."
                : editingRewardId
                  ? "Update Discount"
                  : "Create Discount"}
            </button>
            {editingRewardId ? (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="ml-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>

          <aside className="self-start rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-bold text-gray-950">Recent Discounts</p>
            <div className="mt-3 space-y-3">
              {loading ? (
                <p className="text-sm text-gray-500">Loading discounts...</p>
              ) : rewards.length ? (
                rewards.map((reward) => (
                  <div key={reward.id} className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{reward.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {reward.discount_type === "percentage"
                            ? `${toNumber(reward.discount_value)}% off`
                            : `${formatCurrency(toNumber(reward.discount_value))} off`}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          reward.is_active
                            ? OWNER_SEMANTIC_TONES.success.badgeClass
                            : OWNER_SEMANTIC_TONES.neutral.badgeClass
                        }`}
                      >
                        {reward.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Used {formatNumber(toNumber(reward.used_count))} times
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(reward)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteDiscount(reward)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No discounts created yet.</p>
              )}
            </div>
          </aside>
        </div>
      </ChartCard>
    </div>
  );
}

const normalizeInventoryTransactionType = (type?: string | null) => {
  const raw = String(type || "sale").toLowerCase();
  if (raw === "order_usage") return "sale";
  if (raw === "stock_in") return "restock";
  return raw;
};

const getInventoryTransactionTimestamp = (createdAt?: string | null, timestamp?: string | null) => {
  return createdAt || timestamp || null;
};

function getUsageTransactionsInRange(data: DashboardData, range: DateRangeValue) {
  return data.usageTransactions.filter((transaction) => {
    const businessDate = getBusinessDateFromTimestamp(
      getInventoryTransactionTimestamp(transaction.created_at, transaction.timestamp),
    );
    return businessDate >= range.startDate && businessDate <= range.endDate;
  });
}

function getInventoryUnitCost(item?: { cost_per_unit?: number | string | null; price_per_unit?: number | string | null }) {
  return toNumber(item?.cost_per_unit ?? item?.price_per_unit);
}

function buildInventoryMovementTrend(
  data: DashboardData,
  range: DateRangeValue,
  selectedInventoryItemId: string,
) {
  const transactions = getUsageTransactionsInRange(data, range);
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));
  const transactionById = new Map(data.usageTransactions.map((transaction) => [transaction.id, transaction]));
  const inventoryById = new Map(data.inventoryItems.map((item) => [item.id, item]));
  const details = data.usageTransactionDetails.filter((detail) => {
    if (!detail.usage_transaction_id || !transactionIds.has(detail.usage_transaction_id)) {
      return false;
    }

    if (selectedInventoryItemId === "all") return true;

    return detail.inventory_item_id === selectedInventoryItemId;
  });
  const hourly = range.startDate === range.endDate;
  const dateBuckets = hourly
    ? Array.from({ length: 24 }, (_, hour) => {
        const label = `${String(hour).padStart(2, "0")}:00`;
        return { key: `${range.startDate} ${label}`, label };
      })
    : getDatesBetween(range.startDate, range.endDate).map((date) => ({
        key: date,
        label: date.slice(5),
      }));

  return dateBuckets.map((bucket) => {
    const rows = details.filter((detail) => {
      const transaction = transactionById.get(detail.usage_transaction_id ?? "");
      const timestamp = getInventoryTransactionTimestamp(
        transaction?.created_at,
        transaction?.timestamp,
      );
      const date = getBusinessDateFromTimestamp(timestamp);
      const hour = getBusinessHourFromTimestamp(timestamp);
      const key = hourly ? `${date} ${hour}:00` : date;
      return key === bucket.key;
    });
    const getValue = (type: string) =>
      rows
        .filter((detail) => {
          const transaction = transactionById.get(detail.usage_transaction_id ?? "");
          return normalizeInventoryTransactionType(transaction?.transaction_type ?? transaction?.type) === type;
        })
        .reduce((sum, detail) => {
          const quantity = toNumber(detail.quantity_used);
          if (selectedInventoryItemId !== "all") return sum + quantity;

          const inventory = inventoryById.get(detail.inventory_item_id ?? "");
          return sum + quantity * getInventoryUnitCost(inventory);
        }, 0);

    return {
      date: bucket.label,
      stockIn: getValue("restock"),
      stockOut: getValue("sale"),
      adjustments: getValue("adjustment"),
    };
  });
}

function buildStockMovementRows(data: DashboardData, range: DateRangeValue) {
  const transactionById = new Map(data.usageTransactions.map((row) => [row.id, row]));
  const inventoryNameById = new Map(
    data.inventoryItems.map((item) => [item.id, item.name ?? "Inventory item"]),
  );
  const transactionsInRange = new Set(getUsageTransactionsInRange(data, range).map((row) => row.id));

  return data.usageTransactionDetails
    .filter((detail) => detail.usage_transaction_id && transactionsInRange.has(detail.usage_transaction_id))
    .map((detail, index) => {
      const transaction = transactionById.get(detail.usage_transaction_id ?? "");
      const type = normalizeInventoryTransactionType(transaction?.transaction_type ?? transaction?.type);
      const previous = toNumber(detail.previous_stock);
      const next = toNumber(detail.new_stock);

      return {
        id: `${detail.usage_transaction_id}-${detail.inventory_item_id}-${detail.ingredient_name}-${index}`,
        itemName:
          detail.ingredient_name ||
          inventoryNameById.get(detail.inventory_item_id ?? "") ||
          "Inventory item",
        type,
        quantity: toNumber(detail.quantity_used),
        unit: detail.unit ?? "",
        previous,
        next,
        timestamp: getInventoryTransactionTimestamp(transaction?.created_at, transaction?.timestamp),
        actor: transaction?.performed_by_name ?? "System",
        notes: transaction?.notes ?? "",
      };
    })
    .sort((a, b) => String(b.timestamp ?? "").localeCompare(String(a.timestamp ?? "")))
    .slice(0, 6);
}

function buildExpiryReadinessRows(data: DashboardData) {
  const perishableKeywords = ["milk", "chicken", "vegetable", "meat", "cream", "cheese", "egg"];

  return data.inventoryItems
    .filter((item) => {
      const label = `${item.name ?? ""} ${item.category ?? ""}`.toLowerCase();
      return perishableKeywords.some((keyword) => label.includes(keyword));
    })
    .slice(0, 6)
    .map((item) => ({
      name: item.name ?? "Inventory item",
      category: item.category ?? "Inventory",
      stock: toNumber(item.current_stock),
      unit: item.unit ?? "",
    }));
}

function buildInventoryHealthSummary(data: DashboardData, range: DateRangeValue) {
  const inventoryById = new Map(data.inventoryItems.map((item) => [item.id, item]));
  const rows = data.inventoryItems.map((item) => {
    const current = toNumber(item.current_stock);
    const minimum = toNumber(item.reorder_level);
    const unitCost = getInventoryUnitCost(item);
    return {
      id: item.id,
      name: item.name ?? "Inventory item",
      current,
      minimum,
      unitCost,
      suggestedRestock: Math.max(0, minimum * 2 - current),
      hasDataIssue: current < 0 || minimum <= 0 || !item.unit,
    };
  });
  const transactions = getUsageTransactionsInRange(data, range);
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));
  const transactionById = new Map(data.usageTransactions.map((transaction) => [transaction.id, transaction]));
  const stockOutByItem = new Map<string, { name: string; value: number; quantity: number }>();

  data.usageTransactionDetails
    .filter((detail) => detail.usage_transaction_id && transactionIds.has(detail.usage_transaction_id))
    .forEach((detail) => {
      const transaction = transactionById.get(detail.usage_transaction_id ?? "");
      const type = normalizeInventoryTransactionType(transaction?.transaction_type ?? transaction?.type);
      if (type !== "sale") return;

      const inventory = inventoryById.get(detail.inventory_item_id ?? "");
      const quantity = toNumber(detail.quantity_used);
      const value = quantity * getInventoryUnitCost(inventory);
      const itemId = detail.inventory_item_id ?? detail.ingredient_name ?? "unknown";
      const current = stockOutByItem.get(itemId) ?? {
        name: detail.ingredient_name || inventory?.name || "Inventory item",
        value: 0,
        quantity: 0,
      };

      stockOutByItem.set(itemId, {
        ...current,
        value: current.value + value,
        quantity: current.quantity + quantity,
      });
    });

  const mostUsed = Array.from(stockOutByItem.values()).sort(
    (a, b) => b.value - a.value || b.quantity - a.quantity,
  )[0];

  return {
    totalItems: rows.length,
    criticalItems: rows.filter((item) => item.minimum > 0 && item.current <= item.minimum).length,
    estimatedRestockCost: rows.reduce(
      (sum, item) => sum + item.suggestedRestock * item.unitCost,
      0,
    ),
    dataIssues: rows.filter((item) => item.hasDataIssue).length,
    mostUsedName: mostUsed?.name ?? "-",
  };
}

function InventoryDashboard() {
  const data = useOwnerDashboardData();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState("all");
  const inventoryRows = data.inventoryItems
    .map((item) => {
      const current = toNumber(item.current_stock);
      const minimum = toNumber(item.reorder_level);
      const stockPercent = minimum > 0 ? Math.min(100, (current / minimum) * 100) : 100;
      return {
        id: item.id,
        name: item.name ?? "Inventory item",
        category: item.category ?? "General",
        current,
        minimum,
        unitCost: getInventoryUnitCost(item),
        unit: item.unit ?? "",
        stockPercent,
        daysRemaining: minimum > 0 && current <= minimum ? 2 : 7,
        suggestedRestock: Math.max(0, minimum * 2 - current),
      };
    })
    .sort((a, b) => a.stockPercent - b.stockPercent);
  const lowStock = inventoryRows
    .filter((item) => item.minimum > 0 && item.current <= item.minimum)
    .slice(0, 7);
  const lowStockCandidates = lowStock.length
    ? lowStock
    : inventoryRows.filter((item) => item.minimum > 0);
  const lowStockRows = [
    ...lowStockCandidates,
    ...inventoryRows.filter(
      (item) => !lowStockCandidates.some((candidate) => candidate.id === item.id),
    ),
  ].slice(0, 7);
  const movementTrend = buildInventoryMovementTrend(data, dateRange, selectedInventoryItemId);
  const movementRows = buildStockMovementRows(data, dateRange);
  const expiryReadinessRows = buildExpiryReadinessRows(data);
  const healthSummary = buildInventoryHealthSummary(data, dateRange);
  const selectedInventoryItem = data.inventoryItems.find((item) => item.id === selectedInventoryItemId);
  const usageAxisIsCurrency = selectedInventoryItemId === "all";
  const selectedUsageUnit = selectedInventoryItem?.unit ?? "";
  const formatUsageAxis = (value: number) =>
    usageAxisIsCurrency
      ? value >= 1_000_000
        ? `Rp ${(value / 1_000_000).toFixed(1)}m`
        : value >= 1_000
          ? `Rp ${(value / 1_000).toFixed(0)}k`
          : `Rp ${value}`
      : `${formatNumber(value)}${selectedUsageUnit ? ` ${selectedUsageUnit}` : ""}`;
  type LowStockRow = (typeof lowStockRows)[number];
  type MovementRow = (typeof movementRows)[number];
  const lowStockColumns: Array<StandardTableColumn<LowStockRow>> = [
    {
      key: "name",
      header: "Item",
      render: (item) => <span className="font-semibold text-gray-900">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    {
      key: "current",
      header: "Current Stock",
      render: (item) => `${formatNumber(item.current)} ${item.unit}`,
      sortValue: (item) => item.current,
    },
    {
      key: "minimum",
      header: "Minimum Stock",
      render: (item) => `${formatNumber(item.minimum)} ${item.unit}`,
      sortValue: (item) => item.minimum,
    },
    {
      key: "daysRemaining",
      header: "Days Remaining",
      render: (item) => `${item.daysRemaining} days`,
      sortValue: (item) => item.daysRemaining,
    },
    {
      key: "suggestedRestock",
      header: "Suggested Restock",
      render: (item) => `${formatNumber(item.suggestedRestock)} ${item.unit}`,
      sortValue: (item) => item.suggestedRestock,
    },
  ];
  const movementColumns: Array<StandardTableColumn<MovementRow>> = [
    {
      key: "itemName",
      header: "Item",
      render: (row) => <span className="font-semibold text-gray-900">{row.itemName}</span>,
      sortValue: (row) => row.itemName,
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <span className="capitalize">{row.type}</span>,
      sortValue: (row) => row.type,
    },
    {
      key: "quantity",
      header: "Qty",
      render: (row) => `${formatNumber(row.quantity)} ${row.unit}`,
      sortValue: (row) => row.quantity,
    },
    {
      key: "previous",
      header: "Before",
      render: (row) => `${formatNumber(row.previous)} ${row.unit}`,
      sortValue: (row) => row.previous,
    },
    {
      key: "next",
      header: "After",
      render: (row) => `${formatNumber(row.next)} ${row.unit}`,
      sortValue: (row) => row.next,
    },
    {
      key: "actor",
      header: "Actor",
      render: (row) => row.actor,
      sortValue: (row) => row.actor,
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => row.notes || "-",
      sortValue: (row) => row.notes,
    },
  ];

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="inventory" />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total SKUs" value={data.loading ? "Loading" : formatNumber(healthSummary.totalItems)} helper="Tracked inventory items" tone="info" />
          <MetricCard label="Critical Items" value={data.loading ? "Loading" : formatNumber(healthSummary.criticalItems)} helper="At or below reorder level" tone={healthSummary.criticalItems > 0 ? "warning" : "success"} />
          <MetricCard label="Restock Cost" value={data.loading ? "Loading" : formatCurrency(healthSummary.estimatedRestockCost)} helper="Estimated cost to restore buffer" tone="waiting" />
          <MetricCard label="Data Issues" value={data.loading ? "Loading" : formatNumber(healthSummary.dataIssues)} helper="Negative stock, missing unit, or missing threshold" tone={healthSummary.dataIssues > 0 ? "danger" : "success"} />
          <MetricCard label="Highest Usage" value={data.loading ? "Loading" : healthSummary.mostUsedName} helper="Largest stock-out value in range" tone="premium" />
        </div>


      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Low Stock Alert" subtitle="Items that need owner attention before they run out.">
          <StandardTable
            columns={lowStockColumns}
            data={lowStockRows}
            getRowKey={(item) => item.id}
            emptyLabel="No inventory item detected."
            minWidthClassName="min-w-155"
          />
        </ChartCard>

        <ChartCard title="Usage Trend" subtitle="Stock movement events over the selected period.">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {usageAxisIsCurrency
                ? "All items are converted into Rupiah value."
                : `Showing quantity movement${selectedUsageUnit ? ` in ${selectedUsageUnit}` : ""}.`}
            </p>
            <select
              value={selectedInventoryItemId}
              onChange={(event) => setSelectedInventoryItemId(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-gray-900"
              aria-label="Select inventory item for usage trend"
            >
              <option value="all">All Items (Rupiah)</option>
              {data.inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name ?? "Inventory item"}
                </option>
              ))}
            </select>
          </div>
          {movementTrend.some((item) => item.stockIn || item.stockOut || item.adjustments) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movementTrend} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatUsageAxis(Number(value))}
                    width={usageAxisIsCurrency ? 72 : 56}
                  />
                  <Tooltip content={<StandardTooltip />} />
                  <Legend />
                  <Bar dataKey="stockIn" name="Stock In" fill={OWNER_CHART_COLORS.SOFT_GREEN} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="stockOut" name="Stock Out" fill={OWNER_CHART_COLORS.SOFT_ROSE} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="adjustments" name="Adjustments" fill={OWNER_CHART_COLORS.SOFT_YELLOW} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="No stock movement events in this period" />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <ChartCard title="Stock Movement" subtitle="Recent stock-in, stock-out, and adjustment records.">
            <StandardTable
              columns={movementColumns}
              data={movementRows}
              getRowKey={(row) => row.id}
              emptyLabel="No stock movement records in this period."
            />
        </ChartCard>

        <ChartCard title="Expiry Readiness" subtitle="Perishable inventory needs batch expiry tracking.">
          <div className="space-y-3">
            <div className={`rounded-xl border p-3 text-sm font-semibold ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}>
              Expiry date data is not available yet. Add batch, received date, and expiry date fields to enable FIFO/FEFO alerts.
            </div>
            {expiryReadinessRows.length ? (
              <div className="space-y-2">
                {expiryReadinessRows.map((item) => (
                  <div key={item.name} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.category}</p>
                      </div>
                      <span className="text-xs font-bold text-gray-700">
                        {formatNumber(item.stock)} {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No perishable inventory signal detected" />
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

const getMinutesBetween = (start: string | null | undefined, end: string | null | undefined) => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const minutes = (endDate.getTime() - startDate.getTime()) / 60_000;
  return minutes >= 0 ? minutes : null;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const getOrderDateCandidates = (order: OrderRow) => {
  return Array.from(
    new Set(
      [
        getOrderBusinessDate(order),
        order.order_date ?? "",
        getBusinessDateFromTimestamp(order.created_at),
      ].filter(Boolean),
    ),
  );
};

function StaffDashboard() {
  const data = useOwnerDashboardData();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const datesInRange = getDatesBetween(dateRange.startDate, dateRange.endDate);
  const rangeDays = getRangeLengthDays(dateRange);
  const singleDayRange = dateRange.startDate === dateRange.endDate;
  const activeStaff = data.staff.filter(
    (row) => row.status === "active" && String(row.role ?? "").toLowerCase() !== "owner",
  );
  const activeStaffIds = new Set(activeStaff.map((staff) => staff.id));
  const attendanceInRange = data.attendance.filter(
    (row) =>
      row.attendance_date &&
      row.attendance_date >= dateRange.startDate &&
      row.attendance_date <= dateRange.endDate &&
      row.staff_id &&
      activeStaffIds.has(row.staff_id),
  );
  const ordersInRange = data.orders.filter(
    (order) =>
      getOrderBusinessDate(order) >= dateRange.startDate &&
      getOrderBusinessDate(order) <= dateRange.endDate &&
      isValidSalesOrder(order),
  );
  const orderById = new Map(ordersInRange.map((order) => [order.id, order]));
  const orderItemsInRange = data.orderItems.filter(
    (item) => item.order_id && orderById.has(item.order_id),
  );

  const staffRows = activeStaff.map((staff) => {
    const records = attendanceInRange.filter((row) => row.staff_id === staff.id);
    const late = records.filter((row) => row.check_in_status === "late").length;
    const overtime = records.filter((row) => row.check_out_status === "overtime").length;
    const earlyLeave = records.filter((row) => row.check_out_status === "early_leave").length;
    const clockedIn = records.filter((row) => row.clock_in_at).length;
    const expectedAttendance = rangeDays;
    const attendanceRate = expectedAttendance
      ? clampScore((clockedIn / expectedAttendance) * 100)
      : 0;
    const createdOrderIds = ordersInRange
      .filter((order) => order.created_by === staff.id)
      .map((order) => order.id);
    const servedOrderIds = orderItemsInRange
      .filter((item) => item.served_by === staff.id && item.order_id)
      .map((item) => item.order_id as string);
    const handledOrderIds = new Set([...createdOrderIds, ...servedOrderIds]);
    const serviceMinutes = orderItemsInRange
      .filter((item) => item.served_by === staff.id)
      .map((item) => getMinutesBetween(item.ready_at, item.served_at))
      .filter((minutes): minutes is number => minutes !== null);
    const averageServiceMinutes = serviceMinutes.length
      ? serviceMinutes.reduce((sum, minutes) => sum + minutes, 0) / serviceMinutes.length
      : null;
    const speedScore =
      averageServiceMinutes === null ? null : clampScore(100 - (averageServiceMinutes / 30) * 100);
    const performanceScore = clampScore(
      attendanceRate - late * 5 - earlyLeave * 4 + overtime * 2 + (speedScore ?? 0) * 0.15,
    );

    return {
      id: staff.id,
      name: staff.name ?? "Staff",
      role: staff.role ?? "Staff",
      ordersHandled: handledOrderIds.size,
      averageServiceMinutes,
      late,
      overtime,
      attendanceRate,
      performanceScore,
    };
  });

  const average = (values: number[]) =>
    values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  const maxOrdersHandled = Math.max(0, ...staffRows.map((row) => row.ordersHandled));
  const attendanceBase = Math.max(1, attendanceInRange.length);
  const averageSpeed = average(
    staffRows
      .map((row) =>
        row.averageServiceMinutes === null
          ? null
          : clampScore(100 - (row.averageServiceMinutes / 30) * 100),
      )
      .filter((value): value is number => value !== null),
  );
  const radarData = [
    { metric: "Attendance", value: average(staffRows.map((row) => row.attendanceRate)) },
    {
      metric: "Orders Handled",
      value: maxOrdersHandled
        ? clampScore((average(staffRows.map((row) => row.ordersHandled)) / maxOrdersHandled) * 100)
        : 0,
    },
    { metric: "Speed", value: averageSpeed },
    { metric: "Consistency", value: average(staffRows.map((row) => row.performanceScore)) },
    {
      metric: "Overtime Control",
      value: clampScore(100 - (attendanceInRange.filter((row) => row.check_out_status === "overtime").length / attendanceBase) * 100),
    },
    {
      metric: "Reliability",
      value: clampScore(100 - (attendanceInRange.filter((row) => row.check_in_status === "late").length / attendanceBase) * 100),
    },
  ];
  const trendData = singleDayRange
    ? Array.from({ length: 24 }, (_, hour) => {
        const hourLabel = `${String(hour).padStart(2, "0")}:00`;
        return {
          date: hourLabel,
          attendance: attendanceInRange.filter(
            (row) => getBusinessHourFromTimestamp(row.clock_in_at) === String(hour).padStart(2, "0"),
          ).length,
          late: attendanceInRange.filter(
            (row) =>
              row.check_in_status === "late" &&
              getBusinessHourFromTimestamp(row.clock_in_at) === String(hour).padStart(2, "0"),
          ).length,
        };
      })
    : datesInRange.map((date) => ({
        date: date.slice(5),
        attendance: attendanceInRange.filter((row) => row.attendance_date === date && row.clock_in_at).length,
        late: attendanceInRange.filter((row) => row.attendance_date === date && row.check_in_status === "late").length,
      }));
  type StaffPerformanceRow = (typeof staffRows)[number];
  const staffColumns: Array<StandardTableColumn<StaffPerformanceRow>> = [
    {
      key: "name",
      header: "Staff Name",
      render: (row) => <span className="font-semibold text-gray-900">{row.name}</span>,
      sortValue: (row) => row.name,
    },
    { key: "role", header: "Role", render: (row) => row.role, sortValue: (row) => row.role },
    {
      key: "ordersHandled",
      header: "Orders Handled",
      render: (row) => formatNumber(row.ordersHandled),
      sortValue: (row) => row.ordersHandled,
    },
    {
      key: "averageServiceMinutes",
      header: "Average Service Time",
      render: (row) =>
        row.averageServiceMinutes === null ? "Timestamp data needed" : `${row.averageServiceMinutes.toFixed(1)} min`,
      sortValue: (row) => row.averageServiceMinutes ?? -1,
    },
    { key: "late", header: "Late Count", render: (row) => formatNumber(row.late), sortValue: (row) => row.late },
    {
      key: "overtime",
      header: "Overtime Count",
      render: (row) => formatNumber(row.overtime),
      sortValue: (row) => row.overtime,
    },
    {
      key: "attendanceRate",
      header: "Attendance Rate",
      render: (row) => `${row.attendanceRate}%`,
      sortValue: (row) => row.attendanceRate,
    },
    {
      key: "score",
      header: "Score",
      render: (row) => formatNumber(row.performanceScore),
      sortValue: (row) => row.performanceScore,
    },
  ];

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="staff" />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Staff" value={formatNumber(activeStaff.length)} helper="Owner role excluded" tone="coffee" />
        <MetricCard label="Clocked In" value={formatNumber(attendanceInRange.filter((row) => row.clock_in_at).length)} helper="Attendance in selected range" tone="success" />
        <MetricCard label="Late Count" value={formatNumber(attendanceInRange.filter((row) => row.check_in_status === "late").length)} helper="Needs attention" tone="danger" />
        <MetricCard label="Overtime Count" value={formatNumber(attendanceInRange.filter((row) => row.check_out_status === "overtime").length)} helper="Premium labor signal" tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Staff Performance Radar" subtitle="Attendance, handled orders, speed, consistency, overtime control, and reliability.">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke={OWNER_CHART_COLORS.INDIGO_BLUE} fill={OWNER_CHART_COLORS.INDIGO_BLUE} fillOpacity={0.25} />
                <Tooltip content={<StandardTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Productivity" subtitle="Orders created or served by each staff member in the selected period.">
          {staffRows.some((row) => row.ordersHandled > 0) ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffRows} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={110} tickLine={false} axisLine={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Bar dataKey="ordersHandled" name="Orders Handled" fill={OWNER_CHART_COLORS.SOFT_SKY_BLUE} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="No staff order attribution in this period" />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Attendance Trend" subtitle={singleDayRange ? "Hourly clock-in and late records." : "Daily clock-in and late records."}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ left: -8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<StandardTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="attendance" name="Clocked In" stroke={OWNER_CHART_COLORS.SOFT_GREEN} strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="late" name="Late" stroke={OWNER_CHART_COLORS.SOFT_ROSE} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Staff Performance Table" subtitle="Concrete numbers for fair staff evaluation.">
        <StandardTable
          columns={staffColumns}
          data={staffRows}
          getRowKey={(row) => row.id}
          emptyLabel="No staff performance data yet."
        />
      </ChartCard>
    </div>
  );
}

function OperationDashboard() {
  const data = useOwnerDashboardData();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const singleDayRange = dateRange.startDate === dateRange.endDate;
  const ordersInRange = data.orders.filter((order) => {
    return getOrderDateCandidates(order).some(
      (date) => date >= dateRange.startDate && date <= dateRange.endDate,
    );
  });
  const normalizeOperationStatus = (status: string | null) => {
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
  const statusFlow = [
    { status: "new", label: "New Order" },
    { status: "on-process", label: "On Process" },
    { status: "partially-served", label: "Partially Served" },
    { status: "completed", label: "Completed" },
  ];
  const flow = statusFlow.map((stage) => ({
    ...stage,
    count: ordersInRange.filter((order) => normalizeOperationStatus(order.status) === stage.status).length,
  }));
  const activeOrders = ordersInRange.filter((order) =>
    ["new", "on-process", "partially-served"].includes(normalizeOperationStatus(order.status)),
  );
  const completedOrders = ordersInRange.filter(
    (order) => normalizeOperationStatus(order.status) === "completed",
  );
  const orderById = new Map(ordersInRange.map((order) => [order.id, order]));
  const serviceEvents = [
    ...completedOrders
      .map((order) => {
        const finishedAt = order.completed_at ?? order.served_at ?? order.ready_at;
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
    ...data.orderItems
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
  const operationSlots = Array.from(
    { length: 12 },
    (_, index) => `${String(index + 9).padStart(2, "0")}:00`,
  );
  const heatmap = operationSlots.map((slot) => {
    const [slotHour] = slot.split(":");
    return {
      slot,
      count: ordersInRange.filter((order) => {
        const hour = getOrderBusinessHour(order);
        return hour === slotHour;
      }).length,
    };
  });
  const serviceTimeRows = serviceEvents.map((event) => event.minutes);
  const averageServiceTime = serviceTimeRows.length
    ? serviceTimeRows.reduce((sum, minutes) => sum + minutes, 0) / serviceTimeRows.length
    : null;
  const serviceTrend = (singleDayRange
    ? Array.from({ length: 24 }, (_, hour) => {
        const hourLabel = `${String(hour).padStart(2, "0")}:00`;
        const rows = serviceEvents
          .filter(
            (event) =>
              getBusinessHourFromTimestamp(event.completedAt) === String(hour).padStart(2, "0") ||
              event.orderHour === String(hour).padStart(2, "0"),
          )
          .map((event) => event.minutes);
        return {
          period: hourLabel,
          averageMinutes: rows.length
            ? Number((rows.reduce((sum, minutes) => sum + minutes, 0) / rows.length).toFixed(1))
            : 0,
        };
      })
    : getDatesBetween(dateRange.startDate, dateRange.endDate).map((date) => {
        const rows = serviceEvents
          .filter(
            (event) =>
              getBusinessDateFromTimestamp(event.completedAt) === date ||
              event.orderDateCandidates.includes(date),
          )
          .map((event) => event.minutes);
        return {
          period: date.slice(5),
          averageMinutes: rows.length
            ? Number((rows.reduce((sum, minutes) => sum + minutes, 0) / rows.length).toFixed(1))
            : 0,
        };
      }));
  const completionTrend = (singleDayRange
    ? Array.from({ length: 24 }, (_, hour) => {
        const hourKey = String(hour).padStart(2, "0");
        const rows = ordersInRange.filter((order) => getOrderBusinessHour(order) === hourKey);
        return {
          period: `${hourKey}:00`,
          active: rows.filter((order) =>
            ["new", "on-process", "partially-served"].includes(normalizeOperationStatus(order.status)),
          ).length,
          completed: rows.filter((order) => normalizeOperationStatus(order.status) === "completed").length,
        };
      })
    : getDatesBetween(dateRange.startDate, dateRange.endDate).map((date) => {
        const rows = ordersInRange.filter((order) => getOrderDateCandidates(order).includes(date));
        return {
          period: date.slice(5),
          active: rows.filter((order) =>
            ["new", "on-process", "partially-served"].includes(normalizeOperationStatus(order.status)),
          ).length,
          completed: rows.filter((order) => normalizeOperationStatus(order.status) === "completed").length,
        };
      }));
  const maxHeatmapCount = Math.max(1, ...heatmap.map((cell) => cell.count));
  const getHeatmapStyle = (count: number) => {
    if (count <= 0) {
      return {
        backgroundColor: "#F8F8F8",
        borderColor: "#E5E7EB",
        color: "#6B7280",
      };
    }

    const intensity = count / maxHeatmapCount;
    const alpha = 0.35 + intensity * 0.55;
    return {
      backgroundColor: `rgba(76, 70, 218, ${alpha})`,
      borderColor: `rgba(76, 70, 218, ${Math.min(1, alpha + 0.12)})`,
      color: alpha > 0.62 ? "#FFFFFF" : "#111827",
    };
  };

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="operations" />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Orders" value={formatNumber(ordersInRange.length)} helper="All operational orders" tone="info" />
        <MetricCard label="Active Orders" value={formatNumber(activeOrders.length)} helper="New, on process, or partially served" tone="progress" />
        <MetricCard label="Completion Rate" value={`${ordersInRange.length ? Math.round((completedOrders.length / ordersInRange.length) * 100) : 0}%`} helper="Completed from selected orders" tone="success" />
        <MetricCard label="Avg. Service Time" value={averageServiceTime === null ? "-" : `${averageServiceTime.toFixed(1)} min`} helper="Created to completed timestamp" tone="waiting" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Order Density Heatmap" subtitle="30 operating slots; stronger purple means higher order pressure.">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            {heatmap.map((item) => {
              const style = getHeatmapStyle(item.count);
              return (
                <div
                  key={item.slot}
                  className="rounded-xl border p-3 transition"
                  style={style}
                >
                  <p className="text-xs font-semibold">{item.slot}</p>
                  <p className="mt-2 text-xl font-bold">{item.count}</p>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Order Flow Funnel" subtitle="Order count across operational stages.">
          <div className="space-y-3">
            {flow.map((item, index) => {
              const max = Math.max(1, ...flow.map((stage) => stage.count));
              return (
                <div key={item.status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-gray-900">{item.label}</span>
                    <span className="text-gray-500">{item.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, (item.count / max) * 100)}%`,
                        backgroundColor:
                          OWNER_CHART_SERIES[index % OWNER_CHART_SERIES.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Average Service Time" subtitle="Created-to-completed duration for completed orders.">
          {serviceTrend.some((item) => item.averageMinutes > 0) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serviceTrend} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Line type="monotone" dataKey="averageMinutes" name="Avg. Minutes" stroke={OWNER_CHART_COLORS.INDIGO_BLUE} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="Completed timestamp data is not available yet" />
          )}
        </ChartCard>

        <ChartCard title="Active vs Completed Trend" subtitle="Shows flow balance over the selected period.">
          {completionTrend.some((item) => item.active || item.completed) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completionTrend} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Legend />
                  <Bar dataKey="active" name="Active" fill={OWNER_CHART_COLORS.SOFT_YELLOW} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill={OWNER_CHART_COLORS.SOFT_GREEN} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="No operation flow data in this period" />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export {
  CustomerDashboard,
  CustomerDiscountDashboard,
  InventoryDashboard,
  OperationDashboard,
  SalesDashboard,
  StaffDashboard,
};
