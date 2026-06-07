"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import { getCurrentUser } from "@/lib/utils";
import {
  getJakartaTodayDate,
  toJakartaDateTimeEnd,
  toJakartaDateTimeStart,
} from "@/lib/services/bookkeeping/bookkeepingDate";
import type { AppNotification, NotificationSeverity } from "./types";

type InventoryRow = {
  id: string;
  name: string | null;
  current_stock: number | string | null;
  reorder_level: number | string | null;
  unit: string | null;
};

type StockReportRow = {
  id: string;
  material_name: string | null;
  report_type: string | null;
  status: string | null;
  station_scope?: string | null;
  created_at: string | null;
};

type KitchenMovementRow = {
  id: string;
  inventory_item_id: string | null;
  movement_type: string | null;
  quantity: number | string | null;
  unit: string | null;
  total_cost: number | string | null;
  shift_name: string | null;
  notes: string | null;
  created_at: string | null;
};

type OrderRow = {
  id: string;
  total: number | string | null;
  status: string | null;
  payment_status: string | null;
  created_at: string | null;
  order_date?: string | null;
};

type ProductRow = {
  id: string;
  name: string | null;
  available: boolean | null;
  type: string | null;
};

type AttendanceRow = {
  id: string;
  staff_id: string | null;
  attendance_date: string | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
  check_in_status: string | null;
  check_out_status: string | null;
};

type ActivityLogRow = {
  id: string;
  action?: string | null;
  action_description?: string | null;
  action_category?: string | null;
  entity_type?: string | null;
  resource_type?: string | null;
  severity?: string | null;
  created_at?: string | null;
};

