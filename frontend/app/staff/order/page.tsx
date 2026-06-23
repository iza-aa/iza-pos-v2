"use client";

import { useState, useEffect } from "react";
import { useSessionValidation } from "@/lib/hooks/useSessionValidation";
import { POLLING_INTERVALS } from "@/lib/constants";
import { OrderCard } from "@/app/components/shared";
import OrderTable from "@/app/components/staff/order/OrderTable";
import { SearchBar, ViewModeToggle } from "@/app/components/ui";
import DateRangeFilter, {
  getDefaultDateRange,
  type DateRangeValue,
} from "@/app/components/shared/DateRangeFilter";
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
import { getCurrentUser } from "@/lib/utils/auth";
import { canUpdateStaffOrders } from "@/lib/utils/staffAccess";
import { reverseOrderInventoryUsageWithBatches } from "@/lib/services/inventory/inventoryBatchService";
import OrderCorrectionModal from "@/app/components/staff/order/OrderCorrectionModal";

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
  fulfillmentMethod?: "table_service" | "counter_pickup" | null;
  pickupCode?: string | null;
}

type OrderCorrectionReview = {
  id: string;
  orderId: string;
  status: "logged" | "reviewed";
};

type KanbanColumnKey = "new" | "preparing" | "partially-served" | "completed";

type OrderFilter =
  | "all"
  | "dine-in"
  | "takeaway"
  | KanbanColumnKey
  | "pos"
  | "qr";

type KanbanFilter = "all" | KanbanColumnKey;

const kanbanFilterOptions: { key: KanbanFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New Order" },
  { key: "preparing", label: "On Process" },
  { key: "partially-served", label: "Partially Served" },
  { key: "completed", label: "Completed" },
];

const tableFilterOptions: { key: OrderFilter; label: string }[] = [
  { key: "all", label: "All Items" },
  { key: "dine-in", label: "Dine In" },
  { key: "takeaway", label: "Takeaway" },
  { key: "new", label: "New Order" },
  { key: "preparing", label: "On Process" },
  { key: "partially-served", label: "Partially Served" },
  { key: "completed", label: "Completed" },
  { key: "pos", label: "POS Only" },
  { key: "qr", label: "QR Only" },
];

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

