import type { DateRangeValue } from "@/app/components/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getIsoWeekdayFromDateString } from "@/lib/staff/availability";
import { supabase } from "@/lib/config/supabaseClient";
import { convertQuantity } from "@/lib/utils/unitConversion";
import {
  isCancelledOrderStatus,
  isValidPaidOrder,
} from "@/lib/utils/orderValidation";
import {
  formatJakartaBusinessDate,
  formatJakartaBusinessTime,
  toJakartaDateTimeEnd,
  toJakartaDateTimeStart,
  toUtcDateOnly,
} from "./bookkeepingDate";
import type {
  BookkeepingDashboardData,
  BookkeepingEntry,
  BookkeepingException,
  BookkeepingExpense,
  MenuMarginRow,
  PaymentBreakdownRow,
  ShiftClosingRow,
} from "./bookkeepingTypes";

type OrderItemRow = {
  id?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  quantity?: number | string | null;
  total_price?: number | string | null;
};

type OrderRow = {
  id: string;
  order_number?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  subtotal?: number | string | null;
  discount?: number | string | null;
  tax?: number | string | null;
  total?: number | string | null;
  order_items?: OrderItemRow[] | null;
  original_status?: string | null;
  correction_id?: string | null;
  correction_status?: string | null;
  correction_physical_status?: string | null;
  created_by?: string | null;
  correction_note?: string | null;
};

type OrderCorrectionRow = {
  id: string;
  order_id?: string | null;
  status?: string | null;
  physical_status?: string | null;
  note?: string | null;
};

type ShiftRow = {
  id: string;
  shift_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean | null;
};

type UsageTransactionRow = {
  id: string;
  order_id?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  transaction_type?: string | null;
  type?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  notes?: string | null;
};

type UsageDetailRow = {
  usage_transaction_id?: string | null;
  inventory_item_id?: string | null;
  ingredient_name?: string | null;
  quantity_used?: number | string | null;
  unit?: string | null;
};

type InventoryItemRow = {
  id: string;
  name?: string | null;
  unit?: string | null;
  cost_per_unit?: number | string | null;
  price_per_unit?: number | string | null;
};

type InventoryBatchRow = {
  id: string;
  inventory_item_id?: string | null;
  batch_number?: string | null;
  supplier?: string | null;
  received_at?: string | null;
  expiry_date?: string | null;
  quantity_received?: number | string | null;
  quantity_remaining?: number | string | null;
  unit?: string | null;
  unit_cost?: number | string | null;
  source_transaction_id?: string | null;
  receipt_url?: string | null;
};

type RecipeRow = {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
  recipe_type?: string | null;
};

type RecipeIngredientRow = {
  recipe_id?: string | null;
  inventory_item_id?: string | null;
  ingredient_name?: string | null;
  quantity_needed?: number | string | null;
  unit?: string | null;
  costing_mode?: RecipeCostingMode | null;
};

type RecipeCostingMode = "deduct_from_pos" | "cost_estimate_only" | "kitchen_overhead";

type ExpenseRow = {
  id: string;
  expense_date: string;
  category: string;
  amount: number | string;
  payment_method?: string | null;
  vendor?: string | null;
  receipt_url?: string | null;
  note?: string | null;
};

type KitchenStationMovementRow = {
  id: string;
  inventory_item_id?: string | null;
  movement_type?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  total_cost?: number | string | null;
  business_date?: string | null;
  shift_name?: string | null;
  notes?: string | null;
  created_by_name?: string | null;
  created_at?: string | null;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isMissingKitchenStationTableError = (error: { message?: string; code?: string } | null | undefined) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("kitchen_station_movements") ||
    message.includes("could not find the table")
  );
};

const isMissingInventoryBatchTableError = (error: { message?: string; code?: string } | null | undefined) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("inventory_batches") ||
    message.includes("could not find the table")
  );
};

const toDateTimeStart = toJakartaDateTimeStart;
const toDateTimeEnd = toJakartaDateTimeEnd;
const formatBusinessDate = formatJakartaBusinessDate;
const formatBusinessTime = formatJakartaBusinessTime;

const isValidOrder = (order: OrderRow) => {
  return isValidPaidOrder(order);
};

const isCancelledOrder = (order: OrderRow) => {
  return isCancelledOrderStatus(order.status);
};

const applyOrderCorrections = (orders: OrderRow[], corrections: OrderCorrectionRow[]) => {
  const correctionByOrderId = new Map(
    corrections
      .filter((correction) => correction.order_id)
      .map((correction) => [correction.order_id as string, correction]),
  );

  return orders.map((order) => {
    const correction = correctionByOrderId.get(order.id);
    if (!correction) return order;

    return {
      ...order,
      original_status: order.status,
      status: "cancelled",
      correction_id: correction.id,
      correction_status: correction.status ?? null,
      correction_physical_status: correction.physical_status ?? null,
      correction_note: correction.note ?? null,
    };
  });
};

const isOrderInShift = (order: OrderRow, shift: ShiftRow) => {
  const orderTime = formatBusinessTime(order.completed_at || order.created_at);
  const startTime = String(shift.start_time || "00:00").slice(0, 5);
  const endTime = String(shift.end_time || "23:59").slice(0, 5);
  const normalizedOrderTime = orderTime.slice(0, 5);

  if (!normalizedOrderTime) return false;
  if (startTime <= endTime) return normalizedOrderTime >= startTime && normalizedOrderTime <= endTime;

  return normalizedOrderTime >= startTime || normalizedOrderTime <= endTime;
};

const buildCashDrawerFields = ({
  cashSales,
  openingCash = 0,
  closingFloat = 0,
  floatPolicy = "carry_float" as const,
  cashCounted = null,
  cashIn = 0,
  cashOut = 0,
}: {
  cashSales: number;
  openingCash?: number;
  closingFloat?: number;
  floatPolicy?: ShiftClosingRow["floatPolicy"];
  cashCounted?: number | null;
  cashIn?: number;
  cashOut?: number;
}) => {
  const expectedDrawerCash = openingCash + cashSales + cashIn - cashOut;
  const cashToDeposit = Math.max((cashCounted ?? expectedDrawerCash) - closingFloat, 0);
  const cashDifference = cashCounted === null ? null : cashCounted - expectedDrawerCash;

  return {
    openingCash,
    cashIn,
    cashOut,
    cashExpected: cashSales,
    expectedDrawerCash,
    cashCounted,
    cashDifference,
    cashToDeposit,
    closingFloat,
    floatPolicy,
  };
};

