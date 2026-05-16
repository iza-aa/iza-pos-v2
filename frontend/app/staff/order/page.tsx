"use client";

import { useState, useEffect } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { POLLING_INTERVALS, getWeeksAgo, getMonthsAgo } from "@/lib/constants";
import OrderHeader from "@/app/components/staff/order/OrderHeader";
import { OrderCard } from "@/app/components/shared";
import OrderTable from "@/app/components/staff/order/OrderTable";
import { SearchBar, ViewModeToggle } from "@/app/components/ui";
import { DateFilterDropdown } from "@/app/components/owner/activitylog";
import type { ViewMode } from "@/app/components/ui/Common/ViewModeToggle";
import type { OrderItem } from "@/lib/types";
import { supabase } from "@/lib/config/supabaseClient";
import {
  parseSupabaseTimestamp,
  getJakartaNow,
  formatJakartaDate,
  formatJakartaTime,
  getMinutesDifference,
} from "@/lib/utils";
import { showSuccess, showError } from "@/lib/services/errorHandling";
import { logActivity } from "@/lib/services/activity/activityLogger";
import TableOrderMapView from "@/app/components/staff/order/TableOrderMapView";

interface Order {
  id: string;
  customerName: string;
  orderNumber: string;
  orderType: string;
  items: OrderItem[];
  total: number;
  date: string;
  time: string;
  status: "new" | "preparing" | "partially-served" | "served" | "completed";
  table?: string;
  tableNumber: string;
  orderSource?: "pos" | "qr";
  createdAt: string;
  createdByName?: string;
  createdByRole?: string;
  servedByNames?: string[];
  servedByRoles?: string[];
  fulfillmentMethod?: "table_service" | "pager" | "counter_pickup" | null;
  pagerNumber?: string | null;
  pickupCode?: string | null;
}

type KanbanColumnKey = "new" | "preparing" | "partially-served" | "completed";

type OrderFilter =
  | "all"
  | "dine-in"
  | "takeaway"
  | KanbanColumnKey
  | "pos"
  | "qr";

const kanbanColumns: {
  key: KanbanColumnKey;
  title: string;
  description: string;
}[] = [
  {
    key: "new",
    title: "New Order",
    description: "Pesanan baru masuk",
  },
  {
    key: "preparing",
    title: "On Process",
    description: "Pesanan sedang diproses",
  },
  {
    key: "partially-served",
    title: "Partially Served",
    description: "Sebagian item sudah disajikan",
  },
  {
    key: "completed",
    title: "Completed",
    description: "Pesanan selesai",
  },
];

const isValidStaffId = (id: unknown): id is string => {
  return typeof id === "string" && id.length > 0;
};

