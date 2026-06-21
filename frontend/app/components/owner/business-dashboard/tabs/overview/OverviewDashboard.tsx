"use client";

import { useMemo, useState } from "react";
import {
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
import { ExportButton } from "@/app/components/shared";
import { useLanguage } from "@/app/components/shared/i18n";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import DateRangeFilter, {
  getDefaultDateRange,
  type DateRangeValue,
} from "../DateRangeFilter";
import {
  ChartCard,
  MetricCard,
  StandardTooltip,
} from "../shared/DashboardPrimitives";
import useOwnerDashboardData from "../shared/useOwnerDashboardData";
import {
  formatCurrency,
  formatNumber,
  getOrderBusinessDate,
  getPreviousDateRange,
  isValidSalesOrder,
  toNumber,
} from "../shared/dashboardUtils";
import BusinessHealthSummary from "./BusinessHealthSummary";
import useBookkeepingSalesSummary from "../sales/useBookkeepingSalesSummary";
import {
  exportReport,
  getReportExportItems,
  type ReportExportFormat,
} from "@/lib/utils/reportExport";
import {
  buildBusinessAreaOverview,
  buildBusinessAreaTrends,
  buildBusinessHealth,
} from "./overviewLogic";
import GenerateRecommendationPanel from "../../ai/GenerateRecommendationPanel";

export default function OverviewDashboard() {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const [selectedTrendArea, setSelectedTrendArea] = useState<
    "sales" | "customer" | "inventory" | "staff" | "operations"
  >("sales");
  const data = useOwnerDashboardData();
  const salesSummary = useBookkeepingSalesSummary(dateRange);
  const previousRange = useMemo(
    () => getPreviousDateRange(dateRange),
    [dateRange.endDate, dateRange.startDate],
  );
  const rangeOrders = useMemo(
    () =>
      data.orders.filter(
        (order) =>
          getOrderBusinessDate(order) >= dateRange.startDate &&
          getOrderBusinessDate(order) <= dateRange.endDate,
      ),
    [data.orders, dateRange.endDate, dateRange.startDate],
  );
  const previousOrders = useMemo(
    () =>
      data.orders.filter(
        (order) =>
          getOrderBusinessDate(order) >= previousRange.startDate &&
          getOrderBusinessDate(order) <= previousRange.endDate,
      ),
    [data.orders, previousRange.endDate, previousRange.startDate],
  );
  const validRangeOrders = useMemo(
    () => rangeOrders.filter(isValidSalesOrder),
    [rangeOrders],
  );
  const areaSummary = useMemo(
    () =>
      buildBusinessAreaOverview(
        data,
        dateRange,
        previousRange,
        salesSummary.summary,
      ),
    [data, dateRange.endDate, dateRange.startDate, previousRange.endDate, previousRange.startDate, salesSummary.summary],
  );
  const businessHealth = useMemo(
    () => buildBusinessHealth(rangeOrders, previousOrders, salesSummary.summary, areaSummary),
    [areaSummary, previousOrders, rangeOrders, salesSummary.summary],
  );
  const areaTrends = useMemo(
    () => buildBusinessAreaTrends(data, dateRange),
    [data, dateRange.endDate, dateRange.startDate],
  );
  const exportOverviewReport = async (format: ReportExportFormat) => {
    try {
      await exportReport(format, {
        filename: `owner-overview-${dateRange.startDate}-to-${dateRange.endDate}`,
        title: `${t("owner.dashboard.overview")} Report`,
        subtitle: `${dateRange.startDate} - ${dateRange.endDate}`,
        sheets: [{
          name: t("owner.overview.sheet.summary"),
          description: "Executive summary of the five owner dashboard areas.",
          rows: [
            [t("owner.staff.metric"), t("owner.staff.sheet.value")],
            [t("owner.staff.sheet.startDate"), dateRange.startDate],
            [t("owner.staff.sheet.endDate"), dateRange.endDate],
            [t("owner.overview.sheet.netSales"), areaSummary.sales.netSales],
            [t("owner.overview.sheet.validOrders"), validRangeOrders.length],
            [t("owner.customer.repeatRate"), areaSummary.customer.repeatCustomerRate],
            [t("owner.inventory.criticalItems"), areaSummary.inventory.criticalItems],
            [t("owner.staff.attendanceRate"), areaSummary.staff.attendanceRate],
            [t("owner.operation.completionRate"), areaSummary.operations.completionRate],
            [t("owner.overview.businessHealth"), businessHealth.score],
            [t("owner.health.weakestDriver"), businessHealth.weakestDriver],
            [t("owner.health.dataConfidence"), businessHealth.confidence],
          ],
        },
        {
          name: t("owner.overview.sheet.businessAreas"),
          description: "Headline metric, score, status, and owner interpretation for each business area.",
          rows: [
            [
              t("owner.overview.sheet.area"),
              t("owner.staff.metric"),
              t("owner.staff.sheet.value"),
              t("owner.staff.score"),
              t("owner.inventory.sheet.status"),
              t("owner.overview.sheet.ownerRead"),
            ],
            [
              t("owner.dashboard.sales"),
              t("owner.bookkeeping.netSales"),
              formatCurrency(areaSummary.sales.netSales),
              businessHealth.salesAreaScore,
              businessHealth.labels.sales,
              t("owner.overview.salesHelper"),
            ],
            [
              t("owner.dashboard.customer"),
              t("owner.customer.repeatRate"),
              `${areaSummary.customer.repeatCustomerRate.toFixed(1)}%`,
              businessHealth.customerAreaScore,
              businessHealth.labels.customer,
              t("owner.overview.customerHelper"),
            ],
            [
              t("owner.dashboard.inventory"),
              t("owner.inventory.criticalItems"),
              formatNumber(areaSummary.inventory.criticalItems),
              businessHealth.inventoryAreaScore,
              businessHealth.labels.inventory,
              t("owner.overview.inventoryHelper"),
            ],
            [
              t("owner.dashboard.staff"),
              t("owner.staff.attendanceRate"),
              `${areaSummary.staff.attendanceRate.toFixed(1)}%`,
              businessHealth.staffAreaScore,
              businessHealth.labels.staff,
              t("owner.overview.staffHelper"),
            ],
            [
              t("owner.dashboard.operation"),
              t("owner.operation.completionRate"),
              `${areaSummary.operations.completionRate.toFixed(1)}%`,
              businessHealth.operationsAreaScore,
              businessHealth.labels.operations,
              t("owner.overview.operationsHelper"),
            ],
          ],
        },
        {
          name: t("owner.overview.sheet.businessTrends"),
          description: "Comparable 0-100 trend signals used by the Overview chart.",
          rows: [
            [
              t("owner.overview.sheet.period"),
              `${t("owner.dashboard.sales")} ${t("owner.staff.score")}`,
              `${t("owner.dashboard.customer")} ${t("owner.staff.score")}`,
              `${t("owner.dashboard.inventory")} ${t("owner.staff.score")}`,
              `${t("owner.dashboard.staff")} ${t("owner.staff.score")}`,
              `${t("owner.dashboard.operation")} ${t("owner.staff.score")}`,
            ],
            ...areaTrends.map((row) => [
              row.label,
              row.sales,
              row.customer,
              row.inventory,
              row.staff,
              row.operations,
            ]),
          ],
        },
        {
          name: t("owner.overview.sheet.orders"),
          description: "Order records used to support the selected-period Overview metrics.",
          rows: [
            [t("owner.overview.sheet.order"), t("owner.overview.sheet.date"), t("owner.inventory.sheet.status"), t("owner.overview.sheet.payment"), t("owner.overview.sheet.fulfillment"), t("owner.sales.amount")],
            ...rangeOrders.map((order) => [
              order.order_number ?? order.id,
              getOrderBusinessDate(order),
              order.status ?? "",
              order.payment_method ?? "",
              order.fulfillment_method ?? "",
              toNumber(order.total),
            ]),
          ],
        }],
      });
      showSuccess(t("owner.overview.exportSuccess"));
    } catch (error) {
      console.error("Failed to export overview report:", error);
      showError(t("owner.overview.exportError"));
    }
  };

  const trendAreaOptions = [
    {
      key: "sales",
      title: t("owner.dashboard.sales"),
      value: formatCurrency(areaSummary.sales.netSales),
      helper: t("owner.overview.salesHelper"),
      chartHelper: t("owner.overview.salesTrendHelper"),
      color: OWNER_CHART_COLORS.INDIGO_BLUE,
    },
    {
      key: "customer",
      title: t("owner.dashboard.customer"),
      value: `${areaSummary.customer.repeatCustomerRate.toFixed(1)}%`,
      helper: t("owner.overview.customerHelper"),
      chartHelper: t("owner.overview.customerTrendHelper"),
      color: OWNER_CHART_COLORS.SOFT_SKY_BLUE,
    },
    {
      key: "inventory",
      title: t("owner.dashboard.inventory"),
      value: formatNumber(areaSummary.inventory.criticalItems),
      helper: t("owner.overview.inventoryHelper"),
      chartHelper: t("owner.overview.inventoryTrendHelper"),
      color: OWNER_CHART_COLORS.SOFT_GREEN,
    },
    {
      key: "staff",
      title: t("owner.dashboard.staff"),
      value: `${areaSummary.staff.attendanceRate.toFixed(1)}%`,
      helper: t("owner.overview.staffHelper"),
      chartHelper: t("owner.overview.staffTrendHelper"),
      color: OWNER_CHART_COLORS.SOFT_YELLOW,
    },
    {
      key: "operations",
      title: t("owner.dashboard.operation"),
      value: `${areaSummary.operations.completionRate.toFixed(1)}%`,
      helper: t("owner.overview.operationsHelper"),
      chartHelper: t("owner.overview.operationsTrendHelper"),
      color: OWNER_CHART_COLORS.SOFT_ROSE,
    },
  ] as const;
  const selectedTrend =
    trendAreaOptions.find((option) => option.key === selectedTrendArea) ??
    trendAreaOptions[0];

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel
        category="overview"
        period={dateRange}
        summaryLabel={t("owner.overview.insightSummary")}
      />

      <DateRangeFilter value={dateRange} onChange={setDateRange} />
      <div className="flex justify-end">
        <ExportButton
          label={t("owner.overview.export")}
          disabled={data.loading || salesSummary.loading}
          items={getReportExportItems({
            onExport: (format) => void exportOverviewReport(format),
            disabled: data.loading || salesSummary.loading,
          })}
        />
      </div>

      {data.error ? (
        <div
          className={`rounded-xl border p-3 text-sm font-medium ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}
        >
          {t("owner.overview.loadWarning")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label={t("owner.dashboard.sales")}
          value={data.loading || salesSummary.loading ? t("owner.dashboard.loading") : formatCurrency(areaSummary.sales.netSales)}
          helper={t("owner.overview.salesHelper")}
          tone="progress"
        />
        <MetricCard
          label={t("owner.dashboard.customer")}
          value={data.loading ? t("owner.dashboard.loading") : `${areaSummary.customer.repeatCustomerRate.toFixed(1)}%`}
          helper={t("owner.overview.customerHelper")}
          tone="info"
        />
        <MetricCard
          label={t("owner.dashboard.inventory")}
          value={data.loading ? t("owner.dashboard.loading") : formatNumber(areaSummary.inventory.criticalItems)}
          helper={t("owner.overview.inventoryHelper")}
          tone={areaSummary.inventory.criticalItems > 0 ? "warning" : "success"}
        />
        <MetricCard
          label={t("owner.dashboard.staff")}
          value={data.loading ? t("owner.dashboard.loading") : `${areaSummary.staff.attendanceRate.toFixed(1)}%`}
          helper={t("owner.overview.staffHelper")}
          tone="coffee"
        />
        <MetricCard
          label={t("owner.dashboard.operation")}
          value={data.loading ? t("owner.dashboard.loading") : `${areaSummary.operations.completionRate.toFixed(1)}%`}
          helper={t("owner.overview.operationsHelper")}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title={t("owner.overview.businessHealth")}
          subtitle={t("owner.overview.businessHealthSubtitle")}
        >
          <BusinessHealthSummary health={businessHealth} />
        </ChartCard>

        <div className="xl:col-span-2">
          <ChartCard
            title={t("owner.overview.businessAreaTrends")}
            subtitle={selectedTrend.chartHelper}
            actions={
              <select
                value={selectedTrendArea}
                onChange={(event) =>
                  setSelectedTrendArea(
                    event.target.value as typeof selectedTrendArea,
                  )
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-gray-900"
                aria-label={t("owner.overview.selectTrendArea")}
              >
                {trendAreaOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.title}
                  </option>
                ))}
              </select>
            }
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-gray-500">
                {selectedTrend.helper}
              </p>
              <p className="text-xl font-bold text-gray-950">
                {selectedTrend.value}
              </p>
            </div>
            <div className="h-90">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={areaTrends}
                  margin={{ left: -8, right: 16, top: 12, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={OWNER_SEMANTIC_TONES.neutral.border}
                  />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip content={<StandardTooltip />} />
                  <Line
                    type="monotone"
                    dataKey={selectedTrend.key}
                    name={selectedTrend.title}
                    stroke={selectedTrend.color}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
