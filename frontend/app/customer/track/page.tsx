"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/config/supabaseClient";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/solid";
import OrderProgressBar, {
  type OrderProgressStep,
} from "@/app/components/customer/track/OrderProgressBar";
import LoadingScreen from "@/app/components/customer/LoadingScreen";

interface TableInfo {
  id: string;
  table_id?: string;
  table_number: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  base_price: number;
  total_price: number;
  served: boolean | null;
  kitchen_status: string | null;
  variants?: unknown;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  table_number: string | null;
  order_type: string;
  status: string;
  total: number;
  created_at: string;
  fulfillment_method: string | null;
  pickup_code: string | null;
  order_items: OrderItem[];
}

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  table_number: string | null;
  order_type: string | null;
  status: string;
  total: number | string;
  created_at: string;
  fulfillment_method: string | null;
  pickup_code: string | null;
  order_items: OrderItem[] | null;
}

interface VariantDisplay {
  optionName?: string;
  name?: string;
  label?: string;
  value?: string;
}

interface StatusConfig {
  label: string;
  description: string;
  icon: ReactNode;
  badgeClassName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseStoredTable(value: string | null): TableInfo | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    const id = parsed.id;
    const tableNumber = parsed.table_number;

    if (typeof id !== "string" || typeof tableNumber !== "string") {
      return null;
    }

    return {
      id,
      table_id: typeof parsed.table_id === "string" ? parsed.table_id : undefined,
      table_number: tableNumber,
    };
  } catch {
    localStorage.removeItem("customer_table");
    localStorage.removeItem("table_session_start");
    return null;
  }
}

function normalizeOrder(row: OrderRow): Order {
  return {
    id: row.id,
    order_number: row.order_number,
    customer_name: row.customer_name,
    table_number: row.table_number,
    order_type: row.order_type ?? "Dine in",
    status: row.status,
    total: Number(row.total) || 0,
    created_at: row.created_at,
    fulfillment_method: row.fulfillment_method,
    pickup_code: row.pickup_code,
    order_items: row.order_items ?? [],
  };
}

function parseVariants(value: unknown): VariantDisplay[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is VariantDisplay => isRecord(item));
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is VariantDisplay => isRecord(item));
      }
    } catch {
      return [];
    }
  }

  return [];
}

function getVariantLabel(variant: VariantDisplay): string {
  return (
    variant.optionName ||
    variant.name ||
    variant.label ||
    variant.value ||
    ""
  );
}

function isTakeAwayOrder(order: Order): boolean {
  return order.order_type === "Take Away" || order.fulfillment_method === "counter_pickup";
}

function hasKitchenItems(order: Order): boolean {
  return order.order_items.some((item) => item.kitchen_status !== "not_required");
}

function getPreparedCount(order: Order): number {
  return order.order_items.filter((item) => {
    return item.kitchen_status === "ready" || item.served === true;
  }).length;
}

function getServedCount(order: Order): number {
  return order.order_items.filter((item) => item.served === true).length;
}

function getOrderProgressCount(order: Order): number {
  return isTakeAwayOrder(order) ? getPreparedCount(order) : getServedCount(order);
}

