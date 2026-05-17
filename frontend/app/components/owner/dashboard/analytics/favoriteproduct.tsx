"use client";

import { useEffect, useMemo, useState } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";

type OrderRow = {
  id: string;
};

type OrderItemRow = {
  product_name: string | null;
  quantity: number | string | null;
  total_price: number | string | null;
};

type ProductItem = {
  name: string;
  quantity: number;
  revenue: number;
  rank: number;
};

type ProductState = {
  products: ProductItem[];
  loading: boolean;
  error: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const toDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    start: toDateString(start),
    end: toDateString(end),
  };
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return "bg-gray-900 text-white";
  if (rank === 2) return "bg-gray-700 text-white";
  if (rank === 3) return "bg-gray-500 text-white";
  return "bg-gray-100 text-gray-700";
};

export default function FavoriteProduct() {
  const [state, setState] = useState<ProductState>({ products: [], loading: true, error: "" });

  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      const { start, end } = getMonthRange();

      const { data: orders, error: orderError } = await supabase
        .from("orders")
        .select("id")
        .gte("order_date", start)
        .lt("order_date", end)
        .neq("status", "cancelled");

      if (!mounted) return;

      if (orderError) {
        console.error("Gagal mengambil order top products:", orderError);
        setState({ products: [], loading: false, error: "Gagal memuat produk" });
        return;
      }

      const orderIds = ((orders ?? []) as OrderRow[]).map((order) => order.id);

      if (orderIds.length === 0) {
        setState({ products: [], loading: false, error: "" });
        return;
      }

      const { data: items, error: itemError } = await supabase
        .from("order_items")
        .select("product_name,quantity,total_price")
        .in("order_id", orderIds);

      if (!mounted) return;

      if (itemError) {
        console.error("Gagal mengambil item top products:", itemError);
        setState({ products: [], loading: false, error: "Gagal memuat produk" });
        return;
      }

      const grouped = new Map<string, { name: string; quantity: number; revenue: number }>();

      ((items ?? []) as OrderItemRow[]).forEach((item) => {
        const name = item.product_name || "Produk Tanpa Nama";
        const current = grouped.get(name) ?? { name, quantity: 0, revenue: 0 };
        current.quantity += Number(item.quantity ?? 0);
        current.revenue += Number(item.total_price ?? 0);
        grouped.set(name, current);
      });

      const products = Array.from(grouped.values())
        .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
        .slice(0, 5)
        .map((product, index) => ({ ...product, rank: index + 1 }));

      setState({ products, loading: false, error: "" });
    };

    void fetchProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const maxQuantity = useMemo(
    () => Math.max(1, ...state.products.map((product) => product.quantity)),
    [state.products],
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden h-full flex flex-col">
      <div className="p-3 md:p-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gray-100 rounded-xl p-2">
              <StarIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold text-gray-800">Top Products</h3>
              <p className="text-[10px] md:text-xs font-medium text-gray-500">
                {state.loading ? "Memuat produk" : `${state.products.length} produk terlaris bulan ini`}
              </p>
            </div>
          </div>
          <a href="/owner/products" className="p-2 hover:bg-gray-100 rounded-xl transition" title="Lihat Produk">
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
        ) : state.products.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Belum ada penjualan produk bulan ini.</div>
        ) : (
          state.products.map((product) => (
            <div key={product.name} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getRankStyle(product.rank)}`}>
                    {product.rank}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
                    <p className="text-[10px] text-gray-500">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{product.quantity}</p>
                  <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">
                    sold
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
                <div
                  className="h-full rounded-full bg-gray-700"
                  style={{ width: `${Math.min(100, Math.max(6, (product.quantity / maxQuantity) * 100))}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}