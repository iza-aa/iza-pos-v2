"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import { getCurrentUser } from "@/lib/utils";
import { showSuccess, showError } from "@/lib/services/errorHandling";
import { getStockStatus } from "@/lib/constants";
import { logActivity } from "@/lib/services/activity/activityLogger";
import InventoryStats from "./InventoryStats";
import InventoryFilters from "./InventoryFilters";
import InventoryTable from "./InventoryTable";
import InventoryModal from "./InventoryModal";
import RestockModal, { type RestockPayload } from "./RestockModal";
import AdjustmentModal from "./AdjustmentModal";
import { DeleteModal } from "@/app/components/ui";
import { ExportButton } from "@/app/components/shared";
import { supabase } from "@/lib/config/supabaseClient";
import { downloadXlsxWorkbook } from "@/lib/utils/exportExcel";
import { createRestockBatch } from "@/lib/services/inventory/inventoryBatchService";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stationScope: "barista" | "kitchen" | "shared";
  trackingMode: "direct_auto_deduct" | "kitchen_station_auto_deduct" | "bulk_usage_expense";
  parLevel: number;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  supplier: string;
  lastRestocked: string;
  status: string;
}

interface InventoryBatch {
  id: string;
  inventoryItemId: string;
  itemName: string;
  batchNumber: string;
  supplier: string;
  receivedAt: string;
  expiryDate: string;
  quantityReceived: number;
  quantityRemaining: number;
  unit: string;
  unitCost: number;
  invoiceReference: string;
  receiptUrl: string;
}

interface InventoryBatchQueryRow {
  id: string;
  inventory_item_id: string;
  batch_number?: string | null;
  supplier?: string | null;
  received_at?: string | null;
  expiry_date?: string | null;
  quantity_received?: number | string | null;
  quantity_remaining?: number | string | null;
  unit?: string | null;
  unit_cost?: number | string | null;
  invoice_reference?: string | null;
  receipt_url?: string | null;
}

type BatchFilter = "all" | "active" | "near-expiry" | "expired" | "depleted";
type RawMaterialView = "raw-materials" | "batch-stock";
type NormalizedStockStatus = "in-stock" | "low-stock" | "critical";

type BatchItemSummary = {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  currentStock: number;
  totalRemaining: number;
  totalReceived: number;
  purchaseValue: number;
  remainingValue: number;
  stockDiscrepancy: number;
  batchCount: number;
  suppliers: string[];
  activeSuppliers: string[];
  earliestExpiry: string;
  latestReceivedAt: string;
  batches: InventoryBatch[];
};

interface RawMaterialsTabProps {
  view?: RawMaterialView;
}

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const getExportDate = () => new Date().toISOString().slice(0, 10);

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStockStatus = (
  item: Pick<InventoryItem, "status" | "currentStock" | "reorderLevel">,
): NormalizedStockStatus => {
  const status = String(item.status || "").toLowerCase().trim();

  if (status === "in-stock" || status === "good") return "in-stock";
  if (status === "low-stock" || status === "low") return "low-stock";
  if (status === "out-of-stock" || status === "out_of_stock" || status === "critical") return "critical";

  if (item.currentStock <= 0) return "critical";
  if (item.currentStock < item.reorderLevel * 2) return "low-stock";
  return "in-stock";
};

const formatDate = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDaysUntilExpiry = (expiryDate: string) => {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return null;
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
};

const getBatchStatus = (batch: InventoryBatch) => {
  const days = getDaysUntilExpiry(batch.expiryDate);
  if (batch.quantityRemaining <= 0) return { label: "Depleted", className: "bg-gray-100 text-gray-600" };
  if (days === null) return { label: "No Expiry", className: "bg-blue-50 text-blue-700" };
  if (days < 0) return { label: "Expired", className: "bg-red-100 text-red-700" };
  if (days <= 7) return { label: `${days}d Left`, className: "bg-yellow-100 text-yellow-800" };
  return { label: "Active", className: "bg-[#D8F999] text-gray-900" };
};

const hasOptionalBatchColumnError = (message: string) => {
  return (
    message.includes("invoice_reference") ||
    message.includes("receipt_url") ||
    message.includes("schema cache")
  );
};

