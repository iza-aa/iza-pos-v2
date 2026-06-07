import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMetric, toNumber } from "./metricSnapshotBuilder";
import {
  buildRecommendationPeriodContext,
  isDateInPeriod,
} from "./periodService";
import type {
  OwnerInsightPeriod,
  RecommendationAllowedIssue,
  RecommendationChartPoint,
  RecommendationMetric,
  RecommendationSnapshot,
} from "./recommendationSnapshotTypes";

type InventoryItemRow = {
  id: string;
  name?: string | null;
  current_stock?: number | string | null;
  reorder_level?: number | string | null;
  unit?: string | null;
  category?: string | null;
  price_per_unit?: number | string | null;
  cost_per_unit?: number | string | null;
};

type UsageTransactionRow = {
  id: string;
  transaction_type?: string | null;
  type?: string | null;
  created_at?: string | null;
  timestamp?: string | null;
  notes?: string | null;
  performed_by_name?: string | null;
};

type UsageTransactionDetailRow = {
  usage_transaction_id?: string | null;
  inventory_item_id?: string | null;
  ingredient_name?: string | null;
  quantity_used?: number | string | null;
  unit?: string | null;
  previous_stock?: number | string | null;
  new_stock?: number | string | null;
};

type StockReportRow = {
  id: string;
  material_name?: string | null;
  report_type?: string | null;
  status?: string | null;
  reported_by_role?: string | null;
  created_at?: string | null;
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
};

const normalizeInventoryTransactionType = (type?: string | null) => {
  const raw = String(type || "sale").toLowerCase();
  if (raw === "order_usage") return "sale";
  if (raw === "stock_in") return "restock";
  return raw;
};

const getTransactionTimestamp = (transaction?: UsageTransactionRow) =>
  transaction?.created_at || transaction?.timestamp || null;

const getJakartaDateParts = (value: string | null | undefined) => {
  if (!value) return null;

  const normalizedValue = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    hour: getPart("hour") === "24" ? "00" : getPart("hour").padStart(2, "0"),
  };
};

const getBusinessDateFromTimestamp = (value: string | null | undefined) =>
  getJakartaDateParts(value)?.date ?? "";

const getBusinessHourFromTimestamp = (value: string | null | undefined) =>
  getJakartaDateParts(value)?.hour ?? "00";

const getInventoryUnitCost = (item?: InventoryItemRow) =>
  toNumber(item?.cost_per_unit ?? item?.price_per_unit);

const formatEvidenceNumber = (value: number | string | null, unit: string) => {
  if (value === null) return "not available";
  if (typeof value === "string") return value;
  if (unit === "IDR") return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
  if (unit === "percent") return `${value.toFixed(1)}%`;
  return Math.round(value).toLocaleString("id-ID");
};

const groupBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item) || "Unknown";
    map.set(key, [...(map.get(key) ?? []), item]);
  });
  return map;
};

const isTransactionInPeriod = (
  transaction: UsageTransactionRow,
  period: OwnerInsightPeriod,
) => {
  const date = getBusinessDateFromTimestamp(getTransactionTimestamp(transaction));
  return date ? isDateInPeriod(date, period) : false;
};

const buildInventoryRows = (inventoryItems: InventoryItemRow[]) =>
  inventoryItems
    .map((item) => {
      const current = toNumber(item.current_stock);
      const minimum = toNumber(item.reorder_level);
      const unitCost = getInventoryUnitCost(item);

      return {
        id: item.id,
        name: item.name || "Inventory item",
        category: item.category || "General",
        current,
        minimum,
        unit: item.unit || "",
        unitCost,
        stockPercent: minimum > 0 ? Math.min(100, (current / minimum) * 100) : 100,
        suggestedRestock: Math.max(0, minimum * 2 - current),
        suggestedRestockCost: Math.max(0, minimum * 2 - current) * unitCost,
        hasDataIssue: current < 0 || minimum <= 0 || !item.unit,
      };
    })
    .sort((a, b) => a.stockPercent - b.stockPercent);

const getDetailsForTransactions = (
  details: UsageTransactionDetailRow[],
  transactions: UsageTransactionRow[],
) => {
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));
  return details.filter(
    (detail) =>
      detail.usage_transaction_id &&
      transactionIds.has(detail.usage_transaction_id),
  );
};

