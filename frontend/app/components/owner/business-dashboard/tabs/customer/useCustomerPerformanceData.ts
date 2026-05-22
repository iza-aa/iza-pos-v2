"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
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

export default function useCustomerPerformanceData() {
  const [data, setData] = useState<CustomerPerformanceData>(emptyData);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setData((current) => ({ ...current, loading: true, error: "" }));

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id,total,discount,status,payment_status,payment_method,order_date,order_time,created_at,fulfillment_method,customer_id,reward_redemption_id")
        .order("created_at", { ascending: true });

      if (!mounted) return;

      setData({
        orders: (orders ?? []) as unknown as OrderRow[],
        loading: false,
        error: error?.message ?? "",
      });
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return data;
}
