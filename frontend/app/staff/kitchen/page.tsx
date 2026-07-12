"use client";

import { useState, useEffect } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { getCurrentUser } from "@/lib/utils";
import { getStaffHomePath, hasStaffPosition } from "@/lib/utils/staffAccess";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import { supabase } from "@/lib/config/supabaseClient";
import { ORDERS_REALTIME_CHANNEL, NEW_ORDER_BROADCAST_EVENT } from "@/lib/services/orders/orderRealtime";
import {
  shouldRouteToKitchen,
  type ProductWithPreparationCategory,
} from "@/lib/orders/stationRouting";
import { ClockIcon, FireIcon } from "@heroicons/react/24/outline";

interface KitchenOrder {
  id: string;
  product_name: string;
  quantity: number;
  kitchen_status: "pending" | "cooking" | "ready";
  variants?: Record<string, string>;
  created_at: string;
  ready_at?: string;
  orders?: {
    id: string;
    order_number: string;
    table_number?: string;
    fulfillment_method?: "table_service" | "counter_pickup" | null;
    customer_name?: string;
    created_at: string;
  };
  products?: ProductWithPreparationCategory | ProductWithPreparationCategory[] | null;
}

type KitchenFilter = "all" | "pending" | "cooking";

interface KitchenColumn {
  id: Exclude<KitchenFilter, "all">;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  count: number;
  icon: typeof ClockIcon;
}

function formatOrderTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatWaitingTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function getTableLabel(item: KitchenOrder) {
  if (item.orders?.fulfillment_method === "table_service" && item.orders.table_number) {
    return `Table ${item.orders.table_number}`;
  }

  return "Counter Pickup";
}

function getVariantLabel(variants?: Record<string, string>) {
  if (!variants || Object.keys(variants).length === 0) {
    return "";
  }

  return Object.values(variants).filter(Boolean).join(", ");
}

const getKitchenStatusTone = (status: KitchenOrder["kitchen_status"]) => {
  if (status === "pending") return OWNER_SEMANTIC_TONES.waiting.badgeClass;
  if (status === "cooking") return OWNER_SEMANTIC_TONES.progress.badgeClass;
  return OWNER_SEMANTIC_TONES.success.badgeClass;
};

const getKitchenStatusLabel = (status: KitchenOrder["kitchen_status"]) => {
  if (status === "pending") return "Pending";
  if (status === "cooking") return "Cooking";
  return "Ready";
};

const renderStatusBadge = (label: string, className: string) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
    {label}
  </span>
);

