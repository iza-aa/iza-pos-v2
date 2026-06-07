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
import { ExportButton } from "@/app/components/shared";
import { useLanguage } from "@/app/components/shared/i18n";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import { showError, showSuccess } from "@/lib/services/errorHandling";
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
import { exportWorkbook } from "../shared/exportUtils";

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

const formatOptionalCurrency = (value: number | null | undefined, fallback: string) => {
  return value === null || value === undefined ? fallback : formatCurrency(value);
};

const sumAvailableCost = (rows: Array<{ estimatedCost: number | null }>) => {
  const availableRows = rows.filter((row) => row.estimatedCost !== null);
  if (!availableRows.length) return null;

  return availableRows.reduce((sum, row) => sum + (row.estimatedCost ?? 0), 0);
};

const formatMissingCostNames = (rows: Array<{ name: string }>) => {
  const visibleNames = rows.slice(0, 3).map((row) => row.name);
  const remainingCount = rows.length - visibleNames.length;

  if (remainingCount <= 0) return visibleNames.join(", ");

  return `${visibleNames.join(", ")} and ${remainingCount} more`;
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

function getStatusLabel(status: string, t: (key: string) => string) {
  if (status === "Star Menu") return t("owner.dashboard.status.starMenu");
  if (status === "Needs Cost Data") return t("owner.dashboard.status.needsCostData");
  if (status === "Low Margin") return t("owner.dashboard.status.lowMargin");
  if (status === "No Sales") return t("owner.dashboard.status.noSales");
  if (status === "Low Demand") return t("owner.dashboard.status.lowDemand");
  if (status === "Healthy") return t("owner.dashboard.status.healthy");
  return status;
}

export default function SalesDashboard() {
  const { t } = useLanguage();
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
  const missingCostRows = profitabilityRows.filter(
    (row) => row.estimatedCost === null || row.grossProfit === null || row.margin === null,
  );
  const missingCostNames = formatMissingCostNames(missingCostRows);
  const availableFoodCost =
    salesSummary.summary.estimatedCogs ?? sumAvailableCost(profitabilityRows);
  const netProfitEstimate =
    salesSummary.summary.netProfitEstimate ??
    (availableFoodCost === null
      ? null
      : salesSummary.summary.netSales -
        availableFoodCost -
        salesSummary.summary.operatingExpenses);
  const hasPartialCostData =
    missingCostRows.length > 0 && availableFoodCost !== null;
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
      header: t("owner.sales.paymentMethod"),
      render: (row) => (
        <span className={`${row.isTotal ? "font-bold " : "text-gray-950 "}`}>
          {row.method}
        </span>
      ),
      isAction: true,
    },
    {
      key: "orders",
      header: t("owner.sales.orders"),
      render: (row) => (
        <span className={row.isTotal ? "font-bold text-gray-950" : ""}>
          {formatNumber(row.orders)}
        </span>
      ),
      isAction: true,
    },
    {
      key: "amount",
      header: t("owner.sales.amount"),
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
      header: t("owner.sales.menuName"),
      render: (item) => <span className="font-semibold text-gray-900">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    {
      key: "category",
      header: t("owner.sales.category"),
      render: (item) => item.category,
      sortValue: (item) => item.category,
    },
    {
      key: "sold",
      header: t("owner.sales.totalSold"),
      render: (item) => formatNumber(item.sold),
      sortValue: (item) => item.sold,
    },
    {
      key: "revenue",
      header: t("owner.sales.revenue"),
      render: (item) => formatCurrency(item.revenue),
      sortValue: (item) => item.revenue,
    },
    {
      key: "estimatedCost",
      header: t("owner.sales.cogsEstimate"),
      render: (item) =>
        item.estimatedCost === null ? t("owner.dashboard.costDataNeededLower") : formatCurrency(item.estimatedCost),
      sortValue: (item) => item.estimatedCost ?? -1,
    },
    {
      key: "grossProfit",
      header: t("owner.sales.grossProfit"),
      render: (item) => (item.grossProfit === null ? "-" : formatCurrency(item.grossProfit)),
      sortValue: (item) => item.grossProfit ?? -1,
    },
    {
      key: "margin",
      header: t("owner.sales.profitMargin"),
      render: (item) => (item.margin === null ? "-" : `${item.margin.toFixed(1)}%`),
      sortValue: (item) => item.margin ?? -1,
    },
    {
      key: "status",
      header: t("owner.sales.status"),
      render: (item) => (
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(item.status)}`}
        >
          {getStatusLabel(item.status, t)}
        </span>
      ),
      sortValue: (item) => item.status,
    },
  ];
  const exportSalesWorkbook = async () => {
    try {
      await exportWorkbook(`owner-sales-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`, [
        {
          name: t("owner.sales.sheet.summary"),
          rows: [
            [t("owner.staff.metric"), t("owner.staff.sheet.value")],
            [t("owner.staff.sheet.startDate"), dateRange.startDate],
            [t("owner.staff.sheet.endDate"), dateRange.endDate],
            [t("owner.sales.revenue"), salesSummary.summary.grossSales],
            [t("owner.bookkeeping.netSales"), salesSummary.summary.netSales],
            [t("owner.sales.discounts"), salesSummary.summary.discounts],
            [t("owner.sales.cogsEstimate"), availableFoodCost ?? ""],
            [t("owner.sales.netProfitEstimate"), netProfitEstimate ?? ""],
            [t("owner.sales.orders"), salesSummary.summary.totalOrders],
          ],
        },
        {
          name: t("owner.sales.sheet.paymentBreakdown"),
          rows: [[t("owner.sales.paymentMethod"), t("owner.sales.orders"), t("owner.sales.amount")], ...paymentBreakdownRows.map((row) => [row.method, row.orders, row.amount])],
        },
        {
          name: t("owner.sales.sheet.menuProfitability"),
          rows: [
            [t("owner.sales.menuName"), t("owner.sales.category"), t("owner.sales.sold"), t("owner.sales.revenue"), t("owner.sales.cogsEstimate"), t("owner.sales.grossProfit"), t("owner.sales.profitMargin"), t("owner.sales.status")],
            ...profitabilityRows.map((row) => [
              row.name,
              row.category,
              row.sold,
              row.revenue,
              row.estimatedCost ?? "",
              row.grossProfit ?? "",
              row.margin ?? "",
              row.status,
            ]),
          ],
        },
      ]);
      showSuccess(t("owner.sales.exportSuccess"));
    } catch (error) {
      console.error("Failed to export sales report:", error);
      showError(t("owner.sales.exportError"));
    }
  };

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="sales" period={dateRange} />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />
      <div className="flex justify-end">
        <ExportButton
          label={t("owner.sales.export")}
          disabled={data.loading || salesSummary.loading}
          items={[
            {
              id: "excel",
              label: t("owner.sales.downloadExcel"),
              onClick: () => void exportSalesWorkbook(),
              disabled: data.loading || salesSummary.loading,
            },
          ]}
        />
      </div>

      {data.error ? (
        <div
          className={`rounded-xl border p-3 text-sm font-medium ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}
        >
          {t("owner.sales.dataLoadWarning")}
        </div>
      ) : null}

      {salesSummary.error ? (
        <div
          className={`rounded-xl border p-3 text-sm font-medium ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}
        >
          {t("owner.sales.financialLoadWarning")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label={t("owner.sales.netProfitEstimate")}
          value={formatOptionalCurrency(netProfitEstimate, t("owner.dashboard.costDataNeeded"))}
          helper={
            hasPartialCostData
              ? t("owner.sales.partialCostHelper", { count: missingCostRows.length, plural: missingCostRows.length === 1 ? "" : "s" })
              : missingCostRows.length
                ? t("owner.sales.costNeededHelper", { count: missingCostRows.length, plural: missingCostRows.length === 1 ? "" : "s" })
                : t("owner.sales.netProfitFullHelper")
          }
          tone={missingCostRows.length ? "warning" : "success"}
        />
        <MetricCard
          label={t("owner.sales.revenue")}
          value={formatCurrency(salesSummary.summary.grossSales)}
          helper={t("owner.sales.revenueHelper")}
          tone="progress"
        />
        <MetricCard
          label={t("owner.sales.discounts")}
          value={formatCurrency(salesSummary.summary.discounts)}
          helper={t("owner.sales.discountsHelper")}
          tone="premium"
        />
        <MetricCard
          label={t("owner.sales.foodCost")}
          value={formatOptionalCurrency(availableFoodCost, t("owner.dashboard.costDataNeeded"))}
          helper={
            hasPartialCostData
              ? t("owner.sales.partialCostHelper", { count: missingCostRows.length, plural: missingCostRows.length === 1 ? "" : "s" })
              : missingCostRows.length
                ? t("owner.sales.costNeededHelper", { count: missingCostRows.length, plural: missingCostRows.length === 1 ? "" : "s" })
                : t("owner.sales.foodCostFullHelper")
          }
          tone={missingCostRows.length ? "warning" : "coffee"}
        />
        <MetricCard
          label={t("owner.sales.operatingExpenses")}
          value={formatCurrency(salesSummary.summary.operatingExpenses)}
          helper={t("owner.sales.operatingExpensesHelper")}
          tone="waiting"
        />
        <MetricCard
          label={t("owner.sales.taxCollected")}
          value={formatCurrency(salesSummary.summary.taxCollected)}
          helper={t("owner.sales.taxCollectedHelper")}
          tone="neutral"
        />
      </div>

      {missingCostRows.length ? (
        <div
          className={`rounded-xl border p-4 text-sm ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}
        >
          <p className="font-bold text-gray-900">{t("owner.sales.incompleteCostTitle")}</p>
          <p className="mt-1 leading-6">
            {t("owner.sales.incompleteCostMessage", {
              available: availableFoodCost === null ? "." : ` (${formatCurrency(availableFoodCost)}).`,
              count: missingCostRows.length,
              plural: missingCostRows.length === 1 ? "" : "s",
              names: missingCostNames,
            })}
          </p>
        </div>
      ) : null}

      <ChartCard
        title={t("owner.sales.paymentBreakdown")}
        subtitle={t("owner.sales.paymentBreakdownSubtitle")}
      >
        <StandardTable
          columns={paymentColumns}
          data={paymentBreakdownRows}
          getRowKey={(row) => (row.isTotal ? "total" : row.method)}
          emptyLabel={salesSummary.loading ? t("owner.sales.loadingPayment") : t("owner.sales.noPayment")}
          loading={salesSummary.loading}
          minWidthClassName="min-w-[620px]"
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("owner.sales.menuQuadrant")}
          subtitle={t("owner.sales.menuQuadrantSubtitle")}
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
                    name={t("owner.sales.sold")}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="quadrantValue"
                    name={t("owner.sales.revenue")}
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
            <EmptyState label={t("owner.sales.noMenuSalesData")} />
          )}
        </ChartCard>

        <ChartCard title={t("owner.sales.topSellingMenu")} subtitle={t("owner.sales.topSellingMenuSubtitle")}>
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
            <EmptyState label={t("owner.sales.noTopMenu")} />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title={t("owner.sales.revenueByCategory")}
        subtitle={t("owner.sales.revenueByCategorySubtitle")}
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
          <EmptyState label={t("owner.sales.noCategoryRevenue")} />
        )}
      </ChartCard>

      <ChartCard
        title={t("owner.sales.profitabilityTable")}
        subtitle={t("owner.sales.profitabilitySubtitle")}
      >
        <StandardTable
          columns={profitabilityColumns}
          data={profitabilityRows}
          getRowKey={(item) => item.id}
          emptyLabel={
            salesSummary.loading || data.loading
              ? t("owner.sales.loadingProfitability")
              : t("owner.sales.noProfitability")
          }
          loading={salesSummary.loading || data.loading}
        />
      </ChartCard>
    </div>
  );
}
