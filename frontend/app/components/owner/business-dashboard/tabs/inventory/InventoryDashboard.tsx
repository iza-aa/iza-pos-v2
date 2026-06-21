"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import { ExportButton } from "@/app/components/shared";
import { getDomainLabel, useLanguage } from "@/app/components/shared/i18n";
import {
  OWNER_CHART_COLORS,
  OWNER_SEMANTIC_TONES,
} from "@/lib/constants/theme";
import { getStockStatus } from "@/lib/constants";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import {
  exportReport,
  getReportExportItems,
  type ReportExportFormat,
} from "@/lib/utils/reportExport";
import GenerateRecommendationPanel from "../../ai/GenerateRecommendationPanel";
import { getDefaultDateRange, type DateRangeValue } from "../DateRangeFilter";
import {
  ChartCard,
  EmptyState,
  MetricCard,
  StandardTooltip,
} from "../shared/DashboardPrimitives";
import type { DashboardData } from "../shared/dashboardTypes";
import {
  formatCurrency,
  formatNumber,
  getBusinessDateFromTimestamp,
  getBusinessHourFromTimestamp,
  getDatesBetween,
  getRangeLengthDays,
  groupBy,
  toNumber,
} from "../shared/dashboardUtils";
import useOwnerDashboardData from "../shared/useOwnerDashboardData";
const normalizeInventoryTransactionType = (type?: string | null) => {
  const raw = String(type || "sale").toLowerCase();
  if (raw === "order_usage") return "sale";
  if (raw === "stock_in") return "restock";
  return raw;
};

const getInventoryTransactionTimestamp = (createdAt?: string | null, timestamp?: string | null) => {
  return createdAt || timestamp || null;
};

const getInventorySnapshotRange = (data: DashboardData): DateRangeValue => {
  const today = getDefaultDateRange().endDate;
  const activityDates = [
    ...data.usageTransactions.map((transaction) =>
      getBusinessDateFromTimestamp(
        getInventoryTransactionTimestamp(transaction.created_at, transaction.timestamp),
      ),
    ),
    ...data.inventoryBatches.map((batch) => getBusinessDateFromTimestamp(batch.received_at)),
  ].filter((date): date is string => Boolean(date));

  return {
    startDate: activityDates.length ? activityDates.sort()[0] : today,
    endDate: today,
  };
};

const getCurrentStockReportMonthRange = (): DateRangeValue => {
  const today = getDefaultDateRange().endDate;
  return {
    startDate: `${today.slice(0, 7)}-01`,
    endDate: today,
  };
};

function getUsageTransactionsInRange(data: DashboardData, range: DateRangeValue) {
  return data.usageTransactions.filter((transaction) => {
    const businessDate = getBusinessDateFromTimestamp(
      getInventoryTransactionTimestamp(transaction.created_at, transaction.timestamp),
    );
    return businessDate >= range.startDate && businessDate <= range.endDate;
  });
}

function getInventoryUnitCost(item?: { cost_per_unit?: number | string | null; price_per_unit?: number | string | null }) {
  return toNumber(item?.cost_per_unit ?? item?.price_per_unit);
}

function buildInventoryMovementTrend(
  data: DashboardData,
  range: DateRangeValue,
  selectedInventoryItemId: string,
) {
  const transactions = getUsageTransactionsInRange(data, range);
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));
  const transactionById = new Map(data.usageTransactions.map((transaction) => [transaction.id, transaction]));
  const inventoryById = new Map(data.inventoryItems.map((item) => [item.id, item]));
  const details = data.usageTransactionDetails.filter((detail) => {
    if (!detail.usage_transaction_id || !transactionIds.has(detail.usage_transaction_id)) {
      return false;
    }

    if (selectedInventoryItemId === "all") return true;

    return detail.inventory_item_id === selectedInventoryItemId;
  });
  const hourly = range.startDate === range.endDate;
  const dateBuckets = hourly
    ? Array.from({ length: 24 }, (_, hour) => {
        const label = `${String(hour).padStart(2, "0")}:00`;
        return { key: `${range.startDate} ${label}`, label };
      })
    : getDatesBetween(range.startDate, range.endDate).map((date) => ({
        key: date,
        label: date.slice(5),
      }));

  return dateBuckets.map((bucket) => {
    const rows = details.filter((detail) => {
      const transaction = transactionById.get(detail.usage_transaction_id ?? "");
      const timestamp = getInventoryTransactionTimestamp(
        transaction?.created_at,
        transaction?.timestamp,
      );
      const date = getBusinessDateFromTimestamp(timestamp);
      const hour = getBusinessHourFromTimestamp(timestamp);
      const key = hourly ? `${date} ${hour}:00` : date;
      return key === bucket.key;
    });
    const getValue = (type: string) =>
      rows
        .filter((detail) => {
          const transaction = transactionById.get(detail.usage_transaction_id ?? "");
          return normalizeInventoryTransactionType(transaction?.transaction_type ?? transaction?.type) === type;
        })
        .reduce((sum, detail) => {
          const quantity = toNumber(detail.quantity_used);
          if (selectedInventoryItemId !== "all") return sum + quantity;

          const inventory = inventoryById.get(detail.inventory_item_id ?? "");
          return sum + quantity * getInventoryUnitCost(inventory);
        }, 0);

    return {
      date: bucket.label,
      stockIn: getValue("restock"),
      stockOut: getValue("sale"),
      adjustments: getValue("adjustment"),
    };
  });
}