function EmptyKanbanColumn({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-8 text-center">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      <p className="mt-2 max-w-[260px] text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}

function KitchenOrderCard({
  item,
  onUpdateStatus,
}: {
  item: KitchenOrder;
  onUpdateStatus: (itemId: string, newStatus: "cooking" | "ready") => Promise<void>;
}) {
  const isPending = item.kitchen_status === "pending";
  const variantLabel = getVariantLabel(item.variants);

  return (
    <article className="self-start rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">

          <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-950">
            {item.product_name}
          </h3>

          <p className="mt-1 truncate text-sm text-gray-500">
            {item.orders?.order_number ?? "No order number"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {renderStatusBadge(
            getKitchenStatusLabel(item.kitchen_status),
            getKitchenStatusTone(item.kitchen_status),
          )}
          <div className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-gray-100 px-3">
            <span className="text-base font-black text-gray-800">{item.quantity}x</span>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Location
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
            {getTableLabel(item)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Time
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
            {formatOrderTime(item.created_at)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Waiting
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
            {formatWaitingTime(item.created_at)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Customer
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
            {item.orders?.customer_name ?? "-"}
          </p>
        </div>
      </div>

      {variantLabel && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Variants
          </p>
          <p className="text-sm font-medium leading-5 text-gray-800">
            {variantLabel}
          </p>
        </div>
      )}

      {isPending ? (
        <button
          onClick={() => onUpdateStatus(item.id, "cooking")}
          className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          Start Cooking
        </button>
      ) : (
        <button
          onClick={() => onUpdateStatus(item.id, "ready")}
          className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
        >
          Mark Ready
        </button>
      )}
    </article>
  );
}

export default function KitchenPage() {
  useSessionValidation();

  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<KitchenFilter>("all");

  // Page protection - only for Owner, Kitchen staff
  useEffect(() => {
    const currentUser = getCurrentUser();

    // Allow: Owner OR Kitchen
    if (
      currentUser?.role !== "owner" &&
      !hasStaffPosition({
        position: "kitchen",
        positions: currentUser?.positions,
        staffType: currentUser?.staffType,
      })
    ) {
      window.location.href = getStaffHomePath(
        currentUser?.positions,
        currentUser?.staffType,
      );
    }
  }, []);

  useEffect(() => {
    void fetchKitchenOrders();

    // Real-time subscription
    const subscription = supabase
      .channel(ORDERS_REALTIME_CHANNEL)
      .on("broadcast", { event: NEW_ORDER_BROADCAST_EVENT }, () => {
        void fetchKitchenOrders({ silent: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        void fetchKitchenOrders({ silent: true });
      })
      .subscribe();

    return () => {
      void subscription.unsubscribe();
    };
  }, []);

  async function fetchKitchenOrders({ silent = false }: { silent?: boolean } = {}) {
    if (!silent) setLoading(true);
    try {
      // Fetch order items yang butuh kitchen (kitchen_status = pending or cooking)
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          *,
          orders (
            id,
            order_number,
            table_number,
            fulfillment_method,
            customer_name,
            created_at
          ),
          products (
            id,
            categories (
              preparation_station
            )
          )
        `)
        .in("kitchen_status", ["pending", "cooking"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      const kitchenItems = ((data || []) as KitchenOrder[]).filter((item) =>
        shouldRouteToKitchen(
          Array.isArray(item.products) ? item.products[0] : item.products,
        ),
      );

      setOrders(kitchenItems);
    } catch (error) {
      console.error("Error fetching kitchen orders:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(itemId: string, newStatus: "cooking" | "ready") {
    try {
      const { error } = await supabase
        .from("order_items")
        .update({
          kitchen_status: newStatus,
          ready_at: newStatus === "ready" ? new Date().toISOString() : null,
        })
        .eq("id", itemId);

      if (error) throw error;

      await fetchKitchenOrders({ silent: true });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    return order.kitchen_status === filter;
  });

  const pendingCount = orders.filter((order) => order.kitchen_status === "pending").length;
  const cookingCount = orders.filter((order) => order.kitchen_status === "cooking").length;

  const filteredPendingOrders = filteredOrders.filter(
    (order) => order.kitchen_status === "pending",
  );

  const filteredCookingOrders = filteredOrders.filter(
    (order) => order.kitchen_status === "cooking",
  );

  const columns: KitchenColumn[] = [
    {
      id: "pending",
      title: "Pending",
      description: "New orders waiting to be cooked",
      emptyTitle: "No Pending Orders",
      emptyDescription:
        filter === "cooking"
          ? "Switch to All Orders or Pending to see pending items."
          : "New kitchen orders will appear here.",
      count: filteredPendingOrders.length,
      icon: ClockIcon,
    },
    {
      id: "cooking",
      title: "Cooking Orders",
      description: "Orders currently being prepared",
      emptyTitle: "No Cooking Orders",
      emptyDescription:
        filter === "pending"
          ? "Switch to All Orders or Cooking to see cooking items."
          : "Orders in progress will appear here.",
      count: filteredCookingOrders.length,
      icon: FireIcon,
    },
  ];

  function getColumnOrders(columnId: KitchenColumn["id"]) {
    if (columnId === "pending") return filteredPendingOrders;
    return filteredCookingOrders;
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-55px)] flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kitchen Orders</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and track cooking orders in real-time</p>
          </div>

          <div className="flex items-center gap-3">
            {renderStatusBadge(`${pendingCount} Pending`, OWNER_SEMANTIC_TONES.waiting.badgeClass)}
            {renderStatusBadge(`${cookingCount} Cooking`, OWNER_SEMANTIC_TONES.progress.badgeClass)}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex-shrink-0 bg-gray-100 px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide sm:flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition sm:px-6 ${
              filter === "all"
                ? "bg-gray-900 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition sm:px-6 ${
              filter === "pending"
                ? "bg-gray-900 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("cooking")}
            className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition sm:px-6 ${
              filter === "cooking"
                ? "bg-gray-900 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            Cooking ({cookingCount})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gray-100 px-6 pb-6">
        {orders.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Orders</h3>
              <p className="text-sm text-gray-500">No pending orders in kitchen</p>
            </div>
          </div>
        ) : (
          <div className="grid h-full min-h-0 grid-cols-1 gap-4 2xl:grid-cols-2">
            {columns.map((column) => {
              const columnOrders = getColumnOrders(column.id);

              return (
                <section
                  key={column.id}
                  className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm"
                >
                  <div className="mb-3 flex-shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-gray-950">
                            {column.title}
                          </h2>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {column.description}
                          </p>
                        </div>
                      </div>

                      {renderStatusBadge(
                        String(column.count),
                        column.id === "pending"
                          ? OWNER_SEMANTIC_TONES.waiting.badgeClass
                          : OWNER_SEMANTIC_TONES.progress.badgeClass,
                      )}
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    {columnOrders.length === 0 ? (
                      <EmptyKanbanColumn
                        title={column.emptyTitle}
                        description={column.emptyDescription}
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        {columnOrders.map((item) => (
                          <KitchenOrderCard
                            key={item.id}
                            item={item}
                            onUpdateStatus={handleUpdateStatus}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
