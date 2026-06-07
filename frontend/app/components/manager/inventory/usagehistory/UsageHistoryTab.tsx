"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  ArchiveBoxIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import StandardTable, {
  type StandardTableColumn,
} from "@/app/components/shared/StandardTable";
import DateRangeFilter, {
  getDefaultDateRange,
  type DateRangeValue,
} from "@/app/components/shared/DateRangeFilter";
import { ExportButton } from "@/app/components/shared";
import { supabase } from "@/lib/config/supabaseClient";
import { formatCurrency } from "@/lib/constants";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { downloadXlsxWorkbook } from "@/lib/utils/exportExcel";
import { getJakartaDateValue } from "@/lib/utils/date";
import { formatJakartaDateTimeParts } from "@/lib/constants/time";

type UsageFilter = "all" | "sale" | "restock" | "adjustment" | "testing_usage" | "kitchen";

type UsageTransactionDetail = {
  inventory_item_id: string;
  ingredient_name: string;
  quantity_used: number;
  unit: string;
  previous_stock?: number | null;
  new_stock?: number | null;
};

type UsageBatchMovement = {
  batch_number: string;
  received_at: string;
  expiry_date: string;
  movement_type: string;
  quantity: number;
  unit: string;
  quantity_before?: number | null;
  quantity_after?: number | null;
};

type UsageTransaction = {
  id: string;
  type: string;
  timestamp: string;
  order_id?: string | null;
  order_number?: string;
  product_id?: string | null;
  product_name?: string | null;
  quantity_sold?: number | null;
  notes?: string | null;
  performed_by?: string | null;
  performed_by_name?: string | null;
  staff_name?: string;
  staff_role?: string;
  details: UsageTransactionDetail[];
  batches: UsageBatchMovement[];
};

type UsageTransactionRow = {
  id: string;
  transaction_type?: string | null;
  type?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  order_id?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  quantity_sold?: number | null;
  notes?: string | null;
  performed_by?: string | null;
  performed_by_name?: string | null;
};

type UsageDetailRow = {
  usage_transaction_id: string;
  inventory_item_id: string;
  ingredient_name?: string | null;
  quantity_used: number;
  unit: string;
  previous_stock?: number | null;
  new_stock?: number | null;
};

type OrderRow = {
  id: string;
  order_number: string;
};

type StaffRow = {
  id: string;
  name: string;
  role: string;
};

type InventoryItemRow = {
  id: string;
  name: string;
};

type KitchenStationMovementRow = {
  id: string;
  station_batch_id?: string | null;
  inventory_item_id: string;
  source_batch_id?: string | null;
  movement_type?: string | null;
  quantity?: number | string | null;
  quantity_before?: number | string | null;
  quantity_after?: number | string | null;
  unit?: string | null;
  business_date?: string | null;
  shift_name?: string | null;
  notes?: string | null;
  created_by_name?: string | null;
  created_at?: string | null;
};

type BatchMovementRow = {
  usage_transaction_id?: string | null;
  movement_type?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  quantity_before?: number | string | null;
  quantity_after?: number | string | null;
  batch?: {
    batch_number?: string | null;
    received_at?: string | null;
    expiry_date?: string | null;
  } | Array<{
    batch_number?: string | null;
    received_at?: string | null;
    expiry_date?: string | null;
  }> | null;
};

const FILTERS: { key: UsageFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sale", label: "Sales" },
  { key: "restock", label: "Restocks" },
  { key: "adjustment", label: "Adjustments" },
  { key: "testing_usage", label: "Testing" },
  { key: "kitchen", label: "Kitchen" },
];

const normalizeType = (type?: string | null) => {
  const raw = (type || "sale").toLowerCase();
  if (raw === "order_usage") return "sale";
  if (raw === "stock_in") return "restock";
  if (raw === "quality_check_usage") return "testing_usage";
  return raw;
};

const isKitchenTransactionType = (type: string) =>
  type.startsWith("kitchen_") || type === "opened_ingredient";