function buildStockMovementRows(data: DashboardData, range: DateRangeValue, limit = 7) {
  const transactionById = new Map(data.usageTransactions.map((row) => [row.id, row]));
  const inventoryNameById = new Map(
    data.inventoryItems.map((item) => [item.id, item.name ?? "Inventory item"]),
  );
  const transactionsInRange = new Set(getUsageTransactionsInRange(data, range).map((row) => row.id));

  const rows = data.usageTransactionDetails
    .filter((detail) => detail.usage_transaction_id && transactionsInRange.has(detail.usage_transaction_id))
    .map((detail, index) => {
      const transaction = transactionById.get(detail.usage_transaction_id ?? "");
      const type = normalizeInventoryTransactionType(transaction?.transaction_type ?? transaction?.type);
      const previous = toNumber(detail.previous_stock);
      const next = toNumber(detail.new_stock);

      return {
        id: `${detail.usage_transaction_id}-${detail.inventory_item_id}-${detail.ingredient_name}-${index}`,
        itemName:
          detail.ingredient_name ||
          inventoryNameById.get(detail.inventory_item_id ?? "") ||
          "Inventory item",
        type,
        quantity: toNumber(detail.quantity_used),
        unit: detail.unit ?? "",
        previous,
        next,
        timestamp: getInventoryTransactionTimestamp(transaction?.created_at, transaction?.timestamp),
        actor: transaction?.performed_by_name ?? "System",
        notes: transaction?.notes ?? "",
      };
    })
    .sort((a, b) => String(b.timestamp ?? "").localeCompare(String(a.timestamp ?? "")));

  return limit > 0 ? rows.slice(0, limit) : rows;
}

function buildInventoryHealthSummary(data: DashboardData, range: DateRangeValue) {
  const inventoryById = new Map(data.inventoryItems.map((item) => [item.id, item]));
  const rows = data.inventoryItems.map((item) => {
    const current = toNumber(item.current_stock);
    const minimum = toNumber(item.reorder_level);
    const unitCost = getInventoryUnitCost(item);
    return {
      id: item.id,
      name: item.name ?? "Inventory item",
      current,
      minimum,
      unitCost,
      suggestedRestock: Math.max(0, minimum * 2 - current),
      hasDataIssue: current < 0 || minimum <= 0 || !item.unit,
    };
  });
  const transactions = getUsageTransactionsInRange(data, range);
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));
  const transactionById = new Map(data.usageTransactions.map((transaction) => [transaction.id, transaction]));
  const stockOutByItem = new Map<string, { name: string; value: number; quantity: number }>();

  data.usageTransactionDetails
    .filter((detail) => detail.usage_transaction_id && transactionIds.has(detail.usage_transaction_id))
    .forEach((detail) => {
      const transaction = transactionById.get(detail.usage_transaction_id ?? "");
      const type = normalizeInventoryTransactionType(transaction?.transaction_type ?? transaction?.type);
      if (type !== "sale") return;

      const inventory = inventoryById.get(detail.inventory_item_id ?? "");
      const quantity = toNumber(detail.quantity_used);
      const value = quantity * getInventoryUnitCost(inventory);
      const itemId = detail.inventory_item_id ?? detail.ingredient_name ?? "unknown";
      const current = stockOutByItem.get(itemId) ?? {
        name: detail.ingredient_name || inventory?.name || "Inventory item",
        value: 0,
        quantity: 0,
      };

      stockOutByItem.set(itemId, {
        ...current,
        value: current.value + value,
        quantity: current.quantity + quantity,
      });
    });

  const mostUsed = Array.from(stockOutByItem.values()).sort(
    (a, b) => b.value - a.value || b.quantity - a.quantity,
  )[0];

  return {
    totalItems: rows.length,
    criticalItems: rows.filter((item) => getStockStatus(item.current, item.minimum) === "critical").length,
    estimatedRestockCost: rows.reduce(
      (sum, item) => sum + item.suggestedRestock * item.unitCost,
      0,
    ),
    dataIssues: rows.filter((item) => item.hasDataIssue).length,
    mostUsedName: mostUsed?.name ?? "-",
  };
}