const normalizeTransactionType = (transaction?: UsageTransactionRow) => {
  const value = String(transaction?.transaction_type || transaction?.type || "").toLowerCase();
  if (value === "stock_in") return "restock";
  if (value === "order_usage") return "sale";
  return value || "sale";
};

const getTransactionTimestamp = (transaction?: UsageTransactionRow) => {
  return transaction?.timestamp || transaction?.created_at || "";
};

const getInventoryCost = (item?: InventoryItemRow) => {
  return toNumber(item?.cost_per_unit ?? item?.price_per_unit);
};

const getRecipeCostingMode = (ingredient: RecipeIngredientRow): RecipeCostingMode => {
  return ingredient.costing_mode || "deduct_from_pos";
};

const normalizeName = (value: string | null | undefined) => {
  return String(value ?? "").trim().toLowerCase();
};

const createSalesEntries = (orders: OrderRow[]): BookkeepingEntry[] => {
  return orders.filter(isValidOrder).map((order) => {
    const gross = toNumber(order.subtotal || order.total);
    const discount = toNumber(order.discount);
    const tax = toNumber(order.tax);
    const netWithTax = toNumber(order.total) || Math.max(gross - discount + tax, 0);
    const net = Math.max(netWithTax - tax, 0);

    return {
      id: `sales-${order.id}`,
      entryAt: order.completed_at || order.created_at || "",
      businessDate: formatBusinessDate(order.created_at),
      type: "sales_income",
      category: "Sales Income",
      source: order.order_number ? `Order ${order.order_number}` : "Order",
      sourceTable: "orders",
      sourceId: order.id,
      paymentMethod: order.payment_method || "Unknown",
      direction: "in",
      amount: net,
      status: "posted",
    };
  });
};

const createTaxEntries = (orders: OrderRow[]): BookkeepingEntry[] => {
  return orders
    .filter(isValidOrder)
    .filter((order) => toNumber(order.tax) > 0)
    .map((order) => ({
      id: `tax-${order.id}`,
      entryAt: order.completed_at || order.created_at || "",
      businessDate: formatBusinessDate(order.created_at),
      type: "tax_payable",
      category: "Tax Payable",
      source: order.order_number ? `Order ${order.order_number}` : "Order",
      sourceTable: "orders",
      sourceId: order.id,
      paymentMethod: order.payment_method || "Unknown",
      direction: "neutral",
      amount: toNumber(order.tax),
      status: "posted",
      note: "Tax collected from customer. Track as payable, not sales revenue.",
    }));
};

const createDiscountEntries = (orders: OrderRow[]): BookkeepingEntry[] => {
  return orders
    .filter(isValidOrder)
    .filter((order) => toNumber(order.discount) > 0)
    .map((order) => ({
      id: `discount-${order.id}`,
      entryAt: order.completed_at || order.created_at || "",
      businessDate: formatBusinessDate(order.created_at),
      type: "discount_cost",
      category: "Discount Cost",
      source: order.order_number ? `Order ${order.order_number}` : "Order",
      sourceTable: "orders",
      sourceId: order.id,
      paymentMethod: order.payment_method || "Unknown",
      direction: "out",
      amount: toNumber(order.discount),
      status: "posted",
    }));
};

const createCancellationEntries = (orders: OrderRow[]): BookkeepingEntry[] => {
  return orders.filter(isCancelledOrder).map((order) => ({
    id: `cancelled-${order.id}`,
    entryAt: order.completed_at || order.created_at || "",
    businessDate: formatBusinessDate(order.created_at),
    type: "cancellation_adjustment",
    category: "Cancellation Adjustment",
    source: order.order_number ? `Order ${order.order_number}` : "Cancelled Order",
    sourceTable: "orders",
    sourceId: order.id,
    paymentMethod: order.payment_method || "Unknown",
    direction: "neutral",
    amount: toNumber(order.total),
    status: "needs_review",
    note: "Cancelled order should be reviewed before daily closing.",
  }));
};

const createExpenseEntries = (expenses: BookkeepingExpense[]): BookkeepingEntry[] => {
  return expenses.map((expense) => ({
    id: `expense-${expense.id}`,
    entryAt: `${expense.expenseDate}T12:00:00`,
    businessDate: expense.expenseDate,
    type: "expense",
    category: "Operating Expense",
    source: expense.vendor
      ? `${expense.category} - ${expense.vendor}`
      : expense.category,
    sourceTable: "bookkeeping_expenses",
    sourceId: expense.id,
    paymentMethod: expense.paymentMethod || undefined,
    direction: "out",
    amount: expense.amount,
    status: "posted",
    note: expense.note || undefined,
  }));
};

const createKitchenBulkUsageEntries = (
  movements: KitchenStationMovementRow[],
  inventoryItems: InventoryItemRow[],
): BookkeepingEntry[] => {
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));

  return movements
    .filter((movement) => {
      const type = String(movement.movement_type || "").toLowerCase();
      return ["bulk_opened", "testing_usage", "waste", "adjustment", "closing_count"].includes(type);
    })
    .filter((movement) => toNumber(movement.total_cost) > 0)
    .map((movement) => {
      const rawMovementType = String(movement.movement_type || "").toLowerCase();
      const movementType = rawMovementType.replaceAll("_", " ");
      const quantityText = movement.quantity
        ? `${toNumber(movement.quantity)} ${movement.unit || ""}`.trim()
        : "";
      const itemName = inventoryById.get(movement.inventory_item_id || "")?.name || "Kitchen item";
      const sourceAction = `${itemName} ${movementType}${quantityText ? ` ${quantityText}` : ""}`;

      return {
        id: `${rawMovementType === "testing_usage" ? "quality-check" : "kitchen-bulk"}-${movement.id}`,
        entryAt: movement.created_at || `${movement.business_date || ""}T12:00:00`,
        businessDate: movement.business_date || formatBusinessDate(movement.created_at),
        type: rawMovementType === "testing_usage" ? "quality_check_usage" : "kitchen_bulk_usage",
        category: rawMovementType === "testing_usage" ? "Quality Check Usage" : "Kitchen Bulk Usage",
        source: movement.shift_name ? `${sourceAction} - ${movement.shift_name}` : sourceAction,
        sourceTable: "kitchen_station_movements",
        sourceId: movement.id,
        direction: "out",
        amount: toNumber(movement.total_cost),
        status: "posted",
        note: [quantityText, movement.notes, movement.created_by_name ? `By ${movement.created_by_name}` : ""]
          .filter(Boolean)
          .join(" | "),
      } satisfies BookkeepingEntry;
    });
};