const getKitchenMovementType = (movement: KitchenStationMovementRow) => {
  const raw = String(movement.movement_type || "").toLowerCase();
  if (raw === "transfer_in") return "kitchen_transfer";
  if (raw === "bulk_opened") return "opened_ingredient";
  if (raw === "testing_usage") return "kitchen_testing_usage";
  if (raw === "waste") return "kitchen_waste";
  if (raw === "closing_count") return "kitchen_report";
  if (raw === "adjustment") {
    return String(movement.notes || "").toLowerCase().includes("finished")
      ? "kitchen_used_up"
      : "kitchen_adjustment";
  }
  return `kitchen_${raw || "movement"}`;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Unable to load usage history.";
};

const formatDateTime = (timestamp: string) => formatJakartaDateTimeParts(timestamp);

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const parseRupiahText = (value: string) => {
  const normalized = value.trim();
  const hasCommaDecimal = /,\d{1,2}$/.test(normalized);
  const withoutCurrencySeparators = normalized.replace(/\./g, "").replace(/,/g, ".");
  const parsed = Number(withoutCurrencySeparators);

  if (!Number.isFinite(parsed)) return null;

  if (hasCommaDecimal && parsed >= 1000000 && parsed % 100 === 0) {
    return parsed / 100;
  }

  return parsed;
};

const formatNotesWithPrice = (notes: string) => {
  return notes.replace(/Rp\s*([\d.]+(?:,\d{1,2})?)/g, (_match, number: string) => {
    const parsed = parseRupiahText(number);

    if (parsed === null) return `Rp ${number}`;

    return formatCurrency(parsed, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  });
};

const getTypeMeta = (type: string) => {
  switch (type) {
    case "sale":
      return {
        label: "Order Sale",
        icon: ShoppingCartIcon,
        badge: "bg-slate-50 text-slate-700 border-slate-200",
      };
    case "restock":
      return {
        label: "Restock",
        icon: ArrowUpTrayIcon,
        badge: "bg-[#D8F999] text-gray-900 border-[#C3EE78]",
      };
    case "adjustment":
      return {
        label: "Adjustment",
        icon: AdjustmentsHorizontalIcon,
        badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
      };
    case "testing_usage":
      return {
        label: "Testing Usage",
        icon: ArchiveBoxIcon,
        badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
      };
    case "kitchen_transfer":
      return {
        label: "Kitchen Transfer",
        icon: ArchiveBoxIcon,
        badge: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "opened_ingredient":
      return {
        label: "Opened Ingredient",
        icon: ArchiveBoxIcon,
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
    case "kitchen_waste":
      return {
        label: "Kitchen Waste",
        icon: XMarkIcon,
        badge: "bg-red-50 text-red-700 border-red-200",
      };
    case "kitchen_testing_usage":
      return {
        label: "Kitchen Testing",
        icon: ArchiveBoxIcon,
        badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
      };
    case "kitchen_used_up":
      return {
        label: "Used Up",
        icon: ArchiveBoxIcon,
        badge: "bg-gray-100 text-gray-700 border-gray-200",
      };
    case "kitchen_report":
      return {
        label: "Kitchen Report",
        icon: AdjustmentsHorizontalIcon,
        badge: "bg-purple-50 text-purple-700 border-purple-200",
      };
    case "kitchen_adjustment":
      return {
        label: "Kitchen Adjustment",
        icon: AdjustmentsHorizontalIcon,
        badge: "bg-orange-50 text-orange-700 border-orange-200",
      };
    default:
      return {
        label: type || "Transaction",
        icon: ShoppingCartIcon,
        badge: "bg-gray-100 text-gray-700 border-gray-200",
      };
  }
};

const getPerformedBy = (transaction: UsageTransaction) => {
  if (transaction.performed_by_name) return transaction.performed_by_name;
  if (transaction.staff_name && transaction.staff_role) {
    const roleLabel =
      transaction.staff_role.charAt(0).toUpperCase() + transaction.staff_role.slice(1);
    return `${transaction.staff_name} / ${roleLabel}`;
  }
  if (transaction.staff_name) return transaction.staff_name;
  return "System Auto-Process";
};

const getPerformedByParts = (transaction: UsageTransaction) => {
  const value = getPerformedBy(transaction);
  const normalized = value.replace(/\s+-\s+/g, " / ");
  const [name, role] = normalized.split(" / ").map((part) => part.trim());

  if (!role) {
    return { name: name || "System Auto-Process", role: name === "System Auto-Process" ? "System" : "" };
  }

  return { name, role };
};

const isDeletedInventoryTransaction = (transaction: UsageTransaction) => {
  return transaction.type === "adjustment" && String(transaction.notes || "").toLowerCase().startsWith("deleted:");
};

const getTransactionTitle = (transaction: UsageTransaction) => {
  if (transaction.type === "sale") {
    if (transaction.order_number) return `Order ${transaction.order_number}`;
    if (transaction.order_id) return `Order #${transaction.order_id.slice(-8)}`;
    return "Order Sale";
  }
  if (transaction.type === "restock") return "Stock Replenishment";
  if (isDeletedInventoryTransaction(transaction)) return "Deleted Inventory Item";
  if (transaction.type === "adjustment") return "Stock Adjustment";
  if (transaction.type === "testing_usage") return "Testing Usage";
  if (transaction.type === "kitchen_transfer") return "Moved to Kitchen";
  if (transaction.type === "opened_ingredient") return "Opened Ingredient";
  if (transaction.type === "kitchen_waste") return "Kitchen Waste";
  if (transaction.type === "kitchen_testing_usage") return "Kitchen Testing Usage";
  if (transaction.type === "kitchen_used_up") return "Kitchen Item Used Up";
  if (transaction.type === "kitchen_report") return "Kitchen Count Report";
  if (transaction.type === "kitchen_adjustment") return "Kitchen Adjustment";
  return "Inventory Transaction";
};

const getTotalQuantityUsed = (transaction: UsageTransaction) => {
  if (isDeletedInventoryTransaction(transaction) && transaction.details.length === 0) {
    const match = String(transaction.notes || "").match(/\(had\s+([\d.]+)\s+([^)]+)\)/i);
    return match ? Number(match[1]) || 0 : 0;
  }

  return transaction.details.reduce(
    (total, detail) => total + Math.abs(Number(detail.quantity_used || 0)),
    0,
  );
};

const getAffectedItemCount = (transaction: UsageTransaction) => {
  if (isDeletedInventoryTransaction(transaction) && transaction.details.length === 0) return 1;
  return transaction.details.length;
};

const getBatchRelation = (batch: BatchMovementRow["batch"]) => {
  if (Array.isArray(batch)) return batch[0] ?? null;
  return batch ?? null;
};

const getBatchSummary = (transaction: UsageTransaction) => {
  if (!transaction.batches.length) return "";
  return transaction.batches
    .map((batch) => {
      const batchLabel = batch.batch_number || "No batch number";
      const expiry = batch.expiry_date ? `exp ${batch.expiry_date}` : "no expiry";
      return `${batchLabel} (${expiry})`;
    })
    .join("; ");
};

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClassName = {
    neutral: "border-gray-200 bg-white",
    success: "border-[#BFEF75] bg-[#F6FFE8]",
    warning: "border-[#FFE58A] bg-[#FFF9D7]",
    danger: "border-[#FFC9C9] bg-[#FFF1F1]",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClassName}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</p>
      <p className="mt-3 text-2xl font-bold text-gray-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-gray-600">Inventory movement records</p>
    </div>
  );
}

