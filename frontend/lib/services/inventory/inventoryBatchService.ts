import { supabase } from "@/lib/config/supabaseClient";
import { convertQuantity } from "@/lib/utils/unitConversion";

export type RestockBatchInput = {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  supplier: string;
  unitCost?: number;
  invoiceReference?: string;
  receiptUrl?: string;
  batchNumber?: string;
  receivedDate?: string;
  expiryDate?: string;
  sourceTransactionId?: string;
  performedByName?: string;
  notes?: string;
};

export type InventoryBatchRow = {
  id: string;
  inventory_item_id: string;
  batch_number: string | null;
  supplier: string | null;
  received_at: string;
  expiry_date: string | null;
  quantity_received: number | string;
  quantity_remaining: number | string;
  unit: string | null;
  unit_cost: number | string | null;
};

export type OrderInventoryUsageItem = {
  productId: string;
  productName: string;
  quantity: number;
  variants?: Array<{ option_id?: string; optionId?: string }>;
};

export type RecordOrderInventoryUsageInput = {
  orderId: string;
  orderNumber: string;
  items: OrderInventoryUsageItem[];
  performedBy?: string | null;
  performedByName?: string | null;
};

export type ReverseOrderInventoryUsageInput = {
  orderId: string;
  orderNumber?: string | null;
  performedByName?: string | null;
};

export type ProductKitchenAvailability = {
  productId: string;
  available: boolean;
  reason?: string;
  shortages: Array<{
    inventoryItemId: string;
    itemName: string;
    required: number;
    ready: number;
    unit: string;
  }>;
};

type ExistingUsageTransactionRow = {
  id: string;
};

type ExistingUsageDetailRow = {
  id?: string | null;
  usage_transaction_id: string;
  inventory_item_id: string;
  ingredient_name?: string | null;
  quantity_used: number | string;
  unit?: string | null;
  previous_stock?: number | string | null;
  new_stock?: number | string | null;
};

type RecipeRow = {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
};

type RecipeIngredientRow = {
  recipe_id: string;
  inventory_item_id: string;
  ingredient_name?: string | null;
  quantity_needed: number | string;
  unit?: string | null;
  costing_mode?: RecipeCostingMode | null;
};

type VariantAdjustmentRow = {
  product_id: string;
  variant_option_id: string;
  inventory_item_id: string;
  adjustment_quantity: number | string;
};

type InventoryItemRow = {
  id: string;
  name: string;
  current_stock: number | string | null;
  unit?: string | null;
  tracking_mode?: InventoryTrackingMode | null;
};

type UsageLine = {
  detailId?: string | null;
  transactionId: string;
  inventoryItemId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  trackingMode: InventoryTrackingMode;
  previousStock?: number | null;
  newStock?: number | null;
};

type InventoryTrackingMode =
  | "direct_auto_deduct"
  | "kitchen_station_auto_deduct"
  | "bulk_usage_expense";

type RecipeCostingMode = "deduct_from_pos" | "cost_estimate_only" | "kitchen_overhead";

const getRecipeCostingMode = (
  ingredient: Pick<RecipeIngredientRow, "costing_mode">,
  trackingMode?: InventoryTrackingMode | null,
): RecipeCostingMode => {
  if (ingredient.costing_mode) return ingredient.costing_mode;
  if (trackingMode === "bulk_usage_expense") return "cost_estimate_only";
  return "deduct_from_pos";
};

const buildUsageSummary = (lines: UsageLine[]) => {
  return lines.map((line) => {
    const quantity = toNumber(line.quantity);
    const unit = line.unit ? ` ${line.unit}` : "";
    const stockText =
      line.previousStock === null || line.previousStock === undefined || line.newStock === null || line.newStock === undefined
        ? ""
        : ` (${line.previousStock} -> ${line.newStock}${unit})`;

    return `${line.ingredientName} reduced by ${quantity}${unit}${stockText}`;
  });
};

type BatchMovementRow = {
  id: string;
  batch_id: string;
  inventory_item_id: string;
  usage_transaction_id?: string | null;
  usage_transaction_detail_id?: string | null;
  movement_type: string;
  quantity: number | string;
  quantity_before?: number | string | null;
  quantity_after?: number | string | null;
  unit?: string | null;
};

const isMissingBatchTableError = (error: { message?: string } | null | undefined) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String((error as { code?: string } | null | undefined)?.code || "").toUpperCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("relation \"inventory_batches\" does not exist") ||
    message.includes("relation \"inventory_batch_movements\" does not exist")
  );
};

