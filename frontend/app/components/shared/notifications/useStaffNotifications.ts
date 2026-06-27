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

type StaffType = "kitchen" | "cashier" | "barista" | "waiter";
type StationScope = "barista" | "kitchen" | "shared";

type InventoryRow = {
  id: string;
  name: string | null;
  current_stock: number | string | null;
  reorder_level: number | string | null;
  unit: string | null;
  station_scope?: string | null;
};

type StockReportRow = {
  id: string;
  material_name: string | null;
  report_type: string | null;
  status: string | null;
  review_note?: string | null;
  created_at: string | null;
  reviewed_at?: string | null;
};

type AttendanceRow = {
  id: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  check_in_status: string | null;
  check_out_status: string | null;
};

type OrderRow = {
  id: string;
  status: string | null;
  payment_status: string | null;
  created_at: string | null;
};

type ProductRelation = {
  type?: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string | null;
  product_name: string | null;
  quantity: number | string | null;
  served: boolean | null;
  kitchen_status: string | null;
  created_at: string | null;
  products?: ProductRelation | ProductRelation[] | null;
};

type StationBatchRow = {
  id: string;
  inventory_item_id: string | null;
  station_status: string | null;
  quantity_remaining: number | string | null;
  unit: string | null;
  expiry_date: string | null;
};