const createInventoryEntries = ({
  transactions,
  details,
  inventoryItems,
  inventoryBatches,
}: {
  transactions: UsageTransactionRow[];
  details: UsageDetailRow[];
  inventoryItems: InventoryItemRow[];
  inventoryBatches: InventoryBatchRow[];
}): BookkeepingEntry[] => {
  const transactionById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  const restockEntries = inventoryBatches
    .filter((batch) => batch.source_transaction_id)
    .map((batch) => {
      const transaction = transactionById.get(batch.source_transaction_id || "");
      const inventory = inventoryById.get(batch.inventory_item_id || "");
      const quantityReceived = toNumber(batch.quantity_received);
      const unitCost = toNumber(batch.unit_cost);
      const amount = quantityReceived * unitCost;
      const status = amount > 0 ? "posted" : "cost_data_needed";
      const sourceTable = transaction ? "usage_transactions" : "inventory_batches";
      const sourceId = transaction?.id || batch.id;
      const sourceParts = [
        transaction?.notes || `Restocked ${inventory?.name || "Inventory item"}`,
        batch.supplier ? `Supplier: ${batch.supplier}` : "",
        batch.batch_number ? `Batch: ${batch.batch_number}` : "",
      ].filter(Boolean);

      return {
        id: `stock-purchase-${sourceTable}-${sourceId}`,
        entryAt: transaction ? getTransactionTimestamp(transaction) : batch.received_at || "",
        businessDate: formatBusinessDate(transaction ? getTransactionTimestamp(transaction) : batch.received_at),
        type: "stock_purchase",
        category: "Stock Purchase",
        source: sourceParts.join(" | "),
        sourceTable,
        sourceId,
        direction: "out",
        amount,
        status,
        note: status === "cost_data_needed" ? "Batch unit cost is missing." : undefined,
      } satisfies BookkeepingEntry;
    });
  const restockTransactionIdsWithBatch = new Set(
    inventoryBatches
      .map((batch) => batch.source_transaction_id)
      .filter((id): id is string => Boolean(id)),
  );
  const cogsByTransaction = new Map<string, {
    amount: number;
    hasMissingCost: boolean;
  }>();

  details.forEach((detail) => {
    const transaction = transactionById.get(detail.usage_transaction_id || "");
    if (!transaction) return;

    const type = normalizeTransactionType(transaction);
    if (type !== "sale" && type !== "restock" && type !== "testing_usage") return;
    if (type === "restock" && restockTransactionIdsWithBatch.has(transaction.id)) return;

    const inventory = inventoryById.get(detail.inventory_item_id || "");
    const unitCost = getInventoryCost(inventory);
    const amount = unitCost * toNumber(detail.quantity_used);

    const current = cogsByTransaction.get(transaction.id) || {
      amount: 0,
      hasMissingCost: false,
    };

    current.amount += amount;
    current.hasMissingCost = current.hasMissingCost || amount <= 0;
    cogsByTransaction.set(transaction.id, current);
  });

  const entriesBySource = new Map<string, BookkeepingEntry>();

  cogsByTransaction.forEach((transactionCogs, transactionId) => {
    const transaction = transactionById.get(transactionId);
    if (!transaction) return;

    const type = normalizeTransactionType(transaction);
    if (type !== "sale" && type !== "restock" && type !== "testing_usage") return;

    const productKey = transaction.product_id || transaction.product_name || "unknown";
    const sourceKey = type === "sale" && transaction.order_id
      ? `sale:${transaction.order_id}:${productKey}`
      : `${type}:${transactionId}`;
    const existing = entriesBySource.get(sourceKey);
    const direction = type === "restock" ? "out" : "out";
    const entryType =
      type === "restock"
        ? "stock_purchase"
        : type === "testing_usage"
          ? "quality_check_usage"
          : "cogs_estimate";
    const category =
      type === "restock"
        ? "Stock Purchase"
        : type === "testing_usage"
          ? "Quality Check Usage"
          : "COGS Estimate";
    const status = transactionCogs.hasMissingCost || transactionCogs.amount <= 0
      ? "cost_data_needed"
      : "estimated";
    const dedupedAmount = type === "sale" && existing
      ? Math.max(existing.amount, transactionCogs.amount)
      : (existing?.amount || 0) + transactionCogs.amount;

    entriesBySource.set(sourceKey, {
      id: `${entryType}-${sourceKey}`,
      entryAt: getTransactionTimestamp(transaction),
      businessDate: formatBusinessDate(getTransactionTimestamp(transaction)),
      type: entryType,
      category,
      source: transaction?.notes || (type === "restock"
        ? "Inventory Restock"
        : type === "testing_usage"
          ? "Staff Testing Usage"
          : transaction.order_id
            ? `Auto-deduct from order #${transaction.order_id}`
            : "Recipe Usage"),
      sourceTable: type === "sale" && transaction.order_id ? "orders" : "usage_transactions",
      sourceId: type === "sale" && transaction.order_id
        ? transaction.order_id
        : transactionId,
      direction,
      amount: dedupedAmount,
      status: existing?.status === "cost_data_needed" || status === "cost_data_needed"
        ? "cost_data_needed"
        : "estimated",
      note: status === "cost_data_needed" ? "Item cost data is missing." : undefined,
    });
  });

  return [...restockEntries, ...Array.from(entriesBySource.values())];
};