const isMissingOptionalBatchColumnError = (error: { message?: string } | null | undefined) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("invoice_reference") ||
    message.includes("receipt_url") ||
    message.includes("schema cache")
  );
};

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIsoDateTime = (dateValue?: string) => {
  if (!dateValue) return new Date().toISOString();
  return new Date(`${dateValue}T00:00:00`).toISOString();
};

const getBatchDateKey = (dateValue?: string) =>
  (dateValue || new Date().toISOString().slice(0, 10)).replaceAll("-", "");

const buildBatchItemCode = (itemName: string) => {
  const normalized = itemName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const code = words.length > 1
    ? words.map((word) => word[0]).join("")
    : words[0] || "ITEM";
  return code.slice(0, 8);
};

async function generateRestockBatchNumber(input: RestockBatchInput) {
  const dateKey = getBatchDateKey(input.receivedDate);
  const itemCode = buildBatchItemCode(input.itemName);
  const prefix = `B-${itemCode}-${dateKey}`;

  const { data, error } = await supabase
    .from("inventory_batches")
    .select("batch_number")
    .eq("inventory_item_id", input.inventoryItemId)
    .like("batch_number", `${prefix}-%`);

  if (error) {
    if (isMissingBatchTableError(error)) return `${prefix}-001`;
    throw error;
  }

  const maxSequence = ((data || []) as Array<{ batch_number: string | null }>).reduce(
    (max, row) => {
      const match = row.batch_number?.match(/-(\d+)$/);
      const sequence = match ? Number(match[1]) : 0;
      return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
    },
    0,
  );

  return `${prefix}-${String(maxSequence + 1).padStart(3, "0")}`;
}

export async function createRestockBatch(input: RestockBatchInput) {
  const receivedAt = toIsoDateTime(input.receivedDate);
  const batchNumber = input.batchNumber?.trim() || await generateRestockBatchNumber(input);
  const baseBatchPayload = {
    inventory_item_id: input.inventoryItemId,
    batch_number: batchNumber,
    supplier: input.supplier || null,
    received_at: receivedAt,
    expiry_date: input.expiryDate || null,
    quantity_received: input.quantity,
    quantity_remaining: input.quantity,
    unit: input.unit,
    unit_cost: input.unitCost ?? null,
    source_transaction_id: input.sourceTransactionId || null,
    created_by_name: input.performedByName || null,
  };
  const batchPayload = {
    ...baseBatchPayload,
    invoice_reference: input.invoiceReference || null,
    receipt_url: input.receiptUrl || null,
  };

  let { data: batch, error: batchError } = await supabase
    .from("inventory_batches")
    .insert(batchPayload)
    .select("id")
    .single();

  if (batchError) {
    if (isMissingOptionalBatchColumnError(batchError)) {
      const retry = await supabase
        .from("inventory_batches")
        .insert(baseBatchPayload)
        .select("id")
        .single();
      batch = retry.data;
      batchError = retry.error;
    }
  }

  if (batchError) {
    if (isMissingBatchTableError(batchError)) return { enabled: false, batchId: null };
    throw batchError;
  }

  const batchId = batch?.id as string | undefined;
  if (!batchId) return { enabled: true, batchId: null };

  const { error: movementError } = await supabase.from("inventory_batch_movements").insert({
    batch_id: batchId,
    inventory_item_id: input.inventoryItemId,
    usage_transaction_id: input.sourceTransactionId || null,
    movement_type: "restock",
    quantity: input.quantity,
    quantity_before: 0,
    quantity_after: input.quantity,
    unit: input.unit,
    notes: input.notes || null,
    created_by_name: input.performedByName || null,
  });

  if (movementError) {
    if (isMissingBatchTableError(movementError)) return { enabled: false, batchId };
    throw movementError;
  }

  return { enabled: true, batchId };
}

async function hasBatchMovements(transactionIds: string[]) {
  if (!transactionIds.length) return false;

  const { data, error } = await supabase
    .from("inventory_batch_movements")
    .select("id")
    .in("usage_transaction_id", transactionIds)
    .limit(1);

  if (error) {
    if (isMissingBatchTableError(error)) return false;
    throw error;
  }

  return (data || []).length > 0;
}

