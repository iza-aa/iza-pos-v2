"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/config/supabaseClient";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import QRISPayment from "@/app/components/customer/menu/checkout/QRISPayment";
import CheckoutCartItem from "@/app/components/customer/menu/checkout/CheckoutCartItem";
import { sendOrderNotification } from "@/app/actions/notifyAction";
import { broadcastNewOrder } from "@/lib/services/orders/orderRealtime";
import OrderSummary from "@/app/components/customer/menu/checkout/OrderSummary";
import LoadingScreen from "@/app/components/customer/LoadingScreen";
import {
  type CustomerTableSession,
  validateStoredCustomerTableSession,
} from "@/lib/customer/customerSession";
import { getStoredCustomerAccount } from "@/lib/customer/customerAccount";
import {
  calculateOrderFinancialTotals,
  defaultFinancialSettings,
} from "@/lib/services/bookkeeping/financialSettings";
import { recordOrderInventoryUsageWithBatches } from "@/lib/services/inventory/inventoryBatchService";
import type { BookkeepingFinancialSettings } from "@/lib/services/bookkeeping/bookkeepingTypes";
import { showError } from "@/lib/services/errorHandling";
import {
  getKitchenStatusForPreparationStation,
  getProductPreparationStation,
  type PreparationStation,
} from "@/lib/orders/stationRouting";

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variants?: unknown[];
}

interface StoredCartItem {
  id?: unknown;
  productId?: unknown;
  name?: unknown;
  price?: unknown;
  quantity?: unknown;
  image?: unknown;
  variants?: unknown;
}

interface CreatedOrder {
  id: string;
  order_number: string;
  pickup_code: string | null;
}

interface QrOrderPayload {
  order_number: string;
  customer_name: string;
  customer_id: string | null;
  table_number: string | null;
  table_id: null;
  table_session_id: string | null;
  order_source: "qr";
  order_type: "Dine in" | "Take Away";
  fulfillment_method: "table_service" | "counter_pickup";
  pickup_code: string | null;
  status: "new";
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: "QRIS";
  payment_status: "paid";
  notes: string | null;
}

interface QrOrderItemPayload {
  product_id: string;
  product_name: string;
  quantity: number;
  base_price: number;
  variants: unknown[] | null;
  total_price: number;
  kitchen_status: KitchenStatus;
}

interface ProductCategory {
  name: string | null;
  preparation_station?: PreparationStation | string | null;
}

interface ProductLookupRow {
  id: string;
  category?: ProductCategory | ProductCategory[] | null;
  categories?: ProductCategory | ProductCategory[] | null;
}

interface SessionStatsRow {
  order_ids: string[] | null;
  total_orders: number | null;
  total_revenue: number | string | null;
}

type OrderMode = "dine_in" | "takeaway";
type KitchenStatus = "pending" | "not_required";

function normalizeVariantForInventoryUsage(variant: unknown) {
  if (!variant || typeof variant !== "object") {
    return {};
  }

  const record = variant as { option_id?: unknown; optionId?: unknown };

  return {
    option_id: typeof record.option_id === "string" ? record.option_id : undefined,
    optionId: typeof record.optionId === "string" ? record.optionId : undefined,
  };
}

function normalizeCartItem(item: StoredCartItem): CartItem | null {
  if (
    typeof item.id !== "string" ||
    typeof item.productId !== "string" ||
    typeof item.name !== "string" ||
    typeof item.price !== "number" ||
    typeof item.quantity !== "number"
  ) {
    return null;
  }

  return {
    id: item.id,
    productId: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    image: typeof item.image === "string" ? item.image : "",
    variants: Array.isArray(item.variants) ? item.variants : undefined,
  };
}

function parseStoredCart(value: string | null): CartItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeCartItem(item as StoredCartItem))
      .filter((item): item is CartItem => item !== null);
  } catch {
    localStorage.removeItem("customer_cart");
    return [];
  }
}

function createFallbackCustomerName(
  mode: OrderMode,
  tableSession: CustomerTableSession | null,
): string {
  if (mode === "dine_in") {
    return `Guest ${tableSession?.table_number ?? "Table"}`;
  }

  return "Guest Take Away";
}

