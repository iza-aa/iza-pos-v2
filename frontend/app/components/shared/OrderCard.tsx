"use client";

import { Trash2, CheckCircle } from "lucide-react";
import { ReactNode, useState, useRef, useEffect } from "react";
import type { MouseEvent } from "react";
import { formatCurrency } from "@/lib/constants";
import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import type { Order } from "@/lib/types";

type VariantValue = string | number | boolean | null | undefined;

type VariantOption = {
  optionName?: string;
  name?: string;
  label?: string;
  value?: VariantValue;
};

type VariantRecord = Record<string, VariantValue>;

interface OrderCardProps {
  order: Order;
  onDelete?: (orderId: string) => void;
  showDeleteButton?: boolean;
  onServeItem?: (orderId: string, itemId: string) => void;
  onServeAll?: (orderId: string) => void;
  onMarkServed?: (orderId: string, itemIds: string[]) => void;
  showServeButtons?: boolean;
  enableFlipCard?: boolean;
  customActions?: ReactNode;
  showServeOrderAction?: boolean;
  serveOrderLabel?: string;
  disabledServeOrderLabel?: string;
  correctionLabel?: string;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isVariantOption = (value: unknown): value is VariantOption => {
  if (!isObjectRecord(value)) return false;

  return (
    "optionName" in value ||
    "name" in value ||
    "label" in value ||
    "value" in value
  );
};

const normalizeVariantValue = (value: unknown): VariantValue => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return value;
  }

  return String(value);
};

const normalizeVariants = (variants: unknown): VariantOption[] => {
  if (!variants) return [];

  if (typeof variants === "string") {
    try {
      const parsed: unknown = JSON.parse(variants);
      return normalizeVariants(parsed);
    } catch {
      return [];
    }
  }

  if (Array.isArray(variants)) {
    return variants.filter(isVariantOption).map((variant) => ({
      optionName:
        typeof variant.optionName === "string" ? variant.optionName : undefined,
      name: typeof variant.name === "string" ? variant.name : undefined,
      label: typeof variant.label === "string" ? variant.label : undefined,
      value: normalizeVariantValue(variant.value),
    }));
  }

  if (isVariantOption(variants)) {
    return [
      {
        optionName:
          typeof variants.optionName === "string"
            ? variants.optionName
            : undefined,
        name: typeof variants.name === "string" ? variants.name : undefined,
        label: typeof variants.label === "string" ? variants.label : undefined,
        value: normalizeVariantValue(variants.value),
      },
    ];
  }

  if (isObjectRecord(variants)) {
    const record: VariantRecord = Object.fromEntries(
      Object.entries(variants).map(([key, value]) => [
        key,
        normalizeVariantValue(value),
      ]),
    );

    return Object.entries(record).map(([key, value]) => ({
      optionName: key,
      value,
    }));
  }

  return [];
};

const getVariantLabel = (variant: VariantOption): string => {
  const label =
    variant.optionName ?? variant.name ?? variant.label ?? variant.value;

  return label === null || label === undefined ? "" : String(label);
};

const getVariantText = (variants: unknown): string => {
  return normalizeVariants(variants)
    .map(getVariantLabel)
    .filter(Boolean)
    .join(", ");
};

type FulfillmentMethod = "table_service" | "pager" | "counter_pickup";

type OrderWithFulfillment = Order & {
  fulfillment_method?: FulfillmentMethod | string | null;
  fulfillmentMethod?: FulfillmentMethod | string | null;
  pager_number?: string | null;
  pagerNumber?: string | null;
  pickup_code?: string | null;
  pickupCode?: string | null;
  table_number?: string | null;
  tableNumber?: string | null;
  order_number?: string | null;
};

type OrderWithPricing = Order & {
  subtotal?: number | string | null;
  subTotal?: number | string | null;
  discount?: number | string | null;
  reward_discount?: number | string | null;
  rewardDiscount?: number | string | null;
  total?: number | string | null;
  reward_redemption_id?: string | null;
  rewardRedemptionId?: string | null;
};