const buildUsageValueByItem = ({
  inventoryItems,
  transactions,
  details,
}: {
  inventoryItems: InventoryItemRow[];
  transactions: UsageTransactionRow[];
  details: UsageTransactionDetailRow[];
}) => {
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  const transactionById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const stockOutByItem = new Map<
    string,
    { name: string; value: number; quantity: number; unit: string }
  >();

  details.forEach((detail) => {
    const transaction = transactionById.get(detail.usage_transaction_id ?? "");
    const type = normalizeInventoryTransactionType(
      transaction?.transaction_type ?? transaction?.type,
    );
    if (type !== "sale") return;

    const inventory = inventoryById.get(detail.inventory_item_id ?? "");
    const quantity = toNumber(detail.quantity_used);
    const value = quantity * getInventoryUnitCost(inventory);
    const itemId = detail.inventory_item_id ?? detail.ingredient_name ?? "unknown";
    const current = stockOutByItem.get(itemId) ?? {
      name: detail.ingredient_name || inventory?.name || "Inventory item",
      value: 0,
      quantity: 0,
      unit: detail.unit || inventory?.unit || "",
    };

    stockOutByItem.set(itemId, {
      ...current,
      value: current.value + value,
      quantity: current.quantity + quantity,
    });
  });

  return Array.from(stockOutByItem.values()).sort(
    (a, b) => b.value - a.value || b.quantity - a.quantity,
  );
};

const summarizeUsage = ({
  inventoryItems,
  transactions,
  details,
}: {
  inventoryItems: InventoryItemRow[];
  transactions: UsageTransactionRow[];
  details: UsageTransactionDetailRow[];
}) => {
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  const transactionById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const rows = details.map((detail) => {
    const transaction = transactionById.get(detail.usage_transaction_id ?? "");
    const inventory = inventoryById.get(detail.inventory_item_id ?? "");
    const type = normalizeInventoryTransactionType(
      transaction?.transaction_type ?? transaction?.type,
    );
    const quantity = toNumber(detail.quantity_used);
    const value = quantity * getInventoryUnitCost(inventory);

    return {
      type,
      quantity,
      value,
    };
  });

  return {
    movementEventCount: details.length,
    stockInValue: rows
      .filter((row) => row.type === "restock")
      .reduce((sum, row) => sum + row.value, 0),
    stockOutValue: rows
      .filter((row) => row.type === "sale")
      .reduce((sum, row) => sum + row.value, 0),
    adjustmentValue: rows
      .filter((row) => row.type === "adjustment")
      .reduce((sum, row) => sum + row.value, 0),
  };
};

const buildUsageTrend = ({
  inventoryItems,
  transactions,
  details,
  granularity,
}: {
  inventoryItems: InventoryItemRow[];
  transactions: UsageTransactionRow[];
  details: UsageTransactionDetailRow[];
  granularity: string;
}) => {
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  const transactionById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const useHourlyBucket = granularity === "hour";

  return Array.from(
    groupBy(details, (detail) => {
      const transaction = transactionById.get(detail.usage_transaction_id ?? "");
      const timestamp = getTransactionTimestamp(transaction);
      const date = getBusinessDateFromTimestamp(timestamp);
      const hour = getBusinessHourFromTimestamp(timestamp);
      return useHourlyBucket ? `${date} ${hour}:00` : date;
    }).entries(),
  )
    .map(([bucket, rows]): RecommendationChartPoint => {
      const sumByType = (type: string) =>
        rows
          .filter((detail) => {
            const transaction = transactionById.get(detail.usage_transaction_id ?? "");
            return (
              normalizeInventoryTransactionType(
                transaction?.transaction_type ?? transaction?.type,
              ) === type
            );
          })
          .reduce((sum, detail) => {
            const inventory = inventoryById.get(detail.inventory_item_id ?? "");
            return sum + toNumber(detail.quantity_used) * getInventoryUnitCost(inventory);
          }, 0);

      return {
        period: useHourlyBucket ? bucket.slice(11) : bucket,
        stockInValue: sumByType("restock"),
        stockOutValue: sumByType("sale"),
        adjustmentValue: sumByType("adjustment"),
      };
    })
    .sort((a, b) => String(a.period).localeCompare(String(b.period)));
};

