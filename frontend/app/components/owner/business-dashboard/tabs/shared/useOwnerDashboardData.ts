"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import type {
  AttendanceRow,
  DashboardData,
  InventoryItemRow,
  OrderItemRow,
  OrderRow,
  ProductRow,
  StaffRow,
  UsageTransactionDetailRow,
  UsageTransactionRow,
} from "./dashboardTypes";

const emptyData: DashboardData = {
  orders: [],
  orderItems: [],
  products: [],
  inventoryItems: [],
  staff: [],
  attendance: [],
  usageTransactions: [],
  usageTransactionDetails: [],
  loading: true,
  error: "",
};

const ORDER_BASE_SELECT =
  "id,total,discount,status,payment_status,payment_method,order_date,order_time,created_at,fulfillment_method,customer_id,reward_redemption_id";
const ORDER_EXTENDED_SELECT = `${ORDER_BASE_SELECT},completed_at,ready_at,served_at,created_by`;
const ORDER_ITEM_BASE_SELECT = "order_id,product_name,quantity,total_price";
const ORDER_ITEM_EXTENDED_SELECT = `${ORDER_ITEM_BASE_SELECT},ready_at,served_at,served_by`;

export default function useOwnerDashboardData() {
  const [data, setData] = useState<DashboardData>(emptyData);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setData((current) => ({ ...current, loading: true, error: "" }));

      const queryOrders = (select: string) => supabase.from("orders").select(select);
      const queryOrderItems = (select: string) => supabase.from("order_items").select(select);
      const [orders, orderItems, products, inventoryItems, staff, attendance, usageTransactions, usageTransactionDetails] =
        await Promise.all([
          queryOrders(ORDER_EXTENDED_SELECT).then((result) =>
            result.error ? queryOrders(ORDER_BASE_SELECT) : result,
          ),
          queryOrderItems(ORDER_ITEM_EXTENDED_SELECT).then((result) =>
            result.error ? queryOrderItems(ORDER_ITEM_BASE_SELECT) : result,
          ),
          supabase.from("products").select("id,name,stock,available,type"),
          supabase.from("inventory_items").select("*"),
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
        ]);

      if (!mounted) return;

      const error = [
        orders.error,
        orderItems.error,
        products.error,
        inventoryItems.error,
        staff.error,
        attendance.error,
        usageTransactions.error,
        usageTransactionDetails.error,
      ]
        .map((item) => item?.message)
        .filter(Boolean)
        .join(" ");

      setData({
        orders: (orders.data ?? []) as OrderRow[],
        orderItems: (orderItems.data ?? []) as OrderItemRow[],
        products: (products.data ?? []) as ProductRow[],
        inventoryItems: (inventoryItems.data ?? []) as InventoryItemRow[],
        staff: (staff.data ?? []) as StaffRow[],
        attendance: (attendance.data ?? []) as AttendanceRow[],
        usageTransactions: (usageTransactions.data ?? []) as UsageTransactionRow[],
        usageTransactionDetails: (usageTransactionDetails.data ?? []) as UsageTransactionDetailRow[],
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
