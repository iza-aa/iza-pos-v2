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
import { ExportButton } from "@/app/components/shared";
import { useLanguage } from "@/app/components/shared/i18n";
import {
  OWNER_CHART_COLORS,
  OWNER_CHART_SERIES,
  OWNER_SEMANTIC_TONES,
} from "@/lib/constants/theme";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import {
  exportReport,
  getReportExportItems,
  type ReportExportFormat,
} from "@/lib/utils/reportExport";
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
import {
  formatNumber,
  getBusinessDateFromTimestamp,
  getBusinessHourFromTimestamp,
  getDatesBetween,
  getOrderBusinessHour,
} from "../shared/dashboardUtils";
import useOwnerDashboardData from "../shared/useOwnerDashboardData";
import { getMinutesBetween, getOrderDateCandidates } from "../shared/staffOperationUtils";
function OperationDashboard() {
  const { t } = useLanguage();
  const data = useOwnerDashboardData();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const singleDayRange = dateRange.startDate === dateRange.endDate;
  const isCancelledOperationOrder = (status: string | null | undefined) =>
    ["cancelled", "canceled", "void", "refunded"].includes(
      String(status ?? "").toLowerCase(),
    );
  const ordersInRange = data.orders.filter((order) => {
    return getOrderDateCandidates(order).some(
      (date) => date >= dateRange.startDate && date <= dateRange.endDate,
    );
  });
  const normalizeOperationStatus = (status: string | null) => {
    const normalized = String(status ?? "").toLowerCase();
    if (isCancelledOperationOrder(normalized)) return "cancelled";
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
    { status: "new", label: t("owner.operation.newOrder") },
    { status: "on-process", label: t("owner.operation.onProcess") },
    { status: "partially-served", label: t("owner.operation.partiallyServed") },
    { status: "completed", label: t("owner.operation.completed") },
    { status: "cancelled", label: t("owner.operation.cancelled") },
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
  const cancelledOrders = ordersInRange.filter(
    (order) => normalizeOperationStatus(order.status) === "cancelled",
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
  const orderCountByHour = new Map<string, number>();
  ordersInRange.forEach((order) => {
    const hour = getOrderBusinessHour(order);
    orderCountByHour.set(hour, (orderCountByHour.get(hour) ?? 0) + 1);
  });
  const heatmap = operationSlots.map((slot) => {
    const [slotHour] = slot.split(":");
    return {
      slot,
      count: orderCountByHour.get(slotHour) ?? 0,
    };
  });
  const serviceTimeRows = serviceEvents.map((event) => event.minutes);
  const averageServiceTime = serviceTimeRows.length
    ? serviceTimeRows.reduce((sum, minutes) => sum + minutes, 0) / serviceTimeRows.length
    : null;
  const serviceMinutesByHour = new Map<string, number[]>();
  const serviceMinutesByDate = new Map<string, number[]>();
  serviceEvents.forEach((event) => {
    const hours = new Set([
      getBusinessHourFromTimestamp(event.completedAt),
      event.orderHour,
    ]);
    hours.forEach((hour) => {
      if (!hour) return;
      const rows = serviceMinutesByHour.get(hour);
      if (rows) rows.push(event.minutes);
      else serviceMinutesByHour.set(hour, [event.minutes]);
    });

    const dates = new Set([
      getBusinessDateFromTimestamp(event.completedAt),
      ...event.orderDateCandidates,
    ]);
    dates.forEach((date) => {
      if (!date) return;
      const rows = serviceMinutesByDate.get(date);
      if (rows) rows.push(event.minutes);
      else serviceMinutesByDate.set(date, [event.minutes]);
    });
  });
  const serviceTrend = (singleDayRange
    ? Array.from({ length: 24 }, (_, hour) => {
        const hourLabel = `${String(hour).padStart(2, "0")}:00`;
        const rows = serviceMinutesByHour.get(String(hour).padStart(2, "0")) ?? [];
        return {
          period: hourLabel,
          averageMinutes: rows.length
            ? Number((rows.reduce((sum, minutes) => sum + minutes, 0) / rows.length).toFixed(1))
            : 0,
        };
      })
    : getDatesBetween(dateRange.startDate, dateRange.endDate).map((date) => {
        const rows = serviceMinutesByDate.get(date) ?? [];
        return {
          period: date.slice(5),
          averageMinutes: rows.length
            ? Number((rows.reduce((sum, minutes) => sum + minutes, 0) / rows.length).toFixed(1))
            : 0,
          };
      }));
  const ordersByHour = new Map<string, typeof ordersInRange>();
  const ordersByDate = new Map<string, typeof ordersInRange>();
  ordersInRange.forEach((order) => {
    const hour = getOrderBusinessHour(order);
    const hourRows = ordersByHour.get(hour);
    if (hourRows) hourRows.push(order);
    else ordersByHour.set(hour, [order]);

    getOrderDateCandidates(order).forEach((date) => {
      const dateRows = ordersByDate.get(date);
      if (dateRows) dateRows.push(order);
      else ordersByDate.set(date, [order]);
    });
  });
  const outcomeTrend = (singleDayRange
    ? Array.from({ length: 24 }, (_, hour) => {
        const hourKey = String(hour).padStart(2, "0");
        const rows = ordersByHour.get(hourKey) ?? [];
        return {
          period: `${hourKey}:00`,
          created: rows.length,
          activeBacklog: rows.filter((order) =>
            ["new", "on-process", "partially-served"].includes(normalizeOperationStatus(order.status)),
          ).length,
          completed: rows.filter((order) => normalizeOperationStatus(order.status) === "completed").length,
          cancelled: rows.filter((order) => normalizeOperationStatus(order.status) === "cancelled").length,
        };
      })
    : getDatesBetween(dateRange.startDate, dateRange.endDate).map((date) => {
        const rows = ordersByDate.get(date) ?? [];
        return {
          period: date.slice(5),
          created: rows.length,
          activeBacklog: rows.filter((order) =>
            ["new", "on-process", "partially-served"].includes(normalizeOperationStatus(order.status)),
          ).length,
          completed: rows.filter((order) => normalizeOperationStatus(order.status) === "completed").length,
          cancelled: rows.filter((order) => normalizeOperationStatus(order.status) === "cancelled").length,
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
  const exportOperationReport = async (format: ReportExportFormat) => {
    try {
      await exportReport(format, {
        filename: `owner-operations-${dateRange.startDate}-to-${dateRange.endDate}`,
        title: `${t("owner.dashboard.operation")} Report`,
        subtitle: `${dateRange.startDate} - ${dateRange.endDate}`,
        sheets: [{
          name: t("owner.operation.sheet.summary"),
          description: "Order flow and service indicators for the selected date range.",
          rows: [
            [t("owner.staff.metric"), t("owner.staff.sheet.value")],
            [t("owner.staff.sheet.startDate"), dateRange.startDate],
            [t("owner.staff.sheet.endDate"), dateRange.endDate],
            [t("owner.operation.totalOrders"), ordersInRange.length],
            [t("owner.operation.activeOrders"), activeOrders.length],
            [t("owner.operation.completedOrders"), completedOrders.length],
            [t("owner.operation.cancelledOrders"), cancelledOrders.length],
            [t("owner.operation.completionRate"), ordersInRange.length ? Math.round((completedOrders.length / ordersInRange.length) * 100) : 0],
            [t("owner.operation.cancellationRate"), ordersInRange.length ? Math.round((cancelledOrders.length / ordersInRange.length) * 100) : 0],
            [t("owner.staff.sheet.averageServiceMinutes"), averageServiceTime ?? ""],
          ],
        },
        {
          name: t("owner.operation.sheet.orderFlow"),
          description: "Orders grouped by their normalized operational status.",
          rows: [[t("owner.inventory.sheet.status"), t("owner.inventory.sheet.itemCount")], ...flow.map((row) => [row.label, row.count])],
        },
        {
          name: t("owner.operation.sheet.orderDensity"),
          description: "Order volume by operating hour.",
          rows: [[t("owner.operation.sheet.slot"), t("owner.operation.sheet.orderCount")], ...heatmap.map((row) => [row.slot, row.count])],
        },
        {
          name: t("owner.operation.sheet.serviceTrend"),
          description: "Average service duration based only on records with valid timestamps.",
          rows: [[t("owner.staff.sheet.period"), t("owner.operation.sheet.averageMinutes")], ...serviceTrend.map((row) => [row.period, row.averageMinutes])],
        },
        {
          name: t("owner.operation.sheet.outcomeTrend"),
          description: "Created, completed, cancelled, and active orders by reporting period.",
          rows: [
            [
              t("owner.staff.sheet.period"),
              t("owner.operation.created"),
              t("owner.operation.completed"),
              t("owner.operation.cancelled"),
              t("owner.operation.activeBacklog"),
            ],
            ...outcomeTrend.map((row) => [row.period, row.created, row.completed, row.cancelled, row.activeBacklog]),
          ],
        }],
      });
      showSuccess(t("owner.operation.exportSuccess"));
    } catch (error) {
      console.error("Failed to export operation report:", error);
      showError(t("owner.operation.exportError"));
    }
  };

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="operations" period={dateRange} />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />
      <div className="flex justify-end">
        <ExportButton
          label={t("owner.operation.export")}
          disabled={data.loading}
          items={getReportExportItems({
            onExport: (format) => void exportOperationReport(format),
            disabled: data.loading,
          })}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("owner.operation.totalOrders")} value={formatNumber(ordersInRange.length)} helper={t("owner.operation.totalOrdersHelper")} tone="info" />
        <MetricCard label={t("owner.operation.activeOrders")} value={formatNumber(activeOrders.length)} helper={t("owner.operation.activeOrdersHelper")} tone="progress" />
        <MetricCard label={t("owner.operation.completionRate")} value={`${ordersInRange.length ? Math.round((completedOrders.length / ordersInRange.length) * 100) : 0}%`} helper={t("owner.operation.completionRateHelper")} tone="success" />
        <MetricCard label={t("owner.operation.cancelledOrders")} value={formatNumber(cancelledOrders.length)} helper={t("owner.operation.cancelledOrdersHelper")} tone={cancelledOrders.length > 0 ? "danger" : "success"} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title={t("owner.operation.orderDensity")} subtitle={t("owner.operation.orderDensitySubtitle")}>
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

        <ChartCard title={t("owner.operation.orderFlow")} subtitle={t("owner.operation.orderFlowSubtitle")}>
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
        <ChartCard title={t("owner.operation.averageServiceTime")} subtitle={t("owner.operation.averageServiceTimeSubtitle")}>
          {serviceTrend.some((item) => item.averageMinutes > 0) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serviceTrend} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Line type="monotone" dataKey="averageMinutes" name={t("owner.operation.avgMinutes")} stroke={OWNER_CHART_COLORS.INDIGO_BLUE} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.operation.noTimestampData")} />
          )}
        </ChartCard>

        <ChartCard title={t("owner.operation.orderOutcomeTrend")} subtitle={t("owner.operation.orderOutcomeTrendSubtitle")}>
          {outcomeTrend.some((item) => item.created || item.completed || item.cancelled || item.activeBacklog) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outcomeTrend} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Legend />
                  <Bar dataKey="created" name={t("owner.operation.created")} fill={OWNER_CHART_COLORS.SOFT_SKY_BLUE} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="completed" name={t("owner.operation.completed")} fill={OWNER_CHART_COLORS.SOFT_GREEN} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="cancelled" name={t("owner.operation.cancelled")} fill={OWNER_CHART_COLORS.SOFT_ROSE} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="activeBacklog" name={t("owner.operation.activeBacklog")} fill={OWNER_CHART_COLORS.SOFT_YELLOW} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.operation.noOperationFlow")} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default OperationDashboard;