const normalizeStaffType = (value?: string | null): StaffType | null => {
  if (value === "kitchen" || value === "cashier" || value === "barista" || value === "waiter") return value;
  return null;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatQuantity = (value: number, unit?: string | null) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} ${unit || ""}`.trim();

const normalizeStatus = (status?: string | null) => String(status || "").toLowerCase().replace(/\s+/g, "_");

const getRelationObject = <T,>(relation: T | T[] | null | undefined): T | null => {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
};

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

export default function useStaffNotifications(enabled: boolean, rawStaffType?: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const today = useMemo(() => getJakartaTodayDate(), []);
  const staffType = normalizeStaffType(rawStaffType);

  useEffect(() => {
    if (!enabled || !staffType) {
      setNotifications([]);
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }

    let mounted = true;

    const load = async () => {
      setLoading(true);
      const startIso = toJakartaDateTimeStart(today);
      const endIso = toJakartaDateTimeEnd(today);
      const stationScope: StationScope | null =
        staffType === "barista" || staffType === "kitchen" ? staffType : null;
      const stockScopes = stationScope ? [stationScope, "shared"] : ["shared"];

      const [
        attendanceResult,
        reportsResult,
        inventoryResult,
        ordersResult,
        orderItemsResult,
        stationBatchesResult,
      ] = await Promise.all([
        supabase
          .from("attendance")
          .select("id,clock_in_at,clock_out_at,check_in_status,check_out_status")
          .eq("staff_id", currentUser.id)
          .eq("attendance_date", today)
          .maybeSingle()
          .then((result) => {
            const message = result.error?.message.toLowerCase() || "";
            return message.includes("attendance") || message.includes("schema cache")
              ? { data: null as AttendanceRow | null, error: null }
              : result;
          }),
        supabase
          .from("stock_reports")
          .select("id,material_name,report_type,status,review_note,created_at,reviewed_at")
          .eq("reported_by", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(10)
          .then((result) => {
            const message = result.error?.message.toLowerCase() || "";
            return message.includes("review_note") || message.includes("schema cache")
              ? supabase
                  .from("stock_reports")
                  .select("id,material_name,report_type,status,created_at")
                  .eq("reported_by", currentUser.id)
                  .order("created_at", { ascending: false })
                  .limit(10)
              : result;
          }),
        stationScope
          ? supabase
              .from("inventory_items")
              .select("id,name,current_stock,reorder_level,unit,station_scope")
              .in("station_scope", stockScopes)
              .order("name", { ascending: true })
              .then((result) => {
                const message = result.error?.message.toLowerCase() || "";
                return message.includes("station_scope") || message.includes("schema cache")
                  ? supabase
                      .from("inventory_items")
                      .select("id,name,current_stock,reorder_level,unit")
                      .order("name", { ascending: true })
                  : result;
              })
          : Promise.resolve({ data: [] as InventoryRow[], error: null }),
        supabase
          .from("orders")
          .select("id,status,payment_status,created_at")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("order_items")
          .select("id,order_id,product_name,quantity,served,kitchen_status,created_at,products(type)")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: false })
          .limit(200)
          .then((result) => {
            const message = result.error?.message.toLowerCase() || "";
            return message.includes("products") || message.includes("schema cache")
              ? supabase
                  .from("order_items")
                  .select("id,order_id,product_name,quantity,served,kitchen_status,created_at")
                  .gte("created_at", startIso)
                  .lte("created_at", endIso)
                  .order("created_at", { ascending: false })
                  .limit(200)
              : result;
          }),
        staffType === "kitchen"
          ? supabase
              .from("kitchen_station_batches")
              .select("id,inventory_item_id,station_status,quantity_remaining,unit,expiry_date")
              .in("station_status", ["ready", "thawing", "prep"])
              .gt("quantity_remaining", 0)
              .order("expiry_date", { ascending: true })
              .limit(30)
              .then((result) => {
                const message = result.error?.message.toLowerCase() || "";
                return message.includes("kitchen_station_batches") || message.includes("schema cache")
                  ? { data: [] as StationBatchRow[], error: null }
                  : result;
              })
          : Promise.resolve({ data: [] as StationBatchRow[], error: null }),
      ]);

      if (!mounted) return;

      const next: AppNotification[] = [];
      const now = new Date().toISOString();
      const attendance = attendanceResult.data as AttendanceRow | null;
      const reports = (reportsResult.data ?? []) as StockReportRow[];
      const inventoryRows = (inventoryResult.data ?? []) as InventoryRow[];
      const inventoryNameById = new Map(inventoryRows.map((item) => [item.id, item.name || "Inventory item"]));
      const orders = (ordersResult.data ?? []) as OrderRow[];
      const orderItems = (orderItemsResult.data ?? []) as OrderItemRow[];
      const stationBatches = (stationBatchesResult.data ?? []) as StationBatchRow[];

      if (!attendance?.clock_in_at) {
        next.push({
          id: `staff-attendance-clock-in-${currentUser.id}-${today}`,
          title: "Clock in before starting work",
          message: "Your attendance for today has not been recorded yet.",
          severity: "warning",
          source: "Attendance",
          createdAt: now,
          actionHref: "/staff/attendance",
        });
      } else if (!attendance.clock_out_at && getJakartaHour() >= 20) {
        next.push({
          id: `staff-attendance-clock-out-${currentUser.id}-${today}`,
          title: "Remember to clock out",
          message: "Your shift is still active. Clock out when your work is finished.",
          severity: "info",
          source: "Attendance",
          createdAt: now,
          actionHref: "/staff/attendance",
        });
      }

      const reviewedReports = reports.filter((report) => report.status === "resolved" || report.status === "rejected");
      if (reviewedReports.length > 0) {
        const first = reviewedReports[0];
        next.push({
          id: `staff-reviewed-report-${first.id}-${first.status}`,
          title: first.status === "rejected" ? "A stock report was rejected" : "A stock report was resolved",
          message: `${first.material_name || "Inventory item"} ${reportTypeLabel(first.report_type)} is now ${first.status}.${first.review_note ? ` ${first.review_note}` : ""}`,
          severity: first.status === "rejected" ? "warning" : "success",
          source: "My Reports",
          createdAt: first.reviewed_at || first.created_at || now,
          actionHref: "/staff/stock-check",
        });
      }

      if (staffType === "barista" || staffType === "kitchen") {
        const criticalStock = inventoryRows.filter((item) => toNumber(item.current_stock) <= 0).slice(0, 4);
        const lowStock = inventoryRows
          .filter((item) => {
            const current = toNumber(item.current_stock);
            const reorder = toNumber(item.reorder_level);
            return current > 0 && reorder > 0 && current <= reorder;
          })
          .slice(0, 4);

        if (criticalStock.length > 0) {
          next.push({
            id: `staff-critical-stock-${staffType}-${criticalStock.map((item) => item.id).join("-")}`,
            title: "Station stock is out",
            message: `${criticalStock.map((item) => item.name || "Inventory item").join(", ")} need a report or manager follow-up.`,
            severity: "critical",
            source: "Stock Check",
            createdAt: now,
            actionHref: "/staff/stock-check",
          });
        } else if (lowStock.length > 0) {
          next.push({
            id: `staff-low-stock-${staffType}-${lowStock.map((item) => item.id).join("-")}`,
            title: "Station stock is low",
            message: `${lowStock.map((item) => `${item.name || "Item"} (${formatQuantity(toNumber(item.current_stock), item.unit)})`).join(", ")}.`,
            severity: "warning",
            source: "Stock Check",
            createdAt: now,
            actionHref: "/staff/stock-check",
          });
        }
      }

      if (staffType === "kitchen") {
        const kitchenQueue = orderItems.filter((item) =>
          ["pending", "cooking"].includes(normalizeStatus(item.kitchen_status)),
        );

        if (kitchenQueue.length > 0) {
          next.push({
            id: `staff-kitchen-queue-${today}-${kitchenQueue.length}`,
            title: "Kitchen queue needs attention",
            message: `${kitchenQueue.length} item(s) are pending or cooking.`,
            severity: kitchenQueue.length >= 8 ? "warning" : "info",
            source: "Kitchen",
            createdAt: kitchenQueue[0].created_at || now,
            actionHref: "/staff/kitchen",
          });
        }

        const consumeToday = stationBatches.filter((batch) => batch.expiry_date && batch.expiry_date <= today);
        if (consumeToday.length > 0) {
          const first = consumeToday[0];
          next.push({
            id: `staff-kitchen-consume-by-${today}-${consumeToday.length}`,
            title: "Kitchen ready stock needs review",
            message: `${consumeToday.length} batch(es) are at consume-by date. Latest: ${inventoryNameById.get(first.inventory_item_id || "") || "Kitchen item"} ${formatQuantity(toNumber(first.quantity_remaining), first.unit)}.`,
            severity: "warning",
            source: "Kitchen Station",
            createdAt: now,
            actionHref: "/staff/stock-check",
          });
        }
      }


      if (staffType === "cashier") {
        const unpaidOrders = orders.filter((order) => normalizeStatus(order.payment_status).includes("unpaid"));
        const newOrders = orders.filter((order) => ["new", "pending"].includes(normalizeStatus(order.status)));

        if (unpaidOrders.length > 0) {
          next.push({
            id: `staff-cashier-unpaid-${today}-${unpaidOrders.length}`,
            title: "Unpaid orders need payment",
            message: `${unpaidOrders.length} order(s) still have unpaid payment status.`,
            severity: "warning",
            source: "POS",
            createdAt: unpaidOrders[0].created_at || now,
            actionHref: "/staff/pos",
          });
        } else if (newOrders.length > 0) {
          next.push({
            id: `staff-cashier-new-orders-${today}-${newOrders.length}`,
            title: "New orders are active",
            message: `${newOrders.length} new order(s) are in today's flow.`,
            severity: "info",
            source: "Order",
            createdAt: newOrders[0].created_at || now,
            actionHref: "/staff/order",
          });
        }
      }

      setNotifications(sortNotifications(next));
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [enabled, staffType, today]);

  return { notifications, loading };
}
