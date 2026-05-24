"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { OWNER_CHART_COLORS, OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import GenerateRecommendationPanel from "../../ai/GenerateRecommendationPanel";
import DateRangeFilter, {
  getDefaultDateRange,
  type DateRangeValue,
} from "../DateRangeFilter";
import {
  ChartCard,
  DonutChartWithLegend,
  EmptyState,
  MetricCard,
  StandardTooltip,
} from "../shared/DashboardPrimitives";
import { formatCurrency, formatNumber } from "../shared/dashboardUtils";
import {
  buildCustomerPerformance,
  buildNewReturningTrend,
  getLoyaltyInsightSummary,
} from "./customerLogic";
import useCustomerPerformanceData from "./useCustomerPerformanceData";

export default function CustomerPerformanceDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const data = useCustomerPerformanceData();
  const metrics = buildCustomerPerformance(data.orders, dateRange);
  const trend = buildNewReturningTrend(data.orders, dateRange);
  const loyaltyInsight = getLoyaltyInsightSummary(metrics);
  const customerMix = [
    { name: "Member", value: metrics.memberOrders.length },
    { name: "Guest", value: metrics.guestOrders.length },
  ].filter((item) => item.value > 0);
  const aovData = [
    { name: "Member", aov: Math.round(metrics.memberAov) },
    { name: "Guest", aov: Math.round(metrics.guestAov) },
  ];
  const insightTone =
    loyaltyInsight.status === "Healthy"
      ? OWNER_SEMANTIC_TONES.success.badgeClass
      : loyaltyInsight.status === "Watch"
        ? OWNER_SEMANTIC_TONES.warning.badgeClass
        : OWNER_SEMANTIC_TONES.danger.badgeClass;

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="rewards" period={dateRange} />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {data.error ? (
        <div
          className={`rounded-xl border p-3 text-sm font-medium ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}
        >
          Some customer and loyalty data could not be loaded. Available widgets will still render.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Member Orders"
          value={data.loading ? "Loading" : formatNumber(metrics.memberOrders.length)}
          helper="Orders linked to customers"
          tone="premium"
        />
        <MetricCard
          label="Guest Orders"
          value={data.loading ? "Loading" : formatNumber(metrics.guestOrders.length)}
          helper="Orders with guest checkout"
          tone="neutral"
        />
        <MetricCard
          label="Repeat Customer Rate"
          value={data.loading ? "Loading" : `${metrics.repeatCustomerRate.toFixed(1)}%`}
          helper="Repeat incoming customer"
          tone={metrics.repeatCustomerRate >= 30 ? "success" : "warning"}
        />
        <MetricCard
          label="Member AOV"
          value={data.loading ? "Loading" : formatCurrency(metrics.memberAov)}
          helper="Average spend per order"
          tone="success"
        />
        <MetricCard
          label="Reward Usage"
          value={data.loading ? "Loading" : `${metrics.rewardUsageRate.toFixed(1)}%`}
          helper="Valid orders using rewards"
          tone="premium"
        />
        <MetricCard
          label="Discount Cost"
          value={data.loading ? "Loading" : formatCurrency(metrics.discountCost)}
          helper="Total discount impact"
          tone={metrics.discountCost > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Customer Mix" subtitle="Member and guest order composition.">
          <DonutChartWithLegend data={customerMix} emptyLabel="No customer order data yet" />
        </ChartCard>

        <ChartCard
          title="Member vs Guest AOV"
          subtitle="Compares spend quality instead of only revenue share."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aovData} margin={{ left: -8, right: 16 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={OWNER_SEMANTIC_TONES.neutral.border}
                />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Number(value) / 1000}k`}
                />
                <Tooltip content={<StandardTooltip />} />
                <Bar
                  dataKey="aov"
                  fill={OWNER_CHART_COLORS.INDIGO_BLUE}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <ChartCard
          title="New vs Returning Customer Trend"
          subtitle="Tracks whether customer activity is driven by acquisition or retention."
        >
          {trend.some((item) => item.newCustomers || item.returningCustomers) ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={OWNER_SEMANTIC_TONES.neutral.border}
                  />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="newCustomers"
                    name="New Customers"
                    stroke={OWNER_CHART_COLORS.SOFT_SKY_BLUE}
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="returningCustomers"
                    name="Returning Customers"
                    stroke={OWNER_CHART_COLORS.INDIGO_BLUE}
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="No returning customer trend yet" />
          )}
        </ChartCard>

        <ChartCard
          title="Loyalty Insight Summary"
          subtitle="Business signal for retention and reward effectiveness."
        >
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${insightTone}`}>
              <p className="text-xs font-bold uppercase tracking-wide">
                {loyaltyInsight.status}
              </p>
              <p className="mt-3 text-sm leading-6">{loyaltyInsight.summary}</p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <span className="font-semibold text-gray-600">Member Share</span>
                <span className="font-bold text-gray-950">
                  {metrics.memberShare.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <span className="font-semibold text-gray-600">Guest AOV</span>
                <span className="font-bold text-gray-950">
                  {formatCurrency(metrics.guestAov)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <span className="font-semibold text-gray-600">Discount Ratio</span>
                <span className="font-bold text-gray-950">
                  {metrics.discountRatio.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