const buildActualUsageCogsByProduct = ({
  orders,
  transactions,
  details,
  inventoryItems,
}: {
  orders: OrderRow[];
  transactions: UsageTransactionRow[];
  details: UsageDetailRow[];
  inventoryItems: InventoryItemRow[];
}) => {
  const saleTransactions = transactions.filter((transaction) => normalizeTransactionType(transaction) === "sale");
  const transactionById = new Map(saleTransactions.map((transaction) => [transaction.id, transaction]));
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  const singleProductKeyByOrderId = new Map<string, string>();
  const cogsByProduct = new Map<string, number>();
  const cogsByTransactionProduct = new Map<string, number>();
  const cogsByOrderProduct = new Map<string, number>();
  const cogsByUnlinkedTransaction = new Map<string, number>();
  const orderIdsWithUsage = new Set<string>();

  orders.forEach((order) => {
    const productKeys = new Set(
      (order.order_items || [])
        .map((item) => item.product_id || item.product_name)
        .filter((value): value is string => Boolean(value)),
    );

    if (productKeys.size === 1) {
      singleProductKeyByOrderId.set(order.id, Array.from(productKeys)[0]);
    }
  });

  details.forEach((detail) => {
    const transaction = transactionById.get(detail.usage_transaction_id || "");
    if (!transaction) return;

    const productKey =
      transaction.product_id ||
      transaction.product_name ||
      (transaction.order_id ? singleProductKeyByOrderId.get(transaction.order_id) : undefined);
    if (!productKey) return;

    const inventory = inventoryById.get(detail.inventory_item_id || "");
    const amount = getInventoryCost(inventory) * toNumber(detail.quantity_used);

    if (transaction.order_id) {
      const transactionProductKey = `${transaction.id}:${transaction.order_id}:${productKey}`;
      cogsByTransactionProduct.set(
        transactionProductKey,
        (cogsByTransactionProduct.get(transactionProductKey) ?? 0) + amount,
      );
      orderIdsWithUsage.add(transaction.order_id);
      return;
    }

    cogsByUnlinkedTransaction.set(
      transaction.id,
      (cogsByUnlinkedTransaction.get(transaction.id) ?? 0) + amount,
    );
  });

  cogsByTransactionProduct.forEach((amount, transactionProductKey) => {
    const [, orderId, ...productParts] = transactionProductKey.split(":");
    const productKey = productParts.join(":");
    const orderProductKey = `${orderId}:${productKey}`;
    cogsByOrderProduct.set(
      orderProductKey,
      Math.max(cogsByOrderProduct.get(orderProductKey) ?? 0, amount),
    );
  });

  cogsByOrderProduct.forEach((amount, orderProductKey) => {
    const productKey = orderProductKey.split(":").slice(1).join(":");
    const current = cogsByProduct.get(productKey) ?? 0;
    cogsByProduct.set(productKey, current + Math.max(amount, 0));
  });

  cogsByUnlinkedTransaction.forEach((amount, transactionId) => {
    const transaction = transactionById.get(transactionId);
    const productKey = transaction?.product_id || transaction?.product_name;
    if (!productKey) return;
    cogsByProduct.set(productKey, (cogsByProduct.get(productKey) ?? 0) + Math.max(amount, 0));
  });

  return { cogsByProduct, cogsByOrderProduct, orderIdsWithUsage };
};

const buildPaymentBreakdown = (orders: OrderRow[]): PaymentBreakdownRow[] => {
  const byMethod = new Map<string, PaymentBreakdownRow>();

  orders.filter(isValidOrder).forEach((order) => {
    const method = order.payment_method || "Unknown";
    const current = byMethod.get(method) || { method, orders: 0, amount: 0 };
    current.orders += 1;
    current.amount += toNumber(order.total);
    byMethod.set(method, current);
  });

  return Array.from(byMethod.values()).sort((left, right) => right.amount - left.amount);
};

const buildMenuMargins = ({
  orders,
  cogsByProduct,
  cogsByOrderProduct,
  recipeStatusByProduct,
}: {
  orders: OrderRow[];
  cogsByProduct: Map<string, number>;
  cogsByOrderProduct?: Map<string, number>;
  recipeStatusByProduct: Map<string, MenuMarginRow["status"]>;
}): MenuMarginRow[] => {
  const productMap = new Map<string, MenuMarginRow>();

  orders.filter(isValidOrder).forEach((order) => {
    (order.order_items || []).forEach((item) => {
      const id = item.product_id || item.product_name || "unknown";
      const current = productMap.get(id) || {
        id,
        menuName: item.product_name || "Unknown menu",
        quantitySold: 0,
        revenue: 0,
        estimatedCogs: 0,
        grossProfit: 0,
        marginPct: 0,
        status: "cost_data_needed" as const,
      };

      current.quantitySold += toNumber(item.quantity);
      current.revenue += toNumber(item.total_price);
      current.estimatedCogs = (current.estimatedCogs ?? 0) + (
        cogsByOrderProduct?.get(`${order.id}:${id}`) ?? 0
      );
      productMap.set(id, current);
    });
  });

  return Array.from(productMap.values())
    .map((row) => {
      const cogs = row.estimatedCogs && row.estimatedCogs > 0
        ? row.estimatedCogs
        : cogsByProduct.get(row.id) ?? null;
      if (!cogs || cogs <= 0) {
        let fallbackStatus = recipeStatusByProduct.get(row.id) ?? ("cost_data_needed" as const);
        if (fallbackStatus === "ready") fallbackStatus = "cost_data_needed";
        return {
          ...row,
          estimatedCogs: null,
          grossProfit: null,
          marginPct: null,
          status: fallbackStatus,
        };
      }

      const grossProfit = row.revenue - cogs;
      return {
        ...row,
        estimatedCogs: cogs,
        grossProfit,
        marginPct: row.revenue > 0 ? (grossProfit / row.revenue) * 100 : 0,
        status: "ready" as const,
      };
    })
    .sort((left, right) => right.revenue - left.revenue);
};

