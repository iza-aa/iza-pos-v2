"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/utils";
import type {
  BookkeepingSummary,
  PaymentBreakdownRow,
} from "@/lib/services/bookkeeping/bookkeepingTypes";
import type { DateRangeValue } from "../DateRangeFilter";

type BookkeepingSalesSummary = {
  summary: Pick<
    BookkeepingSummary,
    | "grossSales"
    | "discounts"
    | "netSales"
    | "taxCollected"
    | "cashExpected"
    | "totalOrders"
  >;
  paymentBreakdown: PaymentBreakdownRow[];
  loading: boolean;
  error: string;
};

const emptySummary: BookkeepingSalesSummary["summary"] = {
  grossSales: 0,
  discounts: 0,
  netSales: 0,
  taxCollected: 0,
  cashExpected: 0,
  totalOrders: 0,
};

export default function useBookkeepingSalesSummary(dateRange: DateRangeValue) {
  const [data, setData] = useState<BookkeepingSalesSummary>({
    summary: emptySummary,
    paymentBreakdown: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.role !== "owner") {
        setData((current) => ({
          ...current,
          loading: false,
          error: "Owner access required.",
        }));
        return;
      }

      setData((current) => ({ ...current, loading: true, error: "" }));

      try {
        const params = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });
        const response = await fetch(`/api/owner/bookkeeping/overview?${params.toString()}`, {
          headers: {
            "x-user-id": currentUser.id,
            "x-user-name": currentUser.name,
            "x-user-role": currentUser.role,
          },
        });
        const result = (await response.json().catch(() => ({}))) as {
          data?: {
            summary?: Partial<BookkeepingSummary>;
            paymentBreakdown?: PaymentBreakdownRow[];
          };
          error?: string;
        };

        if (!response.ok || !result.data?.summary) {
          throw new Error(result.error || "Sales summary could not be loaded.");
        }

        if (!mounted) return;

        setData({
          summary: {
            grossSales: Number(result.data.summary.grossSales ?? 0),
            discounts: Number(result.data.summary.discounts ?? 0),
            netSales: Number(result.data.summary.netSales ?? 0),
            taxCollected: Number(result.data.summary.taxCollected ?? 0),
            cashExpected: Number(result.data.summary.cashExpected ?? 0),
            totalOrders: Number(result.data.summary.totalOrders ?? 0),
          },
          paymentBreakdown: result.data.paymentBreakdown ?? [],
          loading: false,
          error: "",
        });
      } catch (error) {
        if (!mounted) return;

        setData({
          summary: emptySummary,
          paymentBreakdown: [],
          loading: false,
          error: error instanceof Error ? error.message : "Sales summary could not be loaded.",
        });
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [dateRange]);

  return data;
}