const buildMovementRows = ({
  inventoryItems,
  transactions,
  details,
}: {
  inventoryItems: InventoryItemRow[];
  transactions: UsageTransactionRow[];
  details: UsageTransactionDetailRow[];
}) => {
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  const transactionById = new Map(transactions.map((transaction) => [transaction.id, transaction]));

  return details
    .map((detail, index) => {
      const transaction = transactionById.get(detail.usage_transaction_id ?? "");
      const inventory = inventoryById.get(detail.inventory_item_id ?? "");
      const type = normalizeInventoryTransactionType(
        transaction?.transaction_type ?? transaction?.type,
      );

      return {
        id: `${detail.usage_transaction_id}-${detail.inventory_item_id}-${index}`,
        itemName: detail.ingredient_name || inventory?.name || "Inventory item",
        type,
        quantity: toNumber(detail.quantity_used),
        unit: detail.unit || inventory?.unit || "",
        previousStock: toNumber(detail.previous_stock),
        newStock: toNumber(detail.new_stock),
        timestamp: getTransactionTimestamp(transaction) || "",
        actor: transaction?.performed_by_name || "System",
      };
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 6);
};

const buildExpiryReadinessRows = (inventoryItems: InventoryItemRow[]) => {
  const perishableKeywords = [
    "milk",
    "chicken",
    "vegetable",
    "meat",
    "cream",
    "cheese",
    "egg",
  ];

  return inventoryItems
    .filter((item) => {
      const label = `${item.name ?? ""} ${item.category ?? ""}`.toLowerCase();
      return perishableKeywords.some((keyword) => label.includes(keyword));
    })
    .slice(0, 6)
    .map((item) => ({
      name: item.name || "Inventory item",
      category: item.category || "Inventory",
      stock: toNumber(item.current_stock),
      unit: item.unit || "",
    }));
};

const getDaysUntilExpiry = (expiryDate: string | null | undefined) => {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return null;
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
};

const buildBatchRows = (
  batches: InventoryBatchRow[],
  inventoryItems: InventoryItemRow[],
) => {
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));

  return batches
    .map((batch) => {
      const item = batch.inventory_item_id
        ? inventoryById.get(batch.inventory_item_id)
        : undefined;
      const remaining = toNumber(batch.quantity_remaining);
      const unitCost = toNumber(batch.unit_cost) || getInventoryUnitCost(item);
      const daysUntilExpiry = getDaysUntilExpiry(batch.expiry_date);

      return {
        itemName: item?.name || "Inventory item",
        category: item?.category || "Inventory",
        batchNumber: batch.batch_number || "-",
        supplier: batch.supplier || "-",
        receivedAt: batch.received_at || null,
        expiryDate: batch.expiry_date || null,
        daysUntilExpiry,
        quantityReceived: toNumber(batch.quantity_received),
        quantityRemaining: remaining,
        unit: batch.unit || item?.unit || "",
        unitCost,
        value: remaining * unitCost,
      };
    })
    .sort((a, b) => {
      const expiryA = a.expiryDate || "9999-12-31";
      const expiryB = b.expiryDate || "9999-12-31";
      if (expiryA !== expiryB) return expiryA.localeCompare(expiryB);
      return String(a.receivedAt || "").localeCompare(String(b.receivedAt || ""));
    });
};