async function consumeBatches(lines: UsageLine[], notes: string, performedByName?: string | null) {
  if (!lines.length) return { enabled: true, movements: 0 };

  let movements = 0;
  let shortage = 0;

  for (const line of lines) {
    let remaining = Math.max(0, line.quantity);
    if (remaining <= 0) continue;

    const { data: batchRows, error: batchError } = await supabase
      .from("inventory_batches")
      .select("id, inventory_item_id, batch_number, received_at, expiry_date, quantity_remaining, unit")
      .eq("inventory_item_id", line.inventoryItemId)
      .gt("quantity_remaining", 0)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .order("received_at", { ascending: true })
      .order("created_at", { ascending: true });

    if (batchError) {
      if (isMissingBatchTableError(batchError)) return { enabled: false, movements };
      throw batchError;
    }

    for (const batch of (batchRows || []) as InventoryBatchRow[]) {
      if (remaining <= 0) break;

      const before = toNumber(batch.quantity_remaining);
      if (before <= 0) continue;

      const used = Math.min(before, remaining);
      const after = before - used;

      const { error: updateError } = await supabase
        .from("inventory_batches")
        .update({
          quantity_remaining: after,
          updated_at: new Date().toISOString(),
        })
        .eq("id", batch.id);

      if (updateError) {
        if (isMissingBatchTableError(updateError)) return { enabled: false, movements };
        throw updateError;
      }

      const { error: movementError } = await supabase.from("inventory_batch_movements").insert({
        batch_id: batch.id,
        inventory_item_id: line.inventoryItemId,
        usage_transaction_id: line.transactionId,
        usage_transaction_detail_id: line.detailId || null,
        movement_type: "sale",
        quantity: used,
        quantity_before: before,
        quantity_after: after,
        unit: line.unit,
        notes,
        created_by_name: performedByName || null,
      });

      if (movementError) {
        if (isMissingBatchTableError(movementError)) return { enabled: false, movements };
        throw movementError;
      }

      remaining -= used;
      movements += 1;
    }

    if (remaining > 0) {
      shortage += remaining;
    }
  }

  return { enabled: true, movements, shortage };
}

async function consumeKitchenStationBatches(
  lines: UsageLine[],
  notes: string,
  performedByName?: string | null,
) {
  const stationLines = lines.filter((line) => line.trackingMode === "kitchen_station_auto_deduct");
  if (!stationLines.length) return { enabled: true, movements: 0, shortage: 0 };

  let movements = 0;
  let shortage = 0;

  for (const line of stationLines) {
    let remaining = Math.max(0, line.quantity);
    if (remaining <= 0) continue;

    const { data: stationRows, error: stationError } = await supabase
      .from("kitchen_station_batches")
      .select("id, inventory_item_id, source_batch_id, quantity_remaining, unit, unit_cost, station_status, expiry_date, started_at, created_at")
      .eq("inventory_item_id", line.inventoryItemId)
      .eq("station_status", "ready")
      .gt("quantity_remaining", 0)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .order("started_at", { ascending: true })
      .order("created_at", { ascending: true });

    if (stationError) {
      if (isMissingBatchTableError(stationError) || String(stationError.message || "").includes("kitchen_station_batches")) {
        return { enabled: false, movements, shortage };
      }
      throw stationError;
    }

    for (const stationBatch of (stationRows || []) as Array<{
      id: string;
      source_batch_id?: string | null;
      quantity_remaining?: number | string | null;
      unit?: string | null;
      unit_cost?: number | string | null;
    }>) {
      if (remaining <= 0) break;

      const before = toNumber(stationBatch.quantity_remaining);
      if (before <= 0) continue;

      const used = Math.min(before, remaining);
      const after = before - used;
      const unitCost = toNumber(stationBatch.unit_cost);

      const { error: updateError } = await supabase
        .from("kitchen_station_batches")
        .update({
          quantity_remaining: after,
          station_status: after <= 0 ? "finished" : "ready",
          finished_at: after <= 0 ? new Date().toISOString() : null,
        })
        .eq("id", stationBatch.id);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase.from("kitchen_station_movements").insert({
        station_batch_id: stationBatch.id,
        inventory_item_id: line.inventoryItemId,
        source_batch_id: stationBatch.source_batch_id || null,
        usage_transaction_id: line.transactionId,
        movement_type: "pos_usage",
        quantity: used,
        quantity_before: before,
        quantity_after: after,
        unit: line.unit,
        unit_cost: unitCost || null,
        total_cost: unitCost > 0 ? unitCost * used : null,
        notes,
        created_by_name: performedByName || null,
      });

      if (movementError) throw movementError;

      remaining -= used;
      movements += 1;
    }

    if (remaining > 0) shortage += remaining;
  }

  return { enabled: true, movements, shortage };
}