type BookkeepingOverview = {
  summary?: {
    grossSales?: number | null;
    netSales?: number | null;
    grossProfit?: number | null;
    netProfitEstimate?: number | null;
    totalOrders?: number | null;
    unresolvedExceptions?: number | null;
  };
  exceptions?: Array<{
    id: string;
    severity: "low" | "medium" | "high";
    type: string;
    description: string;
    status: string;
  }>;
  dailyClosing?: {
    status?: string | null;
    unresolvedExceptionCount?: number | null;
  } | null;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatQuantity = (value: number, unit?: string | null) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} ${unit || ""}`.trim();

const getJakartaHour = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0);
};

const reportTypeLabel = (type?: string | null) => {
  if (type === "out_of_stock") return "out of stock";
  if (type === "waste_damaged") return "waste/damaged";
  if (type === "restock_request") return "restock request";
  if (type === "testing_usage") return "testing usage";
  return "low stock";
};

const normalizeOrderStatus = (status?: string | null) => String(status || "").toLowerCase().replace(/\s+/g, "_");
const normalizePaymentStatus = (status?: string | null) => String(status || "").toLowerCase().replace(/\s+/g, "_");

const getOwnerRequestHeaders = () => {
  const currentUser = getCurrentUser();
  return {
    "x-user-id": currentUser?.id || "",
    "x-user-name": currentUser?.name || "Owner",
    "x-user-role": currentUser?.role || "owner",
  };
};

const sortNotifications = (items: AppNotification[]) => {
  const severityRank: Record<NotificationSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    success: 3,
  };

  return [...items].sort((left, right) => {
    const severityDiff = severityRank[left.severity] - severityRank[right.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
};

export default function useOwnerNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const today = useMemo(() => getJakartaTodayDate(), []);

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      return;
    }

    let mounted = true;

    const load = async () => {
      setLoading(true);
      const startIso = toJakartaDateTimeStart(today);
      const endIso = toJakartaDateTimeEnd(today);

      const [
        inventoryResult,
        stockReportsResult,
        kitchenMovementsResult,
        ordersResult,
        productsResult,
        attendanceResult,
        activityLogsResult,
        bookkeepingResult,
      ] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("id,name,current_stock,reorder_level,unit")
          .order("name", { ascending: true }),
        supabase
          .from("stock_reports")
          .select("id,material_name,report_type,status,station_scope,created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(25)
          .then((result) => {
            const message = result.error?.message.toLowerCase() || "";
            return message.includes("station_scope") || message.includes("schema cache")
              ? supabase
                  .from("stock_reports")
                  .select("id,material_name,report_type,status,created_at")
                  .eq("status", "pending")
                  .order("created_at", { ascending: false })
                  .limit(25)
              : result;
          }),
        supabase
          .from("kitchen_station_movements")
          .select("id,inventory_item_id,movement_type,quantity,unit,total_cost,shift_name,notes,created_at")
          .eq("movement_type", "waste")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: false })
          .limit(25)
          .then((result) => {
            const message = result.error?.message.toLowerCase() || "";
            return message.includes("kitchen_station_movements") || message.includes("schema cache")
              ? { data: [] as KitchenMovementRow[], error: null }
              : result;
          }),
        supabase
          .from("orders")
          .select("id,total,status,payment_status,created_at,order_date")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("products")
          .select("id,name,available,type")
          .eq("available", false)
          .order("name", { ascending: true })
          .limit(20),
        supabase
          .from("attendance")
          .select("id,staff_id,attendance_date,clock_in_at,clock_out_at,check_in_status,check_out_status")
          .eq("attendance_date", today)
          .limit(200),
        supabase
          .from("activity_logs")
          .select("*")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: false })
          .limit(50)
          .then((result) => {
            const message = result.error?.message.toLowerCase() || "";
            return message.includes("activity_logs") || message.includes("schema cache")
              ? { data: [] as ActivityLogRow[], error: null }
              : result;
          }),
        fetch(`/api/owner/bookkeeping/overview?startDate=${today}&endDate=${today}`, {
          headers: getOwnerRequestHeaders(),
        })
          .then(async (response): Promise<BookkeepingOverview | null> => {
            if (!response.ok) return null;
            const result = await response.json() as { data?: BookkeepingOverview } | BookkeepingOverview;
            return "data" in result ? result.data ?? null : result as BookkeepingOverview;
          })
          .catch(() => null),
      ]);

      if (!mounted) return;

      const next: AppNotification[] = [];
      const now = new Date().toISOString();
      const inventoryRows = (inventoryResult.data ?? []) as InventoryRow[];
      const inventoryNameById = new Map(inventoryRows.map((item) => [item.id, item.name || "Inventory item"]));
      const stockReports = (stockReportsResult.data ?? []) as StockReportRow[];
      const kitchenMovements = (kitchenMovementsResult.data ?? []) as KitchenMovementRow[];
      const orders = (ordersResult.data ?? []) as OrderRow[];
      const products = (productsResult.data ?? []) as ProductRow[];
      const attendanceRows = (attendanceResult.data ?? []) as AttendanceRow[];
      const activityLogs = ((activityLogsResult.data ?? []) as ActivityLogRow[])
        .filter((log) => ["critical", "warning"].includes(String(log.severity || "").toLowerCase()))
        .slice(0, 20);
      const bookkeeping = bookkeepingResult;

      const summary = bookkeeping?.summary;
      if (summary && toNumber(summary.totalOrders) > 0) {
        const grossSales = toNumber(summary.grossSales);
        const netSales = toNumber(summary.netSales);
        const grossProfit = summary.grossProfit === null || summary.grossProfit === undefined ? null : toNumber(summary.grossProfit);
        const marginPct = grossProfit !== null && netSales > 0 ? (grossProfit / netSales) * 100 : null;

        next.push({
          id: `owner-daily-summary-${today}`,
          title: "Daily business summary is ready",
          message: `${toNumber(summary.totalOrders)} orders recorded today. Gross sales ${formatCurrency(grossSales)}${marginPct !== null ? `, gross margin ${Math.round(marginPct)}%` : ""}.`,
          severity: "info",
          source: "Bookkeeping",
          createdAt: now,
          actionHref: "/owner/bookkeeping?tab=closings",
          actionLabel: "Review closing",
        });

        if (marginPct !== null && marginPct < 35) {
          next.push({
            id: `owner-margin-low-${today}`,
            title: "Gross margin is below target",
            message: `Today's gross margin is ${Math.round(marginPct)}%. Review menu cost, waste, and stock usage before closing the day.`,
            severity: marginPct < 20 ? "critical" : "warning",
            source: "Profit",
            createdAt: now,
            actionHref: "/owner/bookkeeping?tab=cost-margin",
            actionLabel: "Review margins",
          });
        }
      }

      const openExceptions = (bookkeeping?.exceptions ?? []).filter((exception) => exception.status === "open");
      const highExceptions = openExceptions.filter((exception) => exception.severity === "high");
      if (openExceptions.length > 0) {
        next.push({
          id: `owner-bookkeeping-exceptions-${today}-${openExceptions.length}-${highExceptions.length}`,
          title: highExceptions.length ? "High bookkeeping exceptions need review" : "Bookkeeping exceptions need review",
          message: `${openExceptions.length} unresolved exception(s) found today${highExceptions.length ? `, including ${highExceptions.length} high severity issue(s)` : ""}.`,
          severity: highExceptions.length ? "critical" : "warning",
          source: "Bookkeeping",
          createdAt: now,
          actionHref: "/owner/bookkeeping?tab=exceptions",
          actionLabel: "Open exceptions",
        });
      }

      const closingStatus = bookkeeping?.dailyClosing?.status;
      const shouldPromptClosing = toNumber(summary?.totalOrders) > 0 && (!closingStatus || closingStatus === "reopened" || closingStatus === "needs_review");
      if (shouldPromptClosing && getJakartaHour() >= 20) {
        next.push({
          id: `owner-daily-closing-${today}-${closingStatus || "missing"}`,
          title: "Daily closing is not clean yet",
          message: closingStatus
            ? `Today's closing status is ${closingStatus}. Review it before ending the business day.`
            : "Sales exist today, but daily closing has not been completed yet.",
          severity: closingStatus === "needs_review" ? "critical" : "warning",
          source: "Closing",
          createdAt: now,
          actionHref: "/owner/bookkeeping?tab=closings",
          actionLabel: "Open closing",
        });
      }

      const criticalStock = inventoryRows
        .filter((item) => toNumber(item.current_stock) <= 0)
        .slice(0, 5);
      const lowStock = inventoryRows
        .filter((item) => {
          const current = toNumber(item.current_stock);
          const reorder = toNumber(item.reorder_level);
          return current > 0 && reorder > 0 && current <= reorder;
        })
        .slice(0, 5);

      if (criticalStock.length > 0) {
        next.push({
          id: `owner-critical-stock-${criticalStock.map((item) => item.id).join("-")}`,
          title: "Critical inventory is out of stock",
          message: `${criticalStock.map((item) => item.name || "Inventory item").join(", ")} need immediate restock or menu review.`,
          severity: "critical",
          source: "Inventory",
          createdAt: now,
          actionHref: "/owner/dashboard?tab=inventory",
          actionLabel: "Review inventory",
        });
      } else if (lowStock.length > 0) {
        next.push({
          id: `owner-low-stock-${lowStock.map((item) => item.id).join("-")}`,
          title: "Inventory is below reorder level",
          message: `${lowStock.map((item) => `${item.name || "Item"} (${formatQuantity(toNumber(item.current_stock), item.unit)})`).join(", ")}.`,
          severity: "warning",
          source: "Inventory",
          createdAt: now,
          actionHref: "/owner/dashboard?tab=inventory",
          actionLabel: "Review inventory",
        });
      }

      const importantReports = stockReports.filter((report) =>
        ["out_of_stock", "waste_damaged", "restock_request", "testing_usage"].includes(report.report_type || ""),
      );
      if (importantReports.length > 0) {
        const first = importantReports[0];
        next.push({
          id: `owner-pending-stock-reports-${importantReports.length}-${first.id}`,
          title: "Staff reports need manager follow-up",
          message: `${importantReports.length} important pending report(s). Latest: ${first.material_name || "Inventory item"} ${reportTypeLabel(first.report_type)}.`,
          severity: first.report_type === "out_of_stock" || first.report_type === "waste_damaged" ? "warning" : "info",
          source: "Stock Reports",
          createdAt: first.created_at || now,
          actionHref: "/manager/inventory?tab=stock-reports",
          actionLabel: "Open reports",
        });
      }

      if (kitchenMovements.length > 0) {
        const totalWasteValue = kitchenMovements.reduce((sum, movement) => sum + toNumber(movement.total_cost), 0);
        const first = kitchenMovements[0];
        next.push({
          id: `owner-kitchen-waste-${today}-${kitchenMovements.length}-${Math.round(totalWasteValue)}`,
          title: "Kitchen waste was recorded today",
          message: `${kitchenMovements.length} waste movement(s) recorded${totalWasteValue > 0 ? `, estimated value ${formatCurrency(totalWasteValue)}` : ""}. Latest: ${inventoryNameById.get(first.inventory_item_id || "") || "Kitchen item"} ${formatQuantity(toNumber(first.quantity), first.unit)}.`,
          severity: totalWasteValue >= 50000 || kitchenMovements.length >= 3 ? "warning" : "info",
          source: "Kitchen",
          createdAt: first.created_at || now,
          actionHref: "/owner/bookkeeping?tab=auto-ledger",
          actionLabel: "Review ledger",
        });
      }

      if (products.length > 0) {
        next.push({
          id: `owner-menu-unavailable-${products.map((product) => product.id).join("-")}`,
          title: "Menu availability risk",
          message: `${products.length} menu item(s) are unavailable. Check whether critical ingredients or kitchen ready stock caused it.`,
          severity: "warning",
          source: "Menu",
          createdAt: now,
          actionHref: "/manager/menu",
          actionLabel: "Open menu",
        });
      }

      const unpaidOrders = orders.filter((order) => normalizePaymentStatus(order.payment_status).includes("unpaid"));
      const activeOrders = orders.filter((order) =>
        ["new", "pending", "on_process", "on-process", "partially_served", "partially-served"].includes(normalizeOrderStatus(order.status)),
      );
      const cancelledOrders = orders.filter((order) =>
        ["cancelled", "canceled", "void", "refunded"].includes(normalizeOrderStatus(order.status)),
      );

      if (unpaidOrders.length > 0) {
        next.push({
          id: `owner-unpaid-orders-${today}-${unpaidOrders.length}`,
          title: "Unpaid orders need reconciliation",
          message: `${unpaidOrders.length} order(s) still have unpaid payment status today.`,
          severity: "warning",
          source: "Operations",
          createdAt: now,
          actionHref: "/owner/dashboard?tab=operations",
          actionLabel: "Review operations",
        });
      }

      if (activeOrders.length >= 5) {
        next.push({
          id: `owner-active-order-backlog-${today}-${activeOrders.length}`,
          title: "Active order backlog is building",
          message: `${activeOrders.length} order(s) are still active in the service flow.`,
          severity: activeOrders.length >= 10 ? "critical" : "warning",
          source: "Operations",
          createdAt: now,
          actionHref: "/owner/dashboard?tab=operations",
          actionLabel: "Open operations",
        });
      }

      if (cancelledOrders.length > 0) {
        next.push({
          id: `owner-cancelled-orders-${today}-${cancelledOrders.length}`,
          title: "Cancelled or refunded orders recorded",
          message: `${cancelledOrders.length} cancelled, void, or refunded order(s) were detected today.`,
          severity: cancelledOrders.length >= 3 ? "warning" : "info",
          source: "Operations",
          createdAt: now,
          actionHref: "/owner/dashboard?tab=operations",
          actionLabel: "Review operations",
        });
      }

      const lateAttendance = attendanceRows.filter((row) => String(row.check_in_status || "").toLowerCase().includes("late"));
      const missingClockOut = attendanceRows.filter((row) => row.clock_in_at && !row.clock_out_at);
      if (lateAttendance.length > 0 || missingClockOut.length > 0) {
        next.push({
          id: `owner-attendance-risk-${today}-${lateAttendance.length}-${missingClockOut.length}`,
          title: "Staff attendance needs review",
          message: `${lateAttendance.length} late check-in(s), ${missingClockOut.length} active shift(s) without clock-out.`,
          severity: lateAttendance.length >= 3 || missingClockOut.length >= 3 ? "warning" : "info",
          source: "Staff",
          createdAt: now,
          actionHref: "/owner/dashboard?tab=staff",
          actionLabel: "Review staff",
        });
      }

      const criticalLogs = activityLogs.filter((log) => String(log.severity || "").toLowerCase() === "critical");
      const warningLogs = activityLogs.filter((log) => String(log.severity || "").toLowerCase() === "warning");
      if (criticalLogs.length > 0 || warningLogs.length >= 3) {
        const firstLog = criticalLogs[0] || warningLogs[0];
        const activityDescription =
          firstLog?.action_description ||
          [firstLog?.action, firstLog?.resource_type || firstLog?.entity_type]
            .filter(Boolean)
            .join(" ") ||
          `${criticalLogs.length} critical and ${warningLogs.length} warning activity log event(s) detected today.`;
        next.push({
          id: `owner-activity-risk-${today}-${criticalLogs.length}-${warningLogs.length}-${firstLog?.id || "logs"}`,
          title: criticalLogs.length ? "Critical activity log event" : "Multiple warning activity events",
          message: activityDescription,
          severity: criticalLogs.length ? "critical" : "warning",
          source: "Activity Log",
          createdAt: firstLog?.created_at || now,
          actionHref: "/owner/activitylog",
          actionLabel: "Open activity log",
        });
      }

      setNotifications(sortNotifications(next));
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [enabled, today]);

  return { notifications, loading };
}