const buildRecipeCostMaps = ({
  orders,
  orderIdsWithActualUsage,
  recipes,
  recipeIngredients,
  inventoryItems,
}: {
  orders: OrderRow[];
  orderIdsWithActualUsage?: Set<string>;
  recipes: RecipeRow[];
  recipeIngredients: RecipeIngredientRow[];
  inventoryItems: InventoryItemRow[];
}) => {
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  const recipeByProductId = new Map(
    recipes
      .filter((recipe) => recipe.product_id)
      .map((recipe) => [recipe.product_id as string, recipe]),
  );
  const recipeByProductName = new Map(
    recipes
      .filter((recipe) => recipe.product_name)
      .map((recipe) => [normalizeName(recipe.product_name), recipe]),
  );
  const ingredientsByRecipeId = new Map<string, RecipeIngredientRow[]>();

  recipeIngredients.forEach((ingredient) => {
    const recipeId = ingredient.recipe_id;
    if (!recipeId) return;

    ingredientsByRecipeId.set(recipeId, [
      ...(ingredientsByRecipeId.get(recipeId) ?? []),
      ingredient,
    ]);
  });

  const cogsByProduct = new Map<string, number>();
  const recipeStatusByProduct = new Map<string, MenuMarginRow["status"]>();

  orders.filter(isValidOrder).forEach((order) => {
    if (orderIdsWithActualUsage?.has(order.id)) return;

    (order.order_items || []).forEach((item) => {
      const productKey = item.product_id || item.product_name || "unknown";
      const recipe =
        recipeByProductId.get(item.product_id ?? "") ??
        recipeByProductName.get(normalizeName(item.product_name));

      if (!recipe) {
        recipeStatusByProduct.set(productKey, "recipe_needed");
        return;
      }

      const ingredients = ingredientsByRecipeId.get(recipe.id) ?? [];
      if (!ingredients.length) {
        recipeStatusByProduct.set(productKey, "recipe_needed");
        return;
      }

      let hasMissingCost = false;
      const unitCogs = ingredients.reduce((sum, ingredient) => {
        if (getRecipeCostingMode(ingredient) === "kitchen_overhead") return sum;

        const inventory = inventoryById.get(ingredient.inventory_item_id ?? "");
        const unitCost = getInventoryCost(inventory);

        if (unitCost <= 0) {
          hasMissingCost = true;
        }

        const quantityInInventoryUnit = convertQuantity(
          toNumber(ingredient.quantity_needed),
          ingredient.unit,
          inventory?.unit,
        );

        return sum + quantityInInventoryUnit * unitCost;
      }, 0);

      if (hasMissingCost || unitCogs <= 0) {
        recipeStatusByProduct.set(productKey, "cost_data_needed");
        return;
      }

      const itemCogs = unitCogs * toNumber(item.quantity);
      cogsByProduct.set(productKey, (cogsByProduct.get(productKey) ?? 0) + itemCogs);
      recipeStatusByProduct.set(productKey, "ready");
    });
  });

  return { cogsByProduct, recipeStatusByProduct };
};

const buildExceptions = ({
  orders,
  entries,
  menuMargins,
  dateRange,
  shifts,
}: {
  orders: OrderRow[];
  entries: BookkeepingEntry[];
  menuMargins: MenuMarginRow[];
  dateRange: DateRangeValue;
  shifts: ShiftRow[];
}): BookkeepingException[] => {
  const exceptions: BookkeepingException[] = [];
  const activeShifts = shifts.filter((shift) => shift.is_active !== false);

  orders.forEach((order) => {
    if (isValidOrder(order) && !order.payment_method) {
      exceptions.push({
        id: `missing-payment-${order.id}`,
        businessDate: formatBusinessDate(order.created_at),
        severity: "medium",
        type: "Missing Payment Method",
        description: `${order.order_number || "Order"} is paid but has no payment method.`,
        source: order.order_number ? `Order ${order.order_number}` : "Order",
        suggestedFix: "Open the order payment record and assign the correct payment method.",
        status: "open",
      });
    }

    if (isCancelledOrder(order) && toNumber(order.total) > 0) {
      exceptions.push({
        id: `cancelled-value-${order.id}`,
        businessDate: formatBusinessDate(order.created_at),
        severity: "high",
        type: "Cancelled Order With Value",
        description: `${order.order_number || "Cancelled order"} has a recorded value and needs review.`,
        source: order.order_number ? `Order ${order.order_number}` : "Order",
        suggestedFix: "Confirm whether refund or cancellation adjustment is needed.",
        status: "open",
      });
    }

    if (
      activeShifts.length > 0 &&
      (isValidOrder(order) || isCancelledOrder(order)) &&
      !activeShifts.some((shift) => isOrderInShift(order, shift))
    ) {
      exceptions.push({
        id: `outside-shift-${order.id}`,
        businessDate: formatBusinessDate(order.created_at),
        severity: "high",
        type: "Order Outside Active Shift",
        description: `${order.order_number || "Order"} does not match any active shift window.`,
        source: order.order_number ? `Order ${order.order_number}` : "Order",
        suggestedFix: "Update active shift hours or review the order business date before closing bookkeeping.",
        status: "open",
      });
    }
  });

  entries
    .filter((entry) => entry.status === "cost_data_needed")
    .forEach((entry) => {
      exceptions.push({
        id: `cost-${entry.id}`,
        businessDate: entry.businessDate,
        severity: "medium",
        type: "Inventory Cost Needed",
        description: `${entry.source} cannot produce reliable COGS because item cost is missing.`,
        source: entry.source,
        suggestedFix: "Complete item cost in Manager Inventory before approving margin reports.",
        status: "open",
      });
    });

  menuMargins
    .filter((row) => row.status !== "ready")
    .slice(0, 8)
    .forEach((row) => {
      const needsRecipe = row.status === "recipe_needed";

      exceptions.push({
        id: `menu-cost-${row.id}`,
        businessDate: dateRange.startDate,
        severity: "medium",
        type: needsRecipe ? "Menu Recipe Needed" : "Menu Cost Data Needed",
        description: needsRecipe
          ? `${row.menuName} has sales but no base recipe is available for margin calculation.`
          : `${row.menuName} has sales but incomplete ingredient cost data.`,
        source: row.menuName,
        suggestedFix: needsRecipe
          ? "Create a base recipe for this menu in Manager Inventory."
          : "Complete ingredient cost in Manager Inventory for this menu recipe.",
        status: "open",
      });
    });

  return exceptions;
};

