"use client";

import { useMemo } from "react";
import type { Order } from "@/lib/types";
import StandardTable, {
  type StandardTableColumn,
} from "@/app/components/shared/StandardTable";
import OrderSourceBadge from "@/app/components/shared/OrderSourceBadge";
import PaymentMethodBadge from "@/app/components/shared/PaymentMethodBadge";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";

interface OrderTableProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  loading?: boolean;
  correctionOrderIds?: Set<string>;
  pendingCorrectionByOrderId?: Map<string, string>;
  reviewingCorrectionId?: string;
  onReviewCorrection?: (correctionId: string) => void;
}

type FulfillmentMethod = "table_service" | "counter_pickup";

type OrderWithFulfillment = Order & {
  fulfillmentMethod?: FulfillmentMethod | null;
  pickupCode?: string | null;
  fulfillment_method?: FulfillmentMethod | null;
  pickup_code?: string | null;
};

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatStatusLabel = (status: string) => {
  if (status === "new") return "New Order";
  if (status === "preparing") return "On Process";
  if (status === "partially-served") return "Partially Served";
  if (status === "served") return "Served";
  if (status === "completed") return "Completed";
  if (status === "cancelled" || status === "canceled") return "Cancelled";
  return status.replaceAll("-", " ");
};

const getStatusBadgeClass = (status: string) => {
  if (status === "new") return OWNER_SEMANTIC_TONES.info.badgeClass;
  if (status === "preparing") return OWNER_SEMANTIC_TONES.progress.badgeClass;
  if (status === "partially-served") return OWNER_SEMANTIC_TONES.warning.badgeClass;
  if (status === "served") return OWNER_SEMANTIC_TONES.success.badgeClass;
  if (status === "completed") return "border-black bg-white text-black font-semibold";
  if (status === "cancelled" || status === "canceled") return OWNER_SEMANTIC_TONES.danger.badgeClass;
  return OWNER_SEMANTIC_TONES.neutral.badgeClass;
};