const buildInventoryAllowedIssues = ({
  metrics,
  lowStockRows,
  mostUsed,
  expiryReadinessRows,
  batchRows,
  stockReportRows,
}: {
  metrics: Record<string, RecommendationMetric>;
  lowStockRows: ReturnType<typeof buildInventoryRows>;
  mostUsed: ReturnType<typeof buildUsageValueByItem>[number] | undefined;
  expiryReadinessRows: ReturnType<typeof buildExpiryReadinessRows>;
  batchRows: ReturnType<typeof buildBatchRows>;
  stockReportRows: StockReportRow[];
}): RecommendationAllowedIssue[] => {
  const issues: RecommendationAllowedIssue[] = [];
  const criticalItems = Number(metrics.criticalItems.value ?? 0);
  const dataIssues = Number(metrics.dataIssues.value ?? 0);
  const restockCost = Number(metrics.estimatedRestockCost.value ?? 0);
  const movementEvents = Number(metrics.movementEventCount.value ?? 0);
  const stockOutValue = Number(metrics.stockOutValue.value ?? 0);
  const stockOutPrevious = Number(metrics.stockOutValue.previousValue ?? 0);
  const stockOutChange = metrics.stockOutValue.changePct ?? 0;
  const pendingStockReports = Number(metrics.pendingStockReports?.value ?? 0);
  const lowestStockItem = lowStockRows[0];
  const activeBatchRows = batchRows.filter((batch) => batch.quantityRemaining > 0);
  const expiredBatchRows = activeBatchRows.filter(
    (batch) => batch.daysUntilExpiry !== null && batch.daysUntilExpiry < 0,
  );
  const nearExpiryBatchRows = activeBatchRows.filter(
    (batch) =>
      batch.daysUntilExpiry !== null &&
      batch.daysUntilExpiry >= 0 &&
      batch.daysUntilExpiry <= 7,
  );

  if (pendingStockReports > 0) {
    const repeatedReport = Array.from(
      stockReportRows.reduce((map, report) => {
        const key = report.material_name || "Unknown material";
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map<string, number>()),
    ).sort((left, right) => right[1] - left[1])[0];

    issues.push({
      id: "inventory-pending-stock-reports",
      title: "Staff Stock Reports Need Follow Up",
      priority: "medium",
      confidence: "high",
      problem: "Barista or kitchen staff submitted stock reports that are still waiting for manager review.",
      evidence: [
        `Pending Stock Reports is ${formatEvidenceNumber(pendingStockReports, "count")}.`,
        repeatedReport
          ? `${repeatedReport[0]} appears in ${formatEvidenceNumber(repeatedReport[1], "count")} stock report(s).`
          : "No repeated stock report item was detected.",
      ],
      recommendationHint:
        "Ask the manager to review pending stock reports and resolve repeated material issues before they affect menu availability.",
      expectedImpact:
        "Following up staff reports helps prevent stock issues from being lost during busy shifts.",
      metricKeys: ["pendingStockReports"],
    });
  }

  if (dataIssues > 0) {
    issues.push({
      id: "inventory-data-issues",
      title: "Inventory Data Needs Cleanup",
      priority: "high",
      confidence: "high",
      problem: "Some inventory records have negative stock, missing units, or missing minimum stock thresholds.",
      evidence: [
        `Data Issues is ${formatEvidenceNumber(dataIssues, "count")}.`,
        `Total SKUs is ${formatEvidenceNumber(metrics.totalItems.value, "count")}.`,
      ],
      recommendationHint:
        "Fix negative stock, missing units, and missing reorder levels before relying on inventory recommendations.",
      expectedImpact:
        "Cleaner inventory master data makes low-stock alerts and restock cost estimates more reliable.",
      metricKeys: ["dataIssues", "totalItems"],
    });
  }

  if (criticalItems > 0 && lowestStockItem) {
    issues.push({
      id: "inventory-critical-stock",
      title: "Critical Stock Needs Owner Attention",
      priority: "high",
      confidence: "high",
      problem: "One or more inventory items are at or below the reorder level.",
      evidence: [
        `Critical Items is ${formatEvidenceNumber(criticalItems, "count")}.`,
        `${lowestStockItem.name} has ${formatEvidenceNumber(lowestStockItem.current, "count")} ${lowestStockItem.unit} current stock and ${formatEvidenceNumber(lowestStockItem.minimum, "count")} ${lowestStockItem.unit} minimum stock.`,
      ],
      recommendationHint:
        "Prioritize restocking critical items first, starting from the lowest stock ratio and items linked to high sales usage.",
      expectedImpact:
        "Restocking the most urgent items reduces menu unavailability and protects sales continuity.",
      metricKeys: ["criticalItems", "lowStockItems"],
    });
  }

  if (restockCost > 0) {
    issues.push({
      id: "inventory-restock-budget",
      title: "Restock Budget Is Required",
      priority: criticalItems > 0 ? "medium" : "low",
      confidence: "high",
      problem: "The dashboard estimates a restock cost to restore inventory buffer.",
      evidence: [
        `Estimated Restock Cost is ${formatEvidenceNumber(restockCost, "IDR")}.`,
        `Critical Items is ${formatEvidenceNumber(criticalItems, "count")}.`,
      ],
      recommendationHint:
        "Use the estimated restock cost as a purchasing budget baseline, then validate supplier prices before buying.",
      expectedImpact:
        "A budget-first restock plan helps the owner control cash outflow while fixing stock risk.",
      metricKeys: ["estimatedRestockCost", "criticalItems"],
    });
  }

  if (stockOutValue > 0 && stockOutPrevious > 0 && stockOutChange >= 25) {
    issues.push({
      id: "inventory-stock-out-value-increase",
      title: "Stock-Out Value Increased",
      priority: "medium",
      confidence: "high",
      problem: "The value of inventory consumed is higher than the comparison period.",
      evidence: [
        `Stock Out Value is ${formatEvidenceNumber(stockOutValue, "IDR")}.`,
        `Comparison stock out value was ${formatEvidenceNumber(stockOutPrevious, "IDR")}.`,
        `Stock out value change is ${stockOutChange.toFixed(1)}%.`,
      ],
      recommendationHint:
        "Review high-usage ingredients and menu demand before increasing reorder quantities across all items.",
      expectedImpact:
        "Targeted purchasing prevents overstock while supporting items with real usage growth.",
      metricKeys: ["stockOutValue", "highestUsage"],
    });
  }

  if (mostUsed && mostUsed.value > 0) {
    issues.push({
      id: "inventory-highest-usage-item",
      title: "Highest Usage Item Should Be Watched",
      priority: "medium",
      confidence: "high",
      problem: "One inventory item has the largest stock-out value in the selected period.",
      evidence: [
        `${mostUsed.name} has stock-out value ${formatEvidenceNumber(mostUsed.value, "IDR")}.`,
        `${mostUsed.name} used ${formatEvidenceNumber(mostUsed.quantity, "count")} ${mostUsed.unit}.`,
      ],
      recommendationHint:
        "Check whether this item supports top-selling menus and adjust reorder planning around its usage pattern.",
      expectedImpact:
        "Monitoring the highest-usage item helps prevent silent stock depletion in key recipes.",
      metricKeys: ["highestUsage", "stockOutValue"],
    });
  }

  if (movementEvents === 0) {
    issues.push({
      id: "inventory-no-movement-records",
      title: "No Stock Movement Recorded",
      priority: "medium",
      confidence: "high",
      problem: "No stock movement events were recorded in the selected period.",
      evidence: [
        `Movement Events is ${formatEvidenceNumber(movementEvents, "count")}.`,
        `Total SKUs is ${formatEvidenceNumber(metrics.totalItems.value, "count")}.`,
      ],
      recommendationHint:
        "Verify whether stock usage and restock transactions are being recorded consistently from POS and inventory workflows.",
      expectedImpact:
        "Reliable movement records make usage trend, COGS signals, and restock planning more trustworthy.",
      metricKeys: ["movementEventCount", "totalItems"],
    });
  }

  if (expiryReadinessRows.length > 0 && batchRows.length === 0) {
    issues.push({
      id: "inventory-expiry-tracking-gap",
      title: "Expiry Tracking Is Not Ready Yet",
      priority: "low",
      confidence: "medium",
      problem: "Perishable inventory exists, but expiry date and batch fields are not available in the current dataset.",
      evidence: [
        `Perishable signal items detected is ${formatEvidenceNumber(expiryReadinessRows.length, "count")}.`,
        "Expiry date fields are not included in the inventory snapshot.",
      ],
      recommendationHint:
        "Add batch, received date, and expiry date fields before enabling FIFO or FEFO expiry alerts.",
      expectedImpact:
        "Expiry-ready data will allow the owner to manage waste risk without AI guessing spoilage.",
      metricKeys: ["expiryReadiness"],
    });
  }

  if (expiredBatchRows.length > 0 || nearExpiryBatchRows.length > 0) {
    const mostUrgentBatch = [...expiredBatchRows, ...nearExpiryBatchRows][0];

    issues.push({
      id: "inventory-batch-expiry-risk",
      title: "Batch Expiry Risk Needs Review",
      priority: expiredBatchRows.length > 0 ? "high" : "medium",
      confidence: "high",
      problem:
        "Active inventory batches have expiry risk in the current batch stock data.",
      evidence: [
        `Expired active batches is ${formatEvidenceNumber(expiredBatchRows.length, "count")}.`,
        `Near-expiry active batches is ${formatEvidenceNumber(nearExpiryBatchRows.length, "count")}.`,
        `Most urgent batch is ${mostUrgentBatch.itemName} batch ${mostUrgentBatch.batchNumber}.`,
      ],
      recommendationHint:
        "Ask the manager to review Batch Stock, prioritize FEFO usage, and decide whether near-expiry stock should be used, discounted, or written off.",
      expectedImpact:
        "Acting on batch-level expiry data helps reduce waste and keeps FIFO/FEFO discipline visible to the owner.",
      metricKeys: ["expiryReadiness"],
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "inventory-monitor-baseline",
      title: "Inventory Signals Are Stable",
      priority: "low",
      confidence: "medium",
      problem: "No critical inventory issue was detected from selected-period metrics.",
      evidence: [
        `Critical Items is ${formatEvidenceNumber(criticalItems, "count")}.`,
        `Data Issues is ${formatEvidenceNumber(dataIssues, "count")}.`,
        `Movement Events is ${formatEvidenceNumber(movementEvents, "count")}.`,
      ],
      recommendationHint:
        "Keep monitoring low stock, usage value, stock movement, and data quality before changing purchasing rules.",
      expectedImpact:
        "A stable inventory baseline helps prevent unnecessary purchasing and keeps attention on real stock risk.",
      metricKeys: ["criticalItems", "dataIssues", "movementEventCount"],
    });
  }

  return issues.slice(0, 5);
};

export async function buildInventoryRecommendationSnapshot(
  supabase: SupabaseClient,
  insightPeriod?: OwnerInsightPeriod,
): Promise<RecommendationSnapshot> {
  const period = buildRecommendationPeriodContext(insightPeriod);
  const [inventoryResult, transactionResult, detailResult, stockReportResult, batchResult] = await Promise.all([
    supabase.from("inventory_items").select("*").order("name", { ascending: true }),
    supabase
      .from("usage_transactions")
      .select("id,transaction_type,type,created_at,timestamp,notes,performed_by_name")
      .order("created_at", { ascending: false }),
    supabase
      .from("usage_transaction_details")
      .select(
        "usage_transaction_id,inventory_item_id,ingredient_name,quantity_used,unit,previous_stock,new_stock",
      ),
    supabase
      .from("stock_reports")
      .select("id,material_name,report_type,status,reported_by_role,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("inventory_batches")
      .select(
        "id,inventory_item_id,batch_number,supplier,received_at,expiry_date,quantity_received,quantity_remaining,unit,unit_cost",
      )
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .limit(200),
  ]);

  if (inventoryResult.error) {
    throw new Error(
      `Owner AI could not read inventory items: ${inventoryResult.error.message}`,
    );
  }

  if (transactionResult.error) {
    throw new Error(
      `Owner AI could not read inventory transactions: ${transactionResult.error.message}`,
    );
  }

  if (detailResult.error) {
    throw new Error(
      `Owner AI could not read inventory transaction details: ${detailResult.error.message}`,
    );
  }

  const inventoryItems = (inventoryResult.data ?? []) as InventoryItemRow[];
  const transactions = (transactionResult.data ?? []) as UsageTransactionRow[];
  const details = (detailResult.data ?? []) as UsageTransactionDetailRow[];
  const stockReports = stockReportResult.error
    ? []
    : ((stockReportResult.data ?? []) as StockReportRow[]);
  const batches = batchResult.error
    ? []
    : ((batchResult.data ?? []) as InventoryBatchRow[]);
  const selectedTransactions = transactions.filter((transaction) =>
    isTransactionInPeriod(transaction, period.selected),
  );
  const comparisonTransactions = transactions.filter((transaction) =>
    isTransactionInPeriod(transaction, period.comparison),
  );
  const selectedDetails = getDetailsForTransactions(details, selectedTransactions);
  const comparisonDetails = getDetailsForTransactions(details, comparisonTransactions);
  const inventoryRows = buildInventoryRows(inventoryItems);
  const batchRows = buildBatchRows(batches, inventoryItems);
  const lowStockRows = [
    ...inventoryRows.filter((item) => item.minimum > 0 && item.current <= item.minimum),
    ...inventoryRows.filter((item) => item.minimum > 0 && item.current > item.minimum),
    ...inventoryRows.filter((item) => item.minimum <= 0),
  ].slice(0, 7);
  const selectedUsage = summarizeUsage({
    inventoryItems,
    transactions: selectedTransactions,
    details: selectedDetails,
  });
  const comparisonUsage = summarizeUsage({
    inventoryItems,
    transactions: comparisonTransactions,
    details: comparisonDetails,
  });
  const usageByItem = buildUsageValueByItem({
    inventoryItems,
    transactions: selectedTransactions,
    details: selectedDetails,
  });
  const mostUsed = usageByItem[0];
  const expiryReadinessRows = buildExpiryReadinessRows(inventoryItems);
  const selectedStockReports = stockReports.filter((report) => {
    const createdAt = report.created_at?.slice(0, 10);
    return Boolean(
      createdAt &&
        createdAt >= period.selected.startDate &&
        createdAt <= period.selected.endDate,
    );
  });
  const pendingStockReports = selectedStockReports.filter(
    (report) => report.status === "pending",
  );
  const metrics = {
    totalItems: buildMetric({
      value: inventoryRows.length,
      previousValue: null,
      unit: "count",
      source: "inventory_items.id count",
      displayLabel: "Total SKUs",
    }),
    criticalItems: buildMetric({
      value: inventoryRows.filter(
        (item) => item.minimum > 0 && item.current <= item.minimum,
      ).length,
      previousValue: null,
      unit: "count",
      source: "inventory_items.current_stock at or below reorder_level",
      displayLabel: "Critical Items",
    }),
    estimatedRestockCost: buildMetric({
      value: inventoryRows.reduce(
        (sum, item) => sum + item.suggestedRestockCost,
        0,
      ),
      previousValue: null,
      unit: "IDR",
      source: "suggested restock quantity multiplied by cost_per_unit or price_per_unit",
      displayLabel: "Estimated Restock Cost",
    }),
    dataIssues: buildMetric({
      value: inventoryRows.filter((item) => item.hasDataIssue).length,
      previousValue: null,
      unit: "count",
      source: "negative stock, missing unit, or missing reorder_level",
      displayLabel: "Data Issues",
    }),
    movementEventCount: buildMetric({
      value: selectedUsage.movementEventCount,
      previousValue: comparisonUsage.movementEventCount,
      unit: "count",
      source: "usage_transaction_details linked to selected-period usage_transactions",
      displayLabel: "Movement Events",
    }),
    stockInValue: buildMetric({
      value: selectedUsage.stockInValue,
      previousValue: comparisonUsage.stockInValue,
      unit: "IDR",
      source: "restock quantity multiplied by item unit cost",
      displayLabel: "Stock In Value",
    }),
    stockOutValue: buildMetric({
      value: selectedUsage.stockOutValue,
      previousValue: comparisonUsage.stockOutValue,
      unit: "IDR",
      source: "stock-out quantity multiplied by item unit cost",
      displayLabel: "Stock Out Value",
    }),
    adjustmentValue: buildMetric({
      value: selectedUsage.adjustmentValue,
      previousValue: comparisonUsage.adjustmentValue,
      unit: "IDR",
      source: "adjustment quantity multiplied by item unit cost",
      displayLabel: "Adjustment Value",
    }),
    highestUsageValue: buildMetric({
      value: mostUsed?.value ?? 0,
      previousValue: null,
      unit: "IDR",
      source: "largest stock-out value by inventory item in selected period",
      displayLabel: "Highest Usage Value",
    }),
    pendingStockReports: buildMetric({
      value: pendingStockReports.length,
      previousValue: null,
      unit: "count",
      source: "stock_reports.status pending in selected period",
      displayLabel: "Pending Stock Reports",
    }),
  } satisfies Record<string, RecommendationMetric>;

  return {
    category: "inventory",
    period,
    metrics,
    charts: {
      usageValueTrend: {
        title: "Usage Trend",
        description: "Stock movement converted to Rupiah value for all items.",
        points: buildUsageTrend({
          inventoryItems,
          transactions: selectedTransactions,
          details: selectedDetails,
          granularity: period.selected.granularity,
        }),
      },
      highestUsageItems: {
        title: "Highest Usage Items",
        description: "Inventory items with the largest stock-out value.",
        points: usageByItem.slice(0, 5).map((item) => ({
          name: item.name,
          value: item.value,
          quantity: item.quantity,
          unit: item.unit,
        })),
      },
    },
    tables: {
      lowStockAlert: {
        title: "Low Stock Alert",
        description: "Items closest to reorder risk.",
        rows: lowStockRows.map((item) => ({
          name: item.name,
          currentStock: item.current,
          minimumStock: item.minimum,
          unit: item.unit,
          suggestedRestock: item.suggestedRestock,
          suggestedRestockCost: item.suggestedRestockCost,
        })),
      },
      stockMovement: {
        title: "Stock Movement",
        description: "Latest stock-in, stock-out, and adjustment records.",
        rows: buildMovementRows({
          inventoryItems,
          transactions: selectedTransactions,
          details: selectedDetails,
        }),
      },
      expiryReadiness: {
        title: "Expiry Readiness",
        description:
          "Perishable-looking items that would benefit from batch expiry tracking.",
        rows: expiryReadinessRows,
      },
      batchStock: {
        title: "Batch Stock",
        description:
          "Batch, supplier, received date, expiry date, remaining quantity, and batch value from inventory_batches.",
        rows: batchRows.slice(0, 20).map((batch) => ({
          itemName: batch.itemName,
          category: batch.category,
          batchNumber: batch.batchNumber,
          supplier: batch.supplier,
          receivedAt: batch.receivedAt,
          expiryDate: batch.expiryDate,
          daysUntilExpiry: batch.daysUntilExpiry,
          quantityRemaining: batch.quantityRemaining,
          unit: batch.unit,
          unitCost: batch.unitCost,
          value: batch.value,
        })),
      },
      staffStockReports: {
        title: "Staff Stock Reports",
        description: "Stock issues submitted by barista and kitchen staff.",
        rows: selectedStockReports.slice(0, 10).map((report) => ({
          materialName: report.material_name ?? null,
          reportType: report.report_type ?? null,
          status: report.status ?? null,
          reportedByRole: report.reported_by_role ?? null,
          createdAt: report.created_at ?? null,
        })),
      },
    },
    allowedIssues: buildInventoryAllowedIssues({
      metrics,
      lowStockRows,
      mostUsed,
      expiryReadinessRows,
      batchRows,
      stockReportRows: selectedStockReports,
    }),
    dataQuality: {
      missingFields: batchResult.error
        ? ["inventory_batches"]
        : [],
      unsupportedClaims: [
        batchRows.length > 0
          ? "Only claim expiry or FEFO risk when it is supported by batchStock rows."
          : "Do not claim any item is expired because no batchStock rows are available.",
        "Do not compare mixed units by quantity when all items are selected; use Rupiah movement value instead.",
        batchRows.length > 0
          ? "Supplier names may be mentioned only as batch purchase context; do not rank supplier performance without repeated purchase evidence."
          : "Do not mention supplier performance because supplier data is not included.",
      ],
      warnings: [],
    },
    diagnostics: {
      fetchedInventoryRows: inventoryItems.length,
      fetchedTransactionRows: transactions.length,
      selectedTransactionRows: selectedTransactions.length,
      selectedDetailRows: selectedDetails.length,
      selectedStockReportRows: selectedStockReports.length,
      fetchedBatchRows: batchRows.length,
    },
  };
}