export default function StaffOrderPage() {
  useSessionValidation();

  const currentUser = getCurrentUser();
  const canUpdateOrders = canUpdateStaffOrders({
    role: currentUser?.role,
    staffType: currentUser?.staffType,
  });
  const canDeleteOrders = currentUser?.role === "owner";

  const [orderList, setOrderList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    getDefaultDateRange(),
  );
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [kanbanFilter, setKanbanFilter] = useState<KanbanFilter>("all");
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [orderCorrections, setOrderCorrections] = useState<OrderCorrectionReview[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchOrderCorrections();

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

    const interval = setInterval(() => {
      fetchOrders();
      fetchOrderCorrections();
    }, POLLING_INTERVALS.SLOW);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    void fetchOrderCorrections();
  }, [dateRange]);

  async function fetchOrderCorrections() {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const response = await fetch(`/api/orders/corrections?${params.toString()}`, {
        headers: {
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
      });

      const result = (await response.json().catch(() => ({}))) as {
        data?: OrderCorrectionReview[];
      };

      if (response.ok) {
        setOrderCorrections(result.data || []);
      }
    } catch (error) {
      console.warn("Failed to load order corrections:", error);
    }
  }

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
    if (!canUpdateOrders) {
      showError("This staff role can view orders but cannot update them.");
      return;
    }

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

  const canShowServeOrderButton = (order: Order) => {
    const hasUnservedItems = order.items.some((item) => !item.served);

    return (
      hasUnservedItems &&
      (order.status === "preparing" || order.status === "partially-served")
    );
  };

  async function handleMarkServed(orderId: string, itemIds: string[]) {
    if (!canUpdateOrders) {
      showError("This staff role can view orders but cannot update them.");
      return;
    }

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
          served_by: currentUser?.id ?? null,
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

      await reverseOrderInventoryUsageWithBatches({
        orderId,
        orderNumber: deletedOrder?.orderNumber,
        performedByName: currentUser
          ? `${currentUser.name} - ${currentUser.role}`
          : "Staff",
      });

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

  const isKanbanView = viewMode === "card";
  const isTableListView = viewMode === "table";
  const shouldShowOrderFilter = isTableListView;
  const shouldShowKanbanFilter = isKanbanView;
  const shouldApplyOrderFilter = isTableListView;
  const visibleKanbanColumns =
    kanbanFilter === "all"
      ? kanbanColumns
      : kanbanColumns.filter((column) => column.key === kanbanFilter);

  const dateRangeOrders = orderList.filter((order) => {
    const orderDateValue = order.createdAt.slice(0, 10);
    return orderDateValue >= dateRange.startDate && orderDateValue <= dateRange.endDate;
  });

  const correctionOrderIds = new Set(orderCorrections.map((correction) => correction.orderId));
  const correctableDateRangeOrders = dateRangeOrders.filter(
    (order) => !correctionOrderIds.has(order.id),
  );
  const loggedCorrectionByOrderId = new Map(
    orderCorrections
      .filter((correction) => correction.status === "logged")
      .map((correction) => [correction.orderId, correction]),
  );

  const getOrderEffectiveStatus = (order: Order): Order["status"] => {
    if (loggedCorrectionByOrderId.has(order.id)) return "preparing";
    return order.status;
  };

  const filteredOrders = orderList.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.tableNumber.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;

    if (shouldApplyOrderFilter) {
      const effectiveStatus = getOrderEffectiveStatus(order);

      if (orderFilter === "dine-in") {
        matchesFilter = order.orderType.toLowerCase().includes("dine");
      } else if (orderFilter === "takeaway") {
        matchesFilter = order.orderType.toLowerCase().includes("take");
      } else if (orderFilter === "new") {
        matchesFilter = effectiveStatus === "new";
      } else if (orderFilter === "preparing") {
        matchesFilter = effectiveStatus === "preparing";
      } else if (orderFilter === "partially-served") {
        matchesFilter = effectiveStatus === "partially-served";
      } else if (orderFilter === "completed") {
        matchesFilter =
          effectiveStatus === "served" || effectiveStatus === "completed";
      } else if (orderFilter === "pos") {
        matchesFilter = order.orderSource === "pos";
      } else if (orderFilter === "qr") {
        matchesFilter = order.orderSource === "qr";
      }
    }

    const orderDateValue = order.createdAt.slice(0, 10);
    const matchesDate =
      orderDateValue >= dateRange.startDate && orderDateValue <= dateRange.endDate;

    return matchesSearch && matchesFilter && matchesDate;
  });

  const getOrdersByKanbanColumn = (columnKey: KanbanColumnKey) => {
    if (columnKey === "completed") {
      return filteredOrders.filter(
        (order) => {
          const effectiveStatus = getOrderEffectiveStatus(order);
          return effectiveStatus === "served" || effectiveStatus === "completed";
        },
      );
    }

    return filteredOrders.filter((order) => getOrderEffectiveStatus(order) === columnKey);
  };

  const renderOrderControls = () => (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search orders..."
        width="w-full lg:w-72"
      />
      <button
        type="button"
        onClick={() => setCorrectionModalOpen(true)}
        className="h-10 rounded-lg border border-gray-900 bg-white px-4 text-sm font-bold text-gray-900 transition hover:bg-gray-50"
      >
        Request Correction
      </button>
      <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
    </div>
  );

  const renderOrderLoadingSkeleton = () => {
    if (viewMode === "table") {
      return (
        <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-4">
            <div className="h-5 w-36 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 table-fixed text-left text-sm">
              <thead className="bg-[#F8F8F8]">
                <tr>
                  {Array.from({ length: 6 }, (_, index) => (
                    <th key={index} className="border-b border-gray-200 px-4 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: 8 }, (_, rowIndex) => (
                  <tr key={rowIndex} className="odd:bg-white even:bg-[#F8F8F8]">
                    {Array.from({ length: 6 }, (_, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-5">
                        <div
                          className={`h-4 animate-pulse rounded bg-gray-200 ${
                            cellIndex === 0 ? "w-32" : cellIndex % 2 === 0 ? "w-24" : "w-16"
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (viewMode === "map") {
      return (
        <div className="mt-2 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-4 flex gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-10 w-28 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
          <div className="h-130 animate-pulse rounded-xl bg-gray-200" />
        </div>
      );
    }

    return (
      <div
        className={
          kanbanFilter === "all"
            ? "mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            : "mt-2"
        }
      >
        {visibleKanbanColumns.map((column) => (
          <section key={column.key} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-3 w-40 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="space-y-3 p-3">
              {Array.from({ length: kanbanFilter === "all" ? 3 : 6 }, (_, index) => (
                <div key={index} className="rounded-xl border border-gray-100 p-4">
                  <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="mt-4 h-3 w-full animate-pulse rounded bg-gray-100" />
                  <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                  <div className="mt-5 h-9 w-full animate-pulse rounded-lg bg-gray-200" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-55px)] bg-gray-100">
      <OrderCorrectionModal
        isOpen={correctionModalOpen}
        orders={correctableDateRangeOrders}
        onClose={() => setCorrectionModalOpen(false)}
        onSubmitted={(orderId) => {
          setOrderList((currentOrders) =>
            currentOrders.map((order) =>
              order.id === orderId
                ? { ...order, status: "preparing", date: order.date, time: order.time }
                : order,
            ),
          );
          void fetchOrders();
          void fetchOrderCorrections();
        }}
      />
      <div className="bg-gray-100">
        <div className="bg-gray-100 px-6 pt-6">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        <div className="shrink-0 bg-gray-100 px-6 pt-6 pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {shouldShowKanbanFilter
                ? kanbanFilterOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setKanbanFilter(option.key)}
                      className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
                        kanbanFilter === option.key
                          ? "bg-gray-900 text-white shadow-md"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))
                : null}
              {shouldShowOrderFilter
                ? tableFilterOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setOrderFilter(option.key)}
                      className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
                        orderFilter === option.key
                          ? "bg-gray-900 text-white shadow-md"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))
                : null}
            </div>
            {renderOrderControls()}
          </div>
        </div>

        <div className="px-6 pb-6">
          {loading ? (
            renderOrderLoadingSkeleton()
          ) : viewMode === "card" ? (
            <div
              className={
                kanbanFilter === "all"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2"
                  : "h-full min-h-0 mt-2"
              }
            >
              {visibleKanbanColumns.map((column) => {
                const columnOrders = getOrdersByKanbanColumn(column.key);
                const isSingleFilteredColumn = kanbanFilter !== "all";

                return (
                  <section
                    key={column.key}
                    className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${
                      isSingleFilteredColumn
                        ? "h-full min-h-0 flex flex-col"
                        : ""
                    }`}
                  >
                    <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
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

                    <div
                      className={
                        isSingleFilteredColumn
                          ? columnOrders.length > 0
                            ? "flex-1 min-h-0 p-4 overflow-y-auto"
                            : "flex-1 min-h-0 p-4"
                          : "p-3 space-y-3 min-h-130"
                      }
                    >
                      {columnOrders.length > 0 ? (
                        isSingleFilteredColumn ? (
                          <div className="columns-1 md:columns-2 xl:columns-4 gap-4 [column-fill:balance]">
                            {columnOrders.map((order) => (
                              <div
                                key={order.id}
                                className="mb-4 break-inside-avoid"
                              >
                                {(() => {
                                  const pendingCorrection = loggedCorrectionByOrderId.get(order.id);

                                  return (
                                <OrderCard
                                  order={order}
                                  correctionLabel={correctionOrderIds.has(order.id) ? "Cancelled" : undefined}
                                  showDeleteButton={!pendingCorrection && canDeleteOrders}
                                  onDelete={handleDeleteOrder}
                                  enableFlipCard={!pendingCorrection && canUpdateOrders && canShowServeOrderButton(order)}
                                  showServeOrderAction={!pendingCorrection && canUpdateOrders && canShowServeOrderButton(order)}
                                  serveOrderLabel="Serve Order"
                                  disabledServeOrderLabel="Waiting for Kitchen"
                                  onMarkServed={handleMarkServed}
                                  customActions={
                                    pendingCorrection ? (
                                      <button
                                        type="button"
                                        disabled
                                        className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-500 cursor-not-allowed"
                                      >
                                        Waiting for manager review
                                      </button>
                                    ) : canUpdateOrders && order.status === "new" ? (
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
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        ) : (
                          columnOrders.map((order) => (
                            (() => {
                              const pendingCorrection = loggedCorrectionByOrderId.get(order.id);

                              return (
                            <OrderCard
                              key={order.id}
                              order={order}
                              correctionLabel={correctionOrderIds.has(order.id) ? "Cancelled" : undefined}
                              showDeleteButton={!pendingCorrection && canDeleteOrders}
                              onDelete={handleDeleteOrder}
                              enableFlipCard={!pendingCorrection && canUpdateOrders && canShowServeOrderButton(order)}
                              showServeOrderAction={!pendingCorrection && canUpdateOrders && canShowServeOrderButton(order)}
                              serveOrderLabel="Serve Order"
                              disabledServeOrderLabel="Waiting for Kitchen"
                              onMarkServed={handleMarkServed}
                              customActions={
                                pendingCorrection ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-500 cursor-not-allowed"
                                  >
                                    Waiting for manager review
                                  </button>
                                ) : canUpdateOrders && order.status === "new" ? (
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
                              );
                            })()
                          ))
                        )
                      ) : (
                        <div
                          className={
                            isSingleFilteredColumn
                              ? "h-full min-h-130 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-400 text-center px-4"
                              : "h-32 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-400 text-center px-4"
                          }
                        >
                          No orders in this status
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : viewMode === "table" ? (
            <div className="mt-2">
              <OrderTable
                orders={filteredOrders}
                onOrderClick={() => {}}
                correctionOrderIds={correctionOrderIds}
                pendingCorrectionByOrderId={new Map(
                  Array.from(loggedCorrectionByOrderId.entries()).map(([orderId, correction]) => [
                    orderId,
                    correction.id,
                  ]),
                )}
              />
            </div>
          ) : (
            <TableOrderMapView orders={filteredOrders} />
          )}
        </div>
      </div>
    </div>
  );
}