async function getKitchenStationTotals(inventoryItemIds: string[]) {
  if (!inventoryItemIds.length) return new Map<string, number>();

  const { data, error } = await supabase
    .from("kitchen_station_batches")
    .select("inventory_item_id, quantity_remaining, station_status")
    .in("inventory_item_id", inventoryItemIds)
    .eq("station_status", "ready")
    .gt("quantity_remaining", 0);

  if (error) {
    if (isMissingBatchTableError(error) || String(error.message || "").includes("kitchen_station_batches")) {
      return new Map<string, number>();
    }
    throw error;
  }

  return ((data || []) as Array<{ inventory_item_id: string; quantity_remaining?: number | string | null }>).reduce(
    (map, row) => {
      map.set(row.inventory_item_id, (map.get(row.inventory_item_id) ?? 0) + toNumber(row.quantity_remaining));
      return map;
    },
    new Map<string, number>(),
  );
}

export async function getProductKitchenAvailability(productIds: string[]): Promise<Map<string, ProductKitchenAvailability>> {
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
  const availabilityByProductId = new Map<string, ProductKitchenAvailability>();

  uniqueProductIds.forEach((productId) => {
    availabilityByProductId.set(productId, {
      productId,
      available: true,
      shortages: [],
    });
  });

  if (!uniqueProductIds.length) return availabilityByProductId;

  const [recipesResult, ingredientsResult, inventoryResult] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, product_id, product_name")
      .eq("recipe_type", "base")
      .in("product_id", uniqueProductIds),
    supabase
      .from("recipe_ingredients")
      .select("recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit, costing_mode"),
    supabase.from("inventory_items").select("id, name, unit, tracking_mode"),
  ]);

  if (recipesResult.error) throw recipesResult.error;
  if (ingredientsResult.error) throw ingredientsResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  const recipes = (recipesResult.data || []) as RecipeRow[];
  const ingredients = (ingredientsResult.data || []) as RecipeIngredientRow[];
  const inventoryRows = (inventoryResult.data || []) as InventoryItemRow[];
  const inventoryById = new Map(inventoryRows.map((item) => [item.id, item]));
  const recipeByProductId = new Map(
    recipes
      .filter((recipe) => recipe.product_id)
      .map((recipe) => [recipe.product_id as string, recipe]),
  );
  const ingredientsByRecipeId = new Map<string, RecipeIngredientRow[]>();

  ingredients.forEach((ingredient) => {
    ingredientsByRecipeId.set(ingredient.recipe_id, [
      ...(ingredientsByRecipeId.get(ingredient.recipe_id) || []),
      ingredient,
    ]);
  });

  const stationRequirements: Array<{
    productId: string;
    inventoryItemId: string;
    itemName: string;
    required: number;
    unit: string;
  }> = [];

  uniqueProductIds.forEach((productId) => {
    const recipe = recipeByProductId.get(productId);
    if (!recipe) return;

    (ingredientsByRecipeId.get(recipe.id) || []).forEach((ingredient) => {
      const inventory = inventoryById.get(ingredient.inventory_item_id);
      const trackingMode = inventory?.tracking_mode || "direct_auto_deduct";
      const costingMode = getRecipeCostingMode(ingredient, trackingMode);
      if (costingMode !== "deduct_from_pos" || trackingMode !== "kitchen_station_auto_deduct") return;

      stationRequirements.push({
        productId,
        inventoryItemId: ingredient.inventory_item_id,
        itemName: inventory?.name || ingredient.ingredient_name || "Kitchen item",
        required: convertQuantity(toNumber(ingredient.quantity_needed), ingredient.unit, inventory?.unit),
        unit: inventory?.unit || ingredient.unit || "",
      });
    });
  });

  const stationItemIds = [...new Set(stationRequirements.map((requirement) => requirement.inventoryItemId))];
  const stationTotals = await getKitchenStationTotals(stationItemIds);

  stationRequirements.forEach((requirement) => {
    const ready = toNumber(stationTotals.get(requirement.inventoryItemId));
    if (ready >= requirement.required) return;

    const current = availabilityByProductId.get(requirement.productId);
    if (!current) return;

    const shortage = {
      inventoryItemId: requirement.inventoryItemId,
      itemName: requirement.itemName,
      required: requirement.required,
      ready,
      unit: requirement.unit,
    };

    availabilityByProductId.set(requirement.productId, {
      productId: requirement.productId,
      available: false,
      reason: `${requirement.itemName} is not ready in kitchen station`,
      shortages: [...current.shortages, shortage],
    });
  });

  return availabilityByProductId;
}