function InventoryDashboard() {
  const { language, t } = useLanguage();
  const data = useOwnerDashboardData();
  const dateRange = getInventorySnapshotRange(data);
  const stockReportRange = getCurrentStockReportMonthRange();
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState("all");
  const inventoryRowsBase = data.inventoryItems
    .map((item) => {
      const current = toNumber(item.current_stock);
      const minimum = toNumber(item.reorder_level);
      const stockPercent = minimum > 0 ? Math.min(100, (current / minimum) * 100) : 100;
      return {
        id: item.id,
        name: item.name ?? t("owner.inventory.inventoryItem"),
        category: item.category ?? t("owner.inventory.general"),
        current,
        minimum,
        unitCost: getInventoryUnitCost(item),
        unit: item.unit ?? "",
        stockPercent,
        suggestedRestock: Math.max(0, minimum * 2 - current),
      };
    })
    .sort((a, b) => a.stockPercent - b.stockPercent);
  const inventoryById = new Map(inventoryRowsBase.map((item) => [item.id, item]));
  const batchRows = data.inventoryBatches
    .map((batch) => {
      const item = batch.inventory_item_id ? inventoryById.get(batch.inventory_item_id) : undefined;
      const remaining = toNumber(batch.quantity_remaining);
      const received = toNumber(batch.quantity_received);
      const unitCost = toNumber(batch.unit_cost) || item?.unitCost || 0;
      const expiryDate = batch.expiry_date || "";
      const jakartaToday = getBusinessDateFromTimestamp(new Date().toISOString());
      const daysUntilExpiry = expiryDate
        ? Math.ceil(
            (new Date(`${expiryDate}T00:00:00`).getTime() -
              new Date(`${jakartaToday}T00:00:00`).getTime()) /
              86400000,
          )
        : null;

      return {
        id: batch.id,
        inventoryItemId: batch.inventory_item_id ?? "",
        itemName: item?.name || t("owner.inventory.inventoryItem"),
        category: item?.category || t("owner.inventory.general"),
        batchNumber: batch.batch_number || "-",
        supplier: batch.supplier || "-",
        receivedAt: batch.received_at || "",
        expiryDate,
        daysUntilExpiry,
        itemCurrentStock: item?.current ?? 0,
        received,
        remaining,
        unit: batch.unit || item?.unit || "",
        unitCost,
        value: remaining * unitCost,
        invoiceReference: batch.invoice_reference || "",
        receiptUrl: batch.receipt_url || "",
      };
    })
    .sort((a, b) => {
      if (a.daysUntilExpiry === null && b.daysUntilExpiry !== null) return 1;
      if (a.daysUntilExpiry !== null && b.daysUntilExpiry === null) return -1;
      return (a.daysUntilExpiry ?? 99999) - (b.daysUntilExpiry ?? 99999);
    });
  const usageTransactionsInRange = getUsageTransactionsInRange(data, dateRange);
  const usageTransactionById = new Map(usageTransactionsInRange.map((row) => [row.id, row]));
  const usageDays = Math.max(1, getRangeLengthDays(dateRange));
  const usageByItemId = data.usageTransactionDetails.reduce<Map<string, number>>((map, detail) => {
    if (!detail.inventory_item_id || !detail.usage_transaction_id) return map;
    const transaction = usageTransactionById.get(detail.usage_transaction_id);
    if (!transaction) return map;
    if (normalizeInventoryTransactionType(transaction.transaction_type ?? transaction.type) !== "sale") {
      return map;
    }

    map.set(
      detail.inventory_item_id,
      (map.get(detail.inventory_item_id) ?? 0) + toNumber(detail.quantity_used),
    );
    return map;
  }, new Map<string, number>());
  const inventoryRows = inventoryRowsBase.map((item) => {
    const usedInRange = usageByItemId.get(item.id) ?? 0;
    const averageDailyUsage = usedInRange / usageDays;
    const activeBatches = batchRows.filter(
      (batch) => batch.inventoryItemId === item.id && batch.remaining > 0,
    );
    const activeExpiringBatches = activeBatches.filter((batch) => batch.daysUntilExpiry !== null);
    const activeBatchRemaining = activeBatches.reduce((sum, batch) => sum + batch.remaining, 0);
    const expiringBatchRemaining = activeExpiringBatches.reduce((sum, batch) => sum + batch.remaining, 0);
    const nearestBatchExpiryDays = activeExpiringBatches
      .map((batch) => batch.daysUntilExpiry)
      .filter((days): days is number => days !== null)
      .sort((a, b) => a - b)[0] ?? null;
    const stockCoverageDays = item.current > 0 && averageDailyUsage > 0
      ? Math.ceil(item.current / averageDailyUsage)
      : null;
    return {
      ...item,
      usedInRange,
      averageDailyUsage,
      daysRemaining: stockCoverageDays,
      activeBatchRemaining,
      expiringBatchRemaining,
      nearestBatchExpiryDays,
    };
  });
  const getAlertSortValues = (item: (typeof inventoryRows)[number]) => {
    const status = getStockStatus(item.current, item.minimum);
    const statusRank = status === "critical" ? 0 : status === "low" ? 1 : 2;
    const stockRatio = item.minimum > 0 ? item.current / item.minimum : Number.POSITIVE_INFINITY;
    const expiryRank = item.nearestBatchExpiryDays ?? Number.POSITIVE_INFINITY;

    return {
      statusRank,
      stockRatio,
      expiryRank,
    };
  };
  const sortByInventoryAlert = (left: (typeof inventoryRows)[number], right: (typeof inventoryRows)[number]) => {
    const leftSort = getAlertSortValues(left);
    const rightSort = getAlertSortValues(right);

    return (
      leftSort.statusRank - rightSort.statusRank ||
      leftSort.stockRatio - rightSort.stockRatio ||
      leftSort.expiryRank - rightSort.expiryRank ||
      right.suggestedRestock - left.suggestedRestock ||
      left.name.localeCompare(right.name)
    );
  };
  const lowStockCandidates = inventoryRows
    .filter((item) => getStockStatus(item.current, item.minimum) !== "good")
    .sort(sortByInventoryAlert);
  const lowStockRows = [
    ...lowStockCandidates,
    ...inventoryRows.filter(
      (item) => !lowStockCandidates.some((candidate) => candidate.id === item.id),
    ).sort(sortByInventoryAlert),
  ].slice(0, 7);
  const movementTrend = buildInventoryMovementTrend(data, dateRange, selectedInventoryItemId);
  const movementRows = buildStockMovementRows(data, dateRange);
  const healthSummary = buildInventoryHealthSummary(data, dateRange);
  const criticalItemCount = inventoryRows.filter(
    (item) => getStockStatus(item.current, item.minimum) === "critical",
  ).length;
  const lowStockItemCount = inventoryRows.filter(
    (item) => getStockStatus(item.current, item.minimum) === "low",
  ).length;
  const inStockItemCount = inventoryRows.filter(
    (item) => getStockStatus(item.current, item.minimum) === "good",
  ).length;
  const stockStatusData = [
    {
      name: t("owner.inventory.inStock"),
      value: inStockItemCount,
      color: "#D8F999",
    },
    {
      name: t("owner.inventory.lowStock"),
      value: lowStockItemCount,
      color: "#FFE02E",
    },
    {
      name: t("owner.inventory.critical"),
      value: criticalItemCount,
      color: "#FFE1E1",
    },
  ];
  const stockStatusChartData = stockStatusData.filter((item) => item.value > 0);
  const activeExpiryTrackedBatchRows = batchRows.filter(
    (batch) => batch.expiryDate && batch.remaining > 0 && batch.itemCurrentStock > 0,
  );
  const batchRiskData = [
    {
      name: t("owner.inventory.expired"),
      value: activeExpiryTrackedBatchRows.filter((batch) => batch.daysUntilExpiry !== null && batch.daysUntilExpiry < 0).length,
      color: "#FEE2E2",
    },
    {
      name: t("owner.inventory.nearExpiry"),
      value: activeExpiryTrackedBatchRows.filter((batch) => batch.daysUntilExpiry !== null && batch.daysUntilExpiry >= 0 && batch.daysUntilExpiry <= 7).length,
      color: "#FEF3C7",
    },
    {
      name: t("owner.inventory.trackedActive"),
      value: activeExpiryTrackedBatchRows.filter((batch) => batch.daysUntilExpiry !== null && batch.daysUntilExpiry > 7).length,
      color: "#D8F999",
    },
  ];
  const batchValueByCategory = Array.from(
    groupBy(batchRows.filter((batch) => batch.value > 0), (batch) => batch.category).entries(),
  )
    .map(([name, rows]) => ({
      name,
      value: rows.reduce((sum, batch) => sum + batch.value, 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const reportsInRange = data.stockReports.filter((report) => {
    const createdAt = getBusinessDateFromTimestamp(report.created_at);
    return Boolean(
      createdAt &&
        createdAt >= stockReportRange.startDate &&
        createdAt <= stockReportRange.endDate,
    );
  });
  const pendingStockReports = reportsInRange.filter(
    (report) => report.status === "pending",
  );
  const resolvedStockReports = reportsInRange.filter(
    (report) => report.status === "resolved",
  );
  const rejectedStockReports = reportsInRange.filter(
    (report) => report.status === "rejected",
  );
  const repeatedStockIssue = Array.from(
    pendingStockReports.reduce((map, report) => {
      const key = report.material_name || t("owner.inventory.unknownMaterial");
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1])[0];
  const mostReportedStockIssue = Array.from(
    reportsInRange.reduce((map, report) => {
      const key = report.material_name || t("owner.inventory.unknownMaterial");
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1])[0];
  const latestStockReport = [...reportsInRange].sort((left, right) => {
    const leftTime = new Date(left.created_at ?? "").getTime();
    const rightTime = new Date(right.created_at ?? "").getTime();
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  })[0];
  const selectedInventoryItem = data.inventoryItems.find((item) => item.id === selectedInventoryItemId);
  const usageAxisIsCurrency = selectedInventoryItemId === "all";
  const selectedUsageUnit = selectedInventoryItem?.unit ?? "";
  const formatUsageAxis = (value: number) =>
    usageAxisIsCurrency
      ? value >= 1_000_000
        ? `Rp ${(value / 1_000_000).toFixed(1)}m`
        : value >= 1_000
          ? `Rp ${(value / 1_000).toFixed(0)}k`
          : `Rp ${value}`
      : `${formatNumber(value)}${selectedUsageUnit ? ` ${selectedUsageUnit}` : ""}`;
  const formatStockReportType = (value: string | null | undefined) => {
    return getDomainLabel("reportType", value, language);
  };
  const formatStockReportStatus = (value: string | null | undefined) => {
    if (value === "pending") return t("owner.inventory.status.pending");
    if (value === "resolved") return t("owner.inventory.status.resolved");
    if (value === "rejected") return t("owner.inventory.status.rejected");
    return "-";
  };
  type LowStockRow = (typeof lowStockRows)[number];
  type MovementRow = (typeof movementRows)[number];
  const [selectedMovementRow, setSelectedMovementRow] = useState<MovementRow | null>(null);
  const lowStockColumns: Array<StandardTableColumn<LowStockRow>> = [
    {
      key: "name",
      header: t("owner.inventory.item"),
      render: (item) => <span className="font-semibold text-gray-900">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    {
      key: "current",
      header: t("owner.inventory.currentStock"),
      render: (item) => `${formatNumber(item.current)} ${item.unit}`,
      sortValue: (item) => item.current,
    },
    {
      key: "minimum",
      header: t("owner.inventory.minimumStock"),
      render: (item) => `${formatNumber(item.minimum)} ${item.unit}`,
      sortValue: (item) => item.minimum,
    },
    {
      key: "expiringStock",
      header: t("owner.inventory.expiringStock"),
      render: (item) => {
        if (item.expiringBatchRemaining <= 0 || item.nearestBatchExpiryDays === null) return "-";
        if (item.nearestBatchExpiryDays < 0) {
          return `${formatNumber(item.expiringBatchRemaining)} ${item.unit} ${t("owner.inventory.expiredSuffix")}`;
        }
        if (item.nearestBatchExpiryDays === 0) {
          return `${formatNumber(item.expiringBatchRemaining)} ${item.unit} ${t("owner.inventory.expiresToday")}`;
        }
        return `${formatNumber(item.expiringBatchRemaining)} ${item.unit} / ${t("owner.inventory.days", { count: item.nearestBatchExpiryDays })}`;
      },
      sortValue: (item) => item.nearestBatchExpiryDays ?? 99999,
    },
    {
      key: "suggestedRestock",
      header: t("owner.inventory.suggestedRestock"),
      render: (item) => `${formatNumber(item.suggestedRestock)} ${item.unit}`,
      sortValue: (item) => item.suggestedRestock,
    },
  ];
  const movementColumns: Array<StandardTableColumn<MovementRow>> = [
    {
      key: "itemName",
      header: t("owner.inventory.item"),
      render: (row) => <span className="font-semibold text-gray-900">{row.itemName}</span>,
      sortValue: (row) => row.itemName,
    },
    {
      key: "type",
      header: t("owner.inventory.type"),
      render: (row) => <span className="capitalize">{row.type}</span>,
      sortValue: (row) => row.type,
    },
    {
      key: "quantity",
      header: t("owner.inventory.qty"),
      render: (row) => `${formatNumber(row.quantity)} ${row.unit}`,
      sortValue: (row) => row.quantity,
    },
    {
      key: "previous",
      header: t("owner.inventory.before"),
      render: (row) => `${formatNumber(row.previous)} ${row.unit}`,
      sortValue: (row) => row.previous,
    },
    {
      key: "next",
      header: t("owner.inventory.after"),
      render: (row) => `${formatNumber(row.next)} ${row.unit}`,
      sortValue: (row) => row.next,
    },
    {
      key: "actor",
      header: t("owner.inventory.actor"),
      render: (row) => row.actor,
      sortValue: (row) => row.actor,
    },
    {
      key: "notes",
      header: t("owner.inventory.detail"),
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedMovementRow(row)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-950"
          aria-label={t("owner.inventory.viewStockMovementDetail", { item: row.itemName })}
        >
          <EyeIcon className="h-5 w-5" />
        </button>
      ),
      sortValue: (row) => row.notes,
    },
  ];
  const exportInventoryReport = async (format: ReportExportFormat) => {
    try {
      const auditRows = buildStockMovementRows(data, dateRange, 0);
      const lowStockPlanRows = inventoryRows
        .filter((item) => getStockStatus(item.current, item.minimum) !== "good")
        .sort(sortByInventoryAlert);

      await exportReport(format, {
        filename: `owner-inventory-report-all-time-to-${dateRange.endDate}`,
        title: `${t("owner.dashboard.inventory")} Report`,
        subtitle: `All time - ${dateRange.endDate}`,
        sheets: [{
            name: t("owner.inventory.sheet.inventoryValuation"),
            description: "Current inventory balance, valuation, reorder target, and estimated restock requirement.",
            rows: [
              [
                t("owner.inventory.sheet.itemName"),
                t("owner.inventory.category"),
                t("owner.inventory.currentStock"),
                t("owner.inventory.sheet.unit"),
                t("owner.inventory.reorderLevel"),
                t("owner.inventory.sheet.unitCost"),
                t("owner.inventory.sheet.totalStockValue"),
                t("owner.inventory.suggestedRestock"),
                t("owner.inventory.sheet.estimatedRestockCost"),
              ],
              ...inventoryRows.map((item) => [
                item.name,
                item.category,
                item.current,
                item.unit,
                item.minimum,
                item.unitCost,
                item.current * item.unitCost,
                item.suggestedRestock,
                item.suggestedRestock * item.unitCost,
              ]),
            ],
          },
          {
            name: t("owner.inventory.sheet.batchValuation"),
            description: "Current batch balances with supplier, expiry, unit cost, and remaining stock value.",
            rows: [
              [
                t("owner.inventory.sheet.itemName"),
                t("owner.inventory.category"),
                t("owner.inventory.sheet.batchNumber"),
                t("owner.inventory.sheet.supplier"),
                t("owner.inventory.sheet.receivedDate"),
                t("owner.inventory.sheet.expiryDate"),
                t("owner.inventory.sheet.daysUntilExpiry"),
                t("owner.inventory.sheet.qtyReceived"),
                t("owner.inventory.sheet.qtyRemaining"),
                t("owner.inventory.sheet.unit"),
                t("owner.inventory.sheet.unitCostHpp"),
                t("owner.inventory.sheet.batchStockValue"),
                t("owner.inventory.sheet.receiptUrl"),
              ],
              ...batchRows.map((batch) => [
                batch.itemName,
                batch.category,
                batch.batchNumber,
                batch.supplier,
                batch.receivedAt ? batch.receivedAt.slice(0, 10) : "",
                batch.expiryDate,
                batch.daysUntilExpiry ?? "",
                batch.received,
                batch.remaining,
                batch.unit,
                batch.unitCost,
                batch.value,
                batch.receiptUrl,
              ]),
            ],
          },
          {
            name: t("owner.inventory.sheet.movementAudit"),
            description: "Inventory movements included in the active inventory reporting range.",
            rows: [
              [
                t("owner.inventory.sheet.timestamp"),
                t("owner.inventory.sheet.itemName"),
                t("owner.inventory.type"),
                t("owner.inventory.quantity"),
                t("owner.inventory.sheet.unit"),
                t("owner.inventory.before"),
                t("owner.inventory.after"),
                t("owner.inventory.actor"),
                t("owner.inventory.notes"),
              ],
              ...auditRows.map((row) => [
                row.timestamp,
                row.itemName,
                row.type,
                row.quantity,
                row.unit,
                row.previous,
                row.next,
                row.actor,
                row.notes,
              ]),
            ],
          },
          {
            name: t("owner.inventory.sheet.lowStockPlan"),
            description: "Items requiring owner attention based on reorder level, expiry risk, and estimated restock cost.",
            rows: [
              [
                t("owner.inventory.sheet.itemName"),
                t("owner.inventory.category"),
                t("owner.inventory.currentStock"),
                t("owner.inventory.reorderLevel"),
                t("owner.inventory.expiringStock"),
                t("owner.inventory.suggestedRestock"),
                t("owner.inventory.sheet.unit"),
                t("owner.inventory.sheet.unitCost"),
                t("owner.inventory.sheet.estimatedRestockCost"),
              ],
              ...lowStockPlanRows.map((item) => [
                item.name,
                item.category,
                item.current,
                item.minimum,
                item.expiringBatchRemaining > 0 && item.nearestBatchExpiryDays !== null
                  ? `${item.expiringBatchRemaining} ${item.unit} / ${item.nearestBatchExpiryDays} day(s)`
                  : "",
                item.suggestedRestock,
                item.unit,
                item.unitCost,
                item.suggestedRestock * item.unitCost,
              ]),
            ],
          },
          {
            name: t("owner.inventory.staffStockReports"),
            description: "Staff-submitted stock reports included in the active reporting range.",
            rows: [
              [
                t("owner.inventory.sheet.createdAt"),
                t("owner.inventory.sheet.itemName"),
                t("owner.inventory.sheet.reportType"),
                t("owner.inventory.sheet.status"),
                t("owner.inventory.sheet.reportedRole"),
              ],
              ...reportsInRange.map((report) => [
                report.created_at ?? "",
                report.material_name ?? "",
                formatStockReportType(report.report_type),
                formatStockReportStatus(report.status),
                report.reported_by_role ?? "",
              ]),
            ],
          },
          {
            name: t("owner.inventory.sheet.stockStatus"),
            description: "Current inventory item count by stock health status.",
            rows: [
              [t("owner.inventory.sheet.status"), t("owner.inventory.sheet.itemCount")],
              ...stockStatusData.map((item) => [item.name, item.value]),
              [t("owner.inventory.dataIssues"), healthSummary.dataIssues],
            ],
          },
          {
            name: t("owner.inventory.sheet.batchRisk"),
            description: "Current batch count grouped by expiry risk.",
            rows: [
              [t("owner.inventory.sheet.risk"), t("owner.inventory.sheet.batchCount")],
              ...batchRiskData.map((item) => [item.name, item.value]),
            ],
          }],
      });
      showSuccess(t("owner.inventory.exportSuccess"));
    } catch (error) {
      console.error("Owner inventory report export error:", error);
      showError(t("owner.inventory.exportError"));
    }
  };

  return (
    <div className="space-y-4">
      <GenerateRecommendationPanel category="inventory" period={dateRange} />
      <div className="flex justify-end">
        <ExportButton
          label={t("owner.inventory.export")}
          items={getReportExportItems({
            onExport: (format) => void exportInventoryReport(format),
            disabled: data.loading,
          })}
        />
      </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label={t("owner.inventory.totalSkus")} value={data.loading ? t("owner.dashboard.loading") : formatNumber(healthSummary.totalItems)} helper={t("owner.inventory.totalSkusHelper")} tone="info" />
          <MetricCard label={t("owner.inventory.criticalItems")} value={data.loading ? t("owner.dashboard.loading") : formatNumber(criticalItemCount)} helper={t("owner.inventory.criticalItemsHelper")} tone={criticalItemCount > 0 ? "danger" : "success"} />
          <MetricCard label={t("owner.inventory.restockCost")} value={data.loading ? t("owner.dashboard.loading") : formatCurrency(healthSummary.estimatedRestockCost)} helper={t("owner.inventory.restockCostHelper")} tone="waiting" />
          <MetricCard label={t("owner.inventory.dataIssues")} value={data.loading ? t("owner.dashboard.loading") : formatNumber(healthSummary.dataIssues)} helper={t("owner.inventory.dataIssuesHelper")} tone={healthSummary.dataIssues > 0 ? "danger" : "success"} />
          <MetricCard label={t("owner.inventory.pendingReports")} value={data.loading ? t("owner.dashboard.loading") : formatNumber(pendingStockReports.length)} helper={t("owner.inventory.pendingReportsHelper")} tone={pendingStockReports.length > 0 ? "warning" : "success"} />
          <MetricCard label={t("owner.inventory.highestUsage")} value={data.loading ? t("owner.dashboard.loading") : healthSummary.mostUsedName} helper={t("owner.inventory.highestUsageHelper")} tone="premium" />
        </div>

      {pendingStockReports.length ? (
        <div className={`rounded-xl border p-4 text-sm ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}>
          <p className="font-bold text-gray-900">{t("owner.inventory.followUpTitle")}</p>
          <p className="mt-1 leading-6">
            {t("owner.inventory.pendingReportCount", { count: pendingStockReports.length })}
            {repeatedStockIssue
              ? t("owner.inventory.mostRepeatedIssue", { item: repeatedStockIssue[0], count: repeatedStockIssue[1] })
              : ""}
          </p>
        </div>
      ) : null}


      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <ChartCard title={t("owner.inventory.batchRisk")} subtitle={t("owner.inventory.batchRiskSubtitle")}>
          {batchRiskData.some((item) => item.value > 0) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchRiskData} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Bar dataKey="value" name={t("owner.inventory.batches")} radius={[8, 8, 0, 0]}>
                    {batchRiskData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.inventory.noBatchRisk")} />
          )}
        </ChartCard>

        <ChartCard title={t("owner.inventory.batchValueByCategory")} subtitle={t("owner.inventory.batchValueByCategorySubtitle")}>
          {batchValueByCategory.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchValueByCategory} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(Number(value))} />
                  <YAxis dataKey="name" type="category" width={92} tickLine={false} axisLine={false} />
                  <Tooltip content={<StandardTooltip />} />
                  <Bar dataKey="value" name={t("owner.inventory.batchValue")} fill={OWNER_CHART_COLORS.SOFT_SKY_BLUE} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.inventory.noBatchValuation")} />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard
        title={t("owner.inventory.lowStockAlert")}
        subtitle={t("owner.inventory.lowStockAlertSubtitle")}
      >
          <StandardTable
            columns={lowStockColumns}
            data={lowStockRows}
            getRowKey={(item) => item.id}
            emptyLabel={t("owner.inventory.noInventoryItem")}
            loading={data.loading}
            minWidthClassName="min-w-170"
            preserveDataOrder
          />
        </ChartCard>

        <ChartCard title={t("owner.inventory.usageTrend")} subtitle={t("owner.inventory.usageTrendSubtitle")}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {usageAxisIsCurrency
                ? t("owner.inventory.usageCurrencyNote")
                : t("owner.inventory.usageQuantityNote", {
                    unit: selectedUsageUnit ? t("owner.inventory.inUnit", { unit: selectedUsageUnit }) : "",
                  })}
            </p>
            <select
              value={selectedInventoryItemId}
              onChange={(event) => setSelectedInventoryItemId(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-gray-900"
              aria-label={t("owner.inventory.selectUsageItem")}
            >
              <option value="all">{t("owner.inventory.allItemsRupiah")}</option>
              {data.inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name ?? t("owner.inventory.inventoryItem")}
                </option>
              ))}
            </select>
          </div>
          {movementTrend.some((item) => item.stockIn || item.stockOut || item.adjustments) ? (
            <div className="h-80 xl:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movementTrend} margin={{ left: -8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OWNER_SEMANTIC_TONES.neutral.border} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatUsageAxis(Number(value))}
                    width={usageAxisIsCurrency ? 72 : 56}
                  />
                  <Tooltip content={<StandardTooltip />} />
                  <Legend />
                  <Bar dataKey="stockIn" name={t("owner.inventory.stockIn")} fill={OWNER_CHART_COLORS.SOFT_GREEN} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="stockOut" name={t("owner.inventory.stockOut")} fill={OWNER_CHART_COLORS.SOFT_ROSE} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="adjustments" name={t("owner.inventory.adjustments")} fill={OWNER_CHART_COLORS.SOFT_YELLOW} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label={t("owner.inventory.noStockMovementEvents")} />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <ChartCard
          title={t("owner.inventory.stockMovement")}
          subtitle={t("owner.inventory.stockMovementSubtitle")}
        >
            <StandardTable
              columns={movementColumns}
              data={movementRows}
              getRowKey={(row) => row.id}
              emptyLabel={t("owner.inventory.noStockMovementRecords")}
              loading={data.loading}
            />
        </ChartCard>

        <div className="space-y-4">
          <ChartCard
            title={t("owner.inventory.staffStockReports")}
            subtitle={t("owner.inventory.staffStockReportsSubtitle")}
          >
            {reportsInRange.length ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className={`rounded-xl border p-3 ${OWNER_SEMANTIC_TONES.warning.badgeClass}`}>
                    <p className="text-xs font-semibold text-gray-600">{t("owner.inventory.pending")}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-950">{formatNumber(pendingStockReports.length)}</p>
                  </div>
                  <div className={`rounded-xl border p-3 ${OWNER_SEMANTIC_TONES.success.badgeClass}`}>
                    <p className="text-xs font-semibold text-gray-600">{t("owner.inventory.resolved")}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-950">{formatNumber(resolvedStockReports.length)}</p>
                  </div>
                  <div className={`rounded-xl border p-3 ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}>
                    <p className="text-xs font-semibold text-gray-600">{t("owner.inventory.rejected")}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-950">{formatNumber(rejectedStockReports.length)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.mostReportedItem")}</p>
                  <p className="mt-2 font-bold text-gray-950">
                    {mostReportedStockIssue ? mostReportedStockIssue[0] : "-"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {mostReportedStockIssue
                      ? t("owner.inventory.reportCountThisMonth", { count: mostReportedStockIssue[1] })
                      : t("owner.inventory.noRepeatedPattern")}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.latestReport")}</p>
                  {latestStockReport ? (
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-950">{latestStockReport.material_name || t("owner.inventory.unknownMaterial")}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatStockReportType(latestStockReport.report_type)}
                          {latestStockReport.reported_by_role ? t("owner.inventory.reportedBy", { role: latestStockReport.reported_by_role }) : ""}
                        </p>
                      </div>
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {formatStockReportStatus(latestStockReport.status)}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">{t("owner.inventory.noLatestReport")}</p>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState label={t("owner.inventory.noStaffStockReports")} />
            )}
          </ChartCard>

          <ChartCard title={t("owner.inventory.stockStatus")} subtitle={t("owner.inventory.stockStatusSubtitle")}>
            {stockStatusChartData.length ? (
              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockStatusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {stockStatusChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<StandardTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {stockStatusData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="truncate text-sm font-semibold text-gray-700">{entry.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-950">{formatNumber(entry.value)}</span>
                    </div>
                  ))}
                  {healthSummary.dataIssues > 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.dataIssues")}</span>
                        <span className="text-sm font-bold text-gray-950">{formatNumber(healthSummary.dataIssues)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState label={t("owner.inventory.noStockStatus")} />
            )}
          </ChartCard>
        </div>
      </div>

      {selectedMovementRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-950">{t("owner.inventory.stockMovementDetail")}</h2>
                <p className="mt-1 text-sm text-gray-500">{selectedMovementRow.itemName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMovementRow(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-950"
                aria-label={t("owner.inventory.closeStockMovementDetail")}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.type")}</p>
                  <p className="mt-1 font-semibold capitalize text-gray-900">{selectedMovementRow.type}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.quantity")}</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatNumber(selectedMovementRow.quantity)} {selectedMovementRow.unit}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.before")}</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatNumber(selectedMovementRow.previous)} {selectedMovementRow.unit}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.after")}</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatNumber(selectedMovementRow.next)} {selectedMovementRow.unit}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.actor")}</p>
                <p className="mt-1 font-semibold text-gray-900">{selectedMovementRow.actor}</p>
              </div>

              <div className="mt-4 rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase text-gray-500">{t("owner.inventory.notes")}</p>
                <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-gray-700">
                  {selectedMovementRow.notes || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default InventoryDashboard;