type FulfillmentInfo = {
  label: string;
  shortLabel: string;
  badgeClass: string;
};

type KitchenBadgeInfo = {
  label: string;
  badgeClass: string;
};

const getFulfillmentMethod = (order: OrderWithFulfillment): string | null => {
  return order.fulfillment_method ?? order.fulfillmentMethod ?? null;
};

const getFulfillmentInfo = (order: OrderWithFulfillment): FulfillmentInfo => {
  const method = getFulfillmentMethod(order);
  const tableNumber =
    order.table_number ?? order.tableNumber ?? order.table ?? null;
  const pagerNumber = order.pager_number ?? order.pagerNumber ?? null;
  const pickupCode = order.pickup_code ?? order.pickupCode ?? null;

  if (method === "table_service") {
    return {
      label: tableNumber ? `Table ${tableNumber}` : "Table Service",
      shortLabel: tableNumber ? `Table ${tableNumber}` : "Table Service",
      badgeClass: OWNER_SEMANTIC_TONES.info.badgeClass,
    };
  }

  if (method === "pager") {
    return {
      label: pagerNumber ? `Pager ${pagerNumber}` : "Pager",
      shortLabel: pagerNumber ? `Pager ${pagerNumber}` : "Pager",
      badgeClass: OWNER_SEMANTIC_TONES.premium.badgeClass,
    };
  }

  if (method === "counter_pickup") {
    return {
      label: pickupCode ? `Pickup ${pickupCode}` : "Pickup",
      shortLabel: pickupCode ? `Pickup ${pickupCode}` : "Pickup",
      badgeClass: OWNER_SEMANTIC_TONES.waiting.badgeClass,
    };
  }

  if (tableNumber && tableNumber !== "Takeaway") {
    return {
      label: `Table ${tableNumber}`,
      shortLabel: `Table ${tableNumber}`,
      badgeClass: OWNER_SEMANTIC_TONES.info.badgeClass,
    };
  }

  return {
    label: order.orderType || "Order",
    shortLabel: order.orderType || "Order",
    badgeClass: OWNER_SEMANTIC_TONES.neutral.badgeClass,
  };
};

const getKitchenBadgeInfo = (kitchenStatus?: string): KitchenBadgeInfo | null => {
  if (!kitchenStatus || kitchenStatus === "not_required") return null;

  if (kitchenStatus === "pending") {
    return {
      label: "Pending",
      badgeClass: OWNER_SEMANTIC_TONES.waiting.badgeClass,
    };
  }

  if (kitchenStatus === "cooking") {
    return {
      label: "Cooking",
      badgeClass: OWNER_SEMANTIC_TONES.progress.badgeClass,
    };
  }

  if (kitchenStatus === "ready") {
    return {
      label: "Ready",
      badgeClass: OWNER_SEMANTIC_TONES.success.badgeClass,
    };
  }

  return {
    label: kitchenStatus,
    badgeClass: OWNER_SEMANTIC_TONES.neutral.badgeClass,
  };
};

const normalizeMoneyValue = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const getOrderDiscount = (order: OrderWithPricing): number => {
  return normalizeMoneyValue(order.discount ?? order.reward_discount ?? order.rewardDiscount);
};

const getOrderSubtotal = (order: OrderWithPricing): number => {
  const explicitSubtotal = normalizeMoneyValue(order.subtotal ?? order.subTotal);

  if (explicitSubtotal > 0) {
    return explicitSubtotal;
  }

  const discount = getOrderDiscount(order);
  const total = normalizeMoneyValue(order.total);

  if (discount > 0) {
    return total + discount;
  }

  return total;
};

const getOrderTotal = (order: OrderWithPricing): number => {
  return normalizeMoneyValue(order.total);
};

const FulfillmentBadge = ({ info }: { info: FulfillmentInfo }) => {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${info.badgeClass}`}
    >
      {info.label}
    </span>
  );
};

const CorrectionBadge = ({ label }: { label: string }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${OWNER_SEMANTIC_TONES.danger.badgeClass}`}>
    {label}
  </span>
);

