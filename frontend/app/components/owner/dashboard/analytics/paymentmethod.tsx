"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { CreditCardIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/lib/config/supabaseClient";

type OrderRow = {
  id: string;
  payment_method: string | null;
  payment_status: string | null;
  status: string | null;
  order_date: string | null;
  total: number | string | null;
};

type PaymentItem = {
  method: string;
  count: number;
  amount: number;
  percentage: number;
};

type PaymentState = {
  items: PaymentItem[];
  total: number;
  totalAmount: number;
  loading: boolean;
  error: string;
};

const getLocalDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthStart = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
};

const isValidOrder = (order: OrderRow) => {
  const status = String(order.status ?? "").toLowerCase();
  const paymentStatus = String(order.payment_status ?? "").toLowerCase();

  if (["cancelled", "canceled", "void", "refunded"].includes(status)) return false;
  if (["cancelled", "canceled", "failed", "refunded", "void"].includes(paymentStatus)) return false;

  return true;
};

const normalizePaymentMethod = (method: string | null) => {
  const raw = String(method ?? "").trim().toLowerCase();
  if (!raw) return "Unknown";

  if (raw.includes("qris") || raw.includes("qr") || raw.includes("wallet") || raw.includes("e-wallet") || raw.includes("ewallet")) return "QRIS / E-Wallet";
  if (raw.includes("debit") || raw.includes("card") || raw.includes("credit")) return "Card";
  if (raw.includes("cash") || raw.includes("tunai")) return "Cash";

  return raw
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const methodOrder = ["Cash", "QRIS / E-Wallet", "Card", "Unknown"];

export default function PaymentMethod() {
  const [state, setState] = useState<PaymentState>({
    items: [],
    total: 0,
    totalAmount: 0,
    loading: true,
    error: "",
  });

  useEffect(() => {
    let mounted = true;

    const fetchPaymentMethods = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,payment_method,payment_status,status,order_date,total")
        .gte("order_date", getMonthStart())
        .lte("order_date", getLocalDate());

      if (!mounted) return;

      if (error) {
        console.error("Gagal mengambil payment method:", error);
        setState({ items: [], total: 0, totalAmount: 0, loading: false, error: "Gagal memuat payment" });
        return;
      }

      const validOrders = ((data ?? []) as OrderRow[]).filter(isValidOrder);
      const grouped = new Map<string, { count: number; amount: number }>();

      validOrders.forEach((order) => {
        const method = normalizePaymentMethod(order.payment_method);
        const current = grouped.get(method) ?? { count: 0, amount: 0 };
        current.count += 1;
        current.amount += Number(order.total ?? 0);
        grouped.set(method, current);
      });

      const total = validOrders.length;
      const totalAmount = validOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
      const items = Array.from(grouped.entries())
        .map(([method, value]) => ({
          method,
          count: value.count,
          amount: value.amount,
          percentage: total > 0 ? Math.round((value.count / total) * 100) : 0,
        }))
        .sort((a, b) => {
          const orderA = methodOrder.indexOf(a.method);
          const orderB = methodOrder.indexOf(b.method);
          const safeOrderA = orderA === -1 ? 999 : orderA;
          const safeOrderB = orderB === -1 ? 999 : orderB;
          return safeOrderA - safeOrderB || b.count - a.count || b.amount - a.amount;
        });

      setState({ items, total, totalAmount, loading: false, error: "" });
    };

    void fetchPaymentMethods();

    return () => {
      mounted = false;
    };
  }, []);

  const highest = useMemo(
    () => [...state.items].sort((a, b) => b.count - a.count || b.amount - a.amount)[0],
    [state.items],
  );

  const displayItems = useMemo(() => {
    const itemMap = new Map(state.items.map((item) => [item.method, item]));
    const preferred = ["Cash", "QRIS / E-Wallet", "Card"];
    const preferredItems = preferred
      .map((method) => itemMap.get(method))
      .filter((item): item is PaymentItem => Boolean(item));
    const otherItems = state.items.filter((item) => !preferred.includes(item.method));
    return [...preferredItems, ...otherItems].slice(0, 5);
  }, [state.items]);

  return (
    <div className="bg-white rounded-2xl p-3 md:p-5 w-full border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-gray-100 rounded-xl p-2 md:p-2.5">
            <CreditCardIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-700" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-gray-500">Payment Method</p>
            <div className="flex items-center gap-2">
              <span className="text-lg md:text-xl font-bold text-gray-900">
                {state.loading ? "..." : state.total}
              </span>
              <span className="text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded-md text-gray-700 bg-gray-100 border border-gray-200">
                Bulan ini
              </span>
            </div>
          </div>
        </div>
      </div>

      {state.loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 rounded-xl bg-gray-50 animate-pulse" />
          ))}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="h-16 rounded-xl bg-gray-50 animate-pulse" />
            <div className="h-16 rounded-xl bg-gray-50 animate-pulse" />
          </div>
        </div>
      ) : state.error ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">{state.error}</div>
      ) : state.total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Belum ada transaksi bulan ini.</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
            {displayItems.map((item) => (
              <div key={item.method} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.method}</p>
                    <p className="text-[10px] text-gray-500 truncate">{formatCurrency(item.amount)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{item.percentage}%</p>
                    <p className="text-[10px] text-gray-500">{item.count} transaksi</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gray-800"
                    style={{ width: item.percentage > 0 ? `${Math.min(100, Math.max(6, item.percentage))}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-3 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] md:text-xs text-gray-500">Total Transaksi</p>
                <p className="text-lg font-bold text-gray-900">{state.total}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] md:text-xs text-gray-500">Total Nilai</p>
                <p className="text-sm md:text-base font-bold text-gray-900 truncate">{formatCurrency(state.totalAmount)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 truncate">
                Terbanyak: <span className="font-semibold text-gray-700">{highest?.method ?? "-"}</span>
              </span>
              <ArrowUpRightIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}