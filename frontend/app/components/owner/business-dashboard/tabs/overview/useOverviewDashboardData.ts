"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import {
  loadDashboardOrderCorrections,
  type DashboardOrderCorrectionRow,
} from "../shared/orderCorrectionClient";
import type { OrderRow, OverviewData } from "../shared/dashboardTypes";

const OVERVIEW_BASE_ORDER_SELECT =
  "id,total,status,payment_status,payment_method,order_date,order_time,created_at,fulfillment_method";
const OVERVIEW_SERVICE_TIME_SELECT = `${OVERVIEW_BASE_ORDER_SELECT},completed_at`;
const OVERVIEW_ORDER_ITEM_SERVICE_SELECT = "order_id,ready_at,served_at";

const emptyOverviewData: OverviewData = {
  orders: [],
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

const getLatestTimestamp = (current: string | null | undefined, next: string | null | undefined) => {
  if (!next) return current ?? null;
  if (!current) return next;

  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
};

const applyOrderItemServiceRollups = (
  orders: OrderRow[],
  orderItems: Array<Pick<OrderRow, "ready_at" | "served_at"> & { order_id?: string | null }>,
) => {
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

export default function useOverviewDashboardData() {
  const [data, setData] = useState<OverviewData>(emptyOverviewData);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setData((current) => ({ ...current, loading: true, error: "" }));

      const queryOrders = (select: string) =>
        supabase
          .from("orders")
          .select(select)
          .order("created_at", { ascending: true });

      const [primaryResult, orderItemsResult, orderCorrections] = await Promise.all([
        queryOrders(OVERVIEW_SERVICE_TIME_SELECT),
        supabase.from("order_items").select(OVERVIEW_ORDER_ITEM_SERVICE_SELECT),
        loadDashboardOrderCorrections(),
      ]);
      const fallbackResult = primaryResult.error
        ? await queryOrders(OVERVIEW_BASE_ORDER_SELECT)
        : primaryResult;

      if (!mounted) return;

      setData({
        orders: applyOrderCorrections(
          applyOrderItemServiceRollups(
            (fallbackResult.data ?? []) as unknown as OrderRow[],
            (orderItemsResult.data ?? []) as Array<
              Pick<OrderRow, "ready_at" | "served_at"> & { order_id?: string | null }
            >,
          ),
          orderCorrections.data ?? [],
        ),
        loading: false,
        error: [fallbackResult.error?.message, orderItemsResult.error?.message, orderCorrections.error?.message]
          .filter(Boolean)
          .join(" "),
      });
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return data;
}
