"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { StandardModal } from "@/app/components/shared";
import { getCurrentUser } from "@/lib/utils/auth";
import { showError, showSuccess, showWarning } from "@/lib/services/errorHandling";
import {
  getOrderPhysicalStatus,
  isOrderEligibleForCorrectionStatus,
  type OrderCorrectionPhysicalStatus,
} from "@/lib/orders/orderCorrection";

type CorrectionType =
  | "wrong_order_input"
  | "customer_wrong_order"
  | "duplicate_order"
  | "payment_or_total_issue"
  | "other";

type PhysicalStatus = OrderCorrectionPhysicalStatus;

type CorrectionOrderItem = {
  id?: string;
  name?: string;
  product_name?: string;
  quantity?: number;
  price?: number;
  base_price?: number;
  total_price?: number;
  subtotal?: number;
  served?: boolean;
  kitchenStatus?: string;
  kitchen_status?: string;
};

export type CorrectionOrder = {
  id: string;
  customerName?: string;
  orderNumber?: string;
  orderType?: string;
  items?: CorrectionOrderItem[];
  total?: number;
  date?: string;
  time?: string;
  status: string;
  table?: string;
  tableNumber?: string;
  orderSource?: "pos" | "qr";
  createdAt?: string;
  createdByName?: string;
  createdByRole?: string;
  fulfillmentMethod?: "table_service" | "counter_pickup" | null;
  pickupCode?: string | null;
};

type OrderCorrectionModalProps = {
  isOpen: boolean;
  orders: CorrectionOrder[];
  initialOrderId?: string;
  onClose: () => void;
  onSubmitted: (orderId: string) => void;
};

const correctionTypeOptions: Array<{ value: CorrectionType; label: string; helper: string }> = [
  {
    value: "wrong_order_input",
    label: "Wrong POS input",
    helper: "Staff selected the wrong product, variant, quantity, or table.",
  },
  {
    value: "customer_wrong_order",
    label: "Customer QR mistake",
    helper: "Customer submitted the wrong QR order and staff needs an audit note.",
  },
  {
    value: "duplicate_order",
    label: "Duplicate order",
    helper: "Same order was entered twice or paid twice.",
  },
  {
    value: "payment_or_total_issue",
    label: "Payment or total issue",
    helper: "Payment, discount, tax, or total needs bookkeeping review.",
  },
  {
    value: "other",
    label: "Other correction",
    helper: "Operational issue that does not fit the common categories.",
  },
];

const physicalStatusOptions: Array<{ value: PhysicalStatus; label: string; helper: string }> = [
  {
    value: "not_processed",
    label: "Not processed yet",
    helper: "No product was made. No inventory or finance loss is recorded.",
  },
  {
    value: "processing_or_made",
    label: "Processing / already made",
    helper: "Product has been prepared. Keep inventory and financial impact as loss or review item.",
  },
  {
    value: "served",
    label: "Already served",
    helper: "Product reached customer. Do not reverse stock automatically.",
  },
];

const formatRupiah = (value: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const getFulfillmentLabel = (order: CorrectionOrder) => {
  if (order.fulfillmentMethod === "counter_pickup") return order.pickupCode ? `Pickup ${order.pickupCode}` : "Counter Pickup";
  const tableNumber = order.table || order.tableNumber;
  return tableNumber ? `Table ${tableNumber}` : order.orderType || "Order";
};

const buildSnapshot = (order: CorrectionOrder) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  customerName: order.customerName,
  status: order.status,
  total: order.total,
  orderSource: order.orderSource,
  fulfillment: getFulfillmentLabel(order),
  items: (order.items || []).map((item) => ({
    id: item.id,
    name: item.name || item.product_name,
    quantity: item.quantity,
    total: item.total_price ?? item.subtotal,
    served: item.served,
  })),
});

