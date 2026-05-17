"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { UsersIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/lib/config/supabaseClient";

type OrderRow = {
  id: string;
  status: string | null;
  payment_status: string | null;
  order_date: string | null;
};

type MetricState = {
  value: number;
  previousValue: number;
  loading: boolean;
  error: string;
};

const getLocalDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatNumber = (value: number) => new Intl.NumberFormat("id-ID").format(value);

const isValidOrder = (order: OrderRow) => {
  const status = String(order.status ?? "").toLowerCase();
  const paymentStatus = String(order.payment_status ?? "").toLowerCase();

  if (["cancelled", "canceled", "void", "refunded"].includes(status)) return false;
  if (["cancelled", "canceled", "failed", "refunded", "void"].includes(paymentStatus)) return false;

  return true;
};

export default function TotalCustomer() {
  const [metric, setMetric] = useState<MetricState>({
    value: 0,
    previousValue: 0,
    loading: true,
    error: "",
  });

  useEffect(() => {
    let mounted = true;

    const fetchMetric = async () => {
      const today = getLocalDate();
      const yesterday = getLocalDate(-1);

      const { data, error } = await supabase
        .from("orders")
        .select("id,status,payment_status,order_date")
        .in("order_date", [today, yesterday]);

      if (!mounted) return;

      if (error) {
        console.error("Gagal mengambil total transaksi:", error);
        setMetric({ value: 0, previousValue: 0, loading: false, error: "Gagal memuat" });
        return;
      }

      const rows = ((data ?? []) as OrderRow[]).filter(isValidOrder);
      setMetric({
        value: rows.filter((order) => order.order_date === today).length,
        previousValue: rows.filter((order) => order.order_date === yesterday).length,
        loading: false,
        error: "",
      });
    };

    void fetchMetric();

    return () => {
      mounted = false;
    };
  }, []);

  const { differenceLabel, percentageLabel, isPositive } = useMemo(() => {
    const difference = metric.value - metric.previousValue;
    const percentage = metric.previousValue > 0 ? Math.round((difference / metric.previousValue) * 100) : metric.value > 0 ? 100 : 0;

    return {
      differenceLabel: `${difference >= 0 ? "+" : "-"}${formatNumber(Math.abs(difference))}`,
      percentageLabel: `${percentage >= 0 ? "+" : ""}${percentage}%`,
      isPositive: difference >= 0,
    };
  }, [metric.value, metric.previousValue]);

  return (
    <div className="bg-gray-100 rounded-2xl p-0.75 w-full border border-gray-300 hover:shadow-lg transition-shadow">
      <div className="bg-white rounded-xl p-3 md:p-4 mb-3 border border-gray-300">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-gray-100 rounded-xl p-2 md:p-3">
            <UsersIcon className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs md:text-sm text-gray-500">Transactions</p>
              <span
                className="text-[10px] md:text-xs font-semibold"
                style={{
                  color: isPositive ? "#166534" : "#991B1B",
                  backgroundColor: isPositive ? "#B2FF5E" : "#FECACA",
                  padding: "2px 6px",
                  borderRadius: "6px",
                }}
              >
                {metric.loading ? "..." : percentageLabel}
              </span>
            </div>
            <span className="text-lg md:text-xl font-bold text-gray-900 truncate block">
              {metric.loading ? "Memuat..." : metric.error || formatNumber(metric.value)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-2 pb-2">
        <span className="text-xs md:text-sm text-gray-600 truncate">
          <span className="font-semibold">{metric.loading ? "..." : differenceLabel}</span> dari kemarin
        </span>
        {isPositive ? (
          <ArrowUpRightIcon className="h-3 md:h-4 w-3 md:w-4 text-gray-400 shrink-0" />
        ) : (
          <ArrowDownRightIcon className="h-3 md:h-4 w-3 md:w-4 text-gray-400 shrink-0" />
        )}
      </div>
    </div>
  );
}