async function getExistingUsageLines(orderId: string) {
  const { data: transactions, error: transactionError } = await supabase
    .from("usage_transactions")
    .select("id")
    .eq("order_id", orderId);

  if (transactionError) throw transactionError;

  const transactionRows = (transactions || []) as ExistingUsageTransactionRow[];
  const transactionIds = transactionRows.map((row) => row.id).filter(Boolean);

  if (!transactionIds.length) {
    return { transactionIds, lines: [] as UsageLine[] };
  }

  const { data: details, error: detailError } = await supabase
    .from("usage_transaction_details")
    .select("id, usage_transaction_id, inventory_item_id, ingredient_name, quantity_used, unit, previous_stock, new_stock")
    .in("usage_transaction_id", transactionIds);

  if (detailError) throw detailError;

  const lines = ((details || []) as ExistingUsageDetailRow[]).map((detail) => ({
    detailId: detail.id,
    transactionId: detail.usage_transaction_id,
    inventoryItemId: detail.inventory_item_id,
    ingredientName: detail.ingredient_name || "Inventory item",
    quantity: Math.abs(toNumber(detail.quantity_used)),
    unit: detail.unit || "",
    trackingMode: "direct_auto_deduct",
    previousStock: detail.previous_stock === null || detail.previous_stock === undefined
      ? null
      : toNumber(detail.previous_stock),
    newStock: detail.new_stock === null || detail.new_stock === undefined
      ? null
      : toNumber(detail.new_stock),
  }));

  return { transactionIds, lines };
}

