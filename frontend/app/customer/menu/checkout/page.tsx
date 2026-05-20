"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/config/supabaseClient";
import {
  ArrowLeftIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";
import QRISPayment from "@/app/components/customer/menu/checkout/QRISPayment";
import CheckoutCartItem from "@/app/components/customer/menu/checkout/CheckoutCartItem";
import OrderSummary from "@/app/components/customer/menu/checkout/OrderSummary";
import LoadingScreen from "@/app/components/customer/LoadingScreen";
import {
  type CustomerAccountSession,
  getStoredCustomerAccount,
  saveCustomerAccount,
} from "@/lib/customer/customerAccount";
import {
  type CustomerTableSession,
  validateStoredCustomerTableSession,
} from "@/lib/customer/customerSession";

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

interface ProductCategory {
  name: string | null;
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

interface AwardPointsResult {
  success: boolean;
  message: string;
  customer_id: string | null;
  order_id: string | null;
  points_earned: number;
  balance_before: number;
  balance_after: number;
}

interface RewardRelation {
  name: string | null;
  reward_type: string | null;
  discount_type: string | null;
  discount_value: number | string | null;
  max_discount_amount: number | string | null;
  minimum_order_amount: number | string | null;
}

interface RewardRedemptionRow {
  id: string;
  customer_id: string;
  reward_id: string;
  points_spent: number;
  code: string;
  status: string;
  redeemed_at: string;
  expires_at: string;
  rewards?: RewardRelation | RewardRelation[] | null;
}

interface RewardRedemption {
  id: string;
  customer_id: string;
  reward_id: string;
  points_spent: number;
  code: string;
  status: string;
  redeemed_at: string;
  expires_at: string;
  reward_name: string;
  reward_type: string | null;
  discount_type: string | null;
  discount_value: number;
  max_discount_amount: number | null;
  minimum_order_amount: number;
}

interface UseRewardResult {
  success: boolean;
  message: string;
  redemption_id: string | null;
  order_id: string | null;
  reward_id: string | null;
  customer_id: string | null;
  status: string | null;
}

type OrderMode = "dine_in" | "takeaway";
type KitchenStatus = "pending" | "not_required";

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

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isBeverageText(value: string): boolean {
  return (
    value.includes("coffee") ||
    value.includes("non coffee") ||
    value.includes("drink") ||
    value.includes("beverage") ||
    value.includes("tea") ||
    value.includes("juice") ||
    value.includes("milk") ||
    value.includes("latte") ||
    value.includes("americano") ||
    value.includes("espresso") ||
    value.includes("cappuccino") ||
    value.includes("macchiato")
  );
}

function getKitchenStatusForCartItem(
  item: CartItem,
  product: ProductLookupRow | undefined,
): KitchenStatus {
  const category = getCategoryRelation(product?.category ?? product?.categories);
  const categoryName = normalizeText(category?.name);
  const productName = normalizeText(item.name);
  const combined = `${categoryName} ${productName}`;

  if (isBeverageText(combined)) {
    return "not_required";
  }

  return "pending";
}

function generatePickupCode(): string {
  const timestampPart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 900 + 100).toString();

  return `TA-${timestampPart}${randomPart}`;
}

function calculateEstimatedPoints(total: number): number {
  if (total < 10000) {
    return 0;
  }

  return Math.floor(total / 10000);
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getRewardRelation(
  relation: RewardRedemptionRow["rewards"],
): RewardRelation | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

function normalizeRewardRedemption(row: RewardRedemptionRow): RewardRedemption {
  const reward = getRewardRelation(row.rewards);

  return {
    id: row.id,
    customer_id: row.customer_id,
    reward_id: row.reward_id,
    points_spent: row.points_spent,
    code: row.code,
    status: row.status,
    redeemed_at: row.redeemed_at,
    expires_at: row.expires_at,
    reward_name: reward?.name ?? "Reward",
    reward_type: reward?.reward_type ?? null,
    discount_type: reward?.discount_type ?? null,
    discount_value: toNumber(reward?.discount_value),
    max_discount_amount:
      reward?.max_discount_amount === null || reward?.max_discount_amount === undefined
        ? null
        : toNumber(reward.max_discount_amount),
    minimum_order_amount: toNumber(reward?.minimum_order_amount),
  };
}

function calculateRewardDiscount(
  redemption: RewardRedemption | null,
  subtotal: number,
): number {
  if (!redemption) {
    return 0;
  }

  if (subtotal < redemption.minimum_order_amount) {
    return 0;
  }

  if (redemption.reward_type !== "discount") {
    return 0;
  }

  if (redemption.discount_type === "fixed") {
    return Math.min(redemption.discount_value, subtotal);
  }

  if (redemption.discount_type === "percentage") {
    const rawDiscount = Math.floor((subtotal * redemption.discount_value) / 100);
    const cappedDiscount = redemption.max_discount_amount
      ? Math.min(rawDiscount, redemption.max_discount_amount)
      : rawDiscount;

    return Math.min(cappedDiscount, subtotal);
  }

  return 0;
}

function formatCurrency(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function CustomerCheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableSession, setTableSession] = useState<CustomerTableSession | null>(null);
  const [customerAccount, setCustomerAccount] =
    useState<CustomerAccountSession | null>(null);
  const [availableRewards, setAvailableRewards] = useState<RewardRedemption[]>([]);
  const [selectedRewardId, setSelectedRewardId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showQRISPayment, setShowQRISPayment] = useState(false);
  const [pendingOrderNumber, setPendingOrderNumber] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState("");
  const [pendingPickupCode, setPendingPickupCode] = useState<string | null>(null);

  const orderMode: OrderMode = tableSession ? "dine_in" : "takeaway";
  const isTakeaway = orderMode === "takeaway";
  const isDineIn = orderMode === "dine_in";

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
      setCustomerAccount(account);
      setCart(storedCart);

      if (account) {
        const { data: redemptionData, error: redemptionError } = await supabase
          .from("customer_reward_redemptions")
          .select(
            "id, customer_id, reward_id, points_spent, code, status, redeemed_at, expires_at, rewards(name, reward_type, discount_type, discount_value, max_discount_amount, minimum_order_amount)",
          )
          .eq("customer_id", account.id)
          .eq("status", "available")
          .gt("expires_at", new Date().toISOString())
          .order("redeemed_at", { ascending: false });

        if (redemptionError) {
          console.warn("Failed to load available rewards:", redemptionError);
        } else {
          setAvailableRewards(
            ((redemptionData ?? []) as RewardRedemptionRow[]).map(
              normalizeRewardRedemption,
            ),
          );
        }
      }

      if (account?.name) {
        setCustomerName(account.name);
      } else if (savedName) {
        setCustomerName(savedName);
      }

      setTimeout(() => setInitializing(false), 200);
    };

    void initializeCheckout();

    return () => {
      isMounted = false;
    };
  }, [router]);

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

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const subtotal = useMemo(() => calculateTotal(), [cart]);

  const selectedReward = useMemo(() => {
    if (!selectedRewardId) {
      return null;
    }

    return availableRewards.find((reward) => reward.id === selectedRewardId) ?? null;
  }, [availableRewards, selectedRewardId]);

  const discountAmount = useMemo(() => {
    return calculateRewardDiscount(selectedReward, subtotal);
  }, [selectedReward, subtotal]);

  const finalTotal = Math.max(0, subtotal - discountAmount);

  const estimatedPoints = useMemo(() => {
    if (!customerAccount) {
      return 0;
    }

    return calculateEstimatedPoints(finalTotal);
  }, [customerAccount, finalTotal]);

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
      .select("id, category:categories(name)")
      .in("id", productIds);

    if (error) {
      console.warn("Product lookup failed. Falling back to item name detection.", error);
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

  const placeOrder = async () => {
    if (cart.length === 0) {
      alert("Your cart is empty");
      return;
    }

    if (isTakeaway && !customerName.trim()) {
      alert("Please enter your name for takeaway order");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderNumberPrefix = isDineIn ? "QR" : "TA";
      const orderNumber = `${orderNumberPrefix}-${Date.now()}`;
      const pickupCode = isTakeaway ? generatePickupCode() : null;
      const total = finalTotal;
      const discount = discountAmount;
      const cleanCustomerName =
        customerAccount?.name ||
        customerName.trim() ||
        createFallbackCustomerName(orderMode, tableSession);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            order_number: orderNumber,
            customer_id: customerAccount?.id ?? null,
            customer_name: cleanCustomerName,
            table_number: tableSession?.table_number ?? null,
            table_id: tableSession?.table_id ?? null,
            table_session_id: tableSession?.session_id ?? null,
            order_source: "qr",
            order_type: isDineIn ? "Dine in" : "Take Away",
            fulfillment_method: isDineIn ? "table_service" : "counter_pickup",
            pickup_code: pickupCode,
            status: "new",
            subtotal,
            tax: 0,
            discount,
            total,
            reward_redemption_id: selectedReward?.id ?? null,
            payment_method: "QRIS",
            payment_status: "pending",
            notes: notes.trim() || null,
          },
        ])
        .select("id, order_number, pickup_code")
        .single();

      if (orderError) {
        throw orderError;
      }

      if (!orderData) {
        throw new Error("Order was not created.");
      }

      const createdOrder = orderData as CreatedOrder;
      const productIds = cart.map((item) => item.productId);
      const productLookup = await fetchProductLookup(productIds);

      const orderItems = cart.map((item) => {
        const product = productLookup.find((productItem) => productItem.id === item.productId);
        const kitchenStatus = getKitchenStatusForCartItem(item, product);

        return {
          order_id: createdOrder.id,
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          base_price: item.price,
          variants: item.variants ?? null,
          total_price: item.price * item.quantity,
          kitchen_status: kitchenStatus,
        };
      });

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

      if (itemsError) {
        throw itemsError;
      }

      await updateTableSessionStats(createdOrder.id, total);

      setPendingOrderNumber(createdOrder.order_number);
      setPendingOrderId(createdOrder.id);
      setPendingPickupCode(createdOrder.pickup_code);
      setShowQRISPayment(true);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Order error:", JSON.stringify(error, null, 2), error);
      alert("Failed to create order. Please try again.");
      setIsSubmitting(false);
    }
  };

  const markSelectedRewardAsUsed = async (orderId: string) => {
    if (!selectedReward) {
      return;
    }

    const { data, error } = await supabase.rpc(
      "use_customer_reward_redemption_for_order",
      {
        p_redemption_id: selectedReward.id,
        p_order_id: orderId,
      },
    );

    if (error) {
      console.warn("Failed to mark reward as used:", error);
      return;
    }

    const useResult = Array.isArray(data)
      ? (data[0] as UseRewardResult | undefined)
      : (data as UseRewardResult | undefined);

    if (!useResult?.success) {
      console.warn("Reward was not marked as used:", useResult?.message);
    }
  };

  const awardPointsForPaidOrder = async (orderId: string) => {
    if (!customerAccount) {
      return;
    }

    const { data, error } = await supabase.rpc("award_customer_points_for_paid_order", {
      p_order_id: orderId,
    });

    if (error) {
      console.warn("Failed to award customer points:", error);
      return;
    }

    const awardResult = Array.isArray(data)
      ? (data[0] as AwardPointsResult | undefined)
      : (data as AwardPointsResult | undefined);

    if (!awardResult?.success) {
      console.warn("Customer points were not awarded:", awardResult?.message);
      return;
    }

    const updatedAccount: CustomerAccountSession = {
      ...customerAccount,
      loyalty_points: awardResult.balance_after,
    };

    setCustomerAccount(updatedAccount);
    saveCustomerAccount(updatedAccount);
  };

  const handlePaymentConfirmed = async () => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", pendingOrderId);

      if (error) {
        throw error;
      }

      await markSelectedRewardAsUsed(pendingOrderId);
      await awardPointsForPaidOrder(pendingOrderId);

      if (customerName.trim()) {
        localStorage.setItem("customer_name", customerName.trim());
      }

      localStorage.setItem("current_order_id", pendingOrderId);

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
      alert("Failed to confirm payment. Please try again.");
    }
  };

  if (initializing) {
    return <LoadingScreen title="Loading Checkout..." subtitle="Preparing your order" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg p-2 transition hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-600">Order Type</h2>

          {isDineIn ? (
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-bold text-white">
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

        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <GiftIcon className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {customerAccount ? "Member Rewards" : "Order as Guest"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                {customerAccount
                  ? estimatedPoints > 0
                    ? `You will earn ${estimatedPoints} points after payment.`
                    : "This order is below the minimum amount to earn points."
                  : "Login or register before checkout to collect points from this order."}
              </p>
            </div>
          </div>

          {customerAccount && availableRewards.length > 0 ? (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-600">
                Use Voucher
              </label>

              <select
                value={selectedRewardId}
                onChange={(event) => setSelectedRewardId(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              >
                <option value="">Do not use voucher</option>
                {availableRewards.map((reward) => (
                  <option
                    key={reward.id}
                    value={reward.id}
                    disabled={subtotal < reward.minimum_order_amount}
                  >
                    {reward.reward_name} • {reward.code}
                    {subtotal < reward.minimum_order_amount
                      ? ` • min ${formatCurrency(reward.minimum_order_amount)}`
                      : ""}
                  </option>
                ))}
              </select>

              {selectedReward ? (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedReward.reward_name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Voucher {selectedReward.code}
                  </p>
                  <p className="mt-2 text-sm font-bold text-emerald-700">
                    Discount {formatCurrency(discountAmount)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {!customerAccount ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push("/customer/login?redirect=/customer/menu/checkout")
                }
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:text-gray-950"
              >
                Login
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/customer/register?redirect=/customer/menu/checkout")
                }
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Register
              </button>
            </div>
          ) : null}
        </div>

        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <label className="mb-2 block text-sm font-semibold text-gray-600">
            {isTakeaway ? "Your Name" : "Your Name (Optional)"}
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder={isTakeaway ? "Required for pickup" : "Optional"}
            disabled={Boolean(customerAccount)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-600">Order Items</h2>
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

        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <label className="mb-2 block text-sm font-semibold text-gray-600">
            Special Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Any special requests?"
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {discountAmount > 0 ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-emerald-800">Reward Discount</span>
              <span className="font-bold text-emerald-800">
                -{formatCurrency(discountAmount)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-base">
              <span className="font-bold text-gray-900">Total after discount</span>
              <span className="font-bold text-gray-900">{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        ) : null}

        <OrderSummary subtotal={finalTotal} />
      </div>

      <div className="fixed bottom-16 left-0 right-0 border-t border-gray-200 bg-white p-4">
        <button
          type="button"
          onClick={placeOrder}
          disabled={!canSubmit}
          className="w-full rounded-lg bg-gray-900 py-3.5 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating Order..." : "Proceed to Payment"}
        </button>
      </div>

      {showQRISPayment && (
        <QRISPayment
          orderNumber={pendingOrderNumber}
          totalAmount={finalTotal}
          onPaymentConfirmed={handlePaymentConfirmed}
          onCancel={() => setShowQRISPayment(false)}
        />
      )}
    </div>
  );
}