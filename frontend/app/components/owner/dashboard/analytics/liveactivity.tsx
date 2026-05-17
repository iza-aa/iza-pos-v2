"use client";

import { useEffect, useState } from "react";
import { BoltIcon } from "@heroicons/react/24/solid";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string | null;
  total: number | string | null;
  created_at: string | null;
  created_by_staff_name: string | null;
  created_by_staff_code: string | null;
  payment_status: string | null;
};

type OrderItemRow = {
  order_id: string;
  quantity: number | string | null;
};

type ActivityOrder = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  createdBy: string;
  itemCount: number;
  paymentStatus: string;
};

type ActivityState = {
  orders: ActivityOrder[];
  loading: boolean;
  error: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatRelativeTime = (value: string) => {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return "-";

  const diffMs = Date.now() - createdAt;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "baru saja";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}j`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}h`;
};

const getStatusStyle = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized === "new") return "bg-gray-900 text-white";
  if (normalized === "preparing" || normalized === "on_process") return "bg-gray-200 text-gray-700";
  if (normalized === "partially-served" || normalized === "partially_served") return "bg-gray-300 text-gray-800";
  if (normalized === "served") return "bg-gray-100 text-gray-600";
  if (normalized === "completed") return "bg-gray-800 text-white";
  if (normalized === "cancelled" || normalized === "canceled") return "bg-gray-100 text-gray-500";

  return "bg-gray-100 text-gray-600";
};

const getStatusLabel = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized === "new") return "New";
  if (normalized === "preparing" || normalized === "on_process") return "Preparing";
  if (normalized === "partially-served" || normalized === "partially_served") return "Partial";
  if (normalized === "served") return "Served";
  if (normalized === "completed") return "Completed";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";

  return status || "Unknown";
};

export default function LiveActivity() {
  const [state, setState] = useState<ActivityState>({ orders: [], loading: true, error: "" });

  useEffect(() => {
    let mounted = true;

    const fetchActivity = async () => {
      const { data: orders, error: orderError } = await supabase
        .from("orders")
        .select("id,order_number,status,total,created_at,created_by_staff_name,created_by_staff_code,payment_status")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!mounted) return;

      if (orderError) {
        console.error("Gagal mengambil live activity:", orderError);
        setState({ orders: [], loading: false, error: "Gagal memuat aktivitas" });
        return;
      }

      const orderRows = (orders ?? []) as OrderRow[];
      const orderIds = orderRows.map((order) => order.id);
      const itemCounts = new Map<string, number>();

      if (orderIds.length > 0) {
        const { data: items, error: itemError } = await supabase
          .from("order_items")
          .select("order_id,quantity")
          .in("order_id", orderIds);

        if (itemError) {
          console.warn("Gagal mengambil item count live activity:", itemError);
        } else {
          ((items ?? []) as OrderItemRow[]).forEach((item) => {
            itemCounts.set(item.order_id, (itemCounts.get(item.order_id) ?? 0) + Number(item.quantity ?? 0));
          });
        }
      }

      if (!mounted) return;

      const mapped = orderRows.map((order) => ({
        id: order.id,
        orderNumber: order.order_number ?? "Order",
        status: order.status ?? "unknown",
        total: Number(order.total ?? 0),
        createdAt: order.created_at ?? "",
        createdBy: order.created_by_staff_name || order.created_by_staff_code || "System",
        itemCount: itemCounts.get(order.id) ?? 0,
        paymentStatus: order.payment_status ?? "-",
      }));

      setState({ orders: mapped, loading: false, error: "" });
    };

    void fetchActivity();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden h-full flex flex-col">
      <div className="p-3 md:p-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gray-100 rounded-xl p-2">
              <BoltIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold text-gray-800">Live Activity</h3>
              <p className="text-[10px] md:text-xs font-medium text-gray-500">
                {state.loading ? "Memuat aktivitas" : `${state.orders.length} order terbaru`}
              </p>
            </div>
          </div>
          <a href="/owner/order" className="p-2 hover:bg-gray-100 rounded-xl transition" title="Lihat Order">
            <ArrowTopRightOnSquareIcon className="h-3 md:h-4 w-3 md:w-4 text-gray-400" />
          </a>
        </div>
      </div>

      <div className="p-3 md:p-4 space-y-2.5 flex-1 overflow-hidden">
        {state.loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 rounded-xl bg-gray-50 animate-pulse" />
          ))
        ) : state.error ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">{state.error}</div>
        ) : state.orders.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Belum ada aktivitas order.</div>
        ) : (
          state.orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{order.orderNumber}</p>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-lg ${getStatusStyle(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {order.itemCount} item • {order.createdBy}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</p>
                  <p className="text-[10px] text-gray-500">{formatRelativeTime(order.createdAt)}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-gray-500">
                <span className="capitalize">Payment: {order.paymentStatus}</span>
                <span>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}