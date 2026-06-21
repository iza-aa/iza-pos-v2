"use client";

import { useMemo, useState } from "react";
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
import {
  exportReport,
  getReportExportItems,
  type ReportExportFormat,
} from "@/lib/utils/reportExport";

export default function CustomerPerformanceDashboard() {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const data = useCustomerPerformanceData();
  const metrics = useMemo(
    () => buildCustomerPerformance(data.orders, dateRange),
    [data.orders, dateRange.endDate, dateRange.startDate],
  );
  const trend = useMemo(
    () => buildNewReturningTrend(data.orders, dateRange),
    [data.orders, dateRange.endDate, dateRange.startDate],
  );
  const loyaltyInsight = getLoyaltyInsightSummary(metrics);
  const customerMix = [
    { name: t("owner.customer.member"), value: metrics.memberOrders.length },
    { name: t("owner.customer.guest"), value: metrics.guestOrders.length },
  ].filter((item) => item.value > 0);
  const aovData = [
    { name: t("owner.customer.member"), aov: Math.round(metrics.memberAov) },
    { name: t("owner.customer.guest"), aov: Math.round(metrics.guestAov) },
  ];
  const insightTone =
    loyaltyInsight.status === "Healthy"
      ? OWNER_SEMANTIC_TONES.success.badgeClass
      : loyaltyInsight.status === "Watch"
        ? OWNER_SEMANTIC_TONES.warning.badgeClass
        : OWNER_SEMANTIC_TONES.danger.badgeClass;
  const insightStatusLabel =
    loyaltyInsight.status === "Healthy"
      ? t("owner.customer.status.healthy")
      : loyaltyInsight.status === "Watch"
        ? t("owner.customer.status.watch")
        : loyaltyInsight.status === "Needs Data"
          ? t("owner.customer.status.needsData")
          : t("owner.customer.status.needsAttention");
  const insightSummaryLabel =
    loyaltyInsight.status === "Healthy"
      ? t("owner.customer.insight.healthy")
      : loyaltyInsight.status === "Watch"
        ? t("owner.customer.insight.watch")
        : loyaltyInsight.status === "Needs Data"
          ? t("owner.customer.insight.needsData")
          : t("owner.customer.insight.needsAttention");
  const exportCustomerReport = async (format: ReportExportFormat) => {
    try {
      await exportReport(format, {
        filename: `owner-customer-${dateRange.startDate}-to-${dateRange.endDate}`,
        title: `${t("owner.dashboard.customer")} Report`,
        subtitle: `${dateRange.startDate} - ${dateRange.endDate}`,
        sheets: [{
          name: t("owner.customer.sheet.summary"),
          description: "Customer mix, loyalty, reward usage, and discount impact for the selected date range.",
          rows: [
            [t("owner.staff.metric"), t("owner.staff.sheet.value")],
            [t("owner.staff.sheet.startDate"), dateRange.startDate],
            [t("owner.staff.sheet.endDate"), dateRange.endDate],
            [t("owner.customer.memberOrders"), metrics.memberOrders.length],
            [t("owner.customer.guestOrders"), metrics.guestOrders.length],
            [t("owner.customer.repeatRate"), metrics.repeatCustomerRate],
            [t("owner.customer.memberAov"), metrics.memberAov],
            [t("owner.customer.guestAov"), metrics.guestAov],
            [t("owner.customer.rewardUsage"), metrics.rewardUsageRate],
            [t("owner.customer.discountCost"), metrics.discountCost],
            [t("owner.customer.loyaltyInsight"), insightStatusLabel],
          ],
        },
        {
          name: t("owner.customer.sheet.newReturningTrend"),
          description: "Unique identified customers classified by their first recorded transaction.",
          rows: [[t("owner.staff.sheet.period"), t("owner.customer.newCustomers"), t("owner.customer.returningCustomers")], ...trend.map((row) => [row.date, row.newCustomers, row.returningCustomers])],
        },
        {
          name: t("owner.customer.sheet.customerOrders"),
          description: "Member and guest orders included in the selected date range.",
          rows: [
            [t("owner.overview.sheet.order"), t("owner.customer.sheet.customer"), t("owner.inventory.sheet.status"), t("owner.overview.sheet.total"), t("owner.inventory.sheet.createdAt")],
            ...[...metrics.memberOrders, ...metrics.guestOrders].map((order) => [
              order.order_number ?? order.id,
              order.customer_id ?? t("owner.customer.guest"),
              order.status ?? "",
              order.total ?? 0,
              order.created_at ?? "",
            ]),
          ],
        }],
      });
      showSuccess(t("owner.customer.exportSuccess"));
    } catch (error) {
      console.error("Failed to export customer report:", error);
      showError(t("owner.customer.exportError"));
    }
  };

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="rewards" period={dateRange} />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />
      <div className="flex justify-end">
        <ExportButton
          label={t("owner.customer.export")}
          disabled={data.loading}
          items={getReportExportItems({
            onExport: (format) => void exportCustomerReport(format),
            disabled: data.loading,
          })}
        />
      </div>

      {data.error ? (
        <div
          className={`rounded-xl border p-3 text-sm font-medium ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}
        >
          {t("owner.customer.dataLoadWarning")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label={t("owner.customer.memberOrders")}
          value={data.loading ? t("owner.dashboard.loading") : formatNumber(metrics.memberOrders.length)}
          helper={t("owner.customer.memberOrdersHelper")}
          tone="premium"
        />
        <MetricCard
          label={t("owner.customer.guestOrders")}
          value={data.loading ? t("owner.dashboard.loading") : formatNumber(metrics.guestOrders.length)}
          helper={t("owner.customer.guestOrdersHelper")}
          tone="neutral"
        />
        <MetricCard
          label={t("owner.customer.repeatRate")}
          value={data.loading ? t("owner.dashboard.loading") : `${metrics.repeatCustomerRate.toFixed(1)}%`}
          helper={t("owner.customer.repeatRateHelper")}
          tone={metrics.repeatCustomerRate >= 30 ? "success" : "warning"}
        />
        <MetricCard
          label={t("owner.customer.memberAov")}
          value={data.loading ? t("owner.dashboard.loading") : formatCurrency(metrics.memberAov)}
          helper={t("owner.customer.averageSpend")}
          tone="success"
        />
        <MetricCard
          label={t("owner.customer.rewardUsage")}
          value={data.loading ? t("owner.dashboard.loading") : `${metrics.rewardUsageRate.toFixed(1)}%`}
          helper={t("owner.customer.rewardUsageHelper")}
          tone="premium"
        />
        <MetricCard
          label={t("owner.customer.discountCost")}
          value={data.loading ? t("owner.dashboard.loading") : formatCurrency(metrics.discountCost)}
          helper={t("owner.customer.discountCostHelper")}
          tone={metrics.discountCost > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title={t("owner.customer.customerMix")} subtitle={t("owner.customer.customerMixSubtitle")}>
          <DonutChartWithLegend data={customerMix} emptyLabel={t("owner.customer.noOrderData")} />
        </ChartCard>

        <ChartCard
          title={t("owner.customer.memberVsGuestAov")}
          subtitle={t("owner.customer.memberVsGuestAovSubtitle")}
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
          title={t("owner.customer.newReturningTrend")}
          subtitle={t("owner.customer.newReturningTrendSubtitle")}
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
                    name={t("owner.customer.newCustomers")}
                    stroke={OWNER_CHART_COLORS.SOFT_SKY_BLUE}
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="returningCustomers"
                    name={t("owner.customer.returningCustomers")}
                    stroke={OWNER_CHART_COLORS.INDIGO_BLUE}
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.customer.noReturningTrend")} />
          )}
        </ChartCard>

        <ChartCard
          title={t("owner.customer.loyaltyInsight")}
          subtitle={t("owner.customer.loyaltyInsightSubtitle")}
        >
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${insightTone}`}>
              <p className="text-xs font-bold uppercase tracking-wide">
                {insightStatusLabel}
              </p>
              <p className="mt-3 text-sm leading-6">{insightSummaryLabel}</p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <span className="font-semibold text-gray-600">{t("owner.customer.memberShare")}</span>
                <span className="font-bold text-gray-950">
                  {metrics.memberShare.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <span className="font-semibold text-gray-600">{t("owner.customer.guestAov")}</span>
                <span className="font-bold text-gray-950">
                  {formatCurrency(metrics.guestAov)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <span className="font-semibold text-gray-600">{t("owner.customer.discountRatio")}</span>
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
