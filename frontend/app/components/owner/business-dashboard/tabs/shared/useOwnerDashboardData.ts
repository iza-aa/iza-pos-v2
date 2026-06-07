"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import {
  loadDashboardOrderCorrections,
  type DashboardOrderCorrectionRow,
} from "./orderCorrectionClient";
import type {
  AttendanceRow,
  DashboardData,
  InventoryBatchRow,
  InventoryItemRow,
  OrderItemRow,
  OrderRow,
  ProductRow,
  StaffRow,
  StockReportRow,
  UsageTransactionDetailRow,
  UsageTransactionRow,
} from "./dashboardTypes";

const emptyData: DashboardData = {
  orders: [],
  orderItems: [],
  products: [],
  inventoryItems: [],
  inventoryBatches: [],
  staff: [],
  attendance: [],
  usageTransactions: [],
  usageTransactionDetails: [],
  stockReports: [],
  loading: true,
  error: "",
};

const applyOrderCorrections = (
  orders: OrderRow[],
  corrections: DashboardOrderCorrectionRow[],
) => {
  const correctionByOrderId = new Map(
    corrections
      .filter((correction) => correction.order_id)
      .map((correction) => [correction.order_id as string, correction]),
  );

  return orders.map((order) => {
    const correction = correctionByOrderId.get(order.id);
    if (!correction) return order;

    return {
      ...order,
      original_status: order.status,
      status: "cancelled",
      correction_id: correction.id,
      correction_status: correction.status,
      correction_physical_status: correction.physical_status,
      correction_note: correction.note,
    };
  });
};

const ORDER_BASE_SELECT =
  "id,total,discount,status,payment_status,payment_method,order_date,order_time,created_at,fulfillment_method,customer_id,reward_redemption_id";
const ORDER_EXTENDED_SELECT = `${ORDER_BASE_SELECT},completed_at,created_by`;
const ORDER_ITEM_BASE_SELECT = "order_id,product_name,quantity,total_price";
const ORDER_ITEM_EXTENDED_SELECT = `${ORDER_ITEM_BASE_SELECT},ready_at,served_at,served_by`;

const getLatestTimestamp = (current: string | null | undefined, next: string | null | undefined) => {
  if (!next) return current ?? null;
  if (!current) return next;

  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
};

const applyOrderItemServiceRollups = (orders: OrderRow[], orderItems: OrderItemRow[]) => {
  const rollupByOrderId = new Map<string, Pick<OrderRow, "ready_at" | "served_at">>();

  orderItems.forEach((item) => {
    if (!item.order_id) return;

    const current = rollupByOrderId.get(item.order_id) ?? {};
    rollupByOrderId.set(item.order_id, {
      ready_at: getLatestTimestamp(current.ready_at, item.ready_at),
      served_at: getLatestTimestamp(current.served_at, item.served_at),
    });
  });

  return orders.map((order) => ({
    ...order,
    ...(rollupByOrderId.get(order.id) ?? {}),
  }));
};

export default function useOwnerDashboardData() {
  const [data, setData] = useState<DashboardData>(emptyData);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setData((current) => ({ ...current, loading: true, error: "" }));

      const queryOrders = (select: string) => supabase.from("orders").select(select);
      const queryOrderItems = (select: string) => supabase.from("order_items").select(select);
      const [orders, orderItems, products, inventoryItems, inventoryBatches, staff, attendance, usageTransactions, usageTransactionDetails, stockReports, orderCorrections] =
        await Promise.all([
          queryOrders(ORDER_EXTENDED_SELECT).then((result) =>
            result.error ? queryOrders(ORDER_BASE_SELECT) : result,
          ),
          queryOrderItems(ORDER_ITEM_EXTENDED_SELECT).then((result) =>
            result.error ? queryOrderItems(ORDER_ITEM_BASE_SELECT) : result,
          ),
          supabase.from("products").select("id,name,stock,available,type"),
          supabase.from("inventory_items").select("*"),
          supabase
            .from("inventory_batches")
            .select("id,inventory_item_id,batch_number,supplier,received_at,expiry_date,quantity_received,quantity_remaining,unit,unit_cost,invoice_reference,receipt_url")
            .then((result) => {
              if (!result.error) return result;
              const message = result.error.message.toLowerCase();
              return message.includes("inventory_batches") || message.includes("schema cache")
                ? { data: [] as InventoryBatchRow[], error: null }
                : result;
            }),
          supabase.from("staff").select("id,name,role,status"),
          supabase
            .from("attendance")
            .select("id,staff_id,attendance_date,clock_in_at,clock_out_at,check_in_status,check_out_status"),
          supabase
            .from("usage_transactions")
            .select("id,transaction_type,type,created_at,timestamp,order_id,product_name,quantity_sold,notes,performed_by_name")
            .order("created_at", { ascending: false }),
          supabase
            .from("usage_transaction_details")
            .select("usage_transaction_id,inventory_item_id,ingredient_name,quantity_used,unit,previous_stock,new_stock"),
          supabase
            .from("stock_reports")
            .select("id,material_name,report_type,status,reported_by_role,created_at")
            .order("created_at", { ascending: false })
            .limit(100),
          loadDashboardOrderCorrections(),
        ]);

      if (!mounted) return;

      const error = [
        orders.error,
        orderItems.error,
        products.error,
        inventoryItems.error,
        inventoryBatches.error,
        staff.error,
        attendance.error,
        usageTransactions.error,
        usageTransactionDetails.error,
        stockReports.error,
        orderCorrections.error,
      ]
        .map((item) => item?.message)
        .filter(Boolean)
        .join(" ");

      const normalizedOrderItems = (orderItems.data ?? []) as unknown as OrderItemRow[];
      const normalizedOrders = applyOrderItemServiceRollups(
        (orders.data ?? []) as unknown as OrderRow[],
        normalizedOrderItems,
      );

      setData({
        orders: applyOrderCorrections(normalizedOrders, orderCorrections.data ?? []),
        orderItems: normalizedOrderItems,
        products: (products.data ?? []) as ProductRow[],
        inventoryItems: (inventoryItems.data ?? []) as InventoryItemRow[],
        inventoryBatches: (inventoryBatches.data ?? []) as InventoryBatchRow[],
        staff: (staff.data ?? []) as StaffRow[],
        attendance: (attendance.data ?? []) as AttendanceRow[],
        usageTransactions: (usageTransactions.data ?? []) as UsageTransactionRow[],
        usageTransactionDetails: (usageTransactionDetails.data ?? []) as UsageTransactionDetailRow[],
        stockReports: (stockReports.data ?? []) as StockReportRow[],
        loading: false,
        error,
      });
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return data;
}