export default function RawMaterialsTab({ view = "raw-materials" }: RawMaterialsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [batchFilter, setBatchFilter] = useState<BatchFilter>("all");
  const [selectedBatchSummary, setSelectedBatchSummary] = useState<BatchItemSummary | null>(null);
  const [categories, setCategories] = useState([
    { id: "all", name: "All Items", count: 0 },
    { id: "ingredients", name: "Ingredients", count: 0 },
    { id: "packaging", name: "Packaging", count: 0 },
  ]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [restockingItem, setRestockingItem] = useState<InventoryItem | null>(
    null,
  );
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(
    null,
  );
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  const fetchInventoryBatches = useCallback(async (inventoryItems: InventoryItem[] = []) => {
    const itemMap = new Map(inventoryItems.map((item) => [item.id, item]));
    const mapBatchRows = (rows: InventoryBatchQueryRow[]) => rows.map((batch) => {
      const item = itemMap.get(batch.inventory_item_id);
      return {
        id: batch.id,
        inventoryItemId: batch.inventory_item_id,
        itemName: item?.name || "Unknown Item",
        batchNumber: batch.batch_number || "-",
        supplier: batch.supplier || item?.supplier || "-",
        receivedAt: batch.received_at || "",
        expiryDate: batch.expiry_date || "",
        quantityReceived: toNumber(batch.quantity_received),
        quantityRemaining: toNumber(batch.quantity_remaining),
        unit: batch.unit || item?.unit || "",
        unitCost: toNumber(batch.unit_cost),
        invoiceReference: batch.invoice_reference || "",
        receiptUrl: batch.receipt_url || "",
      };
    });

    const buildBatchQuery = (columns: string) =>
      supabase
        .from("inventory_batches")
        .select(columns)
        .order("expiry_date", { ascending: true, nullsFirst: false })
        .order("received_at", { ascending: true });

    let { data, error } = await buildBatchQuery(
      "id, inventory_item_id, batch_number, supplier, received_at, expiry_date, quantity_received, quantity_remaining, unit, unit_cost, invoice_reference, receipt_url",
    );

    if (error) {
      const message = String(error.message || "").toLowerCase();
      if (hasOptionalBatchColumnError(message)) {
        const retry = await buildBatchQuery(
          "id, inventory_item_id, batch_number, supplier, received_at, expiry_date, quantity_received, quantity_remaining, unit, unit_cost",
        );
        data = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      const message = String(error.message || "").toLowerCase();
      if (
        message.includes("inventory_batches") ||
        message.includes("schema cache")
      ) {
        setBatches([]);
        return;
      }
      throw error;
    }

    setBatches(mapBatchRows((data || []) as unknown as InventoryBatchQueryRow[]));
  }, []);

  const fetchInventoryItems = useCallback(async () => {
    try {
      setIsLoadingInventory(true);
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name");

      if (error) throw error;

      const transformedItems: InventoryItem[] = (data || []).map((item) => {
        const status = getStockStatus(item.current_stock, item.reorder_level);

        return {
          id: item.id,
          name: item.name,
          category: item.category || "Ingredients",
          stationScope: item.station_scope || "shared",
          trackingMode: item.tracking_mode || "direct_auto_deduct",
          parLevel: toNumber(item.par_level),
          currentStock: item.current_stock,
          reorderLevel: item.reorder_level,
          unit: item.unit,
          supplier: item.supplier || "Unknown",
          lastRestocked: item.last_restocked || new Date().toISOString(),
          status: String(status),
        };
      });

      setItems(transformedItems);

      // Update category counts
      setCategories([
        { id: "all", name: "All Items", count: transformedItems.length },
        {
          id: "ingredients",
          name: "Ingredients",
          count: transformedItems.filter((i) => i.category === "Ingredients")
            .length,
        },
        {
          id: "packaging",
          name: "Packaging",
          count: transformedItems.filter((i) => i.category === "Packaging")
            .length,
        },
      ]);

      await fetchInventoryBatches(transformedItems);
    } catch {
      // Error fetching inventory items
    } finally {
      setIsLoadingInventory(false);
    }
  }, [fetchInventoryBatches]);

  useEffect(() => {
    void fetchInventoryItems();
  }, [fetchInventoryItems]);

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      item.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalItems: items.length,
    lowStock: items.filter((item) => normalizeStockStatus(item) === "low-stock").length,
    outOfStock: items.filter((item) => normalizeStockStatus(item) === "critical").length,
    inStock: items.filter((item) => normalizeStockStatus(item) === "in-stock").length,
  };

  const handleAddNewItem = () => {
    setShowAddItemModal(true);
    setEditingItem(null);
  };
  const searchPlaceholder = view === "raw-materials" ? "Search items..." : "Search batches...";

  const visibleBatches = batches.filter((batch) => {
    const days = getDaysUntilExpiry(batch.expiryDate);
    const matchesSearch =
      !searchQuery.trim() ||
      batch.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (batchFilter === "all") return true;
    if (batchFilter === "depleted") return batch.quantityRemaining <= 0;
    if (batchFilter === "expired") return days !== null && days < 0 && batch.quantityRemaining > 0;
    if (batchFilter === "near-expiry") return days !== null && days >= 0 && days <= 7 && batch.quantityRemaining > 0;
    return batch.quantityRemaining > 0;
  });

  const activeSuppliersByItemId = useMemo<Record<string, string>>(() => {
    const itemIdsWithBatch = new Set<string>();
    const activeSuppliers = new Map<string, Set<string>>();

    batches.forEach((batch) => {
      itemIdsWithBatch.add(batch.inventoryItemId);
      if (batch.quantityRemaining <= 0) return;
      const supplier = batch.supplier.trim();
      if (!supplier || supplier === "-") return;
      const suppliers = activeSuppliers.get(batch.inventoryItemId) || new Set<string>();
      suppliers.add(supplier);
      activeSuppliers.set(batch.inventoryItemId, suppliers);
    });

    return Array.from(itemIdsWithBatch).reduce<Record<string, string>>((result, itemId) => {
      const suppliers = Array.from(activeSuppliers.get(itemId) || []);
      result[itemId] = suppliers.length ? suppliers.join(", ") : "-";
      return result;
    }, {});
  }, [batches]);
  const getDisplaySupplier = (item: InventoryItem) =>
    (activeSuppliersByItemId[item.id] ?? item.supplier) || "-";

  const batchItemSummaries = useMemo<BatchItemSummary[]>(() => {
    const grouped = new Map<string, InventoryBatch[]>();

    visibleBatches.forEach((batch) => {
      grouped.set(batch.inventoryItemId, [...(grouped.get(batch.inventoryItemId) || []), batch]);
    });

    return Array.from(grouped.entries()).map(([inventoryItemId, rows]) => {
      const sortedRows = [...rows].sort((a, b) => {
        const expiryA = a.expiryDate || "9999-12-31";
        const expiryB = b.expiryDate || "9999-12-31";
        if (expiryA !== expiryB) return expiryA.localeCompare(expiryB);
        return a.receivedAt.localeCompare(b.receivedAt);
      });
      const activeRows = rows.filter((row) => row.quantityRemaining > 0);
      const expiryRows = activeRows.filter((row) => row.expiryDate);
      const latestReceivedAt = [...rows].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0]?.receivedAt || "";
      const item = items.find((inventoryItem) => inventoryItem.id === inventoryItemId);
      const totalRemaining = rows.reduce((total, row) => total + row.quantityRemaining, 0);
      const totalReceived = rows.reduce((total, row) => total + row.quantityReceived, 0);

      return {
        inventoryItemId,
        itemName: rows[0]?.itemName || "Unknown Item",
        unit: rows[0]?.unit || "",
        currentStock: item?.currentStock ?? 0,
        totalRemaining,
        totalReceived,
        purchaseValue: rows.reduce((total, row) => total + row.quantityReceived * row.unitCost, 0),
        remainingValue: rows.reduce((total, row) => total + row.quantityRemaining * row.unitCost, 0),
        stockDiscrepancy: totalRemaining - (item?.currentStock ?? 0),
        batchCount: rows.length,
        suppliers: Array.from(new Set(rows.map((row) => row.supplier).filter(Boolean))),
        activeSuppliers: Array.from(new Set(activeRows.map((row) => row.supplier).filter(Boolean))),
        earliestExpiry: expiryRows.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0]?.expiryDate || "",
        latestReceivedAt,
        batches: sortedRows,
      };
    });
  }, [items, visibleBatches]);

  const batchColumns = useMemo<Array<StandardTableColumn<InventoryBatch>>>(
    () => [
      {
        key: "item",
        header: "Item",
        render: (batch) => (
          <div>
            <p className="font-semibold text-gray-900">{batch.itemName}</p>
            <p className="mt-1 text-xs text-gray-500">Batch {batch.batchNumber}</p>
          </div>
        ),
        sortValue: (batch) => batch.itemName,
      },
      {
        key: "supplier",
        header: "Supplier",
        render: (batch) => batch.supplier,
        sortValue: (batch) => batch.supplier,
      },
      {
        key: "received",
        header: "Received",
        render: (batch) => formatDate(batch.receivedAt),
        sortValue: (batch) => batch.receivedAt,
      },
      {
        key: "expiry",
        header: "Expiry",
        render: (batch) => formatDate(batch.expiryDate),
        sortValue: (batch) => batch.expiryDate || "9999-12-31",
      },
      {
        key: "receivedQuantity",
        header: "Received Qty",
        render: (batch) => `${batch.quantityReceived} ${batch.unit}`,
        sortValue: (batch) => batch.quantityReceived,
      },
      {
        key: "remaining",
        header: "Remaining Qty",
        render: (batch) => `${batch.quantityRemaining} ${batch.unit}`,
        sortValue: (batch) => batch.quantityRemaining,
      },
      {
        key: "unitCost",
        header: "Unit Purchase Cost",
        render: (batch) => (batch.unitCost > 0 ? formatRupiah(batch.unitCost) : "-"),
        sortValue: (batch) => batch.unitCost,
      },
      {
        key: "purchaseValue",
        header: "Purchase Value",
        render: (batch) => batch.unitCost > 0 ? formatRupiah(batch.unitCost * batch.quantityReceived) : "-",
        sortValue: (batch) => batch.unitCost * batch.quantityReceived,
      },
      {
        key: "remainingValue",
        header: "Remaining Value",
        render: (batch) => batch.unitCost > 0 ? formatRupiah(batch.unitCost * batch.quantityRemaining) : "-",
        sortValue: (batch) => batch.unitCost * batch.quantityRemaining,
      },
      {
        key: "receipt",
        header: "Receipt",
        render: (batch) => (
          <div>
            {batch.receiptUrl ? (
              <a
                href={batch.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex text-xs font-semibold text-gray-600 underline"
              >
                View receipt
              </a>
            ) : (
              <span className="text-sm text-gray-500">No receipt</span>
            )}
          </div>
        ),
        sortValue: (batch) => batch.receiptUrl,
      },
      {
        key: "status",
        header: "Status",
        render: (batch) => {
          const status = getBatchStatus(batch);
          return (
            <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${status.className}`}>
              {status.label}
            </span>
          );
        },
        sortValue: (batch) => getBatchStatus(batch).label,
      },
    ],
    [],
  );
  const batchSummaryColumns = useMemo<Array<StandardTableColumn<BatchItemSummary>>>(
    () => [
      {
        key: "item",
        header: "Item",
        render: (summary) => (
          <div>
            <p className="font-semibold text-gray-900">{summary.itemName}</p>
            <p className="mt-1 text-xs text-gray-500">{summary.batchCount} batch records</p>
          </div>
        ),
        sortValue: (summary) => summary.itemName,
      },
      {
        key: "remaining",
        header: "Batch Remaining",
        render: (summary) => `${summary.totalRemaining} ${summary.unit}`,
        sortValue: (summary) => summary.totalRemaining,
      },
      {
        key: "currentStock",
        header: "Raw Stock",
        render: (summary) => `${summary.currentStock} ${summary.unit}`,
        sortValue: (summary) => summary.currentStock,
      },
      {
        key: "received",
        header: "Total Received",
        render: (summary) => `${summary.totalReceived} ${summary.unit}`,
        sortValue: (summary) => summary.totalReceived,
      },
      {
        key: "discrepancy",
        header: "Stock Gap",
        render: (summary) => {
          if (Math.abs(summary.stockDiscrepancy) < 0.0001) return "-";
          return (
            <span className="font-bold text-red-700">
              {summary.stockDiscrepancy > 0 ? "+" : ""}
              {summary.stockDiscrepancy} {summary.unit}
            </span>
          );
        },
        sortValue: (summary) => Math.abs(summary.stockDiscrepancy),
      },
      {
        key: "suppliers",
        header: "Active Suppliers",
        render: (summary) => summary.activeSuppliers.join(", ") || "-",
        sortValue: (summary) => summary.activeSuppliers.join(", "),
      },
      {
        key: "expiry",
        header: "Nearest Expiry",
        render: (summary) => formatDate(summary.earliestExpiry),
        sortValue: (summary) => summary.earliestExpiry || "9999-12-31",
      },
      {
        key: "latest",
        header: "Latest Received",
        render: (summary) => formatDate(summary.latestReceivedAt),
        sortValue: (summary) => summary.latestReceivedAt,
      },
      {
        key: "detail",
        header: "Detail",
        isAction: true,
        render: (summary) => (
          <button
            type="button"
            onClick={() => setSelectedBatchSummary(summary)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-950"
            aria-label={`Open batch detail for ${summary.itemName}`}
          >
            <EyeIcon className="h-5 w-5" />
          </button>
        ),
      },
    ],
    [],
  );
  const supplierPriceRows = useMemo(() => {
    const grouped = new Map<string, InventoryBatch[]>();
    visibleBatches
      .filter((batch) => batch.unitCost > 0 && batch.supplier && batch.supplier !== "-")
      .forEach((batch) => {
        grouped.set(batch.itemName, [...(grouped.get(batch.itemName) || []), batch]);
      });

    return Array.from(grouped.entries())
      .map(([itemName, rows]) => {
        const supplierRows = Array.from(
          rows.reduce((map, batch) => {
            const current = map.get(batch.supplier);
            if (!current || batch.unitCost < current.unitCost) {
              map.set(batch.supplier, batch);
            }
            return map;
          }, new Map<string, InventoryBatch>()).values(),
        );
        const sorted = supplierRows.sort((a, b) => a.unitCost - b.unitCost);
        const cheapest = sorted[0];
        const highest = sorted[sorted.length - 1];
        return {
          itemName,
          cheapest,
          highest,
          supplierCount: supplierRows.length,
          hasPriceDifference: Boolean(cheapest && highest && cheapest.unitCost !== highest.unitCost),
        };
      })
      .filter((row) => row.cheapest && row.supplierCount > 1)
      .slice(0, 4);
  }, [visibleBatches]);

  const exportStockList = async () => {
    try {
      await downloadXlsxWorkbook(`inventory-stock-list-${getExportDate()}.xlsx`, [
        {
          name: "Stock List",
          rows: [
            [
              "Item Name",
              "Category",
              "Station",
              "Tracking Mode",
              "Par Level",
              "Current Stock",
              "Reorder Level",
              "Unit",
              "Active Supplier",
              "Last Restocked",
              "Status",
            ],
            ...filteredItems.map((item) => [
              item.name,
              item.category,
              item.stationScope,
              item.trackingMode,
              item.parLevel,
              item.currentStock,
              item.reorderLevel,
              item.unit,
              getDisplaySupplier(item),
              item.lastRestocked,
              item.status,
            ]),
          ],
        },
      ]);
      showSuccess("Inventory stock list exported.");
    } catch (error) {
      console.error("Inventory stock export error:", error);
      showError("Failed to export stock list.");
    }
  };

  const exportOpnameSheet = async () => {
    try {
      await downloadXlsxWorkbook(`inventory-opname-sheet-${getExportDate()}.xlsx`, [
        {
          name: "Opname Sheet",
          rows: [
            [
              "Item Name",
              "Category",
              "Station",
              "Tracking Mode",
              "Par Level",
              "Unit",
              "Active Supplier",
              "Physical Count",
              "Counted By",
              "Notes",
            ],
            ...filteredItems.map((item) => [
              item.name,
              item.category,
              item.stationScope,
              item.trackingMode,
              item.parLevel,
              item.unit,
              getDisplaySupplier(item),
              "",
              "",
              "",
            ]),
          ],
        },
      ]);
      showSuccess("Stock opname sheet exported.");
    } catch (error) {
      console.error("Stock opname export error:", error);
      showError("Failed to export opname sheet.");
    }
  };

  const exportLowStockList = async () => {
    const lowStockItems = items.filter((item) => {
      const status = normalizeStockStatus(item);
      return status === "low-stock" || status === "critical";
    });

    try {
      await downloadXlsxWorkbook(`inventory-low-stock-${getExportDate()}.xlsx`, [
        {
          name: "Low Stock",
          rows: [
            [
              "Item Name",
              "Category",
              "Station",
              "Tracking Mode",
              "Par Level",
              "Current Stock",
              "Reorder Level",
              "Suggested Restock",
              "Unit",
              "Active Supplier",
              "Status",
            ],
            ...lowStockItems.map((item) => [
              item.name,
              item.category,
              item.stationScope,
              item.trackingMode,
              item.parLevel,
              item.currentStock,
              item.reorderLevel,
              Math.max(0, item.reorderLevel * 2 - item.currentStock),
              item.unit,
              getDisplaySupplier(item),
              item.status,
            ]),
          ],
        },
      ]);
      showSuccess("Low stock list exported.");
    } catch (error) {
      console.error("Low stock export error:", error);
      showError("Failed to export low stock list.");
    }
  };

  const exportBatchStock = async () => {
    try {
      await downloadXlsxWorkbook(`inventory-batch-stock-${getExportDate()}.xlsx`, [
        {
          name: "Batch Stock",
          rows: [
            [
              "Item Name",
              "Batch Number",
              "Supplier",
              "Received Date",
              "Expiry Date",
              "Qty Received",
              "Qty Remaining",
              "Unit",
              "Unit Purchase Cost",
              "Purchase Value",
              "Remaining Value",
              "Receipt URL",
              "Status",
            ],
            ...visibleBatches.map((batch) => [
              batch.itemName,
              batch.batchNumber,
              batch.supplier,
              batch.receivedAt ? batch.receivedAt.slice(0, 10) : "",
              batch.expiryDate,
              batch.quantityReceived,
              batch.quantityRemaining,
              batch.unit,
              batch.unitCost,
              batch.unitCost * batch.quantityReceived,
              batch.unitCost * batch.quantityRemaining,
              batch.receiptUrl,
              getBatchStatus(batch).label,
            ]),
          ],
        },
      ]);
      showSuccess("Inventory batch stock exported.");
    } catch (error) {
      console.error("Batch stock export error:", error);
      showError("Failed to export batch stock.");
    }
  };

  const handleSaveNewItem = async (
    newItem: Omit<InventoryItem, "id" | "lastRestocked" | "status">,
  ) => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert([
          {
            name: newItem.name,
            category: newItem.category,
            station_scope: newItem.stationScope,
            tracking_mode: newItem.trackingMode,
            par_level: newItem.parLevel,
            current_stock: newItem.currentStock,
            reorder_level: newItem.reorderLevel,
            unit: newItem.unit,
            supplier: newItem.supplier,
            last_restocked: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      await fetchInventoryItems();
      setShowAddItemModal(false);
      showSuccess("Inventory item added successfully");

      // Log activity
      await logActivity({
        action: "CREATE",
        category: "INVENTORY",
        description: `Created new inventory item: ${newItem.name}`,
        resourceType: "Inventory Item",
        resourceId: data.id,
        resourceName: newItem.name,
        newValue: {
          name: newItem.name,
          category: newItem.category,
          tracking_mode: newItem.trackingMode,
          par_level: newItem.parLevel,
          current_stock: newItem.currentStock,
          unit: newItem.unit,
        },
        severity: "info",
        tags: ["inventory", "create"],
      });
    } catch {
      showError("Failed to add inventory item");
    }
  };

  const handleUpdateItem = async (updatedItem: InventoryItem) => {
    try {
      // Update inventory item (stock is disabled in edit mode, so no adjustment needed)
      const { error } = await supabase
        .from("inventory_items")
        .update({
          name: updatedItem.name,
          category: updatedItem.category,
          station_scope: updatedItem.stationScope,
          tracking_mode: updatedItem.trackingMode,
          par_level: updatedItem.parLevel,
          reorder_level: updatedItem.reorderLevel,
          unit: updatedItem.unit,
        })
        .eq("id", updatedItem.id);

      if (error) throw error;

      await fetchInventoryItems();
      setEditingItem(null);
      showSuccess("Inventory item updated successfully");
    } catch {
      showError("Failed to update inventory item");
    }
  };

  const handleRestockItem = (item: InventoryItem) => {
    setRestockingItem(item);
  };

  const confirmRestock = async (
    itemId: string,
    payload: RestockPayload,
  ) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    try {
      const {
        quantity,
        notes,
        costPerUnit,
        supplier,
        receiptUrl,
        receivedDate,
        expiryDate,
      } = payload;
      const previousStock = item.currentStock;
      const newStock = previousStock + quantity;
      const purchaseSupplier = supplier?.trim() || item.supplier;

      // Get user information from auth helper
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const userName = currentUser.name;
      const userRole = currentUser.role;

      const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);
      const fullUserName = `${userName} - ${roleLabel}`;

      // Update inventory stock
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          current_stock: newStock,
          last_restocked: new Date().toISOString(),
          supplier: purchaseSupplier,
        })
        .eq("id", itemId);

      if (updateError) {
        console.error("Update inventory error:", updateError);
        throw updateError;
      }

      // Create usage transaction for restock
      const totalCost = costPerUnit && costPerUnit > 0 ? costPerUnit * quantity : 0;
      const costNote =
        totalCost > 0 ? ` (Purchase total: ${formatRupiah(totalCost)}, unit cost: ${formatRupiah(costPerUnit || 0)})` : "";
      const batchNote = [
        purchaseSupplier ? `Supplier: ${purchaseSupplier}` : "",
        receiptUrl ? "Receipt photo attached" : "",
        "Batch: generated automatically",
        receivedDate ? `Received: ${receivedDate}` : "",
        expiryDate ? `Expiry: ${expiryDate}` : "",
      ].filter(Boolean).join(", ");
      const fullNotes = [
        notes || `Restocked ${item.name}`,
        batchNote,
      ].filter(Boolean).join(" | ");

      const { data: transaction, error: transactionError } = await supabase
        .from("usage_transactions")
        .insert({
          transaction_type: "restock",
          notes: fullNotes + costNote,
          performed_by: null, // Null for non-staff users
          performed_by_name: fullUserName, // Store name directly
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create transaction detail
      const { error: detailError } = await supabase
        .from("usage_transaction_details")
        .insert({
          usage_transaction_id: transaction.id,
          inventory_item_id: itemId,
          ingredient_name: item.name,
          quantity_used: quantity,
          unit: item.unit,
          previous_stock: previousStock,
          new_stock: newStock,
        });

      if (detailError) throw detailError;

      const batchResult = await createRestockBatch({
        inventoryItemId: itemId,
        itemName: item.name,
        quantity,
        unit: item.unit,
        supplier: purchaseSupplier,
        unitCost: costPerUnit,
        receiptUrl,
        receivedDate,
        expiryDate,
        sourceTransactionId: transaction.id,
        performedByName: fullUserName,
        notes: fullNotes,
      });

      await fetchInventoryItems();
      showSuccess(
        batchResult.enabled
          ? `Successfully restocked ${item.name} and recorded batch.`
          : `Successfully restocked ${item.name}. Run inventory batch SQL to enable FIFO/FEFO tracking.`,
      );

      // Log activity
      await logActivity({
        action: "ADJUST",
        category: "INVENTORY",
        description: `Restocked ${item.name}: +${quantity} ${item.unit}`,
        resourceType: "Inventory Item",
        resourceId: itemId,
        resourceName: item.name,
        previousValue: { stock: previousStock },
        newValue: { stock: newStock },
        changesSummary: [
          `Stock: ${previousStock}${item.unit} → ${newStock}${item.unit} (+${quantity}${item.unit})`,
        ],
        severity: "info",
        tags: ["inventory", "restock"],
        notes: notes || undefined,
      });
    } catch (error) {
      showError("Failed to restock item");
      throw error;
    }
  };

  const handleAdjustItem = (item: InventoryItem) => {
    setAdjustingItem(item);
  };

  const confirmAdjustment = async (
    itemId: string,
    newStock: number,
    reason: string,
    batchId?: string,
  ) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    try {
      const previousStock = item.currentStock;
      const difference = newStock - previousStock;
      const selectedBatch = batchId ? batches.find((batch) => batch.id === batchId) : undefined;

      if (selectedBatch && difference < 0 && Math.abs(difference) > selectedBatch.quantityRemaining) {
        throw new Error("Adjustment reduction cannot exceed the selected batch remaining stock.");
      }

      // Get user from Supabase Auth metadata (fallback to localStorage)
      // Get user information from auth helper
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const userName = currentUser.name;
      const userRole = currentUser.role;

      const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);
      const fullUserName = `${userName} - ${roleLabel}`;

      // Update inventory stock
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          current_stock: newStock,
        })
        .eq("id", itemId);

      if (updateError) {
        throw updateError;
      }

      // Create usage transaction for adjustment

      const transactionData = {
        transaction_type: "adjustment",
        notes: reason,
        performed_by: null, // Null for non-staff users
        performed_by_name: fullUserName, // Store name directly
        created_at: new Date().toISOString(),
      };

      const { data: transaction, error: transactionError } = await supabase
        .from("usage_transactions")
        .insert(transactionData)
        .select()
        .single();

      if (transactionError) {
        throw transactionError;
      }

      // Create transaction detail
      const { data: detail, error: detailError } = await supabase
        .from("usage_transaction_details")
        .insert({
          usage_transaction_id: transaction.id,
          inventory_item_id: itemId,
          ingredient_name: item.name,
          quantity_used: Math.abs(difference),
          unit: item.unit,
          previous_stock: previousStock,
          new_stock: newStock,
        })
        .select("id")
        .single();

      if (detailError) {
        throw detailError;
      }

      if (selectedBatch) {
        const batchBefore = selectedBatch.quantityRemaining;
        const batchAfter = Math.max(0, batchBefore + difference);
        const quantityReceived = Math.max(selectedBatch.quantityReceived, batchAfter);

        const { error: batchUpdateError } = await supabase
          .from("inventory_batches")
          .update({
            quantity_remaining: batchAfter,
            quantity_received: quantityReceived,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedBatch.id);

        if (batchUpdateError) throw batchUpdateError;

        const { error: batchMovementError } = await supabase
          .from("inventory_batch_movements")
          .insert({
            batch_id: selectedBatch.id,
            inventory_item_id: itemId,
            usage_transaction_id: transaction.id,
            usage_transaction_detail_id: detail?.id || null,
            movement_type: "adjustment",
            quantity: Math.abs(difference),
            quantity_before: batchBefore,
            quantity_after: batchAfter,
            unit: item.unit,
            notes: reason,
            created_by_name: fullUserName,
          });

        if (batchMovementError) throw batchMovementError;
      }

      await fetchInventoryItems();
      showSuccess(
        `Stock for ${item.name} adjusted successfully: ${previousStock} → ${newStock}`,
      );

      // Log activity
      const adjustmentType = difference > 0 ? "increase" : "decrease";
      await logActivity({
        action: "ADJUST",
        category: "INVENTORY",
        description: `Adjusted ${item.name} stock: ${previousStock} → ${newStock}`,
        resourceType: "Inventory Item",
        resourceId: itemId,
        resourceName: item.name,
        previousValue: { stock: previousStock },
        newValue: { stock: newStock },
        changesSummary: [
          `Stock: ${previousStock}${item.unit} → ${newStock}${item.unit} (${difference > 0 ? "+" : ""}${difference}${item.unit})`,
        ],
        severity: "warning",
        tags: ["inventory", "adjustment", adjustmentType],
        notes: reason,
      });
    } catch {
      showError("Failed to adjust stock");
      throw new Error("Failed to adjust stock");
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setDeletingItem(item);
  };

  const confirmDeleteItem = async () => {
    if (deletingItem) {
      try {
        // Get user information from auth helper
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const userName = currentUser.name;
        const userRole = currentUser.role;

        const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);
        const fullUserName = `${userName} - ${roleLabel}`;

        // Always create adjustment transaction when deleting
        const stockNote =
          deletingItem.currentStock > 0
            ? ` (had ${deletingItem.currentStock} ${deletingItem.unit} in stock)`
            : " (stock was 0)";

        // Create usage transaction
        const { data: transaction, error: transactionError } = await supabase
          .from("usage_transactions")
          .insert({
            transaction_type: "adjustment",
            notes: `DELETED: ${deletingItem.name}${stockNote}`,
            performed_by: null, // Null for non-staff users
            performed_by_name: fullUserName, // Store name directly
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (transactionError) throw transactionError;

        // Create transaction detail
        const { error: detailError } = await supabase
          .from("usage_transaction_details")
          .insert({
            usage_transaction_id: transaction.id,
            inventory_item_id: deletingItem.id,
            ingredient_name: deletingItem.name,
            quantity_used: deletingItem.currentStock,
            unit: deletingItem.unit,
            previous_stock: deletingItem.currentStock,
            new_stock: 0,
          });

        if (detailError) throw detailError;

        // Delete the inventory item
        const { error } = await supabase
          .from("inventory_items")
          .delete()
          .eq("id", deletingItem.id);

        if (error) {
          showError(`Gagal menghapus ${deletingItem.name}: ${error.message}`);
          setDeletingItem(null);
          return;
        }

        await fetchInventoryItems();
        showSuccess(`Item ${deletingItem.name} deleted successfully`);

        // Log activity
        await logActivity({
          action: "DELETE",
          category: "INVENTORY",
          description: `Deleted inventory item: ${deletingItem.name}`,
          resourceType: "Inventory Item",
          resourceId: deletingItem.id,
          resourceName: deletingItem.name,
          previousValue: {
            name: deletingItem.name,
            category: deletingItem.category,
            station_scope: deletingItem.stationScope,
            current_stock: deletingItem.currentStock,
            unit: deletingItem.unit,
          },
          severity: "critical",
          tags: ["inventory", "delete"],
          isReversible: false,
          notes:
            deletingItem.currentStock > 0
              ? `Had ${deletingItem.currentStock} ${deletingItem.unit} in stock`
              : "Stock was 0",
        });

        setDeletingItem(null);
      } catch {
        showError(
          "Failed to delete inventory item. It may still be used in recipes or transactions.",
        );
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <section className="px-4 py-4 md:px-6 md:py-6">
        {view === "raw-materials" ? (
          <div className="mb-4 shrink-0">
            <InventoryStats
              totalItems={stats.totalItems}
              inStock={stats.inStock}
              lowStock={stats.lowStock}
              outOfStock={stats.outOfStock}
            />
          </div>
        ) : null}

        {view === "raw-materials" ? (
          <div className="mb-4 shrink-0">
            <InventoryFilters
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>
        ) : (
          <div className="mb-4 shrink-0">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "near-expiry", label: "Near Expiry" },
                { key: "expired", label: "Expired" },
                { key: "depleted", label: "Depleted" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setBatchFilter(filter.key as BatchFilter)}
                  className={`h-10 rounded-lg px-4 text-sm font-semibold transition ${
                    batchFilter === filter.key
                      ? "bg-gray-900 text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pb-4">
          {view === "raw-materials" ? (
            <InventoryTable
              items={filteredItems}
              onRestock={handleRestockItem}
              onAdjust={handleAdjustItem}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              activeSuppliersByItemId={activeSuppliersByItemId}
              loading={isLoadingInventory}
              tableActions={
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <div className="relative min-w-0 sm:w-64">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add New Item
                  </button>
                  <ExportButton
                    items={[
                      { id: "stock-list", label: "Download Stock List Excel", onClick: () => void exportStockList() },
                      { id: "opname-sheet", label: "Download Opname Sheet Excel", onClick: () => void exportOpnameSheet() },
                      { id: "low-stock", label: "Download Low Stock Excel", onClick: () => void exportLowStockList() },
                    ]}
                  />
                </div>
              }
            />
          ) : (
            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-950">Batch Stock Table</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Batch, supplier, purchase cost, and expiry records from restock.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <div className="relative min-w-0 sm:w-64">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>
                  <ExportButton
                    items={[
                      { id: "batch-stock", label: "Download Batch Stock Excel", onClick: () => void exportBatchStock() },
                    ]}
                  />
                </div>
              </div>
              <StandardTable
                columns={batchSummaryColumns}
                data={batchItemSummaries}
                getRowKey={(summary) => summary.inventoryItemId}
                emptyLabel={
                  batches.length
                    ? "No batch items match the current filters."
                    : "No batch records yet. Run the batch SQL and restock an item to start batch tracking."
                }
                loading={isLoadingInventory}
                minWidthClassName="min-w-[1080px]"
              />
            </section>
          )}
        </div>
      </section>

      {/* Inventory Modal */}
      <InventoryModal
        isOpen={showAddItemModal || editingItem !== null}
        onClose={() => {
          setShowAddItemModal(false);
          setEditingItem(null);
        }}
        onSave={handleSaveNewItem}
        onUpdate={handleUpdateItem}
        editItem={editingItem}
      />

      {/* Restock Modal */}
      <RestockModal
        isOpen={restockingItem !== null}
        onClose={() => setRestockingItem(null)}
        onRestock={confirmRestock}
        item={restockingItem}
      />

      {/* Adjustment Modal */}
      <AdjustmentModal
        isOpen={adjustingItem !== null}
        onClose={() => setAdjustingItem(null)}
        activeBatches={batches
          .filter((batch) => batch.inventoryItemId === adjustingItem?.id && batch.quantityRemaining > 0)
          .map((batch) => ({
            id: batch.id,
            batchNumber: batch.batchNumber,
            supplier: batch.supplier,
            quantityRemaining: batch.quantityRemaining,
            unit: batch.unit,
            expiryDate: batch.expiryDate,
          }))}
        onAdjust={(itemId, newStock, reason, batchId) =>
          confirmAdjustment(itemId, newStock, reason, batchId)
        }
        item={adjustingItem}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deletingItem !== null}
        onClose={() => setDeletingItem(null)}
        onConfirm={confirmDeleteItem}
        title="Delete Inventory Item"
        itemName={deletingItem?.name || ""}
        description="This item will be permanently removed from your inventory."
      />

      {selectedBatchSummary ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Batch Detail</p>
                <h2 className="mt-1 text-lg font-bold text-gray-950">{selectedBatchSummary.itemName}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Batch remaining {selectedBatchSummary.totalRemaining} {selectedBatchSummary.unit}
                  {" "}from {selectedBatchSummary.totalReceived} {selectedBatchSummary.unit} received.
                  {" "}Raw material stock is {selectedBatchSummary.currentStock} {selectedBatchSummary.unit}.
                </p>
                {Math.abs(selectedBatchSummary.stockDiscrepancy) >= 0.0001 ? (
                  <p className="mt-2 text-sm font-semibold text-red-700">
                    Stock gap: batch remaining is {selectedBatchSummary.stockDiscrepancy > 0 ? "+" : ""}
                    {selectedBatchSummary.stockDiscrepancy} {selectedBatchSummary.unit} compared with raw material stock.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatchSummary(null)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close batch detail"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-6">
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <section className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-normal text-gray-500">Purchase Value</p>
                  <p className="mt-2 text-xl font-bold text-gray-950">{formatRupiah(selectedBatchSummary.purchaseValue)}</p>
                </section>
                <section className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-normal text-gray-500">Remaining Value</p>
                  <p className="mt-2 text-xl font-bold text-gray-950">{formatRupiah(selectedBatchSummary.remainingValue)}</p>
                </section>
                <section className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-normal text-gray-500">Active Suppliers</p>
                  <p className="mt-2 text-base font-bold text-gray-950">{selectedBatchSummary.activeSuppliers.join(", ") || "-"}</p>
                </section>
              </div>
              {(() => {
                const priceRow = supplierPriceRows.find((row) => row.itemName === selectedBatchSummary.itemName);
                if (!priceRow) return null;

                return (
                  <div className="mb-4">
                    <p className="text-sm font-bold text-gray-900">Supplier Unit Price Comparison</p>
                    {priceRow.hasPriceDifference ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-4">
                        <section className="rounded-2xl border border-[#BFEF75] bg-[#F6FFE8] p-4 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Cheapest Supplier</p>
                          <p className="mt-3 text-xl font-bold text-gray-950">
                            {priceRow.cheapest.supplier}, {formatRupiah(priceRow.cheapest.unitCost)} per {priceRow.cheapest.unit}
                          </p>
                          <p className="mt-2 text-sm leading-5 text-gray-600">Lowest recorded unit purchase cost for this item.</p>
                        </section>
                        <section className="rounded-2xl border border-[#FFC9C9] bg-[#FFF1F1] p-4 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Highest Supplier</p>
                          <p className="mt-3 text-xl font-bold text-gray-950">
                            {priceRow.highest.supplier}, {formatRupiah(priceRow.highest.unitCost)} per {priceRow.highest.unit}
                          </p>
                          <p className="mt-2 text-sm leading-5 text-gray-600">Highest recorded unit purchase cost for this item.</p>
                        </section>
                      </div>
                    ) : (
                      <section className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Supplier Cost</p>
                        <p className="mt-3 text-2xl font-bold text-gray-950">
                          {formatRupiah(priceRow.cheapest.unitCost)} per {priceRow.cheapest.unit}
                        </p>
                        <p className="mt-2 text-sm leading-5 text-gray-600">
                          All recorded suppliers for this item currently have the same unit purchase cost.
                        </p>
                      </section>
                    )}
                  </div>
                );
              })()}
              <StandardTable
                columns={batchColumns}
                data={selectedBatchSummary.batches}
                getRowKey={(batch) => batch.id}
                emptyLabel="No batch records for this item."
                loading={isLoadingInventory}
                minWidthClassName="min-w-[1180px]"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
