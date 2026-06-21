"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
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
  buildSalesAovTrend,
  buildSalesPerformance,
  buildSalesRevenueTrend,
  buildTopSellingMenus,
} from "./salesLogic";
import useBookkeepingSalesSummary from "./useBookkeepingSalesSummary";
import useSalesDashboardData from "./useSalesDashboardData";
import type { PaymentBreakdownRow } from "@/lib/services/bookkeeping/bookkeepingTypes";
import {
  exportReport,
  getReportExportItems,
  type ReportExportFormat,
} from "@/lib/utils/reportExport";

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

const normalizeProductName = (value: string | null | undefined) =>
  String(value ?? "").trim().toLowerCase();

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
  const products = useMemo(
    () => buildSalesPerformance(data, dateRange),
    [data, dateRange],
  );
  const topMenus = useMemo(() => buildTopSellingMenus(products), [products]);
  const categoryRevenue = useMemo(() => buildCategoryRevenue(products), [products]);
  const revenueTrend = useMemo(
    () => buildSalesRevenueTrend(data.orders, dateRange),
    [data.orders, dateRange.endDate, dateRange.startDate],
  );
  const aovTrend = useMemo(
    () => buildSalesAovTrend(data.orders, dateRange),
    [data.orders, dateRange.endDate, dateRange.startDate],
  );
  const paymentTotalAmount = salesSummary.paymentBreakdown.reduce((sum, row) => sum + row.amount, 0);
  type ProductPerformanceRow = (typeof products)[number];
  const profitabilityRows: ProductPerformanceRow[] = useMemo(() => {
    if (!salesSummary.menuMargins.length) return products;

    const categoryById = new Map(
      data.categories.map((category) => [
        category.id,
        category.name || t("owner.sales.uncategorized"),
      ]),
    );
    const catalogById = new Map(data.products.map((product) => [product.id, product]));
    const catalogByName = new Map(
      data.products.map((product) => [
        normalizeProductName(product.name),
        product,
      ]),
    );
    const resolveCatalogCategory = (id: string, name: string) => {
      const catalogProduct =
        catalogById.get(id) ?? catalogByName.get(normalizeProductName(name));
      const relation = Array.isArray(catalogProduct?.category)
        ? catalogProduct.category[0]
        : catalogProduct?.category;

      return (
        relation?.name ||
        categoryById.get(catalogProduct?.category_id ?? "") ||
        t("owner.sales.uncategorized")
      );
    };
    const productsByKey = new Map<string, ProductPerformanceRow>();
    products.forEach((product) => {
      productsByKey.set(product.id, product);
      productsByKey.set(normalizeProductName(product.name), product);
    });

    const rowsByProduct = salesSummary.menuMargins.reduce((result, row) => {
      const matchingProduct =
        productsByKey.get(row.id) ??
        productsByKey.get(normalizeProductName(row.menuName));
      const id = matchingProduct?.id ?? row.id;
      const existing = result.get(id);
      const sold = (existing?.sold ?? 0) + row.quantitySold;
      const revenue = (existing?.revenue ?? 0) + row.revenue;
      const estimatedCost =
        existing?.estimatedCost === null || row.estimatedCogs === null
          ? null
          : (existing?.estimatedCost ?? 0) + row.estimatedCogs;
      const grossProfit = estimatedCost === null ? null : revenue - estimatedCost;
      const margin =
        grossProfit === null || revenue <= 0 ? null : (grossProfit / revenue) * 100;

      result.set(id, {
        id,
        name: matchingProduct?.name ?? existing?.name ?? row.menuName,
        category:
          matchingProduct?.category && matchingProduct.category !== "-"
            ? matchingProduct.category
            : existing?.category && existing.category !== "-"
              ? existing.category
              : resolveCatalogCategory(row.id, row.menuName),
        sold,
        revenue,
        estimatedCost,
        grossProfit,
        margin,
        status: getProfitabilityStatus({
          status: row.status,
          sold,
          revenue,
          margin,
        }),
      });

      return result;
    }, new Map<string, ProductPerformanceRow>());

    return Array.from(rowsByProduct.values());
  }, [
    data.categories,
    data.products,
    products,
    salesSummary.menuMargins,
    t,
  ]);
  const missingCostRows = profitabilityRows.filter(
    (row) => row.estimatedCost === null || row.grossProfit === null || row.margin === null,
  );
  const availableFoodCost =
    salesSummary.summary.estimatedCogs ?? sumAvailableCost(profitabilityRows);
  const netProfitEstimate = salesSummary.summary.netProfitEstimate;
  const averageOrderValue = salesSummary.summary.totalOrders
    ? salesSummary.summary.netSales / salesSummary.summary.totalOrders
    : 0;
  const serviceChargeAdjustments =
    salesSummary.summary.netSales -
    (salesSummary.summary.grossSales - salesSummary.summary.discounts);
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
  const exportSalesReport = async (format: ReportExportFormat) => {
    try {
      await exportReport(format, {
        filename: `owner-sales-${dateRange.startDate}-to-${dateRange.endDate}`,
        title: `${t("owner.dashboard.sales")} Report`,
        subtitle: `${dateRange.startDate} - ${dateRange.endDate}`,
        sheets: [{
          name: t("owner.sales.sheet.summary"),
          description: "Owner-facing Sales KPIs followed by the supporting profit reconciliation.",
          rows: [
            [t("owner.staff.metric"), t("owner.staff.sheet.value")],
            [t("owner.staff.sheet.startDate"), dateRange.startDate],
            [t("owner.staff.sheet.endDate"), dateRange.endDate],
            [t("owner.bookkeeping.netSales"), salesSummary.summary.netSales],
            [t("owner.sales.totalOrders"), salesSummary.summary.totalOrders],
            [t("owner.sales.averageOrderValue"), averageOrderValue],
            [t("owner.sales.netProfitEstimate"), netProfitEstimate ?? ""],
            [t("owner.sales.grossSales"), salesSummary.summary.grossSales],
            [t("owner.sales.discounts"), salesSummary.summary.discounts],
            [t("owner.sales.serviceChargeAdjustments"), serviceChargeAdjustments],
            [t("owner.sales.taxCollected"), salesSummary.summary.taxCollected],
            [t("owner.sales.cogsEstimate"), salesSummary.summary.estimatedCogs ?? ""],
            [t("owner.sales.operatingExpenses"), salesSummary.summary.operatingExpenses],
            [t("owner.sales.calculation"), t("owner.sales.netProfitFormula")],
          ],
        },
        {
          name: t("owner.sales.sheet.trends"),
          description: "Net Sales and Average Order Value movement for the selected and previous periods.",
          rows: [
            [
              t("owner.overview.sheet.period"),
              t("owner.bookkeeping.netSales"),
              t("owner.sales.selectedPeriodAov"),
              t("owner.sales.previousPeriodAov"),
            ],
            ...revenueTrend.map((row, index) => [
              row.date,
              row.revenue,
              aovTrend[index]?.current ?? 0,
              aovTrend[index]?.previous ?? 0,
            ]),
          ],
        },
        {
          name: t("owner.sales.sheet.paymentBreakdown"),
          description: "Payment method totals for valid sales in the selected date range.",
          rows: [[t("owner.sales.paymentMethod"), t("owner.sales.orders"), t("owner.sales.amount")], ...paymentBreakdownRows.map((row) => [row.method, row.orders, row.amount])],
        },
        {
          name: t("owner.sales.sheet.categoryPerformance"),
          description: "Sales value grouped by menu category.",
          rows: [
            [t("owner.sales.category"), t("owner.sales.revenue")],
            ...categoryRevenue.map((row) => [row.name, row.revenue]),
          ],
        },
        {
          name: t("owner.sales.sheet.menuProfitability"),
          description: "Menu-level sales and profitability. Missing cost values indicate incomplete recipe or inventory cost data.",
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
              getStatusLabel(row.status, t),
            ]),
          ],
        }],
      });
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
          items={getReportExportItems({
            onExport: (format) => void exportSalesReport(format),
            disabled: data.loading || salesSummary.loading,
          })}
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("owner.bookkeeping.netSales")}
          value={formatCurrency(salesSummary.summary.netSales)}
          helper={t("owner.sales.netSalesHelper")}
          tone="info"
        />
        <MetricCard
          label={t("owner.sales.totalOrders")}
          value={formatNumber(salesSummary.summary.totalOrders)}
          helper={t("owner.sales.totalOrdersHelper")}
          tone="progress"
        />
        <MetricCard
          label={t("owner.sales.averageOrderValue")}
          value={formatCurrency(averageOrderValue)}
          helper={t("owner.sales.averageOrderValueHelper")}
          tone="premium"
        />
        <MetricCard
          label={t("owner.sales.netProfitEstimate")}
          value={formatOptionalCurrency(netProfitEstimate, t("owner.dashboard.costDataNeeded"))}
          helper={t("owner.sales.netProfitShortHelper")}
          tone={missingCostRows.length ? "warning" : "success"}
        />
      </div>

      {missingCostRows.length ? (
        <div
          className={`rounded-xl border p-4 text-sm ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}
        >
          <p className="font-bold text-gray-900">{t("owner.sales.incompleteCostTitle")}</p>
          <p className="mt-1 leading-5">
            {t("owner.sales.incompleteCostShortMessage", { count: missingCostRows.length })}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("owner.sales.revenueTrend")}
          subtitle={t("owner.sales.revenueTrendSubtitle")}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ left: -8, right: 16 }}>
                <defs>
                  <linearGradient id="sales-revenue-trend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={OWNER_CHART_COLORS.INDIGO_BLUE} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={OWNER_CHART_COLORS.INDIGO_BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatAxisCurrency(Number(value))}
                  width={72}
                />
                <Tooltip content={<StandardTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name={t("owner.bookkeeping.netSales")}
                  stroke={OWNER_CHART_COLORS.INDIGO_BLUE}
                  fill="url(#sales-revenue-trend)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("owner.sales.aovTrend")}
          subtitle={t("owner.sales.aovTrendSubtitle")}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aovTrend} margin={{ left: -8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatAxisCurrency(Number(value))}
                  width={72}
                />
                <Tooltip content={<StandardTooltip />} />
                <Line
                  type="monotone"
                  dataKey="current"
                  name={t("owner.sales.selectedPeriodAov")}
                  stroke={OWNER_CHART_COLORS.INDIGO_BLUE}
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  name={t("owner.sales.previousPeriodAov")}
                  stroke={OWNER_CHART_COLORS.SOFT_SKY_BLUE}
                  strokeWidth={3}
                  strokeDasharray="6 6"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

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

      <div className="grid grid-cols-1 gap-4">
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