type DailyAssignment = {
  staff_id: string;
  work_date: string;
  shift_id: string;
};

type WeeklyAssignment = {
  staff_id: string;
  weekday: number;
  shift_id: string;
};

export const buildShiftClosingsFromOrders = (
  orders: OrderRow[],
  dateRange: DateRangeValue,
  shifts: ShiftRow[] = [],
  dailyAssignments: DailyAssignment[] = [],
  weeklyAssignments: WeeklyAssignment[] = [],
): ShiftClosingRow[] => {
  const validOrders = orders.filter(isValidOrder);
  const cancelledOrders = orders.filter(isCancelledOrder);

  const activeShifts = shifts.filter((shift) => shift.is_active !== false);

  if (activeShifts.length > 0) {
    const validOrdersByShift = new Map<string, OrderRow[]>();
    const cancelledOrdersByShift = new Map<string, OrderRow[]>();

    const matchShift = (order: OrderRow) => {
      // 1. Try to find the shift based on creator assignment
      if (order.created_by) {
        const orderDate = formatBusinessDate(order.created_at);
        if (orderDate) {
          // Check daily override assignment first
          const dailyAss = dailyAssignments.find(
            (a) => a.staff_id === order.created_by && a.work_date === orderDate
          );
          if (dailyAss) {
            const matchedShift = activeShifts.find((s) => s.id === dailyAss.shift_id);
            if (matchedShift) return matchedShift;
          }
          
          // Check weekly recurring assignment second
          const weekday = getIsoWeekdayFromDateString(orderDate);
          const weeklyAss = weeklyAssignments.find(
            (a) => a.staff_id === order.created_by && a.weekday === weekday
          );
          if (weeklyAss) {
            const matchedShift = activeShifts.find((s) => s.id === weeklyAss.shift_id);
            if (matchedShift) return matchedShift;
          }
        }
      }

      // 2. Fallback to original time-based matching
      return activeShifts.find((shift) => isOrderInShift(order, shift));
    };

    [...validOrders, ...cancelledOrders].forEach((order) => {
      const shift = matchShift(order);
      const businessDate = formatBusinessDate(order.created_at);
      if (!shift || !businessDate) return;

      const key = `${businessDate}-${shift.id}`;
      const targetMap = isCancelledOrder(order) ? cancelledOrdersByShift : validOrdersByShift;
      targetMap.set(key, [...(targetMap.get(key) ?? []), order]);
    });

    return activeShifts
      .flatMap((shift) => {
        const rows: ShiftClosingRow[] = [];
        const start = toUtcDateOnly(dateRange.startDate);
        const end = toUtcDateOnly(dateRange.endDate);

        for (let cursor = start; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
          const businessDate = cursor.toISOString().slice(0, 10);
          const key = `${businessDate}-${shift.id}`;
          const shiftValidOrders = validOrdersByShift.get(key) ?? [];
          const shiftCancelledOrders = cancelledOrdersByShift.get(key) ?? [];

          const grossSales = shiftValidOrders.reduce((sum, order) => sum + toNumber(order.subtotal || order.total), 0);
          const discountTotal = shiftValidOrders.reduce((sum, order) => sum + toNumber(order.discount), 0);
          const netSales = shiftValidOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
          const cashExpected = shiftValidOrders
            .filter((order) => String(order.payment_method || "").toLowerCase() === "cash")
            .reduce((sum, order) => sum + toNumber(order.total), 0);
          const drawer = buildCashDrawerFields({ cashSales: cashExpected });

          rows.push({
            id: `${shift.id}-${businessDate}`,
            shiftName: shift.shift_name || "Shift",
            businessDate,
            openedAt: `${businessDate}T${String(shift.start_time || "00:00").slice(0, 5)}:00`,
            closedAt: `${businessDate}T${String(shift.end_time || "23:59").slice(0, 5)}:00`,
            grossSales,
            discountTotal,
            netSales,
            ...drawer,
            nonCashSales: Math.max(netSales - cashExpected, 0),
            cancelledCount: shiftCancelledOrders.length,
            status: shiftValidOrders.length > 0 || shiftCancelledOrders.length > 0 ? "needs_review" : "draft",
          });
        }

        return rows;
      })
      .sort((left, right) => right.businessDate.localeCompare(left.businessDate));
  }

  const grossSales = validOrders.reduce((sum, order) => sum + toNumber(order.subtotal || order.total), 0);
  const discountTotal = validOrders.reduce((sum, order) => sum + toNumber(order.discount), 0);
  const netSales = validOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const cashExpected = validOrders
    .filter((order) => String(order.payment_method || "").toLowerCase() === "cash")
    .reduce((sum, order) => sum + toNumber(order.total), 0);

  const nonCashSales = Math.max(netSales - cashExpected, 0);
  const drawer = buildCashDrawerFields({ cashSales: cashExpected });

  return [
    {
      id: `auto-${dateRange.startDate}-${dateRange.endDate}`,
      shiftName: "Auto Draft",
      businessDate: dateRange.startDate,
      openedAt: `${dateRange.startDate}T00:00:00`,
      closedAt: `${dateRange.endDate}T23:59:59`,
      grossSales,
      discountTotal,
      netSales,
      ...drawer,
      nonCashSales,
      cancelledCount: cancelledOrders.length,
      status: validOrders.length > 0 ? "needs_review" : "draft",
    },
  ];
};

const buildExpenseRows = (expenses: ExpenseRow[]): BookkeepingExpense[] => {
  return expenses.map((expense) => ({
    id: expense.id,
    expenseDate: expense.expense_date,
    category: expense.category,
    amount: toNumber(expense.amount),
    paymentMethod: expense.payment_method,
    vendor: expense.vendor,
    receiptUrl: expense.receipt_url,
    note: expense.note,
  }));
};