export default function ManagerOrderPage() {
  useSessionValidation();

  const [orderList, setOrderList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month" | "custom"
  >("all");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("manager-orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => {
          fetchOrders();
        },
      )
      .subscribe();

    const interval = setInterval(fetchOrders, POLLING_INTERVALS.SLOW);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  async function fetchOrders() {
    setLoading(true);

    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select(
          `
					*,
					order_items (
						id,
						product_id,
						product_name,
						quantity,
						base_price,
						total_price,
						variants,
						served,
						served_at,
						served_by,
						kitchen_status,
						ready_at,
						notes,
						products (name, image)
					)
				`,
        )
        .order("created_at", { ascending: false });

      if (error) {
        showError("Gagal mengambil data order.");
        return;
      }

      if (!ordersData) {
        setOrderList([]);
        return;
      }

      const createdByIds = [
        ...new Set(
          ordersData.map((order) => order.created_by).filter(isValidStaffId),
        ),
      ];

      const servedByIds = [
        ...new Set(
          ordersData.flatMap((order) =>
            (order.order_items || [])
              .map(
                (item: OrderItem & { served_by?: string | null }) =>
                  item.served_by,
              )
              .filter(isValidStaffId),
          ),
        ),
      ];

      const allStaffIds = [...new Set([...createdByIds, ...servedByIds])];

      const staffMap = new Map<string, { name: string; type: string }>();

      if (allStaffIds.length > 0) {
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, name, staff_type, role")
          .in("id", allStaffIds);

        if (staffData) {
          staffData.forEach((staff) => {
            let roleCategory = "Staff";

            const roleLower = staff.role?.toLowerCase();

            if (roleLower === "owner") {
              roleCategory = "Owner";
            } else if (roleLower === "manager") {
              roleCategory = "Manager";
            } else if (staff.staff_type) {
              roleCategory = "Staff";
            }

            staffMap.set(staff.id, {
              name: staff.name,
              type: roleCategory,
            });
          });
        }
      }

      const transformedOrders: Order[] = ordersData.map((order) => {
        const orderItems = (order.order_items || []) as (OrderItem & {
          product_name?: string;
          products?: { name?: string };
          base_price?: number;
          kitchen_status?: string;
          ready_at?: string;
          served_by?: string | null;
        })[];

        const servedCount = orderItems.filter((item) => item.served).length;
        const totalCount = orderItems.length;

        const orderCreatedAt = parseSupabaseTimestamp(order.created_at);
        const now = getJakartaNow();
        const minutesSinceCreated = getMinutesDifference(now, orderCreatedAt);

        let status = order.status as Order["status"];

        if (order.status === "new" && minutesSinceCreated >= 5) {
          status = "preparing";

          void supabase
            .from("orders")
            .update({ status: "preparing" })
            .eq("id", order.id);
        }

        if (servedCount > 0 && servedCount < totalCount) {
          status = "partially-served";

          if (order.status !== "partially-served") {
            void supabase
              .from("orders")
              .update({ status: "partially-served" })
              .eq("id", order.id);
          }
        } else if (servedCount === totalCount && totalCount > 0) {
          status = "served";

          if (order.status !== "served" && order.status !== "completed") {
            void supabase
              .from("orders")
              .update({
                status: "served",
                updated_at: new Date().toISOString(),
              })
              .eq("id", order.id);
          }

          const orderUpdatedAt = parseSupabaseTimestamp(
            order.updated_at || order.created_at,
          );
          const minutesSinceServed = getMinutesDifference(now, orderUpdatedAt);

          if (order.status === "served" && minutesSinceServed >= 5) {
            status = "completed";

            void supabase
              .from("orders")
              .update({
                status: "completed",
                completed_at: new Date().toISOString(),
              })
              .eq("id", order.id);
          }
        }

        const servedByStaffIds = [
          ...new Set(
            orderItems
              .filter((item) => item.served)
              .map((item) => item.served_by)
              .filter(isValidStaffId),
          ),
        ];

        const servedByNames = servedByStaffIds
          .map((staffId) => staffMap.get(staffId)?.name)
          .filter((name): name is string => typeof name === "string");

        const servedByTypes = servedByStaffIds
          .map((staffId) => staffMap.get(staffId)?.type)
          .filter((type): type is string => typeof type === "string");

        return {
          id: order.id,
          customerName: order.customer_name || "Guest",
          orderNumber:
            order.order_number || `#${order.id.substring(0, 8).toUpperCase()}`,
          orderType: order.order_type || "Dine in",
          items: orderItems.map((item) => ({
            id: item.id,
            name:
              item.product_name ||
              item.products?.name ||
              item.name ||
              "Unknown Item",
            quantity: item.quantity,
            price: item.base_price ?? item.price ?? 0,
            subtotal: item.subtotal,
            served: item.served,
            servedAt: item.served_at
              ? formatJakartaTime(parseSupabaseTimestamp(item.served_at))
              : undefined,
            variants: item.variants,
            kitchenStatus:
              item.kitchen_status || item.kitchenStatus || "not_required",
            readyAt: item.ready_at || item.readyAt,
          })),
          total: order.total || 0,
          date: formatJakartaDate(orderCreatedAt),
          time: formatJakartaTime(orderCreatedAt),
          status,
          table: order.table_number || undefined,
          tableNumber: order.table_number || order.table || "",
          orderSource: order.order_source || undefined,
          createdByName: order.created_by
            ? staffMap.get(order.created_by)?.name
            : undefined,
          createdByRole: order.created_by
            ? staffMap.get(order.created_by)?.type
            : order.created_by_role,
          servedByNames,
          servedByRoles: servedByTypes,
          fulfillmentMethod: order.fulfillment_method ?? null,
          pagerNumber: order.pager_number ?? null,
          pickupCode: order.pickup_code ?? null,
          createdAt: order.created_at,
        };
      });

      setOrderList(transformedOrders);
    } catch {
      showError("Gagal mengambil data order.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessOrder(orderId: string) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "preparing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) {
        showError(`Gagal memproses order: ${error.message}`);
        return;
      }

      setOrderList((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: "preparing",
              }
            : order,
        ),
      );

      showSuccess("Order moved to On Process");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Silakan coba lagi.";

      showError(`Gagal memproses order. ${errorMessage}`);
    }
  }

  const canServeItem = (item: OrderItem) => {
    return (
      !item.served &&
      (item.kitchenStatus === "not_required" || item.kitchenStatus === "ready")
    );
  };

  const canShowServeOrderButton = (order: Order) => {
    const hasUnservedItems = order.items.some((item) => !item.served);

    return (
      hasUnservedItems &&
      (order.status === "preparing" || order.status === "partially-served")
    );
  };

  const hasServeableItems = (order: Order) => {
    return order.items.some(canServeItem);
  };

  async function handleMarkServed(orderId: string, itemIds: string[]) {
    try {
      const validItemIds = itemIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      );

      if (validItemIds.length === 0) {
        showError("Pilih minimal satu item yang sudah disajikan.");
        return;
      }

      const targetOrder = orderList.find((order) => order.id === orderId);

      if (!targetOrder) {
        showError("Order tidak ditemukan.");
        return;
      }

      const nowIso = new Date().toISOString();

      const { error: itemsError } = await supabase
        .from("order_items")
        .update({
          served: true,
          served_at: nowIso,
        })
        .in("id", validItemIds);

      if (itemsError) {
        showError(`Gagal menyajikan item: ${itemsError.message}`);
        return;
      }

      const nextItems = targetOrder.items.map((item) =>
        validItemIds.includes(item.id)
          ? {
              ...item,
              served: true,
              servedAt: formatJakartaTime(parseSupabaseTimestamp(nowIso)),
            }
          : item,
      );

      const servedCount = nextItems.filter((item) => item.served).length;
      const totalCount = nextItems.length;
      const nextStatus: Order["status"] =
        servedCount === totalCount && totalCount > 0
          ? "served"
          : servedCount > 0
            ? "partially-served"
            : targetOrder.status;

      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: nextStatus,
          updated_at: nowIso,
        })
        .eq("id", orderId);

      if (orderError) {
        showError(`Gagal memperbarui status order: ${orderError.message}`);
        return;
      }

      setOrderList((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: nextStatus,
                items: nextItems,
              }
            : order,
        ),
      );

      showSuccess(
        nextStatus === "served"
          ? "Semua item berhasil disajikan."
          : "Item berhasil disajikan sebagian.",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Silakan coba lagi.";

      showError(`Gagal menyajikan item. ${errorMessage}`);
    }
  }

  async function handleDeleteOrder(orderId: string) {
    if (
      !confirm(
        "Apakah Anda yakin ingin menghapus order ini? Aksi ini tidak dapat dibatalkan.",
      )
    ) {
      return;
    }

    try {
      const deletedOrder = orderList.find((order) => order.id === orderId);

      const { data: usageTransactions, error: usageFetchError } = await supabase
        .from("usage_transactions")
        .select("id")
        .eq("order_id", orderId);

      if (usageFetchError) {
        showError(
          `Gagal mengambil data penggunaan stok: ${usageFetchError.message}`,
        );
        return;
      }

      const usageTransactionIds = (usageTransactions || [])
        .map((transaction) => transaction.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      if (usageTransactionIds.length > 0) {
        const { error: usageDetailsError } = await supabase
          .from("usage_transaction_details")
          .delete()
          .in("usage_transaction_id", usageTransactionIds);

        if (usageDetailsError) {
          showError(
            `Gagal menghapus detail penggunaan stok: ${usageDetailsError.message}`,
          );
          return;
        }

        const { error: usageTransactionsError } = await supabase
          .from("usage_transactions")
          .delete()
          .eq("order_id", orderId);

        if (usageTransactionsError) {
          showError(
            `Gagal menghapus transaksi penggunaan stok: ${usageTransactionsError.message}`,
          );
          return;
        }
      }

      const { error: paymentError } = await supabase
        .from("payment_transactions")
        .delete()
        .eq("order_id", orderId);

      if (paymentError) {
        showError(
          `Gagal menghapus payment transactions: ${paymentError.message}`,
        );
        return;
      }

      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);

      if (itemsError) {
        showError(`Gagal menghapus order items: ${itemsError.message}`);
        return;
      }

      const { error: tableError } = await supabase
        .from("tables")
        .update({ current_order_id: null, status: "free" })
        .eq("current_order_id", orderId);

      if (tableError) {
        showError(`Gagal memperbarui status meja: ${tableError.message}`);
        return;
      }

      const { error: orderError } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (orderError) {
        showError(`Gagal menghapus order: ${orderError.message}`);
        return;
      }

      setOrderList((prev) => prev.filter((order) => order.id !== orderId));
      showSuccess("Order berhasil dihapus");

      if (deletedOrder) {
        await logActivity({
          action: "DELETE",
          category: "SALES",
          description: `Deleted/voided order ${deletedOrder.orderNumber}`,
          resourceType: "Order",
          resourceId: orderId,
          resourceName: deletedOrder.orderNumber,
          previousValue: {
            order_number: deletedOrder.orderNumber,
            customer_name: deletedOrder.customerName,
            total: deletedOrder.total,
            items_count: deletedOrder.items.length,
            usage_transactions_count: usageTransactionIds.length,
          },
          severity: "critical",
          tags: ["order", "delete", "void"],
          isReversible: false,
          notes: "Order deleted by manager",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Silakan coba lagi.";

      showError(`Gagal menghapus order. ${errorMessage}`);
    }
  }

  const now = new Date();
  const today = now.toDateString();
  const weekAgo = getWeeksAgo(1);
  const monthAgo = getMonthsAgo(1);

  const isKanbanView = viewMode === "card";
  const isTableListView = viewMode === "table";
  const isTableOrderMapView = !isKanbanView && !isTableListView;
  const shouldShowOrderFilter = isTableListView;
  const shouldApplyOrderFilter = isTableListView;

  const filteredOrders = orderList.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;

    if (shouldApplyOrderFilter) {
      if (orderFilter === "dine-in") {
        matchesFilter = order.orderType.toLowerCase().includes("dine");
      } else if (orderFilter === "takeaway") {
        matchesFilter = order.orderType.toLowerCase().includes("take");
      } else if (orderFilter === "new") {
        matchesFilter = order.status === "new";
      } else if (orderFilter === "preparing") {
        matchesFilter = order.status === "preparing";
      } else if (orderFilter === "partially-served") {
        matchesFilter = order.status === "partially-served";
      } else if (orderFilter === "completed") {
        matchesFilter =
          order.status === "served" || order.status === "completed";
      } else if (orderFilter === "pos") {
        matchesFilter = order.orderSource === "pos";
      } else if (orderFilter === "qr") {
        matchesFilter = order.orderSource === "qr";
      }
    }

    let matchesDate = true;

    if (dateFilter !== "all") {
      const orderDate = new Date(order.createdAt);

      if (dateFilter === "today") {
        matchesDate = orderDate.toDateString() === today;
      } else if (dateFilter === "week") {
        matchesDate = orderDate >= weekAgo;
      } else if (dateFilter === "month") {
        matchesDate = orderDate >= monthAgo;
      } else if (
        dateFilter === "custom" &&
        customDateRange.start &&
        customDateRange.end
      ) {
        const startDate = new Date(customDateRange.start);
        const endDate = new Date(customDateRange.end);
        matchesDate = orderDate >= startDate && orderDate <= endDate;
      }
    }

    return matchesSearch && matchesFilter && matchesDate;
  });

  const getOrdersByKanbanColumn = (columnKey: KanbanColumnKey) => {
    if (columnKey === "completed") {
      return filteredOrders.filter(
        (order) => order.status === "served" || order.status === "completed",
      );
    }

    return filteredOrders.filter((order) => order.status === columnKey);
  };

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      <div className="shrink-0">
        <OrderHeader
          description="Track and manage all customer orders in real-time"
          searchBar={
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search orders..."
            />
          }
        >
          <div className="flex items-center gap-3">
            <DateFilterDropdown
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
            />

            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </OrderHeader>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-100">
        {shouldShowOrderFilter && (
          <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-6 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setOrderFilter("all")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
                orderFilter === "all"
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              All Items
            </button>

            <button
              type="button"
              onClick={() => setOrderFilter("dine-in")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
                orderFilter === "dine-in"
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Dine In
            </button>

            <button
              type="button"
              onClick={() => setOrderFilter("takeaway")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
                orderFilter === "takeaway"
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Takeaway
            </button>

            <button
              type="button"
              onClick={() => setOrderFilter("new")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
                orderFilter === "new"
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              New Order
            </button>

            <button
              type="button"
              onClick={() => setOrderFilter("preparing")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
                orderFilter === "preparing"
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              On Process
            </button>

            <button
              type="button"
              onClick={() => setOrderFilter("partially-served")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
                orderFilter === "partially-served"
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Partially Served
            </button>

            <button
              type="button"
              onClick={() => setOrderFilter("completed")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
                orderFilter === "completed"
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Completed
            </button>

            <button
              type="button"
              onClick={() => setOrderFilter("pos")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
                orderFilter === "pos"
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              POS Only
            </button>

            <button
              type="button"
              onClick={() => setOrderFilter("qr")}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
                orderFilter === "qr"
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              QR Only
            </button>
            </div>
          </div>
        )}

        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
            </div>
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {kanbanColumns.map((column) => {
                const columnOrders = getOrdersByKanbanColumn(column.key);

                return (
                  <section
                    key={column.key}
                    className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
                  >
                    <div className="bg-white border-b border-gray-200 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {column.title}
                          </h3>

                          <p className="text-xs text-gray-500 mt-0.5">
                            {column.description}
                          </p>
                        </div>

                        <span className="min-w-7 h-7 px-2 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold flex items-center justify-center">
                          {columnOrders.length}
                        </span>
                      </div>
                    </div>

                     <div className="p-3 space-y-3 min-h-[520px]">
                      {columnOrders.length > 0 ? (
                        columnOrders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            showDeleteButton={true}
                            onDelete={handleDeleteOrder}
                            enableFlipCard={canShowServeOrderButton(order)}
                            showServeOrderAction={canShowServeOrderButton(order)}
                            serveOrderLabel="Serve Order"
                            disabledServeOrderLabel="Waiting for Kitchen"
                            onMarkServed={handleMarkServed}
                            customActions={
                              order.status === "new" ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleProcessOrder(order.id);
                                  }}
                                  className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition"
                                >
                                  Process
                                </button>
                              ) : null
                            }
                          />
                        ))
                      ) : (
                        <div className="h-32 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-400 text-center px-4">
                          Tidak ada pesanan pada status ini
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : viewMode === "table" ? (
            <OrderTable orders={filteredOrders} onOrderClick={() => {}} />
          ) : (
            <TableOrderMapView orders={filteredOrders} />
          )}
        </div>
      </div>
    </div>
  );
}