import { NextRequest, NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";
import {
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

type CorrectionRequest = {
  action?: "create" | "review";
  correctionId?: string;
  orderId?: string;
  correctionType?: CorrectionType;
  physicalStatus?: PhysicalStatus;
  note?: string | null;
  reviewNote?: string | null;
  beforeSnapshot?: unknown;
};

const CORRECTION_TYPES = new Set<CorrectionType>([
  "wrong_order_input",
  "customer_wrong_order",
  "duplicate_order",
  "payment_or_total_issue",
  "other",
]);

const PHYSICAL_STATUSES = new Set<PhysicalStatus>([
  "not_processed",
  "processing_or_made",
  "served",
]);

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Staff",
  role: request.headers.get("x-user-role") ?? "",
});

const requireOrderStaff = (request: NextRequest) => {
  const requester = getRequester(request);
  if (!requester.id || !["staff", "manager", "owner"].includes(requester.role)) return null;
  return requester;
};

const getPolicies = (physicalStatus: PhysicalStatus) => {
  if (physicalStatus === "not_processed") {
    return {
      inventory_policy: "none",
      ledger_policy: "none",
    };
  }

  return {
    inventory_policy: "no_reversal_loss_recorded",
    ledger_policy: "no_reversal_loss_recorded",
  };
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const describeUnknownError = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [maybeError.message, maybeError.details, maybeError.hint, maybeError.code]
      .filter((part): part is string | number => typeof part === "string" || typeof part === "number")
      .map(String)
      .filter(Boolean);

    if (parts.length > 0) return parts.join(" ");
  }

  return fallback;
};

const isMissingBatchTableError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === "42P01" ||
    maybeError.message?.toLowerCase().includes("inventory_batch_movements") ||
    maybeError.message?.toLowerCase().includes("inventory_batches")
  );
};