export async function loadBookkeepingDashboardData(
  dateRange: DateRangeValue,
): Promise<BookkeepingDashboardData> {
  return loadBookkeepingDashboardDataFromClient(supabase, dateRange);
}

const USAGE_DETAIL_QUERY_BATCH_SIZE = 200;

async function loadUsageDetailsForTransactions(
  db: SupabaseClient,
  transactionIds: string[],
): Promise<UsageDetailRow[]> {
  if (transactionIds.length === 0) return [];

  const batches: string[][] = [];
  for (let index = 0; index < transactionIds.length; index += USAGE_DETAIL_QUERY_BATCH_SIZE) {
    batches.push(transactionIds.slice(index, index + USAGE_DETAIL_QUERY_BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map((ids) =>
      db
        .from("usage_transaction_details")
        .select("usage_transaction_id, inventory_item_id, ingredient_name, quantity_used, unit")
        .in("usage_transaction_id", ids),
    ),
  );

  const error = results.find((result) => result.error)?.error;
  if (error) throw error;

  return results.flatMap((result) => (result.data || []) as UsageDetailRow[]);
}

export async function loadBookkeepingDashboardDataFromClient(
  db: SupabaseClient,
  dateRange: DateRangeValue,
): Promise<BookkeepingDashboardData> {
  const [
    ordersResult,
    usageTransactionsResult,
    inventoryResult,
    inventoryBatchesResult,
    recipesResult,
    recipeIngredientsResult,
    expensesResult,
    shiftsResult,
    orderCorrectionsResult,
    kitchenMovementsResult,
    dailyAssignmentsResult,
    weeklyAssignmentsResult,
  ] =
    await Promise.all([
      db
        .from("orders")
        .select(`
          id,
          order_number,
          created_at,
          completed_at,
          status,
          payment_status,
          payment_method,
          subtotal,
          discount,
          tax,
          total,
          created_by,
          order_items (
            id,
            product_id,
            product_name,
            quantity,
            total_price
          )
        `)
        .gte("created_at", toDateTimeStart(dateRange.startDate))
        .lte("created_at", toDateTimeEnd(dateRange.endDate))
        .order("created_at", { ascending: false }),
      db
        .from("usage_transactions")
        .select("id, order_id, product_id, product_name, transaction_type, type, timestamp, created_at, notes")
        .gte("created_at", toDateTimeStart(dateRange.startDate))
        .lte("created_at", toDateTimeEnd(dateRange.endDate))
        .order("created_at", { ascending: false }),
      db
        .from("inventory_items")
        .select("*"),
      db
        .from("inventory_batches")
        .select("id, inventory_item_id, batch_number, supplier, received_at, expiry_date, quantity_received, quantity_remaining, unit, unit_cost, source_transaction_id, receipt_url")
        .gte("received_at", toDateTimeStart(dateRange.startDate))
        .lte("received_at", toDateTimeEnd(dateRange.endDate))
        .order("received_at", { ascending: false }),
      db
        .from("recipes")
        .select("id, product_id, product_name, recipe_type")
        .eq("recipe_type", "base"),
      db
        .from("recipe_ingredients")
        .select("recipe_id, inventory_item_id, ingredient_name, quantity_needed, unit, costing_mode"),
      db
        .from("bookkeeping_expenses")
        .select("id, expense_date, category, amount, payment_method, vendor, receipt_url, note")
        .gte("expense_date", dateRange.startDate)
        .lte("expense_date", dateRange.endDate)
        .order("expense_date", { ascending: false }),
      db
        .from("shifts")
        .select("id, shift_name, start_time, end_time, is_active")
        .order("start_time", { ascending: true }),
      db
        .from("order_corrections")
        .select("id, order_id, status, physical_status, note"),
      db
        .from("kitchen_station_movements")
        .select("id, inventory_item_id, movement_type, quantity, unit, total_cost, business_date, shift_name, notes, created_by_name, created_at")
        .gte("business_date", dateRange.startDate)
        .lte("business_date", dateRange.endDate)
        .order("created_at", { ascending: false }),
      db
        .from("staff_shift_daily_assignments")
        .select("staff_id, shift_id, work_date")
        .in("status", ["assigned", "completed"])
        .gte("work_date", dateRange.startDate)
        .lte("work_date", dateRange.endDate),
      db
        .from("staff_shift_weekly_assignments")
        .select("staff_id, shift_id, weekday")
        .eq("status", "assigned"),
    ]);

  if (ordersResult.error) throw ordersResult.error;
  if (usageTransactionsResult.error) throw usageTransactionsResult.error;
  if (inventoryResult.error) throw inventoryResult.error;
  if (inventoryBatchesResult.error && !isMissingInventoryBatchTableError(inventoryBatchesResult.error)) {
    throw inventoryBatchesResult.error;
  }
  if (recipesResult.error) throw recipesResult.error;
  if (recipeIngredientsResult.error) throw recipeIngredientsResult.error;
  if (expensesResult.error) throw expensesResult.error;
  if (orderCorrectionsResult.error) throw orderCorrectionsResult.error;
  if (kitchenMovementsResult.error && !isMissingKitchenStationTableError(kitchenMovementsResult.error)) {
    throw kitchenMovementsResult.error;
  }
  if (dailyAssignmentsResult.error) throw dailyAssignmentsResult.error;
  if (weeklyAssignmentsResult.error) throw weeklyAssignmentsResult.error;

  const orders = applyOrderCorrections(
    (ordersResult.data || []) as OrderRow[],
    (orderCorrectionsResult.data || []) as OrderCorrectionRow[],
  );
  const usageTransactions = (usageTransactionsResult.data || []) as UsageTransactionRow[];
  const usageDetails = await loadUsageDetailsForTransactions(
    db,
    usageTransactions.map((transaction) => transaction.id),
  );
  const inventoryItems = (inventoryResult.data || []) as InventoryItemRow[];
  const inventoryBatches = inventoryBatchesResult.error
    ? []
    : ((inventoryBatchesResult.data || []) as InventoryBatchRow[]);
  const recipes = (recipesResult.data || []) as RecipeRow[];
  const recipeIngredients = (recipeIngredientsResult.data || []) as RecipeIngredientRow[];
  const expenses = buildExpenseRows((expensesResult.data || []) as ExpenseRow[]);
  const shifts = shiftsResult.error ? [] : ((shiftsResult.data || []) as ShiftRow[]);
  const kitchenMovements = kitchenMovementsResult.error
    ? []
    : ((kitchenMovementsResult.data || []) as KitchenStationMovementRow[]);

  const salesEntries = createSalesEntries(orders);
  const taxEntries = createTaxEntries(orders);
  const discountEntries = createDiscountEntries(orders);
  const cancellationEntries = createCancellationEntries(orders);
  const expenseEntries = createExpenseEntries(expenses);
  const kitchenBulkUsageEntries = createKitchenBulkUsageEntries(kitchenMovements, inventoryItems);
  const inventoryEntries = createInventoryEntries({
    transactions: usageTransactions,
    details: usageDetails,
    inventoryItems,
    inventoryBatches,
  });

  const entries = [
    ...salesEntries,
    ...taxEntries,
    ...discountEntries,
    ...cancellationEntries,
    ...expenseEntries,
    ...kitchenBulkUsageEntries,
    ...inventoryEntries,
  ].sort((left, right) => right.entryAt.localeCompare(left.entryAt));

  const usageCogsEstimate = inventoryEntries
    .filter((entry) => entry.type === "cogs_estimate" && entry.status !== "cost_data_needed")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const qualityCheckUsageCost = [...inventoryEntries, ...kitchenBulkUsageEntries]
    .filter((entry) => entry.type === "quality_check_usage" && entry.status !== "cost_data_needed")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const kitchenBulkCogs = kitchenBulkUsageEntries
    .filter((entry) => entry.type === "kitchen_bulk_usage")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const hasCogsGaps = inventoryEntries.some((entry) => entry.status === "cost_data_needed");

  // Gross Sales = Σ subtotal atau total pesanan valid
  // Discounts = Σ diskon pesanan valid
  // Tax Collected = Σ pajak pesanan valid

  const grossSales = orders.filter(isValidOrder).reduce((sum, order) => sum + toNumber(order.subtotal || order.total), 0);
  const discounts = orders.filter(isValidOrder).reduce((sum, order) => sum + toNumber(order.discount), 0);
  const taxCollected = orders.filter(isValidOrder).reduce((sum, order) => sum + toNumber(order.tax), 0);
  const netSales = orders
    .filter(isValidOrder)
    .reduce((sum, order) => sum + Math.max(toNumber(order.total) - toNumber(order.tax), 0), 0);
  const cashExpected = orders
    .filter(isValidOrder)
    .filter((order) => String(order.payment_method || "").toLowerCase() === "cash")
    .reduce((sum, order) => sum + toNumber(order.total), 0);
  const openingCashTotal = 0;
  const expectedDrawerCash = openingCashTotal + cashExpected;
  const cashToDeposit = cashExpected;
  const closingFloatTotal = 0;

  const actualUsageCogs = buildActualUsageCogsByProduct({
    orders,
    transactions: usageTransactions,
    details: usageDetails,
    inventoryItems,
  });
  const { cogsByProduct: recipeCogsByProduct, recipeStatusByProduct } = buildRecipeCostMaps({
    orders,
    orderIdsWithActualUsage: actualUsageCogs.orderIdsWithUsage,
    recipes,
    recipeIngredients,
    inventoryItems,
  });
  const cogsByProduct = new Map(recipeCogsByProduct);
  actualUsageCogs.cogsByProduct.forEach((amount, productKey) => {
    cogsByProduct.set(productKey, (cogsByProduct.get(productKey) ?? 0) + amount);
    recipeStatusByProduct.set(productKey, "ready");
  });
  const menuMargins = buildMenuMargins({
    orders,
    cogsByProduct,
    cogsByOrderProduct: actualUsageCogs.cogsByOrderProduct,
    recipeStatusByProduct,
  });
  const exceptions = buildExceptions({ orders, entries, menuMargins, dateRange, shifts });
  const recipeCogsEstimate = menuMargins.reduce(
    // COGS =
    // Recipe COGS atau Usage COGS
    // + Kitchen Bulk COGS
    // + Quality Check Usage Cost
    (sum, row) => sum + (row.estimatedCogs ?? 0),
    0,
  );
  const hasMenuCostGaps = menuMargins.some((row) => row.status !== "ready");
  const cogsEstimate = (recipeCogsEstimate > 0 ? recipeCogsEstimate : usageCogsEstimate) + kitchenBulkCogs + qualityCheckUsageCost;
  const estimatedCogs = hasCogsGaps || hasMenuCostGaps || cogsEstimate <= 0 ? null : cogsEstimate;
  // grossProfit = netSales - estimatedCogs
  const grossProfit = estimatedCogs === null ? null : netSales - estimatedCogs;
  const operatingExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return {
    dateRange,
    summary: {
      grossSales,
      discounts,
      netSales,
      taxCollected,
      estimatedCogs,
      grossProfit,
      operatingExpenses,
      // netProfitEstimate =
      // grossProfit - operatingExpenses
      netProfitEstimate: grossProfit === null ? null : grossProfit - operatingExpenses,
      openingCashTotal,
      cashExpected,
      expectedDrawerCash,
      cashToDeposit,
      closingFloatTotal,
      cashDifference: null,
      totalOrders: orders.filter(isValidOrder).length,
      cancelledOrders: orders.filter(isCancelledOrder).length,
      unresolvedExceptions: exceptions.filter((exception) => exception.status === "open").length,
    },
    paymentBreakdown: buildPaymentBreakdown(orders),
    entries,
    expenses,
    exceptions,
    reports: [],
    menuMargins,
    shiftClosings: buildShiftClosingsFromOrders(
      orders,
      dateRange,
      shifts,
      dailyAssignmentsResult.data || [],
      weeklyAssignmentsResult.data || [],
    ),
    dailyClosing: null,
  };
}
