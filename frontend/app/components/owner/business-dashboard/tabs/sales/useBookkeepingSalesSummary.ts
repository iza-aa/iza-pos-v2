"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/utils";
import type {
  BookkeepingSummary,
  MenuMarginRow,
  PaymentBreakdownRow,
} from "@/lib/services/bookkeeping/bookkeepingTypes";
import type { DateRangeValue } from "../DateRangeFilter";

type BookkeepingSalesSummary = {
  summary: Pick<
    BookkeepingSummary,
    | "grossSales"
    | "discounts"
    | "netSales"
    | "estimatedCogs"
    | "grossProfit"
    | "operatingExpenses"
    | "netProfitEstimate"
    | "taxCollected"
    | "totalOrders"
  >;
  paymentBreakdown: PaymentBreakdownRow[];
  menuMargins: MenuMarginRow[];
  loading: boolean;
  error: string;
};

const emptySummary: BookkeepingSalesSummary["summary"] = {
  grossSales: 0,
  discounts: 0,
  netSales: 0,
  estimatedCogs: null,
  grossProfit: null,
  operatingExpenses: 0,
  netProfitEstimate: null,
  taxCollected: 0,
  totalOrders: 0,
};

export default function useBookkeepingSalesSummary(dateRange: DateRangeValue) {
  const [data, setData] = useState<BookkeepingSalesSummary>({
    summary: emptySummary,
    paymentBreakdown: [],
    menuMargins: [],
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
            menuMargins?: MenuMarginRow[];
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
            estimatedCogs:
              result.data.summary.estimatedCogs === null ||
              result.data.summary.estimatedCogs === undefined
                ? null
                : Number(result.data.summary.estimatedCogs),
            grossProfit:
              result.data.summary.grossProfit === null ||
              result.data.summary.grossProfit === undefined
                ? null
                : Number(result.data.summary.grossProfit),
            operatingExpenses: Number(result.data.summary.operatingExpenses ?? 0),
            netProfitEstimate:
              result.data.summary.netProfitEstimate === null ||
              result.data.summary.netProfitEstimate === undefined
                ? null
                : Number(result.data.summary.netProfitEstimate),
            taxCollected: Number(result.data.summary.taxCollected ?? 0),
            totalOrders: Number(result.data.summary.totalOrders ?? 0),
          },
          paymentBreakdown: result.data.paymentBreakdown ?? [],
          menuMargins: result.data.menuMargins ?? [],
          loading: false,
          error: "",
        });
      } catch (error) {
        if (!mounted) return;

        setData({
          summary: emptySummary,
          paymentBreakdown: [],
          menuMargins: [],
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
