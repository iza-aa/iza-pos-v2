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

type BookkeepingSummaryPayload = {
  summary: Partial<BookkeepingSummary>;
  paymentBreakdown?: PaymentBreakdownRow[];
  menuMargins?: MenuMarginRow[];
};

type BookkeepingSummaryResponse = {
  data?: BookkeepingSummaryPayload;
  error?: string;
};

const pendingSummaryRequests = new Map<string, Promise<BookkeepingSummaryPayload>>();

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

const requestBookkeepingSummary = (dateRange: DateRangeValue) => {
  const requestKey = `${dateRange.startDate}:${dateRange.endDate}`;
  const pendingRequest = pendingSummaryRequests.get(requestKey);
  if (pendingRequest) return pendingRequest;

  const params = new URLSearchParams({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    mode: "summary",
  });

  const request = fetch(`/api/owner/bookkeeping/overview?${params.toString()}`)
    .then(async (response) => {
      const result = (await response.json().catch(() => ({}))) as BookkeepingSummaryResponse;

      if (!response.ok || !result.data?.summary) {
        throw new Error(result.error || "Sales summary could not be loaded.");
      }

      return result.data;
    });

  pendingSummaryRequests.set(requestKey, request);
  request.then(
    () => {
      if (pendingSummaryRequests.get(requestKey) === request) {
        pendingSummaryRequests.delete(requestKey);
      }
    },
    () => {
      if (pendingSummaryRequests.get(requestKey) === request) {
        pendingSummaryRequests.delete(requestKey);
      }
    },
  );

  return request;
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
        const result = await requestBookkeepingSummary(dateRange);

        if (!mounted) return;

        setData({
          summary: {
            grossSales: Number(result.summary.grossSales ?? 0),
            discounts: Number(result.summary.discounts ?? 0),
            netSales: Number(result.summary.netSales ?? 0),
            estimatedCogs:
              result.summary.estimatedCogs === null ||
              result.summary.estimatedCogs === undefined
                ? null
                : Number(result.summary.estimatedCogs),
            grossProfit:
              result.summary.grossProfit === null ||
              result.summary.grossProfit === undefined
                ? null
                : Number(result.summary.grossProfit),
            operatingExpenses: Number(result.summary.operatingExpenses ?? 0),
            netProfitEstimate:
              result.summary.netProfitEstimate === null ||
              result.summary.netProfitEstimate === undefined
                ? null
                : Number(result.summary.netProfitEstimate),
            taxCollected: Number(result.summary.taxCollected ?? 0),
            totalOrders: Number(result.summary.totalOrders ?? 0),
          },
          paymentBreakdown: result.paymentBreakdown ?? [],
          menuMargins: result.menuMargins ?? [],
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
  }, [dateRange.endDate, dateRange.startDate]);

  return data;
}
