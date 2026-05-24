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
  StandardTooltip,
} from "../shared/DashboardPrimitives";
import { formatCurrency, formatNumber } from "../shared/dashboardUtils";
import {
  buildCategoryRevenue,
  buildSalesPerformance,
  buildTopSellingMenus,
  getQuadrantData,
} from "./salesLogic";
import useSalesDashboardData from "./useSalesDashboardData";

const formatAxisCurrency = (value: number) => {
  if (value >= 1_000_000) return `Rp ${Number(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `Rp ${Number(value / 1_000).toFixed(0)}k`;
  return `Rp ${Number(value).toFixed(0)}`;
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

export default function SalesDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const data = useSalesDashboardData();
  const products = buildSalesPerformance(data, dateRange);
  const topMenus = buildTopSellingMenus(products);
  const categoryRevenue = buildCategoryRevenue(products);
  const quadrantData = getQuadrantData(products);
  type ProductPerformanceRow = (typeof products)[number];
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
      header: "Estimated Cost",
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
        subtitle="Estimated cost uses base recipe and inventory cost data when available."
      >
        <StandardTable
          columns={profitabilityColumns}
          data={products}
          getRowKey={(item) => item.id}
          emptyLabel={data.loading ? "Loading sales data..." : "No profitability data yet."}
        />
      </ChartCard>
    </div>
  );
}
