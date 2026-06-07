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
import { ExportButton } from "@/app/components/shared";
import { useLanguage } from "@/app/components/shared/i18n";
import { showError, showSuccess } from "@/lib/services/errorHandling";
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
import { exportWorkbook } from "../shared/exportUtils";
import {
  buildAovTrendComparison,
  buildBusinessHealth,
  buildPaymentMix,
  buildRevenueTrendForRange,
} from "./overviewLogic";

export default function OverviewDashboard() {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const data = useOwnerDashboardData();
  const salesSummary = useBookkeepingSalesSummary(dateRange);
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
  const businessHealth = buildBusinessHealth(rangeOrders, previousOrders, salesSummary.summary);
  const exportOverviewWorkbook = async () => {
    try {
      await exportWorkbook(`owner-overview-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`, [
        {
          name: t("owner.overview.sheet.summary"),
          rows: [
            [t("owner.staff.metric"), t("owner.staff.sheet.value")],
            [t("owner.staff.sheet.startDate"), dateRange.startDate],
            [t("owner.staff.sheet.endDate"), dateRange.endDate],
            [t("owner.overview.sheet.revenue"), revenue],
            [t("owner.overview.sheet.validOrders"), validRangeOrders.length],
            [t("owner.overview.aov"), aov],
            [t("owner.operation.completedOrders"), completed],
            [t("owner.operation.cancelledOrders"), cancelled],
            [t("owner.overview.topPaymentMethod"), topPayment],
            [t("owner.overview.sheet.grossSales"), salesSummary.summary.grossSales],
            [t("owner.overview.sheet.netSales"), salesSummary.summary.netSales],
            [t("owner.overview.sheet.estimatedCogs"), salesSummary.summary.estimatedCogs ?? ""],
            [t("owner.overview.sheet.grossProfit"), salesSummary.summary.grossProfit ?? ""],
            [t("owner.overview.sheet.netProfitEstimate"), salesSummary.summary.netProfitEstimate ?? ""],
          ],
        },
        {
          name: t("owner.overview.sheet.paymentMix"),
          rows: [[t("owner.overview.sheet.paymentMethod"), t("owner.operation.totalOrders"), t("owner.overview.sheet.amount")], ...salesSummary.paymentBreakdown.map((row) => [row.method, row.orders, row.amount])],
        },
        {
          name: t("owner.overview.sheet.orders"),
          rows: [
            [t("owner.overview.sheet.order"), t("owner.overview.sheet.date"), t("owner.inventory.sheet.status"), t("owner.overview.sheet.payment"), t("owner.overview.sheet.total")],
            ...rangeOrders.map((order) => [
              order.order_number ?? order.id,
              getOrderBusinessDate(order),
              order.status ?? "",
              order.payment_method ?? "",
              toNumber(order.total),
            ]),
          ],
        },
        {
          name: t("owner.overview.sheet.inventory"),
          rows: [
            [t("owner.inventory.item"), t("owner.inventory.category"), t("owner.inventory.currentStock"), t("owner.inventory.reorderLevel"), t("owner.inventory.sheet.unit"), t("owner.inventory.sheet.unitCost")],
            ...data.inventoryItems.map((item) => [
              item.name ?? t("owner.inventory.inventoryItem"),
              item.category ?? "",
              toNumber(item.current_stock),
              toNumber(item.reorder_level),
              item.unit ?? "",
              toNumber(item.cost_per_unit ?? item.price_per_unit),
            ]),
          ],
        },
        {
          name: t("owner.overview.sheet.batches"),
          rows: [
            [t("owner.overview.sheet.batch"), t("owner.inventory.sheet.supplier"), t("owner.overview.sheet.receivedAt"), t("owner.inventory.sheet.expiryDate"), t("owner.overview.sheet.received"), t("owner.overview.sheet.remaining"), t("owner.inventory.sheet.unitCost")],
            ...data.inventoryBatches.map((batch) => [
              batch.batch_number ?? batch.id,
              batch.supplier ?? "",
              batch.received_at ?? "",
              batch.expiry_date ?? "",
              toNumber(batch.quantity_received),
              toNumber(batch.quantity_remaining),
              toNumber(batch.unit_cost),
            ]),
          ],
        },
        {
          name: t("owner.overview.sheet.staff"),
          rows: [
            [t("owner.overview.sheet.name"), t("owner.staff.role"), t("owner.inventory.sheet.status")],
            ...data.staff.map((staff) => [staff.name ?? t("owner.staff.staff"), staff.role ?? "", staff.status ?? ""]),
          ],
        },
        {
          name: t("owner.overview.sheet.operations"),
          rows: [
            [t("owner.overview.sheet.order"), t("owner.overview.sheet.date"), t("owner.inventory.sheet.status"), t("owner.overview.sheet.fulfillment"), t("owner.inventory.sheet.createdAt"), t("owner.overview.sheet.completedAt")],
            ...rangeOrders.map((order) => [
              order.id,
              getOrderBusinessDate(order),
              order.status ?? "",
              order.fulfillment_method ?? "",
              order.created_at ?? "",
              order.completed_at ?? "",
            ]),
          ],
        },
        {
          name: t("owner.overview.sheet.stockReports"),
          rows: [
            [t("owner.overview.sheet.material"), t("owner.inventory.type"), t("owner.inventory.sheet.status"), t("owner.overview.sheet.reportedBy"), t("owner.inventory.sheet.createdAt")],
            ...data.stockReports.map((report) => [
              report.material_name ?? "",
              report.report_type ?? "",
              report.status ?? "",
              report.reported_by_role ?? "",
              report.created_at ?? "",
            ]),
          ],
        },
      ]);
      showSuccess(t("owner.overview.exportSuccess"));
    } catch (error) {
      console.error("Failed to export overview report:", error);
      showError(t("owner.overview.exportError"));
    }
  };

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="overview" period={dateRange} />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />
      <div className="flex justify-end">
        <ExportButton
          label={t("owner.overview.export")}
          disabled={data.loading || salesSummary.loading}
          items={[
            {
              id: "excel",
              label: t("owner.overview.downloadExcel"),
              onClick: () => void exportOverviewWorkbook(),
              disabled: data.loading || salesSummary.loading,
            },
          ]}
        />
      </div>

      {data.error ? (
        <div
          className={`rounded-xl border p-3 text-sm font-medium ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}
        >
          {t("owner.overview.loadWarning")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label={t("owner.overview.totalRevenue")}
          value={data.loading ? t("owner.dashboard.loading") : formatCurrency(revenue)}
          helper={t("owner.overview.totalRevenueHelper")}
          tone="progress"
        />
        <MetricCard
          label={t("owner.operation.totalOrders")}
          value={data.loading ? t("owner.dashboard.loading") : formatNumber(validRangeOrders.length)}
          helper={t("owner.overview.totalOrdersHelper")}
          tone="info"
        />
        <MetricCard
          label={t("owner.overview.aov")}
          value={data.loading ? t("owner.dashboard.loading") : formatCurrency(aov)}
          helper={t("owner.overview.aovHelper")}
          tone="success"
        />
        <MetricCard
          label={t("owner.operation.completedOrders")}
          value={data.loading ? t("owner.dashboard.loading") : formatNumber(completed)}
          helper={t("owner.overview.completedHelper")}
          tone="neutral"
        />
        <MetricCard
          label={t("owner.operation.cancelledOrders")}
          value={data.loading ? t("owner.dashboard.loading") : formatNumber(cancelled)}
          helper={t("owner.overview.cancelledHelper")}
          tone={cancelled > 0 ? "danger" : "success"}
        />
        <MetricCard
          label={t("owner.overview.topPaymentMethod")}
          value={topPayment}
          helper={t("owner.overview.topPaymentMethodHelper")}
          tone="waiting"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title={t("owner.overview.revenueTrend")}
          subtitle={t("owner.overview.revenueTrendSubtitle")}
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
          title={t("owner.overview.aovTrend")}
          subtitle={t("owner.overview.aovTrendSubtitle")}
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
                  name={t("owner.overview.selectedPeriodAov")}
                  stroke={OWNER_CHART_COLORS.INDIGO_BLUE}
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  name={t("owner.overview.previousPeriodAov")}
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
          title={t("owner.overview.businessHealth")}
          subtitle={t("owner.overview.businessHealthSubtitle")}
        >
          <BusinessHealthSummary health={businessHealth} />
        </ChartCard>
      </div>
    </div>
  );
}
