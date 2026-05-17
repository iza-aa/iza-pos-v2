"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { ChartBarIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/lib/config/supabaseClient";

type OrderRow = {
  id: string;
  total: number | string | null;
  status: string | null;
  payment_status: string | null;
  order_date: string | null;
};

type ChartRow = {
  day: string;
  date: string;
  amount: number;
};

type ReportState = {
  rows: ChartRow[];
  loading: boolean;
  error: string;
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getLocalDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRange = () => Array.from({ length: 7 }, (_, index) => getLocalDate(index - 6));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatShortCurrency = (value: number) => {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}k`;
  return `Rp ${value}`;
};

const isValidSalesOrder = (order: OrderRow) => {
  const status = String(order.status ?? "").toLowerCase();
  const paymentStatus = String(order.payment_status ?? "").toLowerCase();

  if (["cancelled", "canceled", "void", "refunded"].includes(status)) return false;
  if (["cancelled", "canceled", "failed", "refunded", "void"].includes(paymentStatus)) return false;

  return true;
};

export default function ReportAnalytics() {
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [report, setReport] = useState<ReportState>({ rows: [], loading: true, error: "" });

  useEffect(() => {
    let mounted = true;

    const fetchReport = async () => {
      const dates = getDateRange();
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      const { data, error } = await supabase
        .from("orders")
        .select("id,total,status,payment_status,order_date")
        .gte("order_date", startDate)
        .lte("order_date", endDate);

      if (!mounted) return;

      if (error) {
        console.error("Gagal mengambil report analytics:", error);
        setReport({ rows: [], loading: false, error: "Gagal memuat report" });
        return;
      }

      const rows = dates.map((date) => {
        const parsedDate = new Date(`${date}T00:00:00`);
        const amount = ((data ?? []) as OrderRow[])
          .filter((order) => order.order_date === date && isValidSalesOrder(order))
          .reduce((sum, order) => sum + Number(order.total ?? 0), 0);

        return {
          date,
          day: dayNames[parsedDate.getDay()],
          amount,
        };
      });

      setReport({ rows, loading: false, error: "" });
    };

    void fetchReport();

    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const totalAmount = report.rows.reduce((sum, row) => sum + row.amount, 0);
    const averageAmount = report.rows.length > 0 ? totalAmount / report.rows.length : 0;
    const selectedRow = report.rows.find((row) => row.date === selectedDate) ?? report.rows[report.rows.length - 1];
    const growth = selectedRow ? selectedRow.amount - averageAmount : 0;
    const growthPercentage = averageAmount > 0 ? Math.round((growth / averageAmount) * 100) : selectedRow?.amount ? 100 : 0;

    return {
      totalAmount,
      averageAmount,
      selectedAmount: selectedRow?.amount ?? 0,
      selectedDay: selectedRow?.day ?? "Today",
      growth,
      growthPercentage,
      isPositive: growth >= 0,
    };
  }, [report.rows, selectedDate]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden h-full">
      <div className="p-3 md:p-4 border-b border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gray-100 rounded-xl p-2">
              <ChartBarIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold text-gray-800">Report Analytics</h3>
              <p className="text-[10px] md:text-xs text-gray-500">Revenue 7 hari terakhir</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg">
            {report.loading ? "Memuat" : formatShortCurrency(metrics.totalAmount)}
          </span>
        </div>
      </div>

      <div className="p-3 md:p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {report.rows.map((row) => (
            <button
              key={row.date}
              type="button"
              onClick={() => setSelectedDate(row.date)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                selectedDate === row.date
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {row.day}
            </button>
          ))}
        </div>

        <div className="h-48 md:h-56">
          {report.loading ? (
            <div className="h-full rounded-xl bg-gray-50 animate-pulse" />
          ) : report.error ? (
            <div className="flex h-full items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-500">
              {report.error}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatShortCurrency}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), "Sales"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                  contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="amount" fill="#374151" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2 md:gap-3">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-[10px] md:text-xs text-gray-500">Selected</p>
            <p className="text-sm md:text-base font-bold text-gray-900 truncate">{formatShortCurrency(metrics.selectedAmount)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-[10px] md:text-xs text-gray-500">Daily Avg</p>
            <p className="text-sm md:text-base font-bold text-gray-900 truncate">{formatShortCurrency(metrics.averageAmount)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2">
              <p className="text-[10px] md:text-xs text-gray-500">Vs Avg</p>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: metrics.isPositive ? "#B2FF5E" : "#FECACA",
                  color: metrics.isPositive ? "#166534" : "#991B1B",
                }}
              >
                {metrics.growthPercentage >= 0 ? "+" : ""}{metrics.growthPercentage}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <p className="text-sm md:text-base font-bold text-gray-900 truncate">{metrics.selectedDay}</p>
              {metrics.isPositive ? (
                <ArrowUpRightIcon className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <ArrowDownRightIcon className="h-3.5 w-3.5 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}