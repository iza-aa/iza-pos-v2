"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import type { OrderRow, OverviewData } from "../shared/dashboardTypes";

const OVERVIEW_BASE_ORDER_SELECT =
  "id,total,status,payment_status,payment_method,order_date,order_time,created_at,fulfillment_method";
const OVERVIEW_SERVICE_TIME_SELECT = `${OVERVIEW_BASE_ORDER_SELECT},completed_at,ready_at,served_at`;

const emptyOverviewData: OverviewData = {
  orders: [],
  loading: true,
  error: "",
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

      const primaryResult = await queryOrders(OVERVIEW_SERVICE_TIME_SELECT);
      const fallbackResult = primaryResult.error
        ? await queryOrders(OVERVIEW_BASE_ORDER_SELECT)
        : primaryResult;

      if (!mounted) return;

      setData({
        orders: (fallbackResult.data ?? []) as unknown as OrderRow[],
        loading: false,
        error: fallbackResult.error?.message ?? "",
      });
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return data;
}
