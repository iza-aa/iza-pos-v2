"use client";

import { useEffect, useMemo, useState } from "react";
import { ClockIcon, FireIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/lib/config/supabaseClient";

type OrderRow = {
  id: string;
  status: string | null;
  payment_status: string | null;
  order_date: string | null;
  order_time: string | null;
};

type HeatmapRow = {
  hour: string;
  values: number[];
};

type PeakState = {
  heatmap: HeatmapRow[];
  rawCounts: number[][];
  loading: boolean;
  error: string;
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];

const getLocalDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMondayIndex = (dateString: string | null) => {
  if (!dateString) return 0;
  const date = new Date(`${dateString}T00:00:00`);
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
};

const getHourBucketIndex = (timeString: string | null) => {
  if (!timeString) return 0;
  const hour = Number(timeString.slice(0, 2));
  if (hour < 8) return 0;
  if (hour < 11) return 1;
  if (hour < 14) return 2;
  if (hour < 17) return 3;
  if (hour < 20) return 4;
  return 5;
};

const isValidOrder = (order: OrderRow) => {
  const status = String(order.status ?? "").toLowerCase();
  const paymentStatus = String(order.payment_status ?? "").toLowerCase();

  if (["cancelled", "canceled", "void", "refunded"].includes(status)) return false;
  if (["cancelled", "canceled", "failed", "refunded", "void"].includes(paymentStatus)) return false;

  return true;
};

const getColorByIntensity = (intensity: number) => {
  const colors = ["bg-gray-100", "bg-gray-200", "bg-gray-400", "bg-gray-600", "bg-gray-800"];
  return colors[Math.max(0, Math.min(4, intensity))];
};

export default function PeakPerformance() {
  const [state, setState] = useState<PeakState>({
    heatmap: [],
    rawCounts: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    let mounted = true;

    const fetchPeakData = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,status,payment_status,order_date,order_time")
        .gte("order_date", getLocalDate(-30))
        .lte("order_date", getLocalDate());

      if (!mounted) return;

      if (error) {
        console.error("Gagal mengambil peak performance:", error);
        setState({ heatmap: [], rawCounts: [], loading: false, error: "Gagal memuat jam ramai" });
        return;
      }

      const counts = Array.from({ length: hours.length }, () => Array.from({ length: days.length }, () => 0));

      ((data ?? []) as OrderRow[]).filter(isValidOrder).forEach((order) => {
        const hourIndex = getHourBucketIndex(order.order_time);
        const dayIndex = getMondayIndex(order.order_date);
        counts[hourIndex][dayIndex] += 1;
      });

      const maxCount = Math.max(1, ...counts.flat());
      const heatmap = counts.map((row, rowIndex) => ({
        hour: hours[rowIndex],
        values: row.map((count) => (count === 0 ? 0 : Math.max(1, Math.ceil((count / maxCount) * 4)))),
      }));

      setState({ heatmap, rawCounts: counts, loading: false, error: "" });
    };

    void fetchPeakData();

    return () => {
      mounted = false;
    };
  }, []);

  const busiest = useMemo(() => {
    let maxCount = 0;
    let busiestHour = "";
    let busiestDay = "";

    state.rawCounts.forEach((row, rowIndex) => {
      row.forEach((count, dayIndex) => {
        if (count > maxCount) {
          maxCount = count;
          busiestHour = hours[rowIndex];
          busiestDay = days[dayIndex];
        }
      });
    });

    return { hour: busiestHour, day: busiestDay, count: maxCount };
  }, [state.rawCounts]);

  const totalOrders = useMemo(() => state.rawCounts.flat().reduce((sum, count) => sum + count, 0), [state.rawCounts]);

  return (
    <div className="bg-white rounded-2xl p-3 md:p-5 w-full border border-gray-200 h-full min-h-90 flex flex-col">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-gray-100 rounded-xl p-2 md:p-2.5">
            <ClockIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-800">Peak Performance</h3>
            <p className="text-[10px] md:text-xs text-gray-500">Jam ramai 30 hari terakhir</p>
          </div>
        </div>

        {!state.loading && busiest.count > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#B2FF5E" }}>
            <FireIcon className="h-3 w-3" style={{ color: "#166534" }} />
            <span className="text-xs font-semibold" style={{ color: "#166534" }}>
              {busiest.day} {busiest.hour}
            </span>
          </div>
        ) : null}
      </div>

      {state.loading ? (
        <div className="flex-1 rounded-xl bg-gray-50 animate-pulse" />
      ) : state.error ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">{state.error}</div>
      ) : busiest.count === 0 ? (
        <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
          Belum ada data order.
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-3">
          <div className="flex items-center justify-center">
            <div className="w-full max-w-97.5">
              <div className="grid grid-cols-[38px_repeat(7,minmax(22px,1fr))] gap-1 md:gap-1.5">
                {state.heatmap.map((row, rowIndex) => (
                  <div key={row.hour} className="contents">
                    <div className="flex items-center justify-end pr-1 text-xs md:text-sm text-gray-500">
                      {row.hour}
                    </div>
                    {row.values.map((intensity, dayIndex) => (
                      <div
                        key={`${row.hour}-${days[dayIndex]}`}
                        className={`aspect-square min-h-6 rounded-md ${getColorByIntensity(
                          intensity,
                        )} transition-all hover:scale-105`}
                        title={`${days[dayIndex]} ${row.hour}: ${state.rawCounts[rowIndex]?.[dayIndex] ?? 0} order`}
                      />
                    ))}
                  </div>
                ))}

                <div />
                {days.map((day) => (
                  <div key={day} className="text-center text-xs md:text-sm text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-gray-900">{totalOrders}</span> order dalam 30 hari
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Less</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-3 w-3 ${getColorByIntensity(i)} rounded`} />
                  ))}
                </div>
                <span className="text-xs text-gray-500">More</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}