export async function reverseOrderInventoryUsageWithBatches(input: ReverseOrderInventoryUsageInput) {
  const existing = await getExistingUsageLines(input.orderId);
  if (!existing.transactionIds.length) {
    return { usageLines: 0, batchEnabled: true, batchMovements: 0, restoredStockItems: 0 };
  }

  const { data: existingReversals, error: reversalCheckError } = await supabase
    .from("inventory_batch_movements")
    .select("id")
    .in("usage_transaction_id", existing.transactionIds)
    .eq("movement_type", "reversal")
    .limit(1);

  if (reversalCheckError && !isMissingBatchTableError(reversalCheckError)) {
    throw reversalCheckError;
  }

  if ((existingReversals || []).length > 0) {
    return {
      usageLines: existing.lines.length,
      batchEnabled: true,
      batchMovements: 0,
      restoredStockItems: 0,
      alreadyReversed: true,
    };
  }

  const notes = `Reversal for voided order ${input.orderNumber || input.orderId}`;
  let batchEnabled = true;
  let batchMovements = 0;
  let stationMovements = 0;

  const { data: saleMovements, error: movementsError } = await supabase
    .from("inventory_batch_movements")
    .select("id, batch_id, inventory_item_id, usage_transaction_id, usage_transaction_detail_id, movement_type, quantity, quantity_before, quantity_after, unit")
    .in("usage_transaction_id", existing.transactionIds)
    .eq("movement_type", "sale");

  if (movementsError) {
    if (isMissingBatchTableError(movementsError)) {
      batchEnabled = false;
    } else {
      throw movementsError;
    }
  }

  if (batchEnabled) {
    for (const movement of (saleMovements || []) as BatchMovementRow[]) {
      const quantity = toNumber(movement.quantity);
      if (quantity <= 0) continue;

      const { data: batch, error: batchError } = await supabase
        .from("inventory_batches")
        .select("id, quantity_received, quantity_remaining")
        .eq("id", movement.batch_id)
        .maybeSingle();

      if (batchError) {
        if (isMissingBatchTableError(batchError)) {
          batchEnabled = false;
          break;
        }
        throw batchError;
      }

      const batchRow = batch as Pick<InventoryBatchRow, "id" | "quantity_received" | "quantity_remaining"> | null;
      if (!batchRow) continue;

      const before = toNumber(batchRow.quantity_remaining);
      const after = Math.min(toNumber(batchRow.quantity_received), before + quantity);

      const { error: updateBatchError } = await supabase
        .from("inventory_batches")
        .update({ quantity_remaining: after })
        .eq("id", movement.batch_id);

      if (updateBatchError) throw updateBatchError;

      const { error: insertReversalError } = await supabase
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
          notes,
          created_by_name: input.performedByName || null,
        });

      if (insertReversalError) throw insertReversalError;
      batchMovements += 1;
    }
  }

  const { data: stationUsageRows, error: stationUsageError } = await supabase
    .from("kitchen_station_movements")
    .select("id, station_batch_id, inventory_item_id, usage_transaction_id, movement_type, quantity, quantity_before, quantity_after, unit, unit_cost")
    .in("usage_transaction_id", existing.transactionIds)
    .eq("movement_type", "pos_usage");

  if (stationUsageError && !String(stationUsageError.message || "").includes("kitchen_station_movements")) {
    throw stationUsageError;
  }

  for (const movement of (stationUsageRows || []) as Array<{
    station_batch_id?: string | null;
    inventory_item_id?: string | null;
    usage_transaction_id?: string | null;
    quantity?: number | string | null;
    unit?: string | null;
    unit_cost?: number | string | null;
  }>) {
    if (!movement.station_batch_id) continue;
    const quantity = toNumber(movement.quantity);
    if (quantity <= 0) continue;

    const { data: stationBatch, error: stationBatchError } = await supabase
      .from("kitchen_station_batches")
      .select("id, quantity_received, quantity_remaining")
      .eq("id", movement.station_batch_id)
      .maybeSingle();
    if (stationBatchError) throw stationBatchError;
    if (!stationBatch) continue;

    const before = toNumber((stationBatch as { quantity_remaining?: number | string | null }).quantity_remaining);
    const after = Math.min(toNumber((stationBatch as { quantity_received?: number | string | null }).quantity_received), before + quantity);

    const { error: updateStationError } = await supabase
      .from("kitchen_station_batches")
      .update({ quantity_remaining: after, station_status: after > 0 ? "ready" : "finished" })
      .eq("id", movement.station_batch_id);
    if (updateStationError) throw updateStationError;

    const unitCost = toNumber(movement.unit_cost);
    const { error: stationReversalError } = await supabase.from("kitchen_station_movements").insert({
      station_batch_id: movement.station_batch_id,
      inventory_item_id: movement.inventory_item_id,
      usage_transaction_id: movement.usage_transaction_id || null,
      movement_type: "reversal",
      quantity,
      quantity_before: before,
      quantity_after: after,
      unit: movement.unit || null,
      unit_cost: unitCost || null,
      total_cost: unitCost > 0 ? unitCost * quantity : null,
      notes,
      created_by_name: input.performedByName || null,
    });
    if (stationReversalError) throw stationReversalError;
    stationMovements += 1;
  }

  let restoredStockItems = 0;
  const inventoryIds = [...new Set(existing.lines.map((line) => line.inventoryItemId).filter(Boolean))];
  const { data: inventoryModes } = inventoryIds.length
    ? await supabase.from("inventory_items").select("id, tracking_mode").in("id", inventoryIds)
    : { data: [] };
  const trackingModeByItemId = new Map(
    ((inventoryModes || []) as Array<{ id: string; tracking_mode?: InventoryTrackingMode | null }>).map((item) => [
      item.id,
      item.tracking_mode || "direct_auto_deduct",
    ]),
  );

  for (const line of existing.lines) {
    if (trackingModeByItemId.get(line.inventoryItemId) === "kitchen_station_auto_deduct") continue;
    const restoreTo =
      line.previousStock !== null && line.previousStock !== undefined
        ? line.previousStock
        : null;

    if (restoreTo === null) continue;

    const { error: stockError } = await supabase
      .from("inventory_items")
      .update({ current_stock: restoreTo })
      .eq("id", line.inventoryItemId);

    if (stockError) throw stockError;
    restoredStockItems += 1;
  }

  return {
    usageLines: existing.lines.length,
    batchEnabled,
    batchMovements: batchMovements + stationMovements,
    restoredStockItems,
    alreadyReversed: false,
  };
}

const getVariantOptionIds = (item: OrderInventoryUsageItem) => {
  return (item.variants || [])
    .map((variant) => variant.option_id || variant.optionId)
    .filter((value): value is string => Boolean(value));
};