function getCategoryRelation(
  category: ProductCategory | ProductCategory[] | null | undefined,
): ProductCategory | null {
  if (Array.isArray(category)) {
    return category[0] ?? null;
  }

  return category ?? null;
}

function getKitchenStatusForCartItem(
  product: ProductLookupRow | undefined,
): KitchenStatus {
  const preparationStation = getProductPreparationStation({
    categories: getCategoryRelation(product?.category ?? product?.categories),
  });

  return getKitchenStatusForPreparationStation(preparationStation);
}

function generatePickupCode(): string {
  const timestampPart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 900 + 100).toString();

  return `TA-${timestampPart}${randomPart}`;
}

export default function CustomerCheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableSession, setTableSession] = useState<CustomerTableSession | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showQRISPayment, setShowQRISPayment] = useState(false);
  const [pendingOrderNumber, setPendingOrderNumber] = useState("");
  const [pendingPickupCode, setPendingPickupCode] = useState<string | null>(null);
  const [financialSettings, setFinancialSettings] =
    useState<BookkeepingFinancialSettings>(defaultFinancialSettings);

  const orderMode: OrderMode = tableSession ? "dine_in" : "takeaway";
  const isTakeaway = orderMode === "takeaway";
  const isDineIn = orderMode === "dine_in";
  const fulfillmentMethod = isDineIn ? "table_service" : "counter_pickup";

  useEffect(() => {
    let isMounted = true;

    const initializeCheckout = async () => {
      const storedCart = parseStoredCart(localStorage.getItem("customer_cart"));
      const validSession = await validateStoredCustomerTableSession();
      const account = getStoredCustomerAccount();
      const savedName = localStorage.getItem("customer_name");

      if (!isMounted) {
        return;
      }

      if (storedCart.length === 0) {
        router.replace("/customer/menu");
        return;
      }

      setTableSession(validSession);
      setCart(storedCart);

      if (savedName || account?.name) {
        setCustomerName(savedName ?? account?.name ?? "");
      }

      setTimeout(() => setInitializing(false), 200);
    };

    void initializeCheckout();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    const loadFinancialSettings = async () => {
      try {
        const response = await fetch("/api/bookkeeping/financial-settings", {
          cache: "no-store",
        });
        const result = (await response.json().catch(() => ({}))) as {
          settings?: BookkeepingFinancialSettings;
        };

        if (isMounted && result.settings) {
          setFinancialSettings(result.settings);
        }
      } catch (error) {
        console.warn("Failed to load financial settings, using defaults:", error);
      }
    };

    void loadFinancialSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateQuantity = (itemId: string, change: number) => {
    const updatedCart = cart
      .map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        return {
          ...item,
          quantity: item.quantity + change,
        };
      })
      .filter((item) => item.quantity > 0);

    setCart(updatedCart);

    if (updatedCart.length > 0) {
      localStorage.setItem("customer_cart", JSON.stringify(updatedCart));
    } else {
      localStorage.removeItem("customer_cart");
      router.replace("/customer/menu");
    }
  };

  const financialTotals = useMemo(
    () => calculateOrderFinancialTotals(
      cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      financialSettings,
      {
        orderType: isDineIn ? "Dine in" : "Take Away",
        fulfillmentMethod,
      },
    ),
    [cart, financialSettings, fulfillmentMethod, isDineIn],
  );

  const canSubmit = useMemo(() => {
    if (isSubmitting || cart.length === 0) {
      return false;
    }

    if (isTakeaway && !customerName.trim()) {
      return false;
    }

    return true;
  }, [cart.length, customerName, isSubmitting, isTakeaway]);

  const fetchProductLookup = async (productIds: string[]): Promise<ProductLookupRow[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("id, category:categories(name, preparation_station)")
      .in("id", productIds);

    if (error) {
      console.warn("Product lookup failed. Falling back to kitchen routing.", error);
      return [];
    }

    return (data ?? []) as ProductLookupRow[];
  };

  const updateTableSessionStats = async (orderId: string, total: number) => {
    if (!tableSession) {
      return;
    }

    const { data, error } = await supabase
      .from("table_sessions")
      .select("order_ids, total_orders, total_revenue")
      .eq("id", tableSession.session_id)
      .maybeSingle();

    if (error || !data) {
      console.warn("Failed to read table session stats:", error);
      return;
    }

    const currentStats = data as SessionStatsRow;
    const orderIds = currentStats.order_ids ?? [];
    const nextOrderIds = orderIds.includes(orderId) ? orderIds : [...orderIds, orderId];
    const totalOrders = currentStats.total_orders ?? 0;
    const totalRevenue = Number(currentStats.total_revenue ?? 0);

    const { error: updateError } = await supabase
      .from("table_sessions")
      .update({
        order_ids: nextOrderIds,
        total_orders: totalOrders + 1,
        total_revenue: totalRevenue + total,
      })
      .eq("id", tableSession.session_id);

    if (updateError) {
      console.warn("Failed to update table session stats:", updateError);
    }
  };

  const createOrderPayload = (
    orderNumber: string,
    cleanCustomerName: string,
    pickupCode: string | null,
    totals: {
      subtotal: number;
      serviceCharge: number;
      tax: number;
      total: number;
    },
  ): QrOrderPayload => {
    const account = getStoredCustomerAccount();
    const baseOrderPayload: QrOrderPayload = {
      order_number: orderNumber,
      customer_name: cleanCustomerName,
      customer_id: account?.id ?? null,
      table_number: tableSession?.table_number ?? null,

      /*
       * Penting:
       * Jangan kirim table_id dari checkout QR.
       * Di database kamu ada trigger/function yang kemungkinan membuat table_session
       * ketika orders.table_id terisi. Karena active session sudah dibuat saat scan QR,
       * trigger itu bisa bentrok dengan unique constraint:
       * table_sessions_one_active_per_table_idx.
       *
       * table_session_id tetap disimpan supaya order masih terhubung ke sesi meja.
       */
      table_id: null,
      table_session_id: tableSession?.session_id ?? null,

      order_source: "qr",
      order_type: isDineIn ? "Dine in" : "Take Away",
      fulfillment_method: fulfillmentMethod,
      pickup_code: pickupCode,
      status: "new",
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: 0,
      total: totals.total,
      payment_method: "QRIS",
      // Order is only created once the customer confirms payment (see
      // handlePaymentConfirmed), so it's always already paid by this point.
      payment_status: "paid",
      notes: notes.trim() || null,
    };

    return baseOrderPayload;
  };

  const submitOrderWithItems = async (
    order: QrOrderPayload,
    items: QrOrderItemPayload[],
  ): Promise<CreatedOrder> => {
    const response = await fetch("/api/customer/qr-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, items }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      order?: CreatedOrder;
    };

    if (!response.ok || !result.success || !result.order) {
      throw new Error(result.error || "Failed to create QR order.");
    }

    return result.order;
  };

  const placeOrder = () => {
    if (cart.length === 0) {
      showError("Your cart is empty");
      return;
    }

    if (isTakeaway && !customerName.trim()) {
      showError("Please enter your name for takeaway order");
      return;
    }

    // No order is created here. It's only inserted once the customer
    // actually confirms payment in handlePaymentConfirmed below — otherwise
    // an abandoned/incomplete QRIS payment would still show up as a live
    // order to staff and kitchen.
    const orderNumberPrefix = isDineIn ? "QR" : "TA";
    const orderNumber = `${orderNumberPrefix}-${Date.now()}`;
    const pickupCode = isTakeaway ? generatePickupCode() : null;

    setPendingOrderNumber(orderNumber);
    setPendingPickupCode(pickupCode);
    setShowQRISPayment(true);
  };

  const handlePaymentConfirmed = async () => {
    setIsSubmitting(true);

    try {
      const cleanCustomerName =
        customerName.trim() || createFallbackCustomerName(orderMode, tableSession);

      const productIds = cart.map((item) => item.productId);
      const productLookup = await fetchProductLookup(productIds);

      const orderItems: QrOrderItemPayload[] = cart.map((item) => {
        const product = productLookup.find((productItem) => productItem.id === item.productId);
        const kitchenStatus = getKitchenStatusForCartItem(product);

        return {
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          base_price: item.price,
          variants: item.variants ?? null,
          total_price: item.price * item.quantity,
          kitchen_status: kitchenStatus,
        };
      });

      const orderPayload = createOrderPayload(
        pendingOrderNumber,
        cleanCustomerName,
        pendingPickupCode,
        financialTotals,
      );
      const createdOrder = await submitOrderWithItems(orderPayload, orderItems);

      broadcastNewOrder(createdOrder.id);

      await updateTableSessionStats(createdOrder.id, financialTotals.total);

      // Trigger Web Push to Cashiers
      await sendOrderNotification(createdOrder.id, createdOrder.order_number, ["cashier", "owner", "manager"]);

      // Trigger Web Push to Kitchen
      await sendOrderNotification(createdOrder.id, createdOrder.order_number, ["kitchen", "owner", "manager"]);

      try {
        const inventoryUsageResult = await recordOrderInventoryUsageWithBatches({
          orderId: createdOrder.id,
          orderNumber: createdOrder.order_number,
          items: cart.map((item) => ({
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            variants: (item.variants || []).map(normalizeVariantForInventoryUsage),
          })),
          performedBy: null,
          performedByName: customerName.trim() || "Customer QR",
        });

        if (!inventoryUsageResult.batchEnabled) {
          console.warn("Inventory batch tracking skipped because batch SQL is not enabled.");
        }
      } catch (inventoryError) {
        console.warn("Failed to record inventory usage for QR order:", inventoryError);
      }

      if (customerName.trim()) {
        localStorage.setItem("customer_name", customerName.trim());
      }

      localStorage.setItem("current_order_id", createdOrder.id);

      if (pendingPickupCode) {
        localStorage.setItem("current_pickup_code", pendingPickupCode);
      }

      localStorage.removeItem("customer_cart");

      if (pendingPickupCode) {
        router.push(`/customer/track?code=${encodeURIComponent(pendingPickupCode)}`);
        return;
      }

      router.push("/customer/track");
    } catch (error) {
      console.error("Payment confirmation error:", JSON.stringify(error, null, 2), error);
      showError("Failed to confirm payment. Please try again.");
      setIsSubmitting(false);
      throw error;
    }
  };

  if (initializing) {
    return <LoadingScreen title="Loading Checkout..." subtitle="Preparing your order" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-600 mb-2">Order Type</h2>

          {isDineIn ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-gray-900 text-white text-sm font-bold rounded-lg">
                {tableSession?.table_number}
              </span>
              <span className="text-sm text-gray-600">
                {tableSession?.floor_name || "Dine-in order"}
              </span>
            </div>
          ) : (
            <div className="text-sm text-gray-700">
              Take away order. Name is required for pickup.
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            {isTakeaway ? "Your Name" : "Your Name (Optional)"}
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder={isTakeaway ? "Required for pickup" : "Optional"}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Order Items</h2>
          <div className="space-y-3">
            {cart.map((item) => (
              <CheckoutCartItem
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                disabled={isSubmitting}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Special Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Any special requests?"
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </div>

        <OrderSummary
          subtotal={financialTotals.subtotal}
          serviceCharge={financialTotals.serviceCharge}
          tax={financialTotals.tax}
          taxLabel={financialSettings.taxLabel}
          total={financialTotals.total}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={placeOrder}
          disabled={!canSubmit}
          className="w-full py-3.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating Order..." : "Proceed to Payment"}
        </button>
      </div>

      {showQRISPayment && (
        <QRISPayment
          orderNumber={pendingOrderNumber}
          totalAmount={financialTotals.total}
          onPaymentConfirmed={handlePaymentConfirmed}
          onCancel={() => setShowQRISPayment(false)}
        />
      )}
    </div>
  );
}
