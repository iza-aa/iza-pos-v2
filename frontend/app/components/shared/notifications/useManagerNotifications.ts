"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
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

type ProductRow = {
  id: string;
  name: string | null;
  available: boolean | null;
  is_available?: boolean | null;
  type: string | null;
};

type OrderRow = {
  id: string;
  status: string | null;
  payment_status: string | null;
  created_at: string | null;
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

type OrderCorrectionRow = {
  id: string;
  order_id: string | null;
  status: string | null;
  physical_status: string | null;
  created_at: string | null;
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

const reportTypeLabel = (type?: string | null) => {
  if (type === "out_of_stock") return "out of stock";
  if (type === "waste_damaged") return "waste/damaged";
  if (type === "restock_request") return "restock request";
  if (type === "testing_usage") return "testing usage";
  return "low stock";
};

const normalizeStatus = (status?: string | null) => String(status || "").toLowerCase().replace(/\s+/g, "_");

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

export default function useManagerNotifications(enabled: boolean) {
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
        productsResult,
        ordersResult,
        attendanceResult,
        correctionsResult,
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
          .limit(30)
          .then((result) => {
            const message = result.error?.message.toLowerCase() || "";
            return message.includes("station_scope") || message.includes("schema cache")
              ? supabase
                  .from("stock_reports")
                  .select("id,material_name,report_type,status,created_at")
                  .eq("status", "pending")
                  .order("created_at", { ascending: false })
                  .limit(30)
              : result;
          }),
        supabase
          .from("kitchen_station_movements")
          .select("id,inventory_item_id,movement_type,quantity,unit,total_cost,shift_name,notes,created_at")
          .in("movement_type", ["waste", "testing_usage", "bulk_opened", "transfer_in"])
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: false })
          .limit(40)
          .then((result) => {
            const message = result.error?.message.toLowerCase() || "";
            return message.includes("kitchen_station_movements") || message.includes("schema cache")
              ? { data: [] as KitchenMovementRow[], error: null }
              : result;
          }),
        supabase
          .from("products")
          .select("id,name,available,is_available,type")
          .order("name", { ascending: true })
          .limit(200),
        supabase
          .from("orders")
          .select("id,status,payment_status,created_at")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("attendance")
          .select("id,staff_id,attendance_date,clock_in_at,clock_out_at,check_in_status,check_out_status")
          .eq("attendance_date", today)
          .limit(200),
        supabase
          .from("order_corrections")
          .select("id,order_id,status,physical_status,created_at")
          .eq("status", "logged")
          .order("created_at", { ascending: false })
          .limit(25)
          .then((result) => {
            const message = result.error?.message.toLowerCase() || "";
            return message.includes("order_corrections") || message.includes("schema cache")
              ? { data: [] as OrderCorrectionRow[], error: null }
              : result;
          }),
      ]);

      if (!mounted) return;

      const next: AppNotification[] = [];
      const now = new Date().toISOString();
      const inventoryRows = (inventoryResult.data ?? []) as InventoryRow[];
      const inventoryNameById = new Map(inventoryRows.map((item) => [item.id, item.name || "Inventory item"]));
      const stockReports = (stockReportsResult.data ?? []) as StockReportRow[];
      const kitchenMovements = (kitchenMovementsResult.data ?? []) as KitchenMovementRow[];
      const products = (productsResult.data ?? []) as ProductRow[];
      const orders = (ordersResult.data ?? []) as OrderRow[];
      const attendanceRows = (attendanceResult.data ?? []) as AttendanceRow[];
      const corrections = (correctionsResult.data ?? []) as OrderCorrectionRow[];

      const criticalStock = inventoryRows.filter((item) => toNumber(item.current_stock) <= 0).slice(0, 5);
      const lowStock = inventoryRows
        .filter((item) => {
          const current = toNumber(item.current_stock);
          const reorder = toNumber(item.reorder_level);
          return current > 0 && reorder > 0 && current <= reorder;
        })
        .slice(0, 5);

      if (criticalStock.length > 0) {
        next.push({
          id: `manager-critical-stock-${criticalStock.map((item) => item.id).join("-")}`,
          title: "Inventory items are out of stock",
          message: `${criticalStock.map((item) => item.name || "Inventory item").join(", ")} need restock or menu availability review.`,
          severity: "critical",
          source: "Inventory",
          createdAt: now,
          actionHref: "/manager/inventory?tab=raw-materials-list",
        });
      } else if (lowStock.length > 0) {
        next.push({
          id: `manager-low-stock-${lowStock.map((item) => item.id).join("-")}`,
          title: "Inventory is below reorder level",
          message: `${lowStock.map((item) => `${item.name || "Item"} (${formatQuantity(toNumber(item.current_stock), item.unit)})`).join(", ")}.`,
          severity: "warning",
          source: "Inventory",
          createdAt: now,
          actionHref: "/manager/inventory?tab=raw-materials-list",
        });
      }

      if (stockReports.length > 0) {
        const highPriorityReports = stockReports.filter((report) =>
          ["out_of_stock", "waste_damaged", "restock_request", "testing_usage"].includes(report.report_type || ""),
        );
        const first = highPriorityReports[0] || stockReports[0];

        next.push({
          id: `manager-stock-reports-${stockReports.length}-${first.id}`,
          title: "Staff stock reports need review",
          message: `${stockReports.length} pending report(s). Latest: ${first.material_name || "Inventory item"} ${reportTypeLabel(first.report_type)}${first.station_scope ? ` from ${first.station_scope}` : ""}.`,
          severity: highPriorityReports.length > 0 ? "warning" : "info",
          source: "Stock Reports",
          createdAt: first.created_at || now,
          actionHref: "/manager/inventory?tab=stock-reports",
        });
      }

      const wasteMovements = kitchenMovements.filter((movement) => movement.movement_type === "waste");
      if (wasteMovements.length > 0) {
        const totalWasteValue = wasteMovements.reduce((sum, movement) => sum + toNumber(movement.total_cost), 0);
        const first = wasteMovements[0];

        next.push({
          id: `manager-kitchen-waste-${today}-${wasteMovements.length}-${Math.round(totalWasteValue)}`,
          title: "Kitchen waste was recorded",
          message: `${wasteMovements.length} waste movement(s) today${totalWasteValue > 0 ? `, estimated ${formatCurrency(totalWasteValue)}` : ""}. Latest: ${inventoryNameById.get(first.inventory_item_id || "") || "Kitchen item"} ${formatQuantity(toNumber(first.quantity), first.unit)}.`,
          severity: wasteMovements.length >= 3 || totalWasteValue >= 50000 ? "warning" : "info",
          source: "Kitchen",
          createdAt: first.created_at || now,
          actionHref: "/manager/inventory?tab=usage-history",
        });
      }

      const testingMovements = kitchenMovements.filter((movement) => movement.movement_type === "testing_usage");
      if (testingMovements.length > 0) {
        const first = testingMovements[0];

        next.push({
          id: `manager-testing-usage-${today}-${testingMovements.length}-${first.id}`,
          title: "Quality testing usage recorded",
          message: `${testingMovements.length} tasting or calibration usage movement(s) were recorded today.`,
          severity: "info",
          source: "Usage History",
          createdAt: first.created_at || now,
          actionHref: "/manager/inventory?tab=usage-history",
        });
      }

      const unavailableProducts = products.filter((product) => product.available === false || product.is_available === false);
      if (unavailableProducts.length > 0) {
        next.push({
          id: `manager-menu-unavailable-${unavailableProducts.map((product) => product.id).join("-")}`,
          title: "Menu items are unavailable",
          message: `${unavailableProducts.slice(0, 5).map((product) => product.name || "Menu item").join(", ")} need recipe, stock, or availability review.`,
          severity: "warning",
          source: "Menu",
          createdAt: now,
          actionHref: "/manager/menu",
        });
      }

      const activeOrders = orders.filter((order) =>
        ["new", "pending", "preparing", "on_process", "on-process", "partially_served", "partially-served"].includes(normalizeStatus(order.status)),
      );
      const unpaidOrders = orders.filter((order) => normalizeStatus(order.payment_status).includes("unpaid"));

      if (activeOrders.length >= 5) {
        next.push({
          id: `manager-active-orders-${today}-${activeOrders.length}`,
          title: "Active order queue is building",
          message: `${activeOrders.length} order(s) are still active. Check kitchen, bar, and serving flow.`,
          severity: activeOrders.length >= 10 ? "critical" : "warning",
          source: "Order",
          createdAt: now,
          actionHref: "/staff/order",
        });
      }

      if (unpaidOrders.length > 0) {
        next.push({
          id: `manager-unpaid-orders-${today}-${unpaidOrders.length}`,
          title: "Unpaid orders need follow-up",
          message: `${unpaidOrders.length} order(s) still have unpaid payment status today.`,
          severity: "warning",
          source: "Order",
          createdAt: now,
          actionHref: "/staff/order",
        });
      }

      if (corrections.length > 0) {
        next.push({
          id: `manager-order-corrections-${corrections.length}-${corrections[0].id}`,
          title: "Order correction requests need review",
          message: `${corrections.length} correction request(s) are waiting for manager review.`,
          severity: "warning",
          source: "Order",
          createdAt: corrections[0].created_at || now,
          actionHref: "/staff/order",
        });
      }

      const lateAttendance = attendanceRows.filter((row) => String(row.check_in_status || "").toLowerCase().includes("late"));
      const missingClockOut = attendanceRows.filter((row) => row.clock_in_at && !row.clock_out_at);
      const earlyLeave = attendanceRows.filter((row) => String(row.check_out_status || "").toLowerCase().includes("early"));

      if (lateAttendance.length > 0 || earlyLeave.length > 0 || missingClockOut.length >= 3) {
        next.push({
          id: `manager-attendance-${today}-${lateAttendance.length}-${earlyLeave.length}-${missingClockOut.length}`,
          title: "Attendance needs review",
          message: `${lateAttendance.length} late check-in(s), ${earlyLeave.length} early leave(s), ${missingClockOut.length} active shift(s) without clock-out.`,
          severity: lateAttendance.length >= 3 || earlyLeave.length >= 2 ? "warning" : "info",
          source: "Staff",
          createdAt: now,
          actionHref: "/manager/staff-manager",
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