async function buildRecipeUsageLines(items: OrderInventoryUsageItem[]) {
  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
  if (!productIds.length) return [];

  const selectedVariantOptionIds = [
    ...new Set(items.flatMap((item) => getVariantOptionIds(item))),
  ];

  const [recipesResult, ingredientsResult, adjustmentsResult, inventoryResult] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, product_id, product_name")
      .eq("recipe_type", "base")
      .in("product_id", productIds),
    supabase
      .from("recipe_ingredients")
      .select("recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit, costing_mode"),
    selectedVariantOptionIds.length > 0
      ? supabase
          .from("product_variant_recipe_adjustments")
          .select("product_id, variant_option_id, inventory_item_id, adjustment_quantity")
          .in("product_id", productIds)
          .in("variant_option_id", selectedVariantOptionIds)
      : Promise.resolve({ data: [] as VariantAdjustmentRow[], error: null }),
    supabase.from("inventory_items").select("id, name, current_stock, unit, tracking_mode"),
  ]);

  if (recipesResult.error) throw recipesResult.error;
  if (ingredientsResult.error) throw ingredientsResult.error;
  if (adjustmentsResult.error) throw adjustmentsResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  const recipes = (recipesResult.data || []) as RecipeRow[];
  const ingredients = (ingredientsResult.data || []) as RecipeIngredientRow[];
  const adjustments = (adjustmentsResult.data || []) as VariantAdjustmentRow[];
  const inventoryRows = (inventoryResult.data || []) as InventoryItemRow[];

  const recipeByProductId = new Map(
    recipes
      .filter((recipe) => recipe.product_id)
      .map((recipe) => [recipe.product_id as string, recipe]),
  );
  const ingredientsByRecipeId = new Map<string, RecipeIngredientRow[]>();
  ingredients.forEach((ingredient) => {
    ingredientsByRecipeId.set(ingredient.recipe_id, [
      ...(ingredientsByRecipeId.get(ingredient.recipe_id) || []),
      ingredient,
    ]);
  });
  const inventoryById = new Map(inventoryRows.map((item) => [item.id, item]));
  const usageByInventoryId = new Map<string, {
    quantity: number;
    name: string;
    unit: string;
    trackingMode: InventoryTrackingMode;
  }>();

  items.forEach((item) => {
    const recipe = recipeByProductId.get(item.productId);
    const quantitySold = Math.max(0, toNumber(item.quantity));
    const selectedOptionIds = new Set(getVariantOptionIds(item));

    if (!recipe || quantitySold <= 0) return;

    (ingredientsByRecipeId.get(recipe.id) || []).forEach((ingredient) => {
      const inventory = inventoryById.get(ingredient.inventory_item_id);
      const trackingMode = inventory?.tracking_mode || "direct_auto_deduct";
      const costingMode = getRecipeCostingMode(ingredient, trackingMode);
      if (costingMode !== "deduct_from_pos" || trackingMode === "bulk_usage_expense") return;

      const quantityNeeded = convertQuantity(
        toNumber(ingredient.quantity_needed),
        ingredient.unit,
        inventory?.unit,
      );
      const current = usageByInventoryId.get(ingredient.inventory_item_id);
      usageByInventoryId.set(ingredient.inventory_item_id, {
        quantity: (current?.quantity || 0) + quantityNeeded * quantitySold,
        name: inventory?.name || ingredient.ingredient_name || "Inventory item",
        unit: inventory?.unit || ingredient.unit || "",
        trackingMode,
      });
    });

    adjustments
      .filter(
        (adjustment) =>
          adjustment.product_id === item.productId &&
          selectedOptionIds.has(adjustment.variant_option_id),
      )
      .forEach((adjustment) => {
        const inventory = inventoryById.get(adjustment.inventory_item_id);
        const trackingMode = inventory?.tracking_mode || "direct_auto_deduct";
        if (trackingMode === "bulk_usage_expense") return;

        const current = usageByInventoryId.get(adjustment.inventory_item_id);
        usageByInventoryId.set(adjustment.inventory_item_id, {
          quantity: (current?.quantity || 0) + toNumber(adjustment.adjustment_quantity) * quantitySold,
          name: inventory?.name || "Inventory item",
          unit: inventory?.unit || current?.unit || "",
          trackingMode,
        });
      });
  });

  const stationItemIds = [...usageByInventoryId.entries()]
    .filter(([, usage]) => usage.trackingMode === "kitchen_station_auto_deduct")
    .map(([inventoryItemId]) => inventoryItemId);
  const stationTotals = await getKitchenStationTotals(stationItemIds);

  return [...usageByInventoryId.entries()]
    .map(([inventoryItemId, usage]) => {
      const inventory = inventoryById.get(inventoryItemId);
      const previousStock = usage.trackingMode === "kitchen_station_auto_deduct"
        ? toNumber(stationTotals.get(inventoryItemId))
        : toNumber(inventory?.current_stock);
      const quantity = Math.max(0, usage.quantity);
      return {
        inventoryItemId,
        ingredientName: usage.name,
        quantity,
        unit: usage.unit,
        trackingMode: usage.trackingMode,
        previousStock,
        newStock: Math.max(0, previousStock - quantity),
      };
    })
    .filter((line) => line.quantity > 0);
}