export default function UsageHistoryTab() {
  const [filterType, setFilterType] = useState<UsageFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => getDefaultDateRange());
  const [transactions, setTransactions] = useState<UsageTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<UsageTransaction | null>(null);

  useEffect(() => {
    void fetchUsageHistory();
  }, []);

  async function fetchUsageHistory() {
    setLoading(true);
    setError("");

    try {
      const { data: transactionsData, error: transError } = await supabase
        .from("usage_transactions")
        .select(
          "id, transaction_type, type, timestamp, order_id, product_id, product_name, quantity_sold, notes, performed_by, performed_by_name, created_at",
        )
        .order("timestamp", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false });

      if (transError) throw transError;

      const transactionRows = (transactionsData || []) as UsageTransactionRow[];
      const orderIds = Array.from(
        new Set(transactionRows.map((item) => item.order_id).filter(Boolean)),
      ) as string[];
      const staffIds = Array.from(
        new Set(transactionRows.map((item) => item.performed_by).filter(Boolean)),
      ) as string[];

      const [ordersResult, staffResult, detailsResult, inventoryResult, kitchenMovementsResult] = await Promise.all([
        orderIds.length > 0
          ? supabase.from("orders").select("id, order_number").in("id", orderIds)
          : Promise.resolve({ data: [] as OrderRow[], error: null }),
        staffIds.length > 0
          ? supabase.from("staff").select("id, name, role").in("id", staffIds)
          : Promise.resolve({ data: [] as StaffRow[], error: null }),
        supabase
          .from("usage_transaction_details")
          .select(
            "usage_transaction_id, inventory_item_id, ingredient_name, quantity_used, unit, previous_stock, new_stock",
          ),
        supabase.from("inventory_items").select("id, name"),
        supabase
          .from("kitchen_station_movements")
          .select("id,station_batch_id,inventory_item_id,source_batch_id,movement_type,quantity,quantity_before,quantity_after,unit,business_date,shift_name,notes,created_by_name,created_at")
          .in("movement_type", ["transfer_in", "bulk_opened", "testing_usage", "waste", "adjustment", "closing_count"])
          .order("created_at", { ascending: false, nullsFirst: false }),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (staffResult.error) throw staffResult.error;
      if (detailsResult.error) throw detailsResult.error;
      if (inventoryResult.error) throw inventoryResult.error;
      if (
        kitchenMovementsResult.error &&
        !String(kitchenMovementsResult.error.message || "").toLowerCase().includes("kitchen_station_movements")
      ) {
        throw kitchenMovementsResult.error;
      }

      const ordersMap = new Map<string, OrderRow>();
      ((ordersResult.data || []) as OrderRow[]).forEach((order) => ordersMap.set(order.id, order));

      const staffMap = new Map<string, StaffRow>();
      ((staffResult.data || []) as StaffRow[]).forEach((staff) => staffMap.set(staff.id, staff));

      const inventoryMap = new Map<string, InventoryItemRow>();
      ((inventoryResult.data || []) as InventoryItemRow[]).forEach((item) =>
        inventoryMap.set(item.id, item),
      );
      const batchMovementsByTransaction = new Map<string, UsageBatchMovement[]>();

      if (transactionRows.length > 0) {
        const transactionIds = transactionRows.map((row) => row.id).filter(Boolean);
        const { data: batchData, error: batchError } = await supabase
          .from("inventory_batch_movements")
          .select(
            "usage_transaction_id, movement_type, quantity, unit, quantity_before, quantity_after, batch:inventory_batches(batch_number, received_at, expiry_date)",
          )
          .in("usage_transaction_id", transactionIds);

        if (!batchError) {
          ((batchData || []) as BatchMovementRow[]).forEach((row) => {
            if (!row.usage_transaction_id) return;
            const batch = getBatchRelation(row.batch);
            const movement: UsageBatchMovement = {
              batch_number: batch?.batch_number || "",
              received_at: batch?.received_at || "",
              expiry_date: batch?.expiry_date || "",
              movement_type: row.movement_type || "",
              quantity: Number(row.quantity || 0),
              unit: row.unit || "",
              quantity_before: row.quantity_before === null || row.quantity_before === undefined
                ? null
                : Number(row.quantity_before),
              quantity_after: row.quantity_after === null || row.quantity_after === undefined
                ? null
                : Number(row.quantity_after),
            };
            batchMovementsByTransaction.set(row.usage_transaction_id, [
              ...(batchMovementsByTransaction.get(row.usage_transaction_id) || []),
              movement,
            ]);
          });
        }
      }

      const detailsByTransaction = new Map<string, UsageTransactionDetail[]>();
      ((detailsResult.data || []) as UsageDetailRow[]).forEach((detail) => {
        const inventoryItem = inventoryMap.get(detail.inventory_item_id);
        const normalizedDetail: UsageTransactionDetail = {
          inventory_item_id: detail.inventory_item_id,
          ingredient_name: inventoryItem?.name || detail.ingredient_name || "Unknown Item",
          quantity_used: Number(detail.quantity_used || 0),
          unit: detail.unit,
          previous_stock: detail.previous_stock,
          new_stock: detail.new_stock,
        };

        const currentDetails = detailsByTransaction.get(detail.usage_transaction_id) || [];
        currentDetails.push(normalizedDetail);
        detailsByTransaction.set(detail.usage_transaction_id, currentDetails);
      });

      const transformedTransactions = transactionRows.map((transaction) => {
        const order = transaction.order_id ? ordersMap.get(transaction.order_id) : undefined;
        const staff = transaction.performed_by ? staffMap.get(transaction.performed_by) : undefined;
        const type = normalizeType(transaction.transaction_type || transaction.type);

        return {
          id: transaction.id,
          type,
          timestamp: transaction.timestamp || transaction.created_at || new Date().toISOString(),
          order_id: transaction.order_id,
          order_number: order?.order_number,
          product_id: transaction.product_id,
          product_name: transaction.product_name,
          quantity_sold: transaction.quantity_sold,
          notes: transaction.notes,
          performed_by: transaction.performed_by,
          performed_by_name: transaction.performed_by_name,
          staff_name: staff?.name,
          staff_role: staff?.role,
          details: detailsByTransaction.get(transaction.id) || [],
          batches: batchMovementsByTransaction.get(transaction.id) || [],
        };
      });

      const kitchenTransactions = ((kitchenMovementsResult.data || []) as KitchenStationMovementRow[]).map((movement) => {
        const item = inventoryMap.get(movement.inventory_item_id);
        const movementType = getKitchenMovementType(movement);
        const quantity = Number(movement.quantity || 0);
        const unit = movement.unit || "";
        const shiftText = movement.shift_name ? `Shift: ${movement.shift_name}` : "";
        const movementNotes = [shiftText, movement.notes].filter(Boolean).join(" | ");

        return {
          id: `kitchen-${movement.id}`,
          type: movementType,
          timestamp: movement.created_at || `${movement.business_date || getJakartaDateValue(new Date().toISOString())}T12:00:00`,
          notes: movementNotes || null,
          performed_by_name: movement.created_by_name || "Kitchen Staff",
          details: [
            {
              inventory_item_id: movement.inventory_item_id,
              ingredient_name: item?.name || "Kitchen item",
              quantity_used: quantity,
              unit,
              previous_stock: movement.quantity_before === null || movement.quantity_before === undefined
                ? null
                : Number(movement.quantity_before),
              new_stock: movement.quantity_after === null || movement.quantity_after === undefined
                ? null
                : Number(movement.quantity_after),
            },
          ],
          batches: [],
        } satisfies UsageTransaction;
      });

      const visibleTransactions = transformedTransactions.filter(
        (transaction) => transaction.type !== "testing_usage" || transaction.details.length > 0,
      );

      setTransactions(
        [...visibleTransactions, ...kitchenTransactions].sort(
          (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
        ),
      );
    } catch (fetchError) {
      console.error("Error fetching usage history:", fetchError);
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return transactions
      .filter((transaction) => {
        const date = getJakartaDateValue(transaction.timestamp);
        return date >= dateRange.startDate && date <= dateRange.endDate;
      })
      .filter((transaction) =>
        filterType === "all" ||
        transaction.type === filterType ||
        (filterType === "kitchen" && isKitchenTransactionType(transaction.type)),
      )
      .filter((transaction) => {
        if (!query) return true;

        return (
          getTransactionTitle(transaction).toLowerCase().includes(query) ||
          transaction.product_name?.toLowerCase().includes(query) ||
          transaction.notes?.toLowerCase().includes(query) ||
          transaction.order_number?.toLowerCase().includes(query) ||
          getPerformedBy(transaction).toLowerCase().includes(query) ||
          transaction.details.some((detail) =>
            detail.ingredient_name.toLowerCase().includes(query),
          )
        );
      });
  }, [dateRange, filterType, searchQuery, transactions]);

  const stats = useMemo(
    () => ({
      totalTransactions: transactions.length,
      sales: transactions.filter((transaction) => transaction.type === "sale").length,
      restocks: transactions.filter((transaction) => transaction.type === "restock").length,
      adjustments: transactions.filter((transaction) => transaction.type === "adjustment").length,
      testing: transactions.filter((transaction) => transaction.type === "testing_usage" || transaction.type === "kitchen_testing_usage").length,
      kitchen: transactions.filter((transaction) => isKitchenTransactionType(transaction.type)).length,
    }),
    [transactions],
  );

  const exportMovementLog = async () => {
    try {
      const rows = filteredTransactions.flatMap((transaction) => {
        const base = {
          timestamp: transaction.timestamp,
          type: getTypeMeta(transaction.type).label,
          reference: getTransactionTitle(transaction),
          product: transaction.product_name || "",
          performedBy: getPerformedBy(transaction),
          notes: transaction.notes || "",
          batches: getBatchSummary(transaction),
        };

        if (!transaction.details.length) {
          return [[
            base.timestamp,
            base.type,
            base.reference,
            base.product,
            "",
            "",
            "",
            "",
            "",
            base.performedBy,
            base.notes,
            base.batches,
          ]];
        }

        return transaction.details.map((detail) => [
          base.timestamp,
          base.type,
          base.reference,
          base.product,
          detail.ingredient_name,
          detail.quantity_used,
          detail.unit,
          detail.previous_stock ?? "",
          detail.new_stock ?? "",
          base.performedBy,
          base.notes,
          base.batches,
        ]);
      });

      await downloadXlsxWorkbook(
        `inventory-movement-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`,
        [
          {
            name: "Movement Log",
            rows: [
              [
                "Timestamp",
                "Type",
                "Reference",
                "Product",
                "Inventory Item",
                "Quantity",
                "Unit",
                "Previous Stock",
                "New Stock",
                "Performed By",
                "Notes",
                "Batch / Expiry",
              ],
              ...rows,
            ],
          },
        ],
      );
      showSuccess("Inventory movement log exported.");
    } catch (error) {
      console.error("Movement export error:", error);
      showError("Failed to export movement log.");
    }
  };

  const renderTransactionDetails = useCallback((transaction: UsageTransaction) => {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Transaction Notes
          </p>
          <p className="mt-1 text-sm text-gray-700">
            {transaction.notes && !transaction.notes.toLowerCase().includes("auto-deduct")
              ? formatNotesWithPrice(transaction.notes)
              : "No manual notes for this transaction."}
          </p>
        </div>

        {transaction.batches.length > 0 ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Batch Movement ({transaction.batches.length})
            </p>
            <div className="mt-2 space-y-2">
              {transaction.batches.map((batch, index) => (
                <div
                  key={`${transaction.id}-batch-${index}`}
                  className="grid gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <span className="font-semibold text-gray-800">
                    {batch.batch_number || "No batch number"}
                  </span>
                  <span className="text-xs text-gray-500">
                    Received {batch.received_at ? batch.received_at.slice(0, 10) : "-"} / Expiry {batch.expiry_date || "-"}
                  </span>
                  <span className="justify-self-start rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 sm:justify-self-end">
                    {formatNumber(batch.quantity)} {batch.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Inventory Changes ({transaction.details.length})
          </p>
          {transaction.details.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No inventory detail recorded.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {transaction.details.map((detail, index) => {
                const increased =
                  detail.previous_stock !== null &&
                  detail.previous_stock !== undefined &&
                  detail.new_stock !== null &&
                  detail.new_stock !== undefined
                    ? Number(detail.new_stock) > Number(detail.previous_stock)
                    : transaction.type === "restock";

                return (
                  <div
                    key={`${transaction.id}-${detail.inventory_item_id}-${index}`}
                    className="grid gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center"
                  >
                    <span className="font-semibold text-gray-800">{detail.ingredient_name}</span>
                    <span className="text-xs text-gray-500">
                      {formatNumber(detail.previous_stock)} to {formatNumber(detail.new_stock)} {detail.unit}
                    </span>
                    <span
                      className={`justify-self-start rounded-md px-2 py-1 text-xs font-bold sm:justify-self-end ${
                        increased ? "bg-[#D8F999] text-gray-900" : "bg-[#FFE1E1] text-[#C00000]"
                      }`}
                    >
                      {increased ? "+" : "-"}{formatNumber(detail.quantity_used)} {detail.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }, []);

  const columns = useMemo<Array<StandardTableColumn<UsageTransaction>>>(
    () => [
      {
        key: "timestamp",
        header: "Date",
        render: (transaction) => {
          const dateTime = formatDateTime(transaction.timestamp);
          return (
            <div>
              <p className="text-sm font-semibold text-gray-900">{dateTime.time}</p>
              <p className="text-xs text-gray-500">{dateTime.date}</p>
            </div>
          );
        },
        sortValue: (transaction) => transaction.timestamp,
        className: "align-top",
      },
      {
        key: "type",
        header: "Type",
        render: (transaction) => {
          const meta = getTypeMeta(transaction.type);
          const Icon = meta.icon;
          return (
            <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${meta.badge}`}>
              <Icon className="h-4 w-4" />
              {meta.label}
            </span>
          );
        },
        sortValue: (transaction) => transaction.type,
        className: "align-top",
      },
      {
        key: "reference",
        header: "Reference",
        render: (transaction) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-gray-900">
              {getTransactionTitle(transaction)}
            </p>
            {transaction.product_name ? (
              <p className="truncate text-xs text-gray-500">
                {transaction.product_name}
                {transaction.quantity_sold ? ` / ${transaction.quantity_sold}x` : ""}
              </p>
            ) : null}
          </div>
        ),
        sortValue: (transaction) => getTransactionTitle(transaction),
        className: "align-top",
      },
      {
        key: "performedBy",
        header: "User",
        render: (transaction) => {
          const user = getPerformedByParts(transaction);
          return (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
              {user.role ? <p className="mt-1 truncate text-xs text-gray-500">{user.role}</p> : null}
            </div>
          );
        },
        sortValue: (transaction) => getPerformedBy(transaction),
        className: "align-top",
      },
      {
        key: "items",
        header: "Items",
        render: (transaction) => (
          <div>
            <p className="text-sm font-semibold text-gray-900">{getAffectedItemCount(transaction)} items</p>
            <p className="text-xs text-gray-500">
              {formatNumber(getTotalQuantityUsed(transaction))} total
            </p>
          </div>
        ),
        sortValue: (transaction) => getAffectedItemCount(transaction),
        className: "align-top",
      },
      {
        key: "detail",
        header: "Detail",
        isAction: true,
        render: (transaction) => {
          return (
            <button
              type="button"
              onClick={() => setSelectedTransaction(transaction)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-950"
              aria-label="Show transaction details"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
          );
        },
        className: "align-top",
      },
    ],
    [],
  );

  return (
    <div className="h-full overflow-y-auto bg-gray-50 px-4 py-4 md:px-6 md:py-6">
      <section>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <SummaryCard label="Total Transactions" value={stats.totalTransactions} />
          <SummaryCard label="Order Sales" value={stats.sales} tone="success" />
          <SummaryCard label="Restocks" value={stats.restocks} tone="warning" />
          <SummaryCard label="Adjustments" value={stats.adjustments} tone="danger" />
          <SummaryCard label="Kitchen" value={stats.kitchen} />
        </div>
      </section>

      <section className="py-4">
        <div className="mb-4 flex shrink-0 items-center gap-2 overflow-x-auto">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setFilterType(filter.key)}
              className={`h-10 rounded-lg px-4 text-sm font-semibold transition ${
                filterType === filter.key
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {error && !loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm font-semibold text-gray-900">Unable to load usage history</p>
              <p className="max-w-md text-sm text-gray-500">{error}</p>
              <button
                type="button"
                onClick={() => void fetchUsageHistory()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-950">Usage History Table</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Inventory movements from sales, restocks, kitchen transfers, opened ingredients, waste, and adjustments.
                  </p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
                  <ExportButton
                    items={[
                      {
                        id: "movement-log",
                        label: "Download Movement Log Excel",
                        onClick: () => void exportMovementLog(),
                      },
                    ]}
                  />

                  <div className="relative flex-1 lg:flex-none">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 md:h-5 md:w-5" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 md:pl-10 lg:w-64"
                    />
                  </div>
                </div>
              </div>
              <StandardTable
                columns={columns}
                data={filteredTransactions}
                getRowKey={(transaction) => transaction.id}
                emptyLabel="No transactions match the current filters."
                loading={loading}
                minWidthClassName="min-w-[1180px]"
              />
            </>
          )}
        </section>
      </section>

      {selectedTransaction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Movement Detail
                </p>
                <h2 className="mt-1 text-lg font-bold text-gray-950">
                  {getTransactionTitle(selectedTransaction)}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDateTime(selectedTransaction.timestamp).date} / {formatDateTime(selectedTransaction.timestamp).time} / {getPerformedBy(selectedTransaction)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close transaction detail"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-6">
              {renderTransactionDetails(selectedTransaction)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
