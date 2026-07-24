import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createQrOrderWithItems,
  QrOrderSubmissionError,
  type ExistingQrOrderRecord,
  type QrOrderRecord,
} from "@/lib/orders/qrOrderSubmission";

type QrOrderItem = {
  product_id?: unknown;
  product_name?: unknown;
  quantity?: unknown;
  base_price?: unknown;
  variants?: unknown;
  total_price?: unknown;
  kitchen_status?: unknown;
};

type QrOrderRequest = {
  order?: Record<string, unknown>;
  items?: QrOrderItem[];
};

type ValidatedQrOrder = {
  order: {
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
    discount: 0;
    total: number;
    payment_method: "QRIS";
    payment_status: "paid";
    notes: string | null;
  };
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    base_price: number;
    variants: unknown;
    total_price: number;
    kitchen_status: string;
  }>;
};

type OrderRow = QrOrderRecord & {
  order_items?: { count?: number }[] | null;
};

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function nullableString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (!isNonEmptyString(value)) return null;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : null;
}

function validateRequest(body: QrOrderRequest): ValidatedQrOrder | null {
  const order = body.order;
  const items = body.items;

  if (!order || !Array.isArray(items) || items.length === 0) {
    return null;
  }

  const orderNumber = nullableString(order.order_number, 100);
  const customerName = nullableString(order.customer_name, 120);
  const orderType = order.order_type === "Dine in" || order.order_type === "Take Away"
    ? order.order_type
    : null;
  const fulfillmentMethod =
    order.fulfillment_method === "table_service" ||
    order.fulfillment_method === "counter_pickup"
      ? order.fulfillment_method
      : null;

  if (
    !orderNumber ||
    !customerName ||
    !orderType ||
    !fulfillmentMethod ||
    !isPositiveNumber(order.subtotal) ||
    !isNonNegativeNumber(order.tax) ||
    !isPositiveNumber(order.total)
  ) {
    return null;
  }

  const validItems = items.map((item) => {
    const productId = nullableString(item.product_id, 100);
    const productName = nullableString(item.product_name, 200);
    const kitchenStatus = nullableString(item.kitchen_status, 50);

    if (
      !productId ||
      !productName ||
      !kitchenStatus ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      !isPositiveNumber(item.base_price) ||
      !isPositiveNumber(item.total_price)
    ) {
      return null;
    }

    return {
      product_id: productId,
      product_name: productName,
      quantity: item.quantity,
      base_price: item.base_price,
      variants: item.variants ?? null,
      total_price: item.total_price,
      kitchen_status: kitchenStatus,
    };
  });

  if (validItems.some((item) => item === null)) return null;

  return {
    order: {
      order_number: orderNumber,
      customer_name: customerName,
      customer_id: nullableString(order.customer_id, 100),
      table_number: nullableString(order.table_number, 50),
      table_id: null,
      table_session_id: nullableString(order.table_session_id, 100),
      order_source: "qr",
      order_type: orderType,
      fulfillment_method: fulfillmentMethod,
      pickup_code: nullableString(order.pickup_code, 100),
      status: "new",
      subtotal: order.subtotal,
      tax: order.tax,
      discount: 0,
      total: order.total,
      payment_method: "QRIS",
      payment_status: "paid",
      notes: nullableString(order.notes, 1000),
    },
    items: validItems.filter((item): item is NonNullable<typeof item> => item !== null),
  };
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return NextResponse.json(
        { success: false, error: "Cross-site request rejected." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as QrOrderRequest;
    const input = validateRequest(body);

    if (!input) {
      return NextResponse.json(
        { success: false, error: "Invalid QR order data." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();
    const orderNumber = input.order.order_number;
    const pickupCode = input.order.pickup_code;

    const order = await createQrOrderWithItems(
      {
        findByOrderNumber: async (): Promise<ExistingQrOrderRecord | null> => {
          const { data, error } = await supabase
            .from("orders")
            .select("id, order_number, pickup_code, order_items(count)")
            .eq("order_number", orderNumber)
            .maybeSingle();

          if (error) throw error;
          if (!data) return null;

          const row = data as OrderRow;
          return {
            id: row.id,
            order_number: row.order_number,
            pickup_code: row.pickup_code,
            itemCount: row.order_items?.[0]?.count ?? 0,
          };
        },
        createOrder: async () => {
          const { data, error } = await supabase
            .from("orders")
            .insert(input.order)
            .select("id, order_number, pickup_code")
            .single();

          if (error) throw error;
          return data as QrOrderRecord;
        },
        insertItems: async (orderId) => {
          const items = input.items.map((item) => ({ ...item, order_id: orderId }));
          const { error } = await supabase.from("order_items").insert(items);
          if (error) throw error;
        },
        deleteOrder: async (orderId) => {
          const { error: itemError } = await supabase
            .from("order_items")
            .delete()
            .eq("order_id", orderId);
          if (itemError) throw itemError;

          const { error: orderError } = await supabase
            .from("orders")
            .delete()
            .eq("id", orderId);
          if (orderError) throw orderError;
        },
      },
      {
        orderNumber,
        pickupCode,
        order: input.order,
        items: input.items,
      },
    );

    return NextResponse.json({ success: true, order });
  } catch (error) {
    if (error instanceof QrOrderSubmissionError) {
      console.error("QR order submission failed:", error.cause);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 },
      );
    }

    console.error("QR order API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create QR order. Please try again." },
      { status: 500 },
    );
  }
}