async function reverseUnprocessedOrderInventory(input: {
  supabase: ReturnType<typeof createBookkeepingSupabaseClient>;
  orderId: string;
  orderNumber?: string | null;
  performedByName: string;
}) {
  const { supabase, orderId, orderNumber, performedByName } = input;

  const { data: usageTransactions, error: usageError } = await supabase
    .from("usage_transactions")
    .select("id")
    .eq("order_id", orderId);

  if (usageError) throw usageError;

  const transactionIds = (usageTransactions || [])
    .map((transaction) => transaction.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (!transactionIds.length) {
    return {
      restoredStockItems: 0,
      restoredBatchMovements: 0,
      adjustmentTransactionId: null as string | null,
      summary: ["No inventory usage rows were found for reversal."],
    };
  }

  const { data: usageDetails, error: detailError } = await supabase
    .from("usage_transaction_details")
    .select("id, usage_transaction_id, inventory_item_id, ingredient_name, quantity_used, unit, previous_stock, new_stock")
    .in("usage_transaction_id", transactionIds);

  if (detailError) throw detailError;

  const lines = (usageDetails || [])
    .map((detail) => ({
      detailId: detail.id as string | null,
      transactionId: detail.usage_transaction_id as string,
      inventoryItemId: detail.inventory_item_id as string,
      ingredientName: String(detail.ingredient_name || "Inventory item"),
      quantity: Math.abs(toNumber(detail.quantity_used)),
      unit: String(detail.unit || ""),
      previousStock:
        detail.previous_stock === null || detail.previous_stock === undefined
          ? null
          : toNumber(detail.previous_stock),
      newStock:
        detail.new_stock === null || detail.new_stock === undefined
          ? null
          : toNumber(detail.new_stock),
    }))
    .filter((line) => line.inventoryItemId && line.quantity > 0);

  if (!lines.length) {
    return {
      restoredStockItems: 0,
      restoredBatchMovements: 0,
      adjustmentTransactionId: null as string | null,
      summary: ["No inventory usage detail rows were found for reversal."],
    };
  }

  let restoredBatchMovements = 0;
  const { data: existingReversals, error: reversalCheckError } = await supabase
    .from("inventory_batch_movements")
    .select("id")
    .in("usage_transaction_id", transactionIds)
    .eq("movement_type", "reversal")
    .limit(1);

  const alreadyReversed = !reversalCheckError && (existingReversals || []).length > 0;

  if (reversalCheckError && !isMissingBatchTableError(reversalCheckError)) {
    throw reversalCheckError;
  }

  if (!alreadyReversed && !isMissingBatchTableError(reversalCheckError)) {
    const { data: saleMovements, error: movementsError } = await supabase
      .from("inventory_batch_movements")
      .select("id, batch_id, inventory_item_id, usage_transaction_id, usage_transaction_detail_id, quantity, quantity_before, quantity_after, unit")
      .in("usage_transaction_id", transactionIds)
      .eq("movement_type", "sale");

    if (movementsError && !isMissingBatchTableError(movementsError)) {
      throw movementsError;
    }

    if (!movementsError) {
      for (const movement of saleMovements || []) {
        const quantity = toNumber(movement.quantity);
        if (quantity <= 0) continue;

        const { data: batch, error: batchError } = await supabase
          .from("inventory_batches")
          .select("id, quantity_received, quantity_remaining")
          .eq("id", movement.batch_id)
          .maybeSingle();

        if (batchError) {
          if (isMissingBatchTableError(batchError)) break;
          throw batchError;
        }

        if (!batch) continue;

        const before = toNumber(batch.quantity_remaining);
        const after = Math.min(toNumber(batch.quantity_received), before + quantity);

        const { error: batchUpdateError } = await supabase
          .from("inventory_batches")
          .update({ quantity_remaining: after })
          .eq("id", movement.batch_id);

        if (batchUpdateError) throw batchUpdateError;

        const { error: movementInsertError } = await supabase
          .from("inventory_batch_movements")
          .insert({
            batch_id: movement.batch_id,
            inventory_item_id: movement.inventory_item_id,
            usage_transaction_id: movement.usage_transaction_id || null,
            usage_transaction_detail_id: movement.usage_transaction_detail_id || null,
            movement_type: "reversal",
            quantity,
            quantity_before: before,
            quantity_after: after,
            unit: movement.unit || null,
            notes: `Correction reversal for unprocessed order ${orderNumber || orderId}`,
            created_by_name: performedByName,
          });

        if (movementInsertError) throw movementInsertError;
        restoredBatchMovements += 1;
      }
    }
  }

  let restoredStockItems = 0;
  const summary: string[] = [];
  for (const line of lines) {
    if (line.previousStock === null || line.previousStock === undefined) continue;

    const { error: stockError } = await supabase
      .from("inventory_items")
      .update({ current_stock: line.previousStock })
      .eq("id", line.inventoryItemId);

    if (stockError) throw stockError;
    restoredStockItems += 1;

    const unit = line.unit ? ` ${line.unit}` : "";
    summary.push(
      `${line.ingredientName} restored by ${line.quantity}${unit} (${line.newStock ?? "-"} -> ${line.previousStock}${unit})`,
    );
  }

  const { data: adjustmentTransaction, error: adjustmentError } = await supabase
    .from("usage_transactions")
    .insert({
      transaction_type: "adjustment",
      order_id: orderId,
      product_name: orderNumber || "Order correction",
      notes: `Correction reversal for unprocessed order ${orderNumber || orderId}`,
      performed_by: null,
      performed_by_name: performedByName,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (adjustmentError) throw adjustmentError;

  const adjustmentDetails = lines
    .filter((line) => line.previousStock !== null && line.previousStock !== undefined)
    .map((line) => ({
      usage_transaction_id: adjustmentTransaction.id,
      inventory_item_id: line.inventoryItemId,
      ingredient_name: line.ingredientName,
      quantity_used: line.quantity,
      unit: line.unit,
      previous_stock: line.newStock,
      new_stock: line.previousStock,
    }));

  if (adjustmentDetails.length > 0) {
    const { error: adjustmentDetailError } = await supabase
      .from("usage_transaction_details")
      .insert(adjustmentDetails);

    if (adjustmentDetailError) throw adjustmentDetailError;
  }

  return {
    restoredStockItems,
    restoredBatchMovements,
    adjustmentTransactionId: adjustmentTransaction.id as string,
    summary,
  };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getDateRange = (request: NextRequest) => {
  const startDate = request.nextUrl.searchParams.get("startDate") ?? "";
  const endDate = request.nextUrl.searchParams.get("endDate") ?? "";
  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate) || startDate > endDate) {
    return null;
  }
  return { startDate, endDate };
};

export async function GET(request: NextRequest) {
  const requester = requireOrderStaff(request);
  if (!requester) {
    return NextResponse.json({ error: "Staff, manager, or owner access required." }, { status: 403 });
  }

  const dateRange = getDateRange(request);
  if (!dateRange) {
    return NextResponse.json({ error: "Valid startDate and endDate are required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    const { data, error } = await supabase
      .from("order_corrections")
      .select("*")
      .gte("created_at", `${dateRange.startDate}T00:00:00+07:00`)
      .lte("created_at", `${dateRange.endDate}T23:59:59+07:00`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      data: (data || []).map((row) => ({
        id: row.id,
        orderId: row.order_id,
        orderNumber: row.order_number,
        requestedByName: row.requested_by_name,
        requestedByRole: row.requested_by_role,
        correctionType: row.correction_type,
        physicalStatus: row.physical_status,
        status: row.status,
        note: row.note,
        inventoryPolicy: row.inventory_policy,
        ledgerPolicy: row.ledger_policy,
        createdAt: row.created_at,
        reviewedByName: row.reviewed_by_name,
        reviewedAt: row.reviewed_at,
        reviewNote: row.review_note,
      })),
    });
  } catch (error) {
    console.error("Failed to load order corrections:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Order corrections could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const requester = requireOrderStaff(request);
  if (!requester) {
    return NextResponse.json({ error: "Staff, manager, or owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as CorrectionRequest;
  const action = body.action ?? "create";

  if (action === "review") {
    const correctionId = String(body.correctionId ?? "").trim();
    if (!correctionId) {
      return NextResponse.json({ error: "Correction id is required." }, { status: 400 });
    }
    if (requester.role !== "manager" && requester.role !== "owner") {
      return NextResponse.json({ error: "Manager or owner access required." }, { status: 403 });
    }

    try {
      const supabase = createBookkeepingSupabaseClient();
      const { data: existingCorrection, error: existingError } = await supabase
        .from("order_corrections")
        .select("id, order_id")
        .eq("id", correctionId)
        .maybeSingle();

      if (existingError) throw existingError;
      if (!existingCorrection) {
        return NextResponse.json({ error: "Correction request was not found." }, { status: 404 });
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("order_corrections")
        .update({
          status: "reviewed",
          reviewed_by: requester.id,
          reviewed_by_name: requester.name,
          reviewed_by_role: requester.role,
          reviewed_at: now,
          review_note: String(body.reviewNote ?? "").trim() || null,
        })
        .eq("id", correctionId)
        .select("*")
        .single();

      if (error) throw error;

      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          status: "completed",
          completed_at: now,
        })
        .eq("id", existingCorrection.order_id);

      if (orderUpdateError) throw orderUpdateError;

      const { error: exceptionUpdateError } = await supabase
        .from("bookkeeping_exceptions")
        .update({
          status: "acknowledged",
          updated_at: now,
        })
        .eq("source_id", correctionId);

      if (exceptionUpdateError) {
        console.warn("Correction reviewed, but bookkeeping review item could not be acknowledged:", exceptionUpdateError);
      }

      const { error: activityError } = await supabase.from("activity_logs").insert({
        user_id: requester.id,
        user_name: requester.name,
        user_role: requester.role,
        action: "UPDATE",
        action_category: "SALES",
        action_description: `Reviewed correction for ${data.order_number ?? "order"}`,
        resource_type: "order",
        resource_id: data.order_id,
        resource_name: data.order_number ?? data.order_id,
        severity: data.physical_status === "not_processed" ? "info" : "warning",
        previous_value: {
          correctionStatus: "logged",
          orderStatus: "preparing",
        },
        new_value: {
          correctionStatus: "reviewed",
          orderStatus: "completed",
        },
        changes_summary: [
          `Correction reviewed by ${requester.name}`,
          `Order moved from preparing to completed`,
          data.physical_status === "not_processed"
            ? "Inventory reversal was handled when the correction was requested"
            : "No automatic inventory or ledger reversal; loss remains recorded",
        ],
        notes: data.review_note,
        tags: ["order", "correction", "review"],
        is_reversible: false,
        ip_address: "0.0.0.0",
        device_info: "Server API",
        session_id: `order-correction-${requester.id}`,
      });

      if (activityError) {
        console.warn("Correction reviewed, but activity log could not be written:", activityError);
      }

      return NextResponse.json({
        success: true,
        correction: data,
        activityLogged: !activityError,
        activityWarning: activityError?.message,
      });
    } catch (error) {
      console.error("Failed to review order correction:", error);
      return NextResponse.json(
        { error: describeUnknownError(error, "Order correction could not be reviewed.") },
        { status: 500 },
      );
    }
  }

  const orderId = String(body.orderId ?? "").trim();
  const correctionType = body.correctionType;
  const physicalStatus = body.physicalStatus;
  const note = String(body.note ?? "").trim();

  if (!orderId) {
    return NextResponse.json({ error: "Order is required." }, { status: 400 });
  }

  if (!correctionType || !CORRECTION_TYPES.has(correctionType)) {
    return NextResponse.json({ error: "Correction type is required." }, { status: 400 });
  }

  if (!physicalStatus || !PHYSICAL_STATUSES.has(physicalStatus)) {
    return NextResponse.json({ error: "Physical status is required." }, { status: 400 });
  }

  if (!note) {
    return NextResponse.json({ error: "Correction note is required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, created_at, completed_at, order_items(served, kitchen_status)",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: "Order was not found." }, { status: 404 });

    if (
      !isOrderEligibleForCorrectionStatus(
        {
          status: order.status,
          order_items: order.order_items,
        },
        physicalStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The selected order does not match the reported product status. Refresh the order list and choose a matching order.",
        },
        { status: 409 },
      );
    }

    const { data: existingCorrection, error: existingCorrectionError } = await supabase
      .from("order_corrections")
      .select("id, status")
      .eq("order_id", order.id)
      .limit(1);

    if (existingCorrectionError) throw existingCorrectionError;
    if ((existingCorrection || []).length > 0) {
      return NextResponse.json(
        { error: "This order already has a correction request." },
        { status: 409 },
      );
    }

    const policies = getPolicies(physicalStatus);
    const now = new Date().toISOString();
    let reversalResult: Awaited<ReturnType<typeof reverseUnprocessedOrderInventory>> | null = null;

    if (physicalStatus === "not_processed") {
      reversalResult = await reverseUnprocessedOrderInventory({
        supabase,
        orderId: order.id,
        orderNumber: order.order_number,
        performedByName: `${requester.name} - ${requester.role}`,
      });
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "preparing",
      })
      .eq("id", order.id)
      .select("id, status, completed_at")
      .single();

    if (updateError) throw updateError;

    const { data: correction, error: correctionError } = await supabase
      .from("order_corrections")
      .insert({
        order_id: order.id,
        order_number: order.order_number ?? null,
        requested_by: requester.id,
        requested_by_name: requester.name,
        requested_by_role: requester.role,
        correction_type: correctionType,
        physical_status: physicalStatus,
        note,
        before_snapshot: body.beforeSnapshot ?? null,
        ...policies,
      })
      .select("*")
      .single();

    if (correctionError) throw correctionError;

    const businessDate = String(order.created_at ?? now).slice(0, 10);
    const { error: exceptionError } = await supabase.from("bookkeeping_exceptions").insert({
      business_date: businessDate,
      severity: physicalStatus === "not_processed" ? "medium" : "high",
      type: "Order Correction Request",
      description: `Order ${order.order_number ?? order.id} correction requested by ${requester.name}. ${note}`,
      source_table: "order_corrections",
      source_id: correction.id,
      suggested_fix:
        physicalStatus === "not_processed"
          ? "Manager should confirm the order was not produced, then owner can resolve this review item."
          : "Manager should confirm the item was made or served. Treat cost as operational loss unless the original data is wrong.",
      status: "open",
      created_at: now,
      updated_at: now,
    });

    if (exceptionError) {
      console.warn("Order correction was saved, but bookkeeping review item could not be written:", exceptionError);
    }

    const { error: activityError } = await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: requester.role,
      action: "UPDATE",
      action_category: "SALES",
      action_description: `Requested correction for ${order.order_number ?? "order"}`,
      resource_type: "order",
      resource_id: order.id,
      resource_name: order.order_number ?? order.id,
      severity: physicalStatus === "not_processed" ? "info" : "warning",
      previous_value: {
        status: order.status,
      },
      new_value: {
        status: "preparing",
        correctionType,
        physicalStatus,
        inventoryPolicy: policies.inventory_policy,
        ledgerPolicy: policies.ledger_policy,
      },
      changes_summary: [
        `Correction requested: ${note}`,
        `Order moved from ${order.status ?? "unknown"} to preparing`,
        physicalStatus === "not_processed"
          ? `Inventory reversal recorded (${reversalResult?.restoredStockItems ?? 0} item(s) restored)`
          : "No automatic inventory or ledger reversal; loss remains recorded",
        ...(reversalResult?.summary ?? []),
      ],
      notes: note,
      tags: ["order", "correction", "request"],
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `order-correction-${requester.id}`,
    });

    if (activityError) {
      console.warn("Order correction was saved, but activity log could not be written:", activityError);
    }

    return NextResponse.json({
      success: true,
      correction,
      order: updatedOrder,
      reversal: reversalResult,
      activityLogged: !activityError,
      activityWarning: activityError?.message,
    });
  } catch (error) {
    console.error("Failed to request order correction:", error);
    return NextResponse.json(
      {
        error: describeUnknownError(error, "Order correction could not be saved."),
      },
      { status: 500 },
    );
  }
}
