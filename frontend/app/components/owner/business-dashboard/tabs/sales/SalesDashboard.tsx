"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { OWNER_CHART_COLORS, OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import GenerateRecommendationPanel from "../../ai/GenerateRecommendationPanel";
import DateRangeFilter, {
  getDefaultDateRange,
  type DateRangeValue,
} from "../DateRangeFilter";
import {
  ChartCard,
  EmptyState,
  MetricCard,
  StandardTooltip,
} from "../shared/DashboardPrimitives";
import { formatCurrency, formatNumber } from "../shared/dashboardUtils";
import {
  buildCategoryRevenue,
  buildSalesPerformance,
  buildTopSellingMenus,
  getQuadrantData,
} from "./salesLogic";
import useBookkeepingSalesSummary from "./useBookkeepingSalesSummary";
import useSalesDashboardData from "./useSalesDashboardData";
import type { PaymentBreakdownRow } from "@/lib/services/bookkeeping/bookkeepingTypes";

type PaymentBreakdownDisplayRow = PaymentBreakdownRow & {
  isTotal?: boolean;
};

type ProfitabilityStatusInput = {
  status?: "ready" | "cost_data_needed" | "recipe_needed";
  sold: number;
  revenue: number;
  margin: number | null;
};

const formatAxisCurrency = (value: number) => {
  if (value >= 1_000_000) return `Rp ${Number(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `Rp ${Number(value / 1_000).toFixed(0)}k`;
  return `Rp ${Number(value).toFixed(0)}`;
};

const formatOptionalCurrency = (value: number | null | undefined) => {
  return value === null || value === undefined ? "Cost Data Needed" : formatCurrency(value);
};

function statusTone(status: string) {
  if (status === "Star Menu" || status === "Healthy") {
    return OWNER_SEMANTIC_TONES.success.badgeClass;
  }

  if (status === "Needs Cost Data") {
    return OWNER_SEMANTIC_TONES.warning.badgeClass;
  }

  if (status === "Low Margin") {
    return OWNER_SEMANTIC_TONES.danger.badgeClass;
  }

  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
}

function getProfitabilityStatus({ status, sold, revenue, margin }: ProfitabilityStatusInput) {
  if (status === "cost_data_needed" || status === "recipe_needed" || margin === null) {
    return "Needs Cost Data";
  }

  if (revenue <= 0 || sold <= 0) return "No Sales";
  if (sold >= 10 && margin >= 60) return "Star Menu";
  if (margin < 30) return "Low Margin";
  if (sold < 3) return "Low Demand";
  return "Healthy";
}

export default function SalesDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const data = useSalesDashboardData();
  const salesSummary = useBookkeepingSalesSummary(dateRange);
  const products = buildSalesPerformance(data, dateRange);
  const topMenus = buildTopSellingMenus(products);
  const categoryRevenue = buildCategoryRevenue(products);
  const quadrantData = getQuadrantData(products);
  const paymentTotalAmount = salesSummary.paymentBreakdown.reduce((sum, row) => sum + row.amount, 0);
  type ProductPerformanceRow = (typeof products)[number];
  const productsByKey = new Map<string, ProductPerformanceRow>();

  products.forEach((product) => {
    productsByKey.set(product.id, product);
    productsByKey.set(product.name.trim().toLowerCase(), product);
  });

  const profitabilityRows: ProductPerformanceRow[] = salesSummary.menuMargins.length
    ? salesSummary.menuMargins.map((row) => {
        const matchingProduct =
          productsByKey.get(row.id) ?? productsByKey.get(row.menuName.trim().toLowerCase());

        return {
          id: row.id,
          name: row.menuName,
          category: matchingProduct?.category ?? "-",
          sold: row.quantitySold,
          revenue: row.revenue,
          estimatedCost: row.estimatedCogs,
          grossProfit: row.grossProfit,
          margin: row.marginPct,
          status: getProfitabilityStatus({
            status: row.status,
            sold: row.quantitySold,
            revenue: row.revenue,
            margin: row.marginPct,
          }),
        };
      })
    : products;
  const paymentBreakdownRows: PaymentBreakdownDisplayRow[] =
    salesSummary.paymentBreakdown.length > 0 || salesSummary.summary.totalOrders > 0
      ? [
          ...salesSummary.paymentBreakdown,
          {
            method: "Total",
            orders: salesSummary.summary.totalOrders,
            amount: paymentTotalAmount,
            isTotal: true,
          },
        ]
      : [];
  const paymentColumns: Array<StandardTableColumn<PaymentBreakdownDisplayRow>> = [
    {
      key: "method",
      header: "Payment Method",
      render: (row) => (
        <span className={`${row.isTotal ? "font-bold " : "text-gray-950 "}`}>
          {row.method}
        </span>
      ),
      isAction: true,
    },
    {
      key: "orders",
      header: "Orders",
      render: (row) => (
        <span className={row.isTotal ? "font-bold text-gray-950" : ""}>
          {formatNumber(row.orders)}
        </span>
      ),
      isAction: true,
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => (
        <span className={`${row.isTotal ? "text-gray-950 font-bold" : "text-gray-900"}`}>
          {formatCurrency(row.amount)}
        </span>
      ),
      isAction: true,
    },
  ];
  const profitabilityColumns: Array<StandardTableColumn<ProductPerformanceRow>> = [
    {
      key: "name",
      header: "Menu Name",
      render: (item) => <span className="font-semibold text-gray-900">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    {
      key: "category",
      header: "Category",
      render: (item) => item.category,
      sortValue: (item) => item.category,
    },
    {
      key: "sold",
      header: "Total Sold",
      render: (item) => formatNumber(item.sold),
      sortValue: (item) => item.sold,
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (item) => formatCurrency(item.revenue),
      sortValue: (item) => item.revenue,
    },
    {
      key: "estimatedCost",
      header: "COGS Estimate",
      render: (item) =>
        item.estimatedCost === null ? "Cost data needed" : formatCurrency(item.estimatedCost),
      sortValue: (item) => item.estimatedCost ?? -1,
    },
    {
      key: "grossProfit",
      header: "Gross Profit",
      render: (item) => (item.grossProfit === null ? "-" : formatCurrency(item.grossProfit)),
      sortValue: (item) => item.grossProfit ?? -1,
    },
    {
      key: "margin",
      header: "Profit Margin",
      render: (item) => (item.margin === null ? "-" : `${item.margin.toFixed(1)}%`),
      sortValue: (item) => item.margin ?? -1,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(item.status)}`}
        >
          {item.status}
        </span>
      ),
      sortValue: (item) => item.status,
    },
  ];

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="sales" period={dateRange} />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {data.error ? (
        <div
          className={`rounded-xl border p-3 text-sm font-medium ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}
        >
          Some sales data could not be loaded. Available widgets will still render.
        </div>
      ) : null}

      {salesSummary.error ? (
        <div
          className={`rounded-xl border p-3 text-sm font-medium ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}
        >
          Sales financial summary could not be loaded. Product performance widgets will still render.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Net Profit Estimate"
          value={formatOptionalCurrency(salesSummary.summary.netProfitEstimate)}
          helper="Revenue minus discounts, food cost, and operating expenses."
          tone={salesSummary.summary.netProfitEstimate === null ? "warning" : "success"}
        />
        <MetricCard
          label="Revenue"
          value={formatCurrency(salesSummary.summary.grossSales)}
          helper="Valid order value before any discount or cost."
          tone="progress"
        />
        <MetricCard
          label="Discounts"
          value={formatCurrency(salesSummary.summary.discounts)}
          helper="Reward, voucher, and manual discount impact."
          tone="premium"
        />
        <MetricCard
          label="Food Cost"
          value={formatOptionalCurrency(salesSummary.summary.estimatedCogs)}
          helper="COGS estimate from bookkeeping menu margin data."
          tone={salesSummary.summary.estimatedCogs === null ? "warning" : "coffee"}
        />
        <MetricCard
          label="Operating Expenses"
          value={formatCurrency(salesSummary.summary.operatingExpenses)}
          helper="Recorded operational expenses in this period."
          tone="waiting"
        />
        <MetricCard
          label="Tax Collected"
          value={formatCurrency(salesSummary.summary.taxCollected)}
          helper="Customer tax kept separate from sales revenue."
          tone="neutral"
        />
      </div>

      <ChartCard
        title="Payment Method Breakdown"
        subtitle="Automatic split from valid paid orders in the selected period."
      >
        <StandardTable
          columns={paymentColumns}
          data={paymentBreakdownRows}
          getRowKey={(row) => (row.isTotal ? "total" : row.method)}
          emptyLabel={salesSummary.loading ? "Loading payment data..." : "No payment data in this period."}
          minWidthClassName="min-w-[620px]"
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Menu Quadrant"
          subtitle="Sales volume compared with revenue contribution."
        >
          {quadrantData.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: -8, right: 16, top: 12, bottom: 12 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={OWNER_SEMANTIC_TONES.neutral.border}
                  />
                  <XAxis
                    type="number"
                    dataKey="sold"
                    name="Sold"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="quadrantValue"
                    name="Revenue"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${Number(value) / 1000}k`}
                  />
                  <Tooltip content={<StandardTooltip />} />
                  <Scatter data={quadrantData} fill={OWNER_CHART_COLORS.INDIGO_BLUE}>
                    {quadrantData.map((item, index) => (
                      <Cell
                        key={item.id}
                        fill={
                          index % 2 === 0
                            ? OWNER_CHART_COLORS.INDIGO_BLUE
                            : OWNER_CHART_COLORS.SOFT_SKY_BLUE
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="name"
                      position="right"
                      className="fill-gray-700 text-[11px] font-semibold"
                    />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="No menu sales data yet" />
          )}
        </ChartCard>

        <ChartCard title="Top Selling Menu" subtitle="Best selling items by quantity.">
          {topMenus.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topMenus}
                  layout="vertical"
                  margin={{ left: 16, right: 16 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={OWNER_SEMANTIC_TONES.neutral.border}
                  />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<StandardTooltip />} />
                  <Bar dataKey="sold" radius={[0, 8, 8, 0]}>
                    {topMenus.map((item) => (
                      <Cell key={item.id} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="No top menu data yet" />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Revenue by Category"
        subtitle="Menu revenue grouped by manager menu categories."
      >
        {categoryRevenue.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRevenue} margin={{ left: -8, right: 16 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={OWNER_SEMANTIC_TONES.neutral.border}
                />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatAxisCurrency(Number(value))}
                  width={72}
                />
                <Tooltip content={<StandardTooltip />} />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                  {categoryRevenue.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState label="No category revenue data yet" />
        )}
      </ChartCard>

      <ChartCard
        title="Profitability Table"
        subtitle="COGS estimate uses the same bookkeeping source as Food Cost."
      >
        <StandardTable
          columns={profitabilityColumns}
          data={profitabilityRows}
          getRowKey={(item) => item.id}
          emptyLabel={
            salesSummary.loading || data.loading
              ? "Loading profitability data..."
              : "No profitability data yet."
          }
        />
      </ChartCard>
    </div>
  );
}
