"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/config/supabaseClient";

type ProductRow = {
  id: string;
  name: string | null;
  stock: number | string | null;
  available: boolean | null;
  type: string | null;
};

type StockItem = {
  id: string;
  name: string;
  stock: number;
  type: string;
  status: "Critical" | "Low" | "Good";
};

type StockState = {
  items: StockItem[];
  loading: boolean;
  error: string;
};

const LOW_STOCK_THRESHOLD = 5;
const CRITICAL_STOCK_THRESHOLD = 0;

const getStockStatus = (stock: number): StockItem["status"] => {
  if (stock <= CRITICAL_STOCK_THRESHOLD) return "Critical";
  if (stock <= LOW_STOCK_THRESHOLD) return "Low";
  return "Good";
};

const getStatusStyle = (status: StockItem["status"]) => {
  if (status === "Critical") return "bg-gray-800 text-white";
  if (status === "Low") return "bg-gray-200 text-gray-700";
  return "bg-gray-100 text-gray-500";
};

export default function LowStockAlert() {
  const [state, setState] = useState<StockState>({ items: [], loading: true, error: "" });

  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,stock,available,type")
        .eq("available", true)
        .order("stock", { ascending: true })
        .limit(5);

      if (!mounted) return;

      if (error) {
        console.error("Gagal mengambil low stock:", error);
        setState({ items: [], loading: false, error: "Gagal memuat stock" });
        return;
      }

      const items = ((data ?? []) as ProductRow[]).map((product) => {
        const stock = Number(product.stock ?? 0);
        return {
          id: product.id,
          name: product.name ?? "Produk Tanpa Nama",
          stock,
          type: product.type ?? "product",
          status: getStockStatus(stock),
        };
      });

      setState({ items, loading: false, error: "" });
    };

    void fetchProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const needsAttentionCount = useMemo(
    () => state.items.filter((item) => item.stock <= LOW_STOCK_THRESHOLD).length,
    [state.items],
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden h-full">
      <div className="p-3 md:p-4 border-b border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gray-100 rounded-xl p-2">
              {needsAttentionCount > 0 ? (
                <ExclamationTriangleIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-700" />
              ) : (
                <CheckCircleIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-700" />
              )}
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold text-gray-800">Stock Levels</h3>
              <p className="text-[10px] md:text-xs font-medium text-gray-500">
                {state.loading
                  ? "Memuat stock"
                  : needsAttentionCount > 0
                    ? `${needsAttentionCount} produk perlu dicek`
                    : "Stock aman"}
              </p>
            </div>
          </div>
          <a
            href="/owner/products"
            className="p-2 hover:bg-gray-100 rounded-xl transition"
            title="Lihat Produk"
          >
            <ArrowTopRightOnSquareIcon className="h-3 md:h-4 w-3 md:w-4 text-gray-400" />
          </a>
        </div>
      </div>

      <div className="p-3 md:p-4 space-y-2.5">
        {state.loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 rounded-xl bg-gray-50 animate-pulse" />
          ))
        ) : state.error ? (
          <div className="py-8 text-center text-sm text-gray-500">{state.error}</div>
        ) : state.items.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">Belum ada data produk.</div>
        ) : (
          state.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{item.type}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{item.stock}</p>
                  <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-lg ${getStatusStyle(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
                <div
                  className="h-full rounded-full bg-gray-700"
                  style={{ width: `${Math.min(100, Math.max(6, (item.stock / LOW_STOCK_THRESHOLD) * 100))}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}