const renderBadge = (label: string | number | null | undefined, className: string) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${className}`}>
    {label ?? "-"}
  </span>
);

export default function OrderTable({
  orders,
  onOrderClick,
  loading = false,
  correctionOrderIds,
  pendingCorrectionByOrderId,
  reviewingCorrectionId = "",
  onReviewCorrection,
}: OrderTableProps) {
  const columns = useMemo<Array<StandardTableColumn<Order>>>(
    () => [
      {
        key: "order",
        header: "Order",
        render: (order) => {
          const ord = order as OrderWithFulfillment;
          const tableNum = ord.tableNumber || ord.table;
          const isTableService = ord.fulfillmentMethod === "table_service" || ord.fulfillment_method === "table_service" || !!tableNum;

          return (
            <div className="min-w-0">
              {isTableService && tableNum ? (
                <div className="mb-1.5">
                  {renderBadge(`Table ${tableNum}`, OWNER_SEMANTIC_TONES.info.badgeClass)}
                </div>
              ) : null}
              <p className="truncate font-semibold text-gray-900">{order.orderNumber}</p>
              <p className="mt-1 text-xs text-gray-500">{order.orderType || "Order"}</p>
            </div>
          );
        },
        sortValue: (order) => order.orderNumber,
        className: "align-top",
      },
      {
        key: "customer",
        header: "Customer",
        render: (order) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{order.customerName}</p>
          </div>
        ),
        sortValue: (order) => order.customerName,
        className: "align-top",
      },
      {
        key: "time",
        header: "Time",
        render: (order) => (
          <div>
            <p className="font-semibold text-gray-900">{order.time}</p>
            <p className="mt-1 text-xs text-gray-500">
              {order.timeLabel || "Ordered"} · {order.date}
            </p>
          </div>
        ),
        sortValue: (order) => `${order.date} ${order.time}`,
        className: "align-top",
      },

      {
        key: "source",
        header: "Source",
        render: (order) =>
          order.orderSource ? (
            <OrderSourceBadge source={order.orderSource} size="sm" />
          ) : (
            <span className="text-gray-400">-</span>
          ),
        sortValue: (order) => order.orderSource ?? "",
        className: "align-top",
      },
      {
        key: "items",
        header: "Items",
        render: (order) => {
          const displayItems = order.items?.slice(0, 2) || [];
          const hasMore = (order.items?.length || 0) > 2;

          return (
            <div className="space-y-1">
              {displayItems.map((item, index) => (
                <p key={`${item.name}-${index}`} className="line-clamp-1 text-gray-700">
                  {item.quantity}x {item.name}
                </p>
              ))}
              {hasMore ? (
                <p className="text-xs font-semibold text-gray-500">
                  +{(order.items?.length ?? 0) - 2} more
                </p>
              ) : null}
            </div>
          );
        },
        sortValue: (order) => order.items?.length ?? 0,
        className: "align-top",
      },
      {
        key: "total",
        header: "Total",
        render: (order) => (
          <span className="font-bold text-gray-950">
            {formatRupiah(order.total ?? 0)}
          </span>
        ),
        sortValue: (order) => order.total ?? 0,
        className: "align-top",
      },
      {
        key: "payment",
        header: "Payment",
        render: (order) => {
          const method = order.paymentMethod ?? order.payment_method;
          const isCash = String(method ?? "").toLowerCase() === "cash";
          const changeAmt = order.changeAmount ?? order.change_amount ?? 0;

          return (
            <div className="space-y-1.5">
              <PaymentMethodBadge method={method} />
              {isCash && typeof (order.paymentAmount ?? order.payment_amount) === "number" ? (
                <p className="text-xs text-gray-500">
                  Paid {formatRupiah(order.paymentAmount ?? order.payment_amount ?? 0)}
                </p>
              ) : null}
              {changeAmt > 0 && typeof (order.changeAmount ?? order.change_amount) === "number" ? (
                <p className="text-xs text-gray-500">
                  Change {formatRupiah(order.changeAmount ?? order.change_amount ?? 0)}
                </p>
              ) : null}
            </div>
          );
        },
        sortValue: (order) =>
          String(order.paymentMethod ?? order.payment_method ?? ""),
        className: "align-top",
      },
      {
        key: "status",
        header: "Status",
        render: (order) => {
          const pendingCorrectionId = pendingCorrectionByOrderId?.get(order.id);
          const effectiveStatus = pendingCorrectionId ? "preparing" : order.status;

          return (
            <div className="flex flex-wrap gap-2">
              {renderBadge(formatStatusLabel(effectiveStatus), getStatusBadgeClass(effectiveStatus))}
              {correctionOrderIds?.has(order.id)
                ? renderBadge("Cancelled", OWNER_SEMANTIC_TONES.danger.badgeClass)
                : null}
            </div>
          );
        },
        sortValue: (order) => pendingCorrectionByOrderId?.has(order.id) ? "preparing" : order.status,
        className: "align-top",
      },
      {
        key: "detail",
        header: "Action",
        isAction: true,
        render: (order) => {
          const pendingCorrectionId = pendingCorrectionByOrderId?.get(order.id);

          if (pendingCorrectionId && onReviewCorrection) {
            return (
              <button
                type="button"
                onClick={() => onReviewCorrection(pendingCorrectionId)}
                disabled={reviewingCorrectionId === pendingCorrectionId}
                className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                {reviewingCorrectionId === pendingCorrectionId ? "Reviewing..." : "Mark Reviewed"}
              </button>
            );
          }

          if (pendingCorrectionId) {
            return (
              <span className="inline-flex rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-500">
                Waiting Review
              </span>
            );
          }

          return (
            <button
              type="button"
              onClick={() => onOrderClick(order)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-900"
            >
              View
            </button>
          );
        },
        className: "align-top",
      },
    ],
    [correctionOrderIds, onOrderClick, onReviewCorrection, pendingCorrectionByOrderId, reviewingCorrectionId],
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-950">Order Table</h2>
        <p className="mt-1 text-sm text-gray-500">
          Detailed order list for the selected status and date filter.
        </p>
      </div>
      <StandardTable
        columns={columns}
        data={orders}
        getRowKey={(order) => order.id}
        loading={loading}
        emptyLabel="No orders match the current filters."
        minWidthClassName="min-w-[1420px]"
      />
    </section>
  );
}
