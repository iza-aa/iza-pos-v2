"use client";

import StandardModal from "@/app/components/shared/StandardModal";
import OrderSourceBadge from "@/app/components/shared/OrderSourceBadge";
import PaymentMethodBadge from "@/app/components/shared/PaymentMethodBadge";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import type { Order, OrderItem } from "@/lib/types";
import {
  ShoppingBagIcon,
  ClockIcon,
  InformationCircleIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

type FulfillmentMethod = "table_service" | "counter_pickup";

type OrderWithFulfillment = Order & {
  fulfillmentMethod?: FulfillmentMethod | string | null;
  fulfillment_method?: FulfillmentMethod | string | null;
  pickupCode?: string | null;
  pickup_code?: string | null;
  timeLabel?: string;
  serviceCharge?: number;
};

interface OrderDetailModalProps {
  isOpen: boolean;
  order: OrderWithFulfillment | null;
  onClose: () => void;
}

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

const normalizeVariants = (variants: any): any[] => {
  if (!variants) return [];
  if (typeof variants === "string") {
    try {
      const parsed = JSON.parse(variants);
      return normalizeVariants(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(variants)) {
    return variants;
  }
  if (typeof variants === "object") {
    return Object.entries(variants).map(([key, value]) => ({
      optionName: key,
      value,
    }));
  }
  return [];
};

const getVariantText = (variants: any): string => {
  return normalizeVariants(variants)
    .map((v: any) => v.optionName ?? v.name ?? v.label ?? v.value)
    .filter(Boolean)
    .join(", ");
};

export default function OrderDetailModal({
  isOpen,
  order,
  onClose,
}: OrderDetailModalProps) {
  if (!order) return null;

  const orderItems = order.items ?? order.order_items ?? [];
  const status = order.status;
  const orderNumber = order.orderNumber ?? order.order_number ?? "-";
  const customerName = order.customerName ?? order.customer_name ?? "Guest";
  const orderType = order.orderType ?? order.order_type ?? "Dine in";
  const orderSource = order.orderSource ?? order.order_source;
  const tableNum = order.tableNumber ?? order.table_number ?? order.table;
  const paymentMethod = order.paymentMethod ?? order.payment_method;
  const paymentAmt = order.paymentAmount ?? order.payment_amount;
  const changeAmt = order.changeAmount ?? order.change_amount;

  const subtotal = order.subtotal ?? 0;
  const discount = order.discount ?? 0;
  const tax = order.tax ?? 0;
  const serviceCharge = order.serviceCharge ?? order.service_charge ?? 0;
  const total = order.total ?? order.total_amount ?? 0;

  const hasStaffLog = Boolean(order.createdByName || order.servedByNames?.length);

  return (
    <StandardModal
      isOpen={isOpen}
      title={`Order Details: ${orderNumber}`}
      description="Detailed receipt, billing breakdown, and staff operation logs."
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        
        {/* Left Column: Items and Logs */}
        <div className="space-y-4">
          
          {/* Card 1: Ordered Items */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-gray-100 p-2">
                <ShoppingBagIcon className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Ordered Items</h3>
                <p className="text-xs text-gray-500">Rincian menu yang dipesan.</p>
              </div>
            </div>

            <div className="overflow-hidden border border-gray-100 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5 text-center">Qty</th>
                    <th className="px-4 py-2.5 text-right">Price</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orderItems.map((item: OrderItem, index: number) => {
                    const variantsText = getVariantText(item.variants);
                    return (
                      <tr key={`${item.id}-${index}`} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          {variantsText ? (
                            <div className="text-xs text-gray-500 mt-0.5">{variantsText}</div>
                          ) : null}
                          {item.notes ? (
                            <div className="mt-1 text-xs text-amber-700 italic">
                              Note: {item.notes}
                            </div>
                          ) : null}
                          {item.assignedBaristaName ? (
                            <div className="text-2xs text-indigo-600 mt-1 font-medium">
                              Bar Handled by: {item.assignedBaristaName}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center align-top text-gray-900 font-semibold">{item.quantity}x</td>
                        <td className="px-4 py-3 text-right align-top text-gray-600">{formatRupiah(item.price)}</td>
                        <td className="px-4 py-3 text-right align-top text-gray-950 font-semibold">{formatRupiah(item.price * item.quantity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Activity Logs */}
          {hasStaffLog ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-gray-100 p-2">
                  <ClockIcon className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Activity Logs</h3>
                  <p className="text-xs text-gray-500">Staff operations trace.</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-gray-600">
                {order.createdByName ? (
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Created by</span>
                    <span className="font-semibold text-gray-800">
                      {order.createdByName} <span className="font-normal text-gray-500">({order.createdByRole ?? "Staff"})</span>
                    </span>
                  </div>
                ) : null}
                {order.servedByNames && order.servedByNames.length > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Served by</span>
                    <span className="font-semibold text-gray-800">{order.servedByNames.join(", ")}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Column: Summaries */}
        <div className="space-y-4">
          
          {/* Card 3: Order Summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-gray-100 p-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Order Summary</h3>
                <p className="text-xs text-gray-500">Fulfillment & customer info.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Status</span>
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-2xs font-semibold ${getStatusBadgeClass(status)}`}>
                  {formatStatusLabel(status)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Type</span>
                <span className="font-medium text-gray-900">{orderType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Source</span>
                {orderSource ? (
                  <OrderSourceBadge source={orderSource} size="sm" showLabel={true} />
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
              <div className="flex justify-between border-t border-gray-50 pt-2.5">
                <span className="text-gray-500 font-medium">Customer</span>
                <span className="font-medium text-gray-900">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Fulfillment</span>
                <span className="font-semibold text-gray-900">
                  {order.fulfillmentMethod === "counter_pickup" || order.fulfillment_method === "counter_pickup"
                    ? `Pickup (${order.pickupCode ?? order.pickup_code ?? "-"})`
                    : tableNum
                    ? `Table ${tableNum}`
                    : "Take Away"}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-50 pt-2.5">
                <span className="text-gray-500 font-medium">Date</span>
                <span className="font-medium text-gray-900">{order.date ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Time</span>
                <span className="font-medium text-gray-900">
                  {order.timeLabel ? `${order.timeLabel} ${order.time}` : order.time}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Billing & Payment */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-gray-100 p-2">
                <CreditCardIcon className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Billing & Payment</h3>
                <p className="text-xs text-gray-500">Method & financial summary.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-600 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Payment Method</span>
                <PaymentMethodBadge method={paymentMethod} />
              </div>

              {String(paymentMethod).toLowerCase() === "cash" || changeAmt ? (
                <div className="space-y-2 border-t border-gray-50 pt-2.5">
                  {typeof paymentAmt === "number" ? (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount Paid</span>
                      <span className="font-medium text-gray-900">{formatRupiah(paymentAmt)}</span>
                    </div>
                  ) : null}
                  {typeof changeAmt === "number" && changeAmt > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Change</span>
                      <span className="font-semibold text-green-700">{formatRupiah(changeAmt)}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs border border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">{formatRupiah(subtotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-medium">-{formatRupiah(discount)}</span>
                </div>
              ) : null}
              {serviceCharge > 0 ? (
                <div className="flex justify-between">
                  <span className="text-gray-500">Service Charge</span>
                  <span className="font-medium text-gray-900">{formatRupiah(serviceCharge)}</span>
                </div>
              ) : null}
              {tax > 0 ? (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax (PPN 11%)</span>
                  <span className="font-medium text-gray-900">{formatRupiah(tax)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm text-gray-950">
                <span>Total</span>
                <span>{formatRupiah(total)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-2 flex justify-end gap-2" slot="footer">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </StandardModal>
  );
}
