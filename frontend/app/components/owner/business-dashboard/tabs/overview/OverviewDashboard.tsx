"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  OWNER_CHART_COLORS,
  OWNER_SEMANTIC_TONES,
} from "@/lib/constants/theme";
import GenerateRecommendationPanel from "../../ai/GenerateRecommendationPanel";
import DateRangeFilter, {
  getDefaultDateRange,
  type DateRangeValue,
} from "../DateRangeFilter";
import {
  ChartCard,
  MetricCard,
  StandardTooltip,
} from "../shared/DashboardPrimitives";
import {
  formatCurrency,
  formatNumber,
  getOrderBusinessDate,
  getPreviousDateRange,
  isValidSalesOrder,
  toNumber,
} from "../shared/dashboardUtils";
import BusinessHealthSummary from "./BusinessHealthSummary";
import {
  buildAovTrendComparison,
  buildBusinessHealth,
  buildPaymentMix,
  buildRevenueTrendForRange,
} from "./overviewLogic";
import useOverviewDashboardData from "./useOverviewDashboardData";

export default function OverviewDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const data = useOverviewDashboardData();
  const previousRange = getPreviousDateRange(dateRange);
  const rangeOrders = data.orders.filter(
    (order) =>
      getOrderBusinessDate(order) >= dateRange.startDate &&
      getOrderBusinessDate(order) <= dateRange.endDate,
  );
  const previousOrders = data.orders.filter(
    (order) =>
      getOrderBusinessDate(order) >= previousRange.startDate &&
      getOrderBusinessDate(order) <= previousRange.endDate,
  );
  const validRangeOrders = rangeOrders.filter(isValidSalesOrder);
  const revenue = validRangeOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const completed = rangeOrders.filter((order) =>
    ["completed", "served", "paid"].includes(String(order.status ?? "").toLowerCase()),
  ).length;
  const cancelled = rangeOrders.filter((order) =>
    ["cancelled", "canceled"].includes(String(order.status ?? "").toLowerCase()),
  ).length;
  const aov = validRangeOrders.length ? revenue / validRangeOrders.length : 0;
  const paymentMix = buildPaymentMix(rangeOrders);
  const topPayment = paymentMix[0]?.name ?? "-";
  const businessHealth = buildBusinessHealth(rangeOrders, previousOrders);

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="overview" period={dateRange} />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {data.error ? (
        <div
          className={`rounded-xl border p-3 text-sm font-medium ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}
        >
          Some dashboard data could not be loaded. Available widgets will still render.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Total Revenue"
          value={data.loading ? "Loading" : formatCurrency(revenue)}
          helper="Total valid revenue"
          tone="progress"
        />
        <MetricCard
          label="Total Orders"
          value={data.loading ? "Loading" : formatNumber(validRangeOrders.length)}
          helper="Paid or valid orders in range"
          tone="info"
        />
        <MetricCard
          label="Average Order Value"
          value={data.loading ? "Loading" : formatCurrency(aov)}
          helper="Revenue per valid order"
          tone="success"
        />
        <MetricCard
          label="Completed Orders"
          value={data.loading ? "Loading" : formatNumber(completed)}
          helper="Finished order flow in range"
          tone="neutral"
        />
        <MetricCard
          label="Cancelled Orders"
          value={data.loading ? "Loading" : formatNumber(cancelled)}
          helper="Risk and loss signal in range"
          tone={cancelled > 0 ? "danger" : "success"}
        />
        <MetricCard
          label="Top Payment Method"
          value={topPayment}
          helper="Dominant method in range"
          tone="waiting"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Revenue Trend"
          subtitle="Revenue and order movement for the selected period."
        >
          <div className="h-90">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={buildRevenueTrendForRange(rangeOrders, dateRange)}
                margin={{ left: -8, right: 12 }}
              >
                <defs>
                  <linearGradient id="ownerRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={OWNER_CHART_COLORS.INDIGO_BLUE}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={OWNER_CHART_COLORS.INDIGO_BLUE}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={OWNER_SEMANTIC_TONES.neutral.border}
                />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Number(value) / 1000}k`}
                />
                <Tooltip content={<StandardTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={OWNER_CHART_COLORS.INDIGO_BLUE}
                  fill="url(#ownerRevenue)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Average Order Value Trend"
          subtitle="Measures transaction quality."
        >
          <div className="h-90">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={buildAovTrendComparison(data.orders, dateRange)}
                margin={{ left: -8, right: 12 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={OWNER_SEMANTIC_TONES.neutral.border}
                />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Number(value) / 1000}k`}
                />
                <Tooltip content={<StandardTooltip />} />
                <Line
                  type="monotone"
                  dataKey="current"
                  name="Selected Period AOV"
                  stroke={OWNER_CHART_COLORS.INDIGO_BLUE}
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  name="Previous Period AOV"
                  stroke={OWNER_CHART_COLORS.SOFT_SKY_BLUE}
                  strokeWidth={3}
                  strokeDasharray="6 6"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Business Health Summary"
          subtitle="Combines growth, completion, cancellation, and service-time."
        >
          <BusinessHealthSummary health={businessHealth} />
        </ChartCard>
      </div>
    </div>
  );
}