export async function recordOrderInventoryUsageWithBatches(input: RecordOrderInventoryUsageInput) {
  const notes = `Auto-deduct from order ${input.orderNumber}`;
  const existing = await getExistingUsageLines(input.orderId);

  if (existing.lines.length > 0) {
    const alreadyHasBatchMovements = await hasBatchMovements(existing.transactionIds);
    if (alreadyHasBatchMovements) {
      return {
        source: "existing",
        usageLines: existing.lines.length,
        batchEnabled: true,
        batchMovements: 0,
        usageSummary: buildUsageSummary(existing.lines as any),
      };
    }

    const batchResult = await consumeBatches(existing.lines as any, notes, input.performedByName);
    return {
      source: "existing",
      usageLines: existing.lines.length,
      batchEnabled: batchResult.enabled,
      batchMovements: batchResult.movements,
      batchShortage: batchResult.shortage,
      usageSummary: buildUsageSummary(existing.lines as any),
    };
  }

  const recipeLines = await buildRecipeUsageLines(input.items);
  if (!recipeLines.length) {
    return { source: "none", usageLines: 0, batchEnabled: true, batchMovements: 0, usageSummary: [] };
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("usage_transactions")
    .insert({
      transaction_type: "sale",
      order_id: input.orderId,
      notes,
      performed_by: input.performedBy || null,
      performed_by_name: input.performedByName || null,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (transactionError) throw transactionError;

  const transactionId = transaction?.id as string | undefined;
  if (!transactionId) {
    return { source: "created", usageLines: 0, batchEnabled: true, batchMovements: 0, usageSummary: [] };
  }

  const detailPayload = recipeLines.map((line) => ({
    usage_transaction_id: transactionId,
    inventory_item_id: line.inventoryItemId,
    ingredient_name: line.ingredientName,
    quantity_used: line.quantity,
    unit: line.unit,
    previous_stock: line.previousStock,
    new_stock: line.newStock,
  }));

  const { data: insertedDetails, error: detailError } = await supabase
    .from("usage_transaction_details")
    .insert(detailPayload)
    .select("id, usage_transaction_id, inventory_item_id, ingredient_name, quantity_used, unit, previous_stock, new_stock");

  if (detailError) throw detailError;

  for (const line of recipeLines.filter((usageLine) => usageLine.trackingMode === "direct_auto_deduct")) {
    const { error: stockError } = await supabase
      .from("inventory_items")
      .update({ current_stock: line.newStock })
      .eq("id", line.inventoryItemId);

    if (stockError) throw stockError;
  }

  const recipeLineByItemId = new Map(recipeLines.map((line) => [line.inventoryItemId, line]));
  const linesWithDetails = ((insertedDetails || []) as ExistingUsageDetailRow[]).map((detail) => {
    const recipeLine = recipeLineByItemId.get(detail.inventory_item_id);
    return {
      detailId: detail.id,
      transactionId: transactionId,
      inventoryItemId: detail.inventory_item_id,
      ingredientName: detail.ingredient_name || "Inventory item",
      quantity: Math.abs(toNumber(detail.quantity_used)),
      unit: detail.unit || "",
      trackingMode: recipeLine?.trackingMode || "direct_auto_deduct",
      previousStock: detail.previous_stock === null || detail.previous_stock === undefined
        ? null
        : toNumber(detail.previous_stock),
      newStock: detail.new_stock === null || detail.new_stock === undefined
        ? null
        : toNumber(detail.new_stock),
    };
  });

  const batchResult = await consumeBatches(
    linesWithDetails.filter((line) => line.trackingMode === "direct_auto_deduct"),
    notes,
    input.performedByName,
  );
  const stationResult = await consumeKitchenStationBatches(linesWithDetails, notes, input.performedByName);

  return {
    source: "created",
    usageLines: linesWithDetails.length,
    batchEnabled: batchResult.enabled && stationResult.enabled,
    batchMovements: batchResult.movements + stationResult.movements,
    batchShortage: (batchResult.shortage || 0) + (stationResult.shortage || 0),
    usageSummary: buildUsageSummary(linesWithDetails),
  };
}
