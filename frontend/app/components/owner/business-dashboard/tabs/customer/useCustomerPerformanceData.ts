"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import {
  loadDashboardOrderCorrections,
  type DashboardOrderCorrectionRow,
} from "../shared/orderCorrectionClient";
import { loadAllDashboardRows } from "../shared/dashboardQueryUtils";
import type { OrderRow } from "../shared/dashboardTypes";

export type CustomerPerformanceData = {
  orders: OrderRow[];
  loading: boolean;
  error: string;
};

const emptyData: CustomerPerformanceData = {
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

export default function useCustomerPerformanceData() {
  const [data, setData] = useState<CustomerPerformanceData>(emptyData);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setData((current) => ({ ...current, loading: true, error: "" }));

      const [orders, orderCorrections] = await Promise.all([
        loadAllDashboardRows<OrderRow>((from, to) =>
          supabase
            .from("orders")
            .select("id,order_number,total,discount,status,payment_status,payment_method,order_date,order_time,created_at,fulfillment_method,customer_id,reward_redemption_id")
            .order("created_at", { ascending: true })
            .range(from, to),
        ),
        loadDashboardOrderCorrections(),
      ]);

      if (!mounted) return;

      setData({
        orders: applyOrderCorrections(
          (orders.data ?? []) as unknown as OrderRow[],
          orderCorrections.data ?? [],
        ),
        loading: false,
        error: [orders.error?.message, orderCorrections.error?.message].filter(Boolean).join(" "),
      });
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return data;
}