function getStatusConfig(order: Order): StatusConfig {
  const status = order.status;
  const isTakeAway = isTakeAwayOrder(order);

  switch (status) {
    case "new":
      return {
        label: "Order Received",
        description: isTakeAway
          ? "Your order has been received and will be prepared for pickup."
          : "Your order has been received and is waiting to be prepared.",
        icon: <ClockIcon className="h-4 w-4" />,
        badgeClassName: "bg-blue-50 text-blue-700 border border-blue-100",
      };
    case "preparing":
      return {
        label: "Preparing",
        description: "Your order is being prepared by our team.",
        icon: <FireIcon className="h-4 w-4" />,
        badgeClassName: "bg-amber-50 text-amber-700 border border-amber-100",
      };
    case "partially-served":
      return {
        label: isTakeAway ? "Partially Ready" : "Partially Served",
        description: isTakeAway
          ? "Some items are ready. The rest are still in progress."
          : "Some items have been served. The rest are still in progress.",
        icon: <ShoppingBagIcon className="h-4 w-4" />,
        badgeClassName: "bg-indigo-50 text-indigo-700 border border-indigo-100",
      };
    case "served":
      return {
        label: isTakeAway ? "Ready for Pickup" : "Completed",
        description: isTakeAway ? "Your order is ready for pickup." : "All items have been served.",
        icon: <CheckCircleIcon className="h-4 w-4" />,
        badgeClassName: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      };
    case "completed":
      return {
        label: "Completed",
        description: "This order has been completed.",
        icon: <CheckCircleIcon className="h-4 w-4" />,
        badgeClassName: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      };
    default:
      return {
        label: status,
        description: "",
        icon: <ClockIcon className="h-4 w-4" />,
        badgeClassName: "bg-gray-100 text-gray-700 border border-gray-200",
      };
  }
}

function getKitchenStatusBadge(status: string | null, isTakeAway: boolean) {
  switch (status) {
    case "pending":
      return {
        label: "On Progress",
        className: "bg-gray-100 text-gray-700",
      };
    case "cooking":
      return {
        label: "On Progress",
        className: "bg-amber-100 text-amber-700",
      };
    case "ready":
      return {
        label: isTakeAway ? "Ready" : "On Progress",
        className: "bg-emerald-100 text-emerald-700",
      };
    case "not_required":
      return {
        label: "On Progress",
        className: "bg-slate-100 text-slate-700",
      };
    default:
      return {
        label: status || "On Progress",
        className: "bg-gray-100 text-gray-700",
      };
  }
}

function getProgressData(order: Order): {
  currentStep: number;
  steps: OrderProgressStep[];
} {
  const steps: OrderProgressStep[] = [
    {
      label: "Order Received",
      description: "Order has been received",
    },
    {
      label: "On Progress",
      description: "Your order is being prepared or served",
    },
    {
      label: "Completed",
      description: "All items have been served",
    },
  ];

  const allItemsServed =
    order.order_items.length > 0 &&
    order.order_items.every((item) => item.served === true);

  if (allItemsServed || order.status === "completed" || order.status === "served") {
    return { currentStep: steps.length + 1, steps };
  }

  if (order.status === "preparing" || order.status === "partially-served") {
    return { currentStep: 2, steps };
  }

  const hasStarted =
    order.order_items.some(
      (item) =>
        item.kitchen_status === "cooking" ||
        item.kitchen_status === "ready" ||
        item.served === true,
    );

  if (hasStarted) {
    return { currentStep: 2, steps };
  }

  return { currentStep: 1, steps };
}

function CustomerTrackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentPickupCode, setCurrentPickupCode] = useState<string | null>(null);
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const tableId = tableInfo?.id ?? null;

  const activeStatuses = useMemo(
    () => ["new", "preparing", "partially-served", "served", "completed"],
    [],
  );

  useEffect(() => {
    const queryCode = searchParams.get("code")?.trim() || null;
    const storedOrderId = localStorage.getItem("current_order_id");
    const storedPickupCode = localStorage.getItem("current_pickup_code");
    const storedTable = parseStoredTable(localStorage.getItem("customer_table"));
    const pickupCode = queryCode || storedPickupCode || null;

    setCurrentOrderId(storedOrderId);
    setCurrentPickupCode(pickupCode);
    setTableInfo(storedTable);

    if (queryCode) {
      localStorage.setItem("current_pickup_code", queryCode);
    }

    void fetchOrders({
      orderId: storedOrderId,
      pickupCode,
      activeTableId: storedTable?.id ?? null,
      shouldShowLoading: true,
    });

    setTimeout(() => setInitializing(false), 250);
  }, [searchParams]);

  useEffect(() => {
    if (!currentOrderId && !currentPickupCode && !tableId) {
      return;
    }

    const channel = supabase.channel("customer-order-tracking");

    if (currentOrderId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${currentOrderId}`,
        },
        () => {
          void fetchOrders({
            orderId: currentOrderId,
            pickupCode: currentPickupCode,
            activeTableId: tableId,
            shouldShowLoading: false,
          });
        },
      );
    }

    if (currentPickupCode) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `pickup_code=eq.${currentPickupCode}`,
        },
        () => {
          void fetchOrders({
            orderId: currentOrderId,
            pickupCode: currentPickupCode,
            activeTableId: tableId,
            shouldShowLoading: false,
          });
        },
      );
    }

    if (tableId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `table_id=eq.${tableId}`,
        },
        () => {
          void fetchOrders({
            orderId: currentOrderId,
            pickupCode: currentPickupCode,
            activeTableId: tableId,
            shouldShowLoading: false,
          });
        },
      );
    }

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "order_items",
      },
      () => {
        void fetchOrders({
          orderId: currentOrderId,
          pickupCode: currentPickupCode,
          activeTableId: tableId,
          shouldShowLoading: false,
        });
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrderId, currentPickupCode, tableId]);

  const fetchOrders = async ({
    orderId,
    pickupCode,
    activeTableId,
    shouldShowLoading,
  }: {
    orderId: string | null;
    pickupCode: string | null;
    activeTableId: string | null;
    shouldShowLoading: boolean;
  }) => {
    if (shouldShowLoading) {
      setLoading(true);
    }

    try {
      if (pickupCode) {
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items (*)")
          .eq("pickup_code", pickupCode)
          .maybeSingle();

        if (error) {
          throw error;
        }

        const normalizedOrders = data ? [normalizeOrder(data as OrderRow)] : [];
        setOrders(normalizedOrders);

        if (!expandedOrderId && normalizedOrders.length > 0) {
          setExpandedOrderId(normalizedOrders[0].id);
        }

        return;
      }

      if (orderId) {
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items (*)")
          .eq("id", orderId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        const normalizedOrders = data ? [normalizeOrder(data as OrderRow)] : [];
        setOrders(normalizedOrders);

        if (!expandedOrderId && normalizedOrders.length > 0) {
          setExpandedOrderId(normalizedOrders[0].id);
        }

        return;
      }

      if (activeTableId) {
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items (*)")
          .eq("table_id", activeTableId)
          .in("status", activeStatuses)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const normalizedOrders = ((data ?? []) as OrderRow[]).map(normalizeOrder);
        setOrders(normalizedOrders);

        if (!expandedOrderId && normalizedOrders.length > 0) {
          setExpandedOrderId(normalizedOrders[0].id);
        }

        return;
      }

      setOrders([]);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchOrders({
      orderId: currentOrderId,
      pickupCode: currentPickupCode,
      activeTableId: tableId,
      shouldShowLoading: false,
    });
  };

  const handleNewOrder = () => {
    localStorage.removeItem("current_order_id");
    setCurrentOrderId(null);
    router.push("/customer/menu");
  };

  const copyTrackingLink = async (pickupCode: string) => {
    const trackingUrl = `${window.location.origin}/customer/track?code=${encodeURIComponent(
      pickupCode,
    )}`;

    try {
      await navigator.clipboard.writeText(trackingUrl);
      alert("Tracking link copied.");
    } catch {
      alert(trackingUrl);
    }
  };

  const renderOrderCard = (order: Order, index: number) => {
    const statusConfig = getStatusConfig(order);
    const isTakeAway = isTakeAwayOrder(order);
    const progressCount = getOrderProgressCount(order);
    const totalCount = order.order_items.length;
    const isExpanded = expandedOrderId === order.id;
    const progressPercentage =
      totalCount > 0 ? Math.round((progressCount / totalCount) * 100) : 0;
    const progress = getProgressData(order);
    const progressLabel = isTakeAway ? "Items Ready" : "Items Served";

    return (
      <div
        key={order.id}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      >
        <button
          type="button"
          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
          className="w-full p-4 text-left hover:bg-gray-50 transition"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-bold text-gray-900">
                  Order #{order.order_number}
                </h2>
                {index === 0 && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Latest
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {order.table_number ? `Table ${order.table_number}` : order.order_type}
              </p>
            </div>

            <ChevronDownIcon
              className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className={`inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${statusConfig.badgeClassName}`}
            >
              {statusConfig.icon}
              <span>{statusConfig.label}</span>
            </div>

            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{progressCount}/{totalCount}</span>{" "}
              {isTakeAway ? "ready" : "served"}
            </div>
          </div>

          {statusConfig.description ? (
            <p className="mt-3 text-sm text-gray-500">{statusConfig.description}</p>
          ) : null}
        </button>

        {isExpanded ? (
          <div className="border-t border-gray-100 px-4 pb-4 pt-4">
            <div className="space-y-4">
              {order.pickup_code ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Pickup Code
                      </p>
                      <p className="mt-1 text-2xl font-bold tracking-wide text-gray-900">
                        {order.pickup_code}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Use this code to track or pick up your order.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyTrackingLink(order.pickup_code || "")}
                      className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-100"
                    >
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="mb-4 text-sm font-semibold text-gray-700">Order Progress</h3>
                <OrderProgressBar currentStep={progress.currentStep} steps={progress.steps} />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{progressLabel}</h3>
                  <span className="text-sm font-bold text-gray-900">
                    {progressCount}/{totalCount}
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gray-900 transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="mb-4 text-sm font-semibold text-gray-700">Order Items</h3>

                <div className="space-y-4">
                  {order.order_items.map((item) => {
                    const variants = parseVariants(item.variants);
                    const itemDone = isTakeAway
                      ? item.kitchen_status === "ready" || item.served === true
                      : item.served === true;
                    const kitchenBadge = itemDone
                      ? {
                          label: isTakeAway ? "Ready" : "Served",
                          className: "bg-emerald-100 text-emerald-700",
                        }
                      : getKitchenStatusBadge(item.kitchen_status, isTakeAway);

                    return (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {item.quantity}x {item.product_name}
                              </p>

                              {variants.length > 0 ? (
                                <p className="mt-1 text-xs text-gray-500">
                                  {variants
                                    .map(getVariantLabel)
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              ) : null}
                            </div>

                            {itemDone ? (
                              <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600" />
                            ) : (
                              <ClockIcon className="h-5 w-5 shrink-0 text-amber-600" />
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-md px-2.5 py-1 text-xs font-medium ${kitchenBadge.className}`}
                            >
                              {kitchenBadge.label}
                            </span>


                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    Rp {order.total.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {order.status === "completed" ? (
                <button
                  type="button"
                  onClick={handleNewOrder}
                  className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  Order Again
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  if (initializing) {
    return <LoadingScreen title="Loading Order Status..." hideBottomNav />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">Track Orders</h1>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="mb-4 rounded-full bg-gray-100 p-5">
            <ClockIcon className="h-8 w-8 text-gray-400" />
          </div>

          <h2 className="mb-2 text-lg font-semibold text-gray-900">No Active Orders</h2>
          <p className="mb-6 max-w-sm text-center text-sm text-gray-500">
            You do not have any active orders at the moment.
          </p>

          <button
            type="button"
            onClick={handleNewOrder}
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Track Orders</h1>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg p-2 transition hover:bg-gray-100 disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-5 w-5 text-gray-600 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {orders.map((order, index) => renderOrderCard(order, index))}
      </div>
    </div>
  );
}


function TrackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
    </div>
  );
}

export default function CustomerTrackPage() {
  return (
    <Suspense fallback={<TrackFallback />}>
      <CustomerTrackContent />
    </Suspense>
  );
}