export default function OrderCard({
  order,
  onDelete,
  showDeleteButton = false,
  onServeItem,
  onServeAll,
  onMarkServed,
  showServeButtons = false,
  enableFlipCard = false,
  customActions,
  showServeOrderAction = false,
  serveOrderLabel = "Serve Order",
  disabledServeOrderLabel = "Waiting for Kitchen",
  correctionLabel,
}: OrderCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [cardHeight, setCardHeight] = useState<number | "auto">("auto");

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const fulfillmentInfo = getFulfillmentInfo(order as OrderWithFulfillment);
  const pricingOrder = order as OrderWithPricing;
  const subtotal = getOrderSubtotal(pricingOrder);
  const discount = getOrderDiscount(pricingOrder);
  const total = getOrderTotal(pricingOrder);
  const hasRewardDiscount = discount > 0;
  const isOrderCompleted = order.status === "completed" || order.status === "served";

  useEffect(() => {
    if (isFlipped && backRef.current) {
      setCardHeight(backRef.current.offsetHeight);
    } else if (!isFlipped && frontRef.current) {
      setCardHeight(frontRef.current.offsetHeight);
    }
  }, [isFlipped, selectedItems]);

  const renderKitchenBadge = (kitchenStatus?: string) => {
    const badge = getKitchenBadgeInfo(kitchenStatus);
    if (!badge) return null;

    return (
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.badgeClass}`}
      >
        {badge.label}
      </span>
    );
  };

  const renderVariants = (variants: unknown) => {
    const variantText = getVariantText(variants);

    if (!variantText) return null;

    return <div className="text-xs text-gray-500 ml-6">{variantText}</div>;
  };

  const renderStaffAuditTrail = () => {
    const hasCreatedBy = Boolean(order.createdByName);
    const hasServedBy = Boolean(order.servedByNames?.length);

    if (!hasCreatedBy && !hasServedBy) return null;

    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
        {hasCreatedBy && <span>Created by {order.createdByName}</span>}

        {hasCreatedBy && hasServedBy && (
          <span className="text-gray-300">•</span>
        )}

        {hasServedBy && (
          <span>Served by {order.servedByNames?.join(", ")}</span>
        )}
      </div>
    );
  };

  const renderOrderPaymentSummary = () => {
    if (!hasRewardDiscount) {
      return (
        <>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg sm:text-xl font-bold text-green-700">
            {formatCurrency(total)}
          </p>
        </>
      );
    }

    return (
      <div className="min-w-45 space-y-1 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2">
        <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
          <span>Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-emerald-700">
          <span>Reward Discount</span>
          <span className="font-semibold">-{formatCurrency(discount)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-emerald-100 pt-1.5">
          <span className="text-xs font-semibold text-gray-600">Total</span>
          <span className="text-lg sm:text-xl font-bold text-green-700">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    );
  };

  const renderOrderFooter = () => {
    return (
      <div className="pt-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          {renderOrderPaymentSummary()}
          {renderStaffAuditTrail()}
        </div>

        <div className="text-sm text-gray-600">
          Served: {servedCount}/{totalCount}
        </div>
      </div>
    );
  };

  const displayItems = (order.items || []).slice(0, 3);
  const hasMore = (order.items || []).length > 3;

  const servedCount = (order.items || []).filter((item) => item.served).length;
  const totalCount = (order.items || []).length;
  const allServed = servedCount === totalCount && totalCount > 0;

  const pendingItems = (order.items || []).filter((item) => !item.served);
  const servedItems = (order.items || []).filter((item) => item.served);

  const isItemReadyToServe = (item: (typeof pendingItems)[number]) => {
    return (
      !item.served &&
      (item.kitchenStatus === "ready" || item.kitchenStatus === "not_required")
    );
  };

  const readyToServeItems = pendingItems.filter(isItemReadyToServe);
  const hasReadyToServeItems = readyToServeItems.length > 0;
  const shouldShowServeOrderAction =
    enableFlipCard &&
    showServeOrderAction &&
    Boolean(onMarkServed) &&
    pendingItems.length > 0;

  const handleDelete = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDelete?.(order.id);
  };

  const handleServeItem = (
    e: MouseEvent<HTMLButtonElement>,
    itemId: string,
  ) => {
    e.stopPropagation();
    onServeItem?.(order.id, itemId);
  };

  const handleServeAll = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onServeAll?.(order.id);
  };

  const handleCheckboxChange = (itemId: string, isServed: boolean) => {
    if (isServed) return;

    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const handleMarkServedBatch = () => {
    if (selectedItems.length === 0 || !onMarkServed) return;

    onMarkServed(order.id, selectedItems);
    setSelectedItems([]);
    setIsFlipped(false);
  };

  const handleOpenServePanel = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!hasReadyToServeItems) return;

    setSelectedItems([]);
    setIsFlipped(true);
  };

  if (enableFlipCard) {
    return (
      <div
        className="perspective-1000 break-inside-avoid transition-all duration-500"
        style={{ height: cardHeight === "auto" ? "auto" : `${cardHeight}px` }}
      >
        <style jsx>{`
          .perspective-1000 {
            perspective: 1000px;
          }

          .rotate-y-180 {
            transform: rotateY(180deg);
          }

          .backface-hidden {
            backface-visibility: hidden;
          }
        `}</style>

        <div
          className={`relative w-full transition-all duration-500 ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            ref={frontRef}
            className={`bg-white rounded-xl shadow-md overflow-hidden backface-hidden transition-all duration-300 hover:shadow-xl border border-gray-200 ${
              isFlipped ? "invisible" : "visible"
            }`}
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="mb-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      {order.orderNumber}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-sm text-gray-600">
                      {order.customerName}
                    </p>

                    <FulfillmentBadge info={fulfillmentInfo} />
                    {correctionLabel ? <CorrectionBadge label={correctionLabel} /> : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {order.time}
                </span>

                <span>{order.date}</span>
              </div>

              <div className="space-y-2 mb-3">
                {displayItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start text-sm gap-2"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            item.served
                              ? "line-through text-gray-400"
                              : "text-gray-700"
                          }
                        >
                          {item.quantity}x {item.name}
                        </span>

                        {!isOrderCompleted && renderKitchenBadge(item.kitchenStatus)}
                      </div>

                      {renderVariants(item.variants)}
                    </div>

                    <span
                      className={
                        item.served
                          ? "line-through text-gray-400"
                          : "text-gray-600"
                      }
                    >
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                ))}

                {hasMore && (
                  <p className="text-xs text-gray-900 font-medium">
                    +{(order.items || []).length - 3} more items
                  </p>
                )}
              </div>

              {renderOrderFooter()}

              {shouldShowServeOrderAction && (
                <div className="mt-3 pt-3">
                  <button
                    type="button"
                    onClick={handleOpenServePanel}
                    disabled={!hasReadyToServeItems}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      hasReadyToServeItems
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {hasReadyToServeItems
                      ? serveOrderLabel
                      : disabledServeOrderLabel}
                  </button>
                </div>
              )}

              {customActions && (
                <div className="mt-3 pt-3 flex flex-col gap-2 [&_button]:w-full [&_button]:justify-center">
                  {customActions}
                </div>
              )}
            </div>
          </div>

          <div
            ref={backRef}
            className={`absolute top-0 left-0 w-full bg-white rounded-xl shadow-xl overflow-hidden flex flex-col ${
              isFlipped ? "visible" : "invisible"
            }`}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {order.orderNumber}
                </h3>

                <p className="text-xs text-gray-600 mt-0.5">
                  {order.customerName} • {fulfillmentInfo.label}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                  setSelectedItems([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 max-h-100">
              {pendingItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                    Pending Items ({pendingItems.length})
                  </h4>

                  <div className="space-y-1.5">
                    {pendingItems.map((item) => {
                      const isReady =
                        item.kitchenStatus === "ready" ||
                        item.kitchenStatus === "not_required";

                      return (
                        <label
                          key={item.id}
                          className={`flex items-start p-2.5 rounded-lg transition-colors ${
                            isReady
                              ? "bg-gray-50 hover:bg-gray-100 cursor-pointer"
                              : "bg-gray-100 cursor-not-allowed"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() =>
                              handleCheckboxChange(item.id, item.served)
                            }
                            disabled={!isReady}
                            className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          />

                          <div className="ml-2.5 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {item.quantity} × {item.name}
                            </p>

                            {getVariantText(item.variants) && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {getVariantText(item.variants)}
                              </p>
                            )}

                            {!isOrderCompleted && renderKitchenBadge(item.kitchenStatus)}
                          </div>

                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(item.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {servedItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                    Served Items ({servedItems.length})
                  </h4>

                  <div className="space-y-1.5">
                    {servedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center p-2.5 bg-green-50 rounded-lg opacity-75"
                      >
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>

                        <div className="ml-2.5 flex-1">
                          <p className="text-sm font-medium text-gray-700">
                            {item.quantity} × {item.name}
                          </p>

                          {item.servedAt && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Served at {item.servedAt}
                            </p>
                          )}
                        </div>

                        <span className="text-sm font-semibold text-gray-700">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {pendingItems.length > 0 && (
              <div className="bg-gray-50 px-4 py-3  flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  {selectedItems.length > 0 ? (
                    <span className="font-semibold text-green-600">
                      {selectedItems.length} item
                      {selectedItems.length > 1 ? "s" : ""} selected
                    </span>
                  ) : (
                    <span>Select items to mark</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkServedBatch();
                  }}
                  disabled={selectedItems.length === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all ${
                    selectedItems.length > 0
                      ? "bg-green-600 hover:bg-green-700 shadow-md"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  Mark as Served
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="break-inside-avoid">
      <div className="relative bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl border border-gray-200">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="mb-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  {order.orderNumber}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">{order.customerName}</p>
                <FulfillmentBadge info={fulfillmentInfo} />
                {correctionLabel ? <CorrectionBadge label={correctionLabel} /> : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showDeleteButton && onDelete && !isOrderCompleted && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg p-2 text-rose-700 transition-colors hover:bg-rose-50"
                  title="Delete Order"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {showServeButtons && onServeAll && !allServed && (
                <button
                  type="button"
                  onClick={handleServeAll}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${OWNER_SEMANTIC_TONES.success.badgeClass}`}
                  title="Serve All Items"
                >
                  Serve All
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {order.time}
            </span>

            <span>{order.date}</span>
          </div>

          <div className="space-y-2 mb-3">
            {displayItems.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-start text-sm gap-2"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        item.served
                          ? "line-through text-gray-400"
                          : "text-gray-700"
                      }
                    >
                      {item.quantity}x {item.name}
                    </span>

                    {!isOrderCompleted && renderKitchenBadge(item.kitchenStatus)}
                  </div>

                  {renderVariants(item.variants)}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={
                      item.served
                        ? "line-through text-gray-400"
                        : "text-gray-600"
                    }
                  >
                    {formatCurrency(item.price)}
                  </span>

                  {showServeButtons && onServeItem && !item.served && (
                    <button
                      type="button"
                      onClick={(e) => handleServeItem(e, item.id)}
                      className="rounded p-1 text-emerald-700 transition-colors hover:bg-emerald-50"
                      title="Mark as Served"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {hasMore && (
              <p className="text-xs text-gray-900 font-medium">
                +{(order.items || []).length - 3} more items
              </p>
            )}
          </div>

          {renderOrderFooter()}

          {customActions && (
            <div className="pt-3 flex flex-col gap-2 [&_button]:w-full [&_button]:justify-center">
              {customActions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