export default function OrderCorrectionModal({
  isOpen,
  orders,
  initialOrderId,
  onClose,
  onSubmitted,
}: OrderCorrectionModalProps) {
  const [orderId, setOrderId] = useState("");
  const [correctionType, setCorrectionType] = useState<CorrectionType>("wrong_order_input");
  const [physicalStatus, setPhysicalStatus] = useState<PhysicalStatus>("not_processed");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const orderSelectRef = useRef<HTMLSelectElement | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === orderId) ?? null,
    [orders, orderId],
  );
  const eligibleOrders = useMemo(
    () =>
      orders.filter((order) =>
        isOrderEligibleForCorrectionStatus(order, physicalStatus),
      ),
    [orders, physicalStatus],
  );

  useEffect(() => {
    if (!isOpen) return;
    const initialOrder = orders.find((order) => order.id === initialOrderId);
    const initialPhysicalStatus = initialOrder
      ? getOrderPhysicalStatus(initialOrder)
      : "not_processed";
    setPhysicalStatus(initialPhysicalStatus);
    setOrderId(initialOrder?.id ?? "");
    setCorrectionType("wrong_order_input");
    setNote("");
    setTouched({});
  }, [initialOrderId, isOpen, orders]);

  const getInputClassName = (field: string) => {
    const invalid = touched[field] && (field === "orderId" ? !orderId : field === "note" ? !note.trim() : false);
    return `w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition ${
      invalid ? "border-red-500" : "border-gray-900"
    }`;
  };

  const submit = async () => {
    if (!selectedOrder) {
      setTouched((current) => ({ ...current, orderId: true }));
      showError("Select the order that needs correction.");
      orderSelectRef.current?.focus();
      return;
    }
    if (!note.trim()) {
      setTouched((current) => ({ ...current, note: true }));
      showError("Correction note is required.");
      noteRef.current?.focus();
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser || !["staff", "manager", "owner"].includes(currentUser.role)) {
      showError("Staff, manager, or owner access required.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/orders/corrections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
          "x-user-name": currentUser.name,
          "x-user-role": currentUser.role,
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          correctionType,
          physicalStatus,
          note,
          beforeSnapshot: buildSnapshot(selectedOrder),
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        activityWarning?: string;
        reversal?: {
          restoredStockItems?: number;
          summary?: string[];
        } | null;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Correction request could not be saved.");
      }

      if (physicalStatus === "not_processed" && (result.reversal?.restoredStockItems ?? 0) === 0) {
        showWarning("Correction saved, but no inventory usage rows were found to reverse.");
      } else {
        showSuccess("Correction recorded. Waiting for manager review.");
      }
      if (result.activityWarning) {
        showWarning(`Activity log warning: ${result.activityWarning}`);
      }
      onSubmitted(selectedOrder.id);
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Correction request could not be saved.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPhysicalOption = physicalStatusOptions.find((option) => option.value === physicalStatus);

  return (
    <StandardModal
      isOpen={isOpen}
      title="Request Correction"
      description="Record order mistakes without deleting sales history. Completed orders remain auditable."
      maxWidthClassName="max-w-5xl"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            {submitting ? "Saving..." : "Save Correction"}
          </button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800">
              Product Status <span className="text-red-500">*</span>
            </label>
            <select
              value={physicalStatus}
              onChange={(event) => {
                const nextStatus = event.target.value as PhysicalStatus;
                setPhysicalStatus(nextStatus);
                setOrderId((currentOrderId) => {
                  const currentOrder = orders.find(
                    (order) => order.id === currentOrderId,
                  );
                  return currentOrder &&
                    isOrderEligibleForCorrectionStatus(currentOrder, nextStatus)
                    ? currentOrderId
                    : "";
                });
              }}
              className="w-full rounded-lg border border-gray-900 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition"
            >
              {physicalStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-5 text-gray-500">
              {selectedPhysicalOption?.helper}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800">
              Order <span className="text-red-500">*</span>
            </label>
            <select
              ref={orderSelectRef}
              value={orderId}
              onChange={(event) => {
                setOrderId(event.target.value);
                setTouched((current) => ({ ...current, orderId: true }));
              }}
              className={getInputClassName("orderId")}
            >
              <option value="">Select order</option>
              {eligibleOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber || order.id} - {order.customerName || "Customer"} - {order.status}
                </option>
              ))}
            </select>
            {eligibleOrders.length === 0 ? (
              <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
                No orders match this product status in the selected date range.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800">
              Correction Type <span className="text-red-500">*</span>
            </label>
            <select
              value={correctionType}
              onChange={(event) => setCorrectionType(event.target.value as CorrectionType)}
              className="w-full rounded-lg border border-gray-900 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition"
            >
              {correctionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-5 text-gray-500">
              {correctionTypeOptions.find((option) => option.value === correctionType)?.helper}
            </p>
          </div>

          {physicalStatus !== "not_processed" ? (
            <div className="rounded-xl border border-[#F6C99F] bg-[#FFF1E6] p-4">
              <div className="flex gap-3">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]" />
                <div>
                  <p className="text-sm font-bold text-[#8A3A0A]">Inventory and finance are not reversed automatically</p>
                  <p className="mt-1 text-sm leading-6 text-[#8A3A0A]">
                    If the drink or food was already made or served, the cost stays as operational loss. Use stock adjustment or bookkeeping review only when the original data was incorrect.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-800">
              Correction Note <span className="text-red-500">*</span>
            </label>
            <textarea
              ref={noteRef}
              value={note}
              onBlur={() => setTouched((current) => ({ ...current, note: true }))}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              className={getInputClassName("note")}
              placeholder="Example: Staff selected Cappuccino, but customer ordered Americano. Product already served, so record as staff mistake."
            />
          </div>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-bold text-gray-950">Order Preview</p>
          {selectedOrder ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xl font-bold text-gray-950">{selectedOrder.orderNumber}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedOrder.customerName || "Customer"} / {getFulfillmentLabel(selectedOrder)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedOrder.time || "-"} / {selectedOrder.date || "-"} / {selectedOrder.orderSource?.toUpperCase() || "POS"}
                </p>
              </div>

              <div className="space-y-2">
                {(selectedOrder.items || []).map((item, index) => (
                  <div key={item.id || `${item.name}-${index}`} className="flex items-start justify-between gap-4 text-sm">
                    <span className="font-medium text-gray-700">
                      {item.quantity || 0}x {item.name || item.product_name || "Item"}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatRupiah(item.total_price ?? item.subtotal ?? 0)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-white p-4">
                <p className="text-xs font-semibold text-gray-500">Total</p>
                <p className="mt-1 text-2xl font-bold text-green-700">{formatRupiah(selectedOrder.total)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold text-gray-500">Current Status</p>
                  <p className="mt-1 font-bold capitalize text-gray-950">{selectedOrder.status.replaceAll("-", " ")}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold text-gray-500">After Correction</p>
                  <p className="mt-1 font-bold text-gray-950">Completed</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Select an order to preview its details.</p>
          )}
        </aside>
      </div>
    </StandardModal>
  );
}
