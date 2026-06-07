"use client";

/* cspell:ignore Pagi Malam */

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import {
  ArchiveBoxIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { SidebarTabset, DateRangeFilter, getDefaultDateRange, type DateRangeValue } from "@/app/components/shared";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import { supabase } from "@/lib/config/supabaseClient";
import { getCurrentUser } from "@/lib/utils";
import { getStaffHomePath, normalizeStaffType } from "@/lib/utils/staffAccess";
import { showError, showSuccess } from "@/lib/services/errorHandling";
import { convertQuantity } from "@/lib/utils/unitConversion";

type StockCheckTab = "stock-check" | "kitchen-station" | "my-reports";
type StationScope = "barista" | "kitchen" | "shared";
type ReportType = "low_stock" | "out_of_stock" | "waste_damaged" | "restock_request" | "testing_usage";
type ReportStatus = "pending" | "rejected" | "resolved";
type TestingMode = "ingredient" | "menu";
type TestingPurpose = "coffee_calibration" | "taste_test" | "menu_trial" | "staff_training" | "quality_check" | "other";

type InventoryItem = {
  id: string;
  name: string;
  category: string | null;
  station_scope?: StationScope | null;
  tracking_mode?: "direct_auto_deduct" | "kitchen_station_auto_deduct" | "bulk_usage_expense" | null;
  par_level?: number | string | null;
  current_stock: number | null;
  reorder_level: number | null;
  unit: string | null;
  supplier?: string | null;
  cost_per_unit?: number | string | null;
};

type StockReport = {
  id: string;
  inventory_item_id: string | null;
  material_name: string;
  report_type: ReportType;
  quantity_note: string | null;
  description: string | null;
  station_scope?: StationScope | null;
  status: ReportStatus;
  created_at: string;
  updated_at?: string | null;
};

type StationBatch = {
  id: string;
  inventory_item_id: string;
  source_batch_id: string | null;
  batch_number: string | null;
  station_status: "planned" | "thawing" | "prep" | "ready" | "finished" | "waste";
  quantity_remaining: number | string | null;
  unit: string | null;
  unit_cost?: number | string | null;
  expiry_date: string | null;
  started_at: string | null;
};

type InventoryBatch = {
  id: string;
  inventory_item_id: string;
  batch_number: string | null;
  supplier: string | null;
  quantity_remaining: number | string | null;
  unit: string | null;
  unit_cost: number | string | null;
  expiry_date: string | null;
};

type ProductItem = {
  id: string;
  name: string;
  type: "food" | "drink" | string | null;
  available?: boolean | null;
};

type RecipeRow = {
  id: string;
  product_id: string | null;
  product_name?: string | null;
  recipe_type?: string | null;
};

type RecipeIngredient = {
  recipe_id: string | null;
  inventory_item_id: string | null;
  ingredient_name: string | null;
  quantity_needed: number | string | null;
  unit: string | null;
  costing_mode?: "deduct_from_pos" | "cost_estimate_only" | "kitchen_overhead" | null;
};

type TestingRecipeLine = {
  ingredient: RecipeIngredient;
  item: InventoryItem | null;
  requiredQuantity: number;
  sourceUnit: string;
  stockUnit: string;
  costingMode: RecipeIngredient["costing_mode"];
  deductionSource: "master" | "station" | "none";
  note: string;
};

type TestingForm = {
  mode: TestingMode;
  itemId: string;
  productId: string;
  quantity: string;
  portions: string;
  purpose: TestingPurpose;
  shiftName: string;
  notes: string;
};

type BulkOpenedMovement = {
  id: string;
  inventory_item_id: string;
  source_batch_id: string | null;
  quantity: number | string | null;
  unit: string | null;
  unit_cost: number | string | null;
  total_cost: number | string | null;
  business_date: string | null;
  shift_name: string | null;
  notes: string | null;
  movement_status?: "active" | "finished" | "waste" | null;
  closed_at?: string | null;
  created_by_name: string | null;
  created_at: string | null;
};

type KitchenMoveForm = {
  itemId: string;
  sourceBatchId: string;
  quantity: string;
  expiryDate: string;
  shiftName: string;
  notes: string;
};

type KitchenAuditTarget = {
  kind: "station" | "bulk";
  inventoryItemId: string;
  itemName: string;
  unit: string;
  expectedQuantity: number;
  sourceBatchId?: string | null;
  stationBatchId?: string | null;
  sourceLabel: string;
};

type KitchenActionTarget =
  | { kind: "station"; batch: StationBatch; anchor: DOMRect }
  | { kind: "bulk"; movement: BulkOpenedMovement; anchor: DOMRect };

type KitchenReportCondition = "ok" | "waste" | "need_prep" | "adjusted" | "handover";
type KitchenReportLevel = "" | "full" | "three_quarter" | "half" | "quarter" | "low" | "empty";

const kitchenShiftOptions = ["Shift Pagi", "Shift Malam"] as const;

const kitchenReportConditionOptions: Array<{ value: KitchenReportCondition; label: string }> = [
  { value: "ok", label: "OK" },
  { value: "handover", label: "Handover note" },
  { value: "waste", label: "Waste" },
  { value: "need_prep", label: "Need prep" },
  { value: "adjusted", label: "Adjusted count" },
];

const kitchenReportLevelOptions: Array<{ value: KitchenReportLevel; label: string }> = [
  { value: "", label: "No level" },
  { value: "full", label: "Full" },
  { value: "three_quarter", label: "3/4" },
  { value: "half", label: "Half" },
  { value: "quarter", label: "1/4" },
  { value: "low", label: "Low" },
  { value: "empty", label: "Empty" },
];

const getKitchenReportConditionLabel = (value: KitchenReportCondition) =>
  kitchenReportConditionOptions.find((option) => option.value === value)?.label || value;

const getKitchenReportLevelLabel = (value: KitchenReportLevel) =>
  kitchenReportLevelOptions.find((option) => option.value === value)?.label || "";

const getKitchenReportSignal = (condition: KitchenReportCondition, level: KitchenReportLevel) => {
  const conditionLabel = getKitchenReportConditionLabel(condition);
  const levelLabel = getKitchenReportLevelLabel(level);

  if (condition === "ok") return levelLabel || conditionLabel;
  return levelLabel ? `${conditionLabel} · ${levelLabel}` : conditionLabel;
};

const stockCheckTabs = [
  {
    id: "stock-check" as const,
    label: "Stock Check",
    description: "View station materials",
    icon: ArchiveBoxIcon,
  },
  {
    id: "kitchen-station" as const,
    label: "Kitchen Station",
    description: "Prep status",
    icon: ClipboardDocumentListIcon,
  },
  {
    id: "my-reports" as const,
    label: "My Reports",
    description: "Submitted reports",
    icon: ClipboardDocumentListIcon,
  },
];

const reportOptions: Array<{
  type: ReportType;
  label: string;
  description: string;
}> = [
  { type: "low_stock", label: "Report Low Stock", description: "Stock is close to minimum" },
  { type: "out_of_stock", label: "Report Out of Stock", description: "Material is unavailable" },
  { type: "waste_damaged", label: "Report Waste/Damaged", description: "Lost, damaged, or unusable" },
  { type: "restock_request", label: "Request Restock", description: "Ask manager to restock" },
];

const testingPurposeOptions: Array<{ value: TestingPurpose; label: string }> = [
  { value: "coffee_calibration", label: "Coffee Calibration" },
  { value: "taste_test", label: "Taste Test" },
  { value: "menu_trial", label: "Menu Trial" },
  { value: "staff_training", label: "Staff Training" },
  { value: "quality_check", label: "Quality Check" },
  { value: "other", label: "Other" },
];

const getTestingPurposeLabel = (value: TestingPurpose) =>
  testingPurposeOptions.find((option) => option.value === value)?.label || "Testing";

const reportTypeLabel = (type: ReportType) => {
  if (type === "low_stock") return "Low Stock";
  if (type === "out_of_stock") return "Out of Stock";
  if (type === "waste_damaged") return "Waste/Damaged";
  if (type === "testing_usage") return "Testing Usage";
  return "Restock Request";
};

const statusClassName = (status: ReportStatus) => {
  if (status === "resolved") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const statusLabel = (status: ReportStatus | "all") => {
  if (status === "all") return "All";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const normalizeInventoryStatus = (item: InventoryItem) => {
  const currentStock = item.current_stock ?? 0;
  const reorderLevel = item.reorder_level ?? 0;

  if (currentStock <= 0) return "out-of-stock";
  if (currentStock <= reorderLevel) return "low-stock";

  return "in-stock";
};

const getInventoryStatusMeta = (status: "in-stock" | "low-stock" | "out-of-stock") => {
  switch (status) {
    case "in-stock":
      return {
        label: "In Stock",
        className: "bg-[#D8F999] text-gray-900 border border-[#C3EE78]",
      };
    case "low-stock":
      return {
        label: "Low Stock",
        className: "bg-[#FFE02E] text-gray-900 border border-[#F4CF12]",
      };
    case "out-of-stock":
      return {
        label: "Critical",
        className: "bg-[#FFE1E1] text-[#C00000] border border-[#FFC7C7]",
      };
    default:
      return {
        label: "Unknown",
        className: "bg-gray-100 text-gray-700 border border-gray-200",
      };
  }
};

const getStockTextClassName = (status: "in-stock" | "low-stock" | "out-of-stock") => {
  if (status === "out-of-stock") return "text-[#C00000]";
  if (status === "low-stock") return "text-[#D8A800]";
  return "text-gray-900";
};

const stationScopeLabel = (value?: StationScope | null) => {
  if (value === "barista") return "Barista";
  if (value === "kitchen") return "Kitchen";
  return "Shared";
};

const trackingModeLabel = (value?: InventoryItem["tracking_mode"]) => {
  if (value === "kitchen_station_auto_deduct") return "Kitchen Station";
  if (value === "bulk_usage_expense") return "Bulk Usage";
  return "Direct Auto";
};

const stationStatusLabel = (value: StationBatch["station_status"]) => {
  if (value === "thawing") return "Thawing";
  if (value === "prep") return "Prep";
  if (value === "ready") return "Ready";
  if (value === "finished") return "Finished by POS";
  if (value === "waste") return "Waste";
  return "In Kitchen";
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getDateAfterDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const getDefaultKitchenShiftName = () => {
  const hour = new Date().getHours();
  return hour >= 15 || hour < 5 ? "Shift Malam" : "Shift Pagi";
};

const omitStationScope = <T extends { station_scope?: unknown }>(payload: T) => {
  const fallback = { ...payload };
  delete fallback.station_scope;
  return fallback;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message || "");
    if (message) return message;
  }
  return fallback;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function StaffStockCheckPage() {
  const currentUser = getCurrentUser();
  const staffType = normalizeStaffType(currentUser?.staffType);
  const initialKitchenShift = getDefaultKitchenShiftName();
  const [activeTab, setActiveTab] = useState<StockCheckTab>("stock-check");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [reports, setReports] = useState<StockReport[]>([]);
  const [stationBatches, setStationBatches] = useState<StationBatch[]>([]);
  const [bulkOpenedMovements, setBulkOpenedMovements] = useState<BulkOpenedMovement[]>([]);
  const [masterBatches, setMasterBatches] = useState<InventoryBatch[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedReport, setSelectedReport] = useState<StockReport | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("low_stock");
  const [quantityNote, setQuantityNote] = useState("");
  const [description, setDescription] = useState("");
  const [closingDate, setClosingDate] = useState(new Date().toISOString().slice(0, 10));
  const [closingItemId, setClosingItemId] = useState("");
  const [closingShift, setClosingShift] = useState(initialKitchenShift);
  const [openingQty, setOpeningQty] = useState("");
  const [transferInQty, setTransferInQty] = useState("");
  const [posUsageQty, setPosUsageQty] = useState("");
  const [wasteQty, setWasteQty] = useState("");
  const [physicalClosingQty, setPhysicalClosingQty] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [kitchenReportCondition, setKitchenReportCondition] = useState<KitchenReportCondition>("ok");
  const [kitchenReportLevel, setKitchenReportLevel] = useState<KitchenReportLevel>("");
  const [closingTouchedSubmit, setClosingTouchedSubmit] = useState(false);
  const [kitchenAuditTarget, setKitchenAuditTarget] = useState<KitchenAuditTarget | null>(null);
  const [kitchenShiftFilter] = useState(initialKitchenShift);
  const [kitchenMoveOpen, setKitchenMoveOpen] = useState<"transfer" | "bulk" | null>(null);
  const [kitchenMoveTouched, setKitchenMoveTouched] = useState(false);
  const [kitchenMoveForm, setKitchenMoveForm] = useState<KitchenMoveForm>({
    itemId: "",
    sourceBatchId: "",
    quantity: "",
    expiryDate: getDateAfterDays(3),
    shiftName: initialKitchenShift,
    notes: "",
  });
  const [testingModalOpen, setTestingModalOpen] = useState(false);
  const [testingTouched, setTestingTouched] = useState(false);
  const [testingForm, setTestingForm] = useState<TestingForm>({
    mode: "ingredient",
    itemId: "",
    productId: "",
    quantity: "",
    portions: "1",
    purpose: staffType === "barista" ? "coffee_calibration" : "taste_test",
    shiftName: initialKitchenShift,
    notes: "",
  });
  const [stockReportsAvailable, setStockReportsAvailable] = useState(true);
  const [stationScopeAvailable, setStationScopeAvailable] = useState(true);
  const [kitchenStationAvailable, setKitchenStationAvailable] = useState(true);
  const [openStockActionMenu, setOpenStockActionMenu] = useState<{
    item: InventoryItem;
    anchor: DOMRect;
  } | null>(null);
  const [openKitchenActionMenu, setOpenKitchenActionMenu] = useState<KitchenActionTarget | null>(null);
  const canUseStockCheck = staffType === "barista" || staffType === "kitchen";

  useEffect(() => {
    if (currentUser?.role === "owner") return;
    if (!currentUser || currentUser.role !== "staff" || !canUseStockCheck) {
      window.location.replace(getStaffHomePath(currentUser?.staffType));
    }
  }, [canUseStockCheck, currentUser]);

  const loadItems = useCallback(async () => {
    if (!canUseStockCheck && currentUser?.role !== "owner") return;

    const stationScope: StationScope | null =
      staffType === "barista" || staffType === "kitchen" ? staffType : null;
    const scopes: StationScope[] =
      currentUser?.role === "owner" || !stationScope
        ? ["barista", "kitchen", "shared"]
        : [stationScope, "shared"];

    const initialResult = await supabase
      .from("inventory_items")
      .select("id,name,category,station_scope,tracking_mode,par_level,current_stock,reorder_level,unit,supplier,cost_per_unit")
      .in("station_scope", scopes)
      .order("name", { ascending: true });
    const data = initialResult.data as InventoryItem[] | null;
    const error = initialResult.error;

    if (error) {
      if (error.message.toLowerCase().includes("station_scope")) {
        setStationScopeAvailable(false);

        const fallbackResult = await supabase
          .from("inventory_items")
          .select("id,name,category,tracking_mode,par_level,current_stock,reorder_level,unit,supplier,cost_per_unit")
          .order("name", { ascending: true });
        const fallbackData = fallbackResult.data as InventoryItem[] | null;
        const fallbackError = fallbackResult.error;

        if (fallbackError) {
          showError(`Failed to load stock data: ${fallbackError.message}`);
          setItems([]);
          return;
        }

        setItems((fallbackData ?? []).map((item) => ({
          ...(item as InventoryItem),
          station_scope: "shared",
        })));
        return;
      }

      showError(`Failed to load stock data: ${error.message}`);
      setItems([]);
      return;
    }

    setStationScopeAvailable(true);
    setItems((data ?? []) as InventoryItem[]);
  }, [canUseStockCheck, currentUser?.role, staffType]);

  const loadReports = useCallback(async () => {
    if (!currentUser?.id) return;

    let { data, error } = await supabase
      .from("stock_reports")
      .select("id,inventory_item_id,material_name,report_type,quantity_note,description,station_scope,status,created_at,updated_at")
      .eq("reported_by", currentUser.id)
      .gte("created_at", `${dateRange.startDate}T00:00:00`)
      .lte("created_at", `${dateRange.endDate}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.message.toLowerCase().includes("station_scope") || error.message.toLowerCase().includes("schema cache")) {
        const fallback = await supabase
          .from("stock_reports")
          .select("id,inventory_item_id,material_name,report_type,quantity_note,description,status,created_at,updated_at")
          .eq("reported_by", currentUser.id)
          .gte("created_at", `${dateRange.startDate}T00:00:00`)
          .lte("created_at", `${dateRange.endDate}T23:59:59`)
          .order("created_at", { ascending: false });

        data = (fallback.data ?? []).map((report) => ({
          ...report,
          station_scope: "shared",
        }));
        error = fallback.error;
      }
    }

    if (error) {
      if (
        error.message.toLowerCase().includes("stock_reports") ||
        error.message.toLowerCase().includes("schema cache")
      ) {
        setStockReportsAvailable(false);
        setReports([]);
        return;
      }

      showError(`Failed to load stock reports: ${error.message}`);
      setReports([]);
      return;
    }

    setStockReportsAvailable(true);
    setReports((data ?? []) as StockReport[]);
  }, [currentUser?.id, dateRange]);

  const loadStationBatches = useCallback(async () => {
    if (staffType !== "kitchen" && currentUser?.role !== "owner") {
      setStationBatches([]);
      return;
    }

    const { data, error } = await supabase
      .from("kitchen_station_batches")
      .select("id,inventory_item_id,source_batch_id,batch_number,station_status,quantity_remaining,unit,unit_cost,expiry_date,started_at")
      .gt("quantity_remaining", 0)
      .not("station_status", "in", "(finished,waste)")
      .order("started_at", { ascending: false });

    if (error) {
      if (
        error.message.toLowerCase().includes("kitchen_station_batches") ||
        error.message.toLowerCase().includes("schema cache")
      ) {
        setKitchenStationAvailable(false);
        setStationBatches([]);
        return;
      }

      showError(`Failed to load kitchen station batches: ${error.message}`);
      setStationBatches([]);
      return;
    }

    setKitchenStationAvailable(true);
    setStationBatches((data ?? []) as StationBatch[]);
  }, [currentUser?.role, staffType]);

  const loadMasterBatches = useCallback(async () => {
    if (staffType !== "kitchen" && currentUser?.role !== "owner") {
      setMasterBatches([]);
      return;
    }

    const { data, error } = await supabase
      .from("inventory_batches")
      .select("id,inventory_item_id,batch_number,supplier,quantity_remaining,unit,unit_cost,expiry_date")
      .gt("quantity_remaining", 0)
      .order("expiry_date", { ascending: true, nullsFirst: false });

    if (error) {
      if (
        error.message.toLowerCase().includes("inventory_batches") ||
        error.message.toLowerCase().includes("schema cache")
      ) {
        setMasterBatches([]);
        return;
      }

      showError(`Failed to load inventory batches: ${error.message}`);
      setMasterBatches([]);
      return;
    }

    setMasterBatches((data ?? []) as InventoryBatch[]);
  }, [currentUser?.role, staffType]);

  const loadBulkOpenedMovements = useCallback(async () => {
    if (staffType !== "kitchen" && currentUser?.role !== "owner") {
      setBulkOpenedMovements([]);
      return;
    }

    let { data, error } = await supabase
      .from("kitchen_station_movements")
      .select("id,inventory_item_id,source_batch_id,quantity,unit,unit_cost,total_cost,business_date,shift_name,notes,movement_status,closed_at,created_by_name,created_at")
      .eq("movement_type", "bulk_opened")
      .eq("movement_status", "active")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error && (error.message.toLowerCase().includes("movement_status") || error.message.toLowerCase().includes("schema cache"))) {
      const fallback = await supabase
        .from("kitchen_station_movements")
        .select("id,inventory_item_id,source_batch_id,quantity,unit,unit_cost,total_cost,business_date,shift_name,notes,created_by_name,created_at")
        .eq("movement_type", "bulk_opened")
        .order("created_at", { ascending: false })
        .limit(50);

      data = (fallback.data ?? []).map((movement) => ({
        ...movement,
        movement_status: "active",
        closed_at: null,
      }));
      error = fallback.error;
    }

    if (error) {
      if (
        error.message.toLowerCase().includes("kitchen_station_movements") ||
        error.message.toLowerCase().includes("schema cache")
      ) {
        setBulkOpenedMovements([]);
        return;
      }

      showError(`Failed to load opened ingredients: ${error.message}`);
      setBulkOpenedMovements([]);
      return;
    }

    setBulkOpenedMovements((data ?? []) as BulkOpenedMovement[]);
  }, [currentUser?.role, staffType]);

  const loadTestingReferenceData = useCallback(async () => {
    const productType = staffType === "barista" ? "drink" : staffType === "kitchen" ? "food" : null;
    const productQuery = supabase
      .from("products")
      .select("id,name,type,available")
      .order("name", { ascending: true });

    const [productsResult, recipesResult, ingredientsResult] = await Promise.all([
      productType ? productQuery.eq("type", productType) : productQuery,
      supabase
        .from("recipes")
        .select("id,product_id,product_name,recipe_type")
        .eq("recipe_type", "base"),
      supabase
        .from("recipe_ingredients")
        .select("recipe_id,inventory_item_id,ingredient_name,quantity_needed,unit,costing_mode"),
    ]);

    if (productsResult.error) {
      showError(`Failed to load test menus: ${productsResult.error.message}`);
      setProducts([]);
    } else {
      setProducts((productsResult.data ?? []) as ProductItem[]);
    }

    if (recipesResult.error) {
      showError(`Failed to load recipes: ${recipesResult.error.message}`);
      setRecipes([]);
    } else {
      setRecipes((recipesResult.data ?? []) as RecipeRow[]);
    }

    if (ingredientsResult.error) {
      showError(`Failed to load recipe ingredients: ${ingredientsResult.error.message}`);
      setRecipeIngredients([]);
    } else {
      setRecipeIngredients((ingredientsResult.data ?? []) as RecipeIngredient[]);
    }
  }, [staffType]);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadItems(),
      loadReports(),
      loadStationBatches(),
      loadMasterBatches(),
      loadBulkOpenedMovements(),
      loadTestingReferenceData(),
    ]);
    setLoading(false);
  }, [loadBulkOpenedMovements, loadItems, loadMasterBatches, loadReports, loadStationBatches, loadTestingReferenceData]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    if (!openStockActionMenu && !openKitchenActionMenu) return;

    const closeMenu = () => {
      setOpenStockActionMenu(null);
      setOpenKitchenActionMenu(null);
    };

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [openKitchenActionMenu, openStockActionMenu]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.name, item.category, item.supplier]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [items, searchQuery]);

  const kitchenTransferItems = useMemo(
    () => items.filter((item) => item.tracking_mode === "kitchen_station_auto_deduct"),
    [items],
  );
  const bulkUsageItems = useMemo(
    () => items.filter((item) => item.tracking_mode === "bulk_usage_expense"),
    [items],
  );
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const recipeByProductId = useMemo(
    () => new Map(recipes.filter((recipe) => recipe.product_id).map((recipe) => [recipe.product_id as string, recipe])),
    [recipes],
  );
  const recipeIngredientsByRecipeId = useMemo(() => {
    const map = new Map<string, RecipeIngredient[]>();
    recipeIngredients.forEach((ingredient) => {
      if (!ingredient.recipe_id) return;
      map.set(ingredient.recipe_id, [...(map.get(ingredient.recipe_id) || []), ingredient]);
    });
    return map;
  }, [recipeIngredients]);
  const sourceBatchesForItem = useCallback(
    (itemId: string) =>
      masterBatches.filter((batch) => batch.inventory_item_id === itemId && toNumber(batch.quantity_remaining) > 0),
    [masterBatches],
  );
  const getActiveStationQuantity = useCallback(
    (itemId: string) =>
      stationBatches
        .filter((batch) => {
          if (batch.inventory_item_id !== itemId) return false;
          if (toNumber(batch.quantity_remaining) <= 0) return false;
          return batch.station_status !== "finished" && batch.station_status !== "waste";
        })
        .reduce((sum, batch) => sum + toNumber(batch.quantity_remaining), 0),
    [stationBatches],
  );
  const selectedKitchenMoveItem = kitchenMoveForm.itemId ? itemById.get(kitchenMoveForm.itemId) || null : null;
  const selectedKitchenMoveBatch =
    kitchenMoveForm.sourceBatchId
      ? masterBatches.find((batch) => batch.id === kitchenMoveForm.sourceBatchId) || null
      : null;
  const selectedKitchenMoveMasterStock = toNumber(selectedKitchenMoveItem?.current_stock);
  const selectedKitchenMoveBatchStock = selectedKitchenMoveBatch ? toNumber(selectedKitchenMoveBatch.quantity_remaining) : null;
  const selectedKitchenMoveMax = selectedKitchenMoveBatch
    ? Math.min(selectedKitchenMoveMasterStock, selectedKitchenMoveBatchStock ?? 0)
    : selectedKitchenMoveMasterStock;
  const selectedKitchenMoveStationQty = selectedKitchenMoveItem ? getActiveStationQuantity(selectedKitchenMoveItem.id) : 0;
  const selectedKitchenMoveParGap = Math.max(toNumber(selectedKitchenMoveItem?.par_level) - selectedKitchenMoveStationQty, 0);
  const selectedKitchenMoveSuggestedQty = Math.min(
    selectedKitchenMoveMax,
    selectedKitchenMoveParGap > 0 ? selectedKitchenMoveParGap : selectedKitchenMoveMax,
  );
  const filteredStationBatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return stationBatches.filter((batch) => {
      const item = itemById.get(batch.inventory_item_id);
      if (!item) return false;
      if (!query) return true;
      return item.name.toLowerCase().includes(query) || (batch.batch_number || "").toLowerCase().includes(query);
    });
  }, [itemById, searchQuery, stationBatches]);

  const filteredBulkOpenedMovements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bulkOpenedMovements.filter((movement) => {
      const item = itemById.get(movement.inventory_item_id);
      if (!query) return true;
      return [item?.name, movement.shift_name, movement.notes, movement.created_by_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [bulkOpenedMovements, itemById, searchQuery]);
  const closingExpected = Math.max(
    Number(openingQty || 0) + Number(transferInQty || 0) - Number(posUsageQty || 0) - Number(wasteQty || 0),
    0,
  );
  const closingVariance = physicalClosingQty.trim() === "" ? null : Number(physicalClosingQty) - closingExpected;

  const selectedTestProduct = testingForm.productId
    ? products.find((product) => product.id === testingForm.productId) || null
    : null;
  const selectedTestRecipe = selectedTestProduct ? recipeByProductId.get(selectedTestProduct.id) || null : null;
  const selectedTestRecipeIngredients = useMemo(
    () => selectedTestRecipe
      ? recipeIngredientsByRecipeId.get(selectedTestRecipe.id) || []
      : [],
    [recipeIngredientsByRecipeId, selectedTestRecipe],
  );
  const selectedTestItem = testingForm.itemId ? itemById.get(testingForm.itemId) || null : null;

  const convertForStockUnit = useCallback((quantity: number, fromUnit?: string | null, toUnit?: string | null) => {
    const sourceUnit = fromUnit || "";
    const targetUnit = toUnit || sourceUnit;
    if (!sourceUnit || !targetUnit || sourceUnit.toLowerCase() === targetUnit.toLowerCase()) return quantity;

    try {
      return convertQuantity(quantity, sourceUnit, targetUnit);
    } catch {
      return quantity;
    }
  }, []);

  const getItemUnitCost = useCallback((item: InventoryItem | null | undefined) => {
    if (!item) return 0;
    return toNumber(item.cost_per_unit);
  }, []);

  const getReadyStationBatches = useCallback(
    (itemId: string) =>
      stationBatches
        .filter((batch) => (
          batch.inventory_item_id === itemId &&
          batch.station_status === "ready" &&
          toNumber(batch.quantity_remaining) > 0
        ))
        .sort((left, right) => String(left.started_at || "").localeCompare(String(right.started_at || ""))),
    [stationBatches],
  );

  const getMasterBatchesForDeduction = useCallback(
    (itemId: string) =>
      masterBatches
        .filter((batch) => batch.inventory_item_id === itemId && toNumber(batch.quantity_remaining) > 0)
        .sort((left, right) => String(left.expiry_date || "9999-12-31").localeCompare(String(right.expiry_date || "9999-12-31"))),
    [masterBatches],
  );

  const getTestingDeductionSource = useCallback((
    item: InventoryItem | null,
    costingMode: RecipeIngredient["costing_mode"] | null | undefined,
    requiredQuantity: number,
  ): TestingRecipeLine["deductionSource"] => {
    if (!item || costingMode === "kitchen_overhead" || requiredQuantity <= 0) return "none";
    if (
      item.tracking_mode === "kitchen_station_auto_deduct" &&
      (staffType === "kitchen" || currentUser?.role === "owner")
    ) {
      return "station";
    }
    return "master";
  }, [currentUser?.role, staffType]);

  const getTestingLineAvailableQuantity = useCallback((line: TestingRecipeLine) => {
    if (!line.item) return 0;
    if (line.deductionSource === "station") {
      return getReadyStationBatches(line.item.id).reduce((sum, batch) => sum + toNumber(batch.quantity_remaining), 0);
    }
    if (line.deductionSource === "master") return toNumber(line.item.current_stock);
    return Number.POSITIVE_INFINITY;
  }, [getReadyStationBatches]);

  const getTestingLineSourceLabel = useCallback((line: TestingRecipeLine) => {
    if (line.deductionSource === "station") return "ready kitchen station stock";
    if (line.deductionSource === "master") return "inventory master stock";
    return "no deduction";
  }, []);

  const testingRecipeLines = useMemo<TestingRecipeLine[]>(() => {
    const portions = Math.max(Number(testingForm.portions || 1), 0);

    return selectedTestRecipeIngredients.map((ingredient) => {
      const item = ingredient.inventory_item_id ? itemById.get(ingredient.inventory_item_id) || null : null;
      const costingMode = ingredient.costing_mode || "deduct_from_pos";
      const sourceQuantity = toNumber(ingredient.quantity_needed) * portions;
      const stockUnit = item?.unit || ingredient.unit || "";
      const requiredQuantity =
        costingMode === "kitchen_overhead"
          ? 0
          : convertForStockUnit(sourceQuantity, ingredient.unit, stockUnit);
      const deductionSource = getTestingDeductionSource(item, costingMode, requiredQuantity);
      const note =
        deductionSource === "station"
          ? "Deduct from ready kitchen station stock"
          : deductionSource === "master"
            ? "Deduct from inventory master stock"
            : costingMode === "kitchen_overhead"
              ? "Recorded as overhead note"
              : "No deduction";

      return {
        ingredient,
        item,
        requiredQuantity,
        sourceUnit: ingredient.unit || stockUnit,
        stockUnit,
        costingMode,
        deductionSource,
        note,
      };
    });
  }, [convertForStockUnit, getTestingDeductionSource, itemById, selectedTestRecipeIngredients, testingForm.portions]);

  const closeTestingModal = () => {
    setTestingModalOpen(false);
    setTestingTouched(false);
    setTestingForm({
      mode: "ingredient",
      itemId: "",
      productId: "",
      quantity: "",
      portions: "1",
      purpose: staffType === "barista" ? "coffee_calibration" : "taste_test",
      shiftName: initialKitchenShift,
      notes: "",
    });
  };

  const openReportModal = (item: InventoryItem, reportType: ReportType) => {
    setOpenStockActionMenu(null);
    setSelectedItem(item);
    setSelectedReport(null);
    setSelectedReportType(reportType);
    setQuantityNote("");
    setDescription("");
  };

  const openEditReportModal = (report: StockReport) => {
    if (report.status !== "pending") {
      showError("Only pending reports can be edited.");
      return;
    }

    setSelectedReport(report);
    setSelectedItem(null);
    setSelectedReportType(report.report_type);
    setQuantityNote(report.quantity_note ?? "");
    setDescription(report.description ?? "");
  };

  const closeReportModal = () => {
    setSelectedItem(null);
    setSelectedReport(null);
    setQuantityNote("");
    setDescription("");
  };

  const closeKitchenMoveModal = () => {
    setKitchenMoveOpen(null);
    setKitchenMoveTouched(false);
    setKitchenMoveForm({
      itemId: "",
      sourceBatchId: "",
      quantity: "",
      expiryDate: getDateAfterDays(3),
      shiftName: kitchenShiftFilter,
      notes: "",
    });
  };

  const closeKitchenAuditModal = () => {
    setKitchenAuditTarget(null);
    setClosingTouchedSubmit(false);
    setPhysicalClosingQty("");
    setWasteQty("");
    setClosingNotes("");
    setKitchenReportCondition("ok");
    setKitchenReportLevel("");
  };

  const openKitchenAuditForStationBatch = (batch: StationBatch) => {
    setOpenKitchenActionMenu(null);
    const item = itemById.get(batch.inventory_item_id);
    const expected = toNumber(batch.quantity_remaining);

    setKitchenAuditTarget({
      kind: "station",
      inventoryItemId: batch.inventory_item_id,
      itemName: item?.name || "Kitchen item",
      unit: batch.unit || item?.unit || "",
      expectedQuantity: expected,
      stationBatchId: batch.id,
      sourceBatchId: batch.source_batch_id,
      sourceLabel: `Batch ${batch.batch_number || "-"}`,
    });
    setClosingDate(new Date().toISOString().slice(0, 10));
    setClosingShift(kitchenShiftFilter);
    setClosingItemId(batch.inventory_item_id);
    setOpeningQty(String(expected));
    setTransferInQty("");
    setPosUsageQty("");
    setWasteQty("");
    setPhysicalClosingQty(String(expected));
    setClosingNotes("");
    setKitchenReportCondition("adjusted");
    setKitchenReportLevel("");
    setClosingTouchedSubmit(false);
  };

  const openKitchenAuditForBulkMovement = (movement: BulkOpenedMovement) => {
    setOpenKitchenActionMenu(null);
    const item = itemById.get(movement.inventory_item_id);
    const expected = toNumber(movement.quantity);

    setKitchenAuditTarget({
      kind: "bulk",
      inventoryItemId: movement.inventory_item_id,
      itemName: item?.name || "Opened ingredient",
      unit: movement.unit || item?.unit || "",
      expectedQuantity: expected,
      sourceBatchId: movement.source_batch_id,
      sourceLabel: `Opened ${expected} ${movement.unit || item?.unit || ""}`.trim(),
    });
    setClosingDate(movement.business_date || new Date().toISOString().slice(0, 10));
    setClosingShift(movement.shift_name || kitchenShiftFilter);
    setClosingItemId(movement.inventory_item_id);
    setOpeningQty(String(expected));
    setTransferInQty("");
    setPosUsageQty("");
    setWasteQty("");
    setPhysicalClosingQty("");
    setClosingNotes("");
    setKitchenReportCondition("ok");
    setKitchenReportLevel("");
    setClosingTouchedSubmit(false);
  };

  const openKitchenMoveModal = (mode: "transfer" | "bulk") => {
    setKitchenMoveOpen(mode);
    setKitchenMoveTouched(false);
    setKitchenMoveForm({
      itemId: "",
      sourceBatchId: "",
      quantity: "",
      expiryDate: mode === "transfer" ? getDateAfterDays(3) : "",
      shiftName: kitchenShiftFilter,
      notes: "",
    });
  };

  const submitKitchenMove = async () => {
    if (!kitchenMoveOpen) return;
    setKitchenMoveTouched(true);

    const item = itemById.get(kitchenMoveForm.itemId);
    if (!item) {
      showError("Please select an item.");
      return;
    }

    const quantity = Number(kitchenMoveForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showError("Quantity is required and must be greater than 0.");
      return;
    }

    if (kitchenMoveOpen === "transfer" && !kitchenMoveForm.expiryDate) {
      showError("Chiller consume-by date is required.");
      return;
    }

    const sourceBatch = masterBatches.find((batch) => batch.id === kitchenMoveForm.sourceBatchId) || null;
    const beforeItemStock = toNumber(item.current_stock);
    const beforeBatchStock = toNumber(sourceBatch?.quantity_remaining);
    const availableStock = sourceBatch ? Math.min(beforeBatchStock, beforeItemStock) : beforeItemStock;
    const unitCost = toNumber(sourceBatch?.unit_cost);
    const createdBy = currentUser ? `${currentUser.name} - ${staffType ?? currentUser.role}` : null;

    if (quantity > availableStock) {
      showError(
        sourceBatch
          ? `Quantity cannot exceed selected batch stock (${availableStock} ${item.unit || ""}).`
          : `Quantity cannot exceed master stock (${availableStock} ${item.unit || ""}).`,
      );
      return;
    }

    const afterBatchStock = Math.max(beforeBatchStock - quantity, 0);
    const afterItemStock = Math.max(beforeItemStock - quantity, 0);
    let createdStationBatchId: string | null = null;
    let batchWasUpdated = false;
    let itemWasUpdated = false;

    try {
      if (kitchenMoveOpen === "transfer") {
        const { data: stationBatch, error: stationError } = await supabase
          .from("kitchen_station_batches")
          .insert({
            inventory_item_id: item.id,
            source_batch_id: sourceBatch?.id || null,
            station_status: "planned",
            batch_number: sourceBatch?.batch_number || null,
            quantity_received: quantity,
            quantity_remaining: quantity,
            unit: item.unit,
            unit_cost: unitCost || null,
            expiry_date: kitchenMoveForm.expiryDate || null,
            created_by_name: createdBy,
            notes: kitchenMoveForm.notes.trim() || null,
          })
          .select("id")
          .single();
        if (stationError) throw stationError;
        createdStationBatchId = stationBatch?.id ?? null;
      }

      if (sourceBatch) {
        const { error: batchError } = await supabase
          .from("inventory_batches")
          .update({ quantity_remaining: afterBatchStock })
          .eq("id", sourceBatch.id);
        if (batchError) throw batchError;
        batchWasUpdated = true;

        const { error: batchMovementError } = await supabase.from("inventory_batch_movements").insert({
          batch_id: sourceBatch.id,
          inventory_item_id: item.id,
          movement_type: "transfer",
          quantity,
          quantity_before: beforeBatchStock,
          quantity_after: afterBatchStock,
          unit: item.unit,
          notes: kitchenMoveOpen === "transfer"
            ? "Moved from master inventory to kitchen station"
            : "Ingredient opened for kitchen use",
          created_by_name: createdBy,
        });
        if (batchMovementError) throw batchMovementError;
      }

      const { error: itemStockError } = await supabase
        .from("inventory_items")
        .update({ current_stock: afterItemStock })
        .eq("id", item.id);
      if (itemStockError) throw itemStockError;
      itemWasUpdated = true;

      if (kitchenMoveOpen === "transfer") {
        const { error: movementError } = await supabase.from("kitchen_station_movements").insert({
          station_batch_id: createdStationBatchId,
          inventory_item_id: item.id,
          source_batch_id: sourceBatch?.id || null,
          movement_type: "transfer_in",
          quantity,
          quantity_before: 0,
          quantity_after: quantity,
          unit: item.unit,
          unit_cost: unitCost || null,
          total_cost: unitCost > 0 ? unitCost * quantity : null,
          business_date: new Date().toISOString().slice(0, 10),
          shift_name: kitchenMoveForm.shiftName,
          notes: kitchenMoveForm.notes.trim() || null,
          created_by_name: createdBy,
        });
        if (movementError) throw movementError;
      } else {
        const { error: movementError } = await supabase.from("kitchen_station_movements").insert({
          inventory_item_id: item.id,
          source_batch_id: sourceBatch?.id || null,
          movement_type: "bulk_opened",
          quantity,
          quantity_before: beforeItemStock,
          quantity_after: afterItemStock,
          unit: item.unit,
          unit_cost: unitCost || null,
          total_cost: unitCost > 0 ? unitCost * quantity : null,
          business_date: new Date().toISOString().slice(0, 10),
          shift_name: kitchenMoveForm.shiftName,
          notes: kitchenMoveForm.notes.trim() || "Ingredient opened for kitchen use",
          created_by_name: createdBy,
        });
        if (movementError) throw movementError;
      }

      showSuccess(kitchenMoveOpen === "transfer" ? "Stock moved to kitchen." : "Ingredient opened.");
      closeKitchenMoveModal();
      await loadPageData();
    } catch (error) {
      if (createdStationBatchId) {
        await supabase.from("kitchen_station_batches").delete().eq("id", createdStationBatchId);
      }
      if (batchWasUpdated && sourceBatch) {
        await supabase.from("inventory_batches").update({ quantity_remaining: beforeBatchStock }).eq("id", sourceBatch.id);
      }
      if (itemWasUpdated) {
        await supabase.from("inventory_items").update({ current_stock: beforeItemStock }).eq("id", item.id);
      }

      showError(getErrorMessage(error, "Kitchen stock movement could not be saved."));
    }
  };

  const openStockMenu = (item: InventoryItem, event: MouseEvent<HTMLButtonElement>) => {
    const anchor = event.currentTarget.getBoundingClientRect();
    setOpenStockActionMenu((current) => (current?.item.id === item.id ? null : { item, anchor }));
  };

  const renderStockActionMenu = () => {
    if (!openStockActionMenu) return null;

    const menuWidth = 320;
    const gap = 8;
    const left = Math.max(12, Math.min(openStockActionMenu.anchor.right - menuWidth, window.innerWidth - menuWidth - 12));
    const menuHeight = 288;
    const shouldOpenAbove = openStockActionMenu.anchor.bottom + gap + menuHeight > window.innerHeight;
    const top = shouldOpenAbove
      ? Math.max(12, openStockActionMenu.anchor.top - gap - menuHeight)
      : openStockActionMenu.anchor.bottom + gap;

    return createPortal(
      <>
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          aria-label="Close stock action menu"
          onClick={() => setOpenStockActionMenu(null)}
        />
        <div
          className="fixed z-50 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
          style={{ left, top, width: menuWidth }}
        >
          {reportOptions.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => openReportModal(openStockActionMenu.item, option.type)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
            >
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" />
              <span>
                <span className="block text-sm font-semibold text-gray-800">{option.label}</span>
                <span className="text-xs text-gray-500">{option.description}</span>
              </span>
            </button>
          ))}
        </div>
      </>,
      document.body,
    );
  };

  const openKitchenMenuForStationBatch = (batch: StationBatch, event: MouseEvent<HTMLButtonElement>) => {
    const anchor = event.currentTarget.getBoundingClientRect();
    setOpenKitchenActionMenu((current) =>
      current?.kind === "station" && current.batch.id === batch.id ? null : { kind: "station", batch, anchor },
    );
  };

  const openKitchenMenuForBulkMovement = (movement: BulkOpenedMovement, event: MouseEvent<HTMLButtonElement>) => {
    const anchor = event.currentTarget.getBoundingClientRect();
    setOpenKitchenActionMenu((current) =>
      current?.kind === "bulk" && current.movement.id === movement.id ? null : { kind: "bulk", movement, anchor },
    );
  };

  const renderKitchenActionMenu = () => {
    if (!openKitchenActionMenu) return null;

    const menuWidth = 300;
    const gap = 8;
    const left = Math.max(12, Math.min(openKitchenActionMenu.anchor.right - menuWidth, window.innerWidth - menuWidth - 12));
    const menuHeight = openKitchenActionMenu.kind === "station" ? 384 : 224;
    const shouldOpenAbove = openKitchenActionMenu.anchor.bottom + gap + menuHeight > window.innerHeight;
    const top = shouldOpenAbove
      ? Math.max(12, openKitchenActionMenu.anchor.top - gap - menuHeight)
      : openKitchenActionMenu.anchor.bottom + gap;

    const reportAction = () => {
      if (openKitchenActionMenu.kind === "station") {
        openKitchenAuditForStationBatch(openKitchenActionMenu.batch);
        return;
      }
      openKitchenAuditForBulkMovement(openKitchenActionMenu.movement);
    };

    return createPortal(
      <>
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          aria-label="Close kitchen action menu"
          onClick={() => setOpenKitchenActionMenu(null)}
        />
        <div
          className="fixed z-50 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
          style={{ left, top, width: menuWidth }}
        >
          {openKitchenActionMenu.kind === "station" ? (
            <>
              <div className="px-4 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-gray-500">Kitchen status</div>
              {(["thawing", "prep", "ready"] as Array<StationBatch["station_status"]>).map((status) => {
                const isActive = openKitchenActionMenu.batch.station_status === status;

                return (
                  <button
                    key={status}
                    type="button"
                    disabled={isActive}
                    onClick={() => {
                      const batch = openKitchenActionMenu.batch;
                      setOpenKitchenActionMenu(null);
                      void updateStationBatchStatus(batch, status);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                  >
                    <span>
                      <span className={`block text-sm font-semibold ${isActive ? "text-gray-400" : "text-gray-800"}`}>
                        {isActive ? stationStatusLabel(status) : `Move to ${stationStatusLabel(status)}`}
                      </span>
                      {status === "ready" ? (
                        <span className="text-xs text-gray-500">Available for POS orders</span>
                      ) : null}
                    </span>
                    {isActive ? (
                      <span className="rounded-full bg-gray-200 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        Current
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <div className="my-2 border-t border-gray-100" />
            </>
          ) : null}

          <button
            type="button"
            onClick={reportAction}
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
          >
            <PencilIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" />
            <span>
              <span className="block text-sm font-semibold text-gray-800">Report</span>
              <span className="text-xs text-gray-500">Submit handover note, waste, or adjusted count.</span>
            </span>
          </button>
          {openKitchenActionMenu.kind === "bulk" ? (
            <button
              type="button"
              onClick={() => void closeKitchenItem(openKitchenActionMenu, "finished")}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
            >
              <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" />
              <span>
                <span className="block text-sm font-semibold text-gray-800">Mark Used Up</span>
                <span className="text-xs text-gray-500">Remove from active kitchen list as used up.</span>
              </span>
            </button>
          ) : null}
          {openKitchenActionMenu.kind === "bulk" ? (
            <button
              type="button"
              onClick={() => void closeKitchenItem(openKitchenActionMenu, "waste")}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-red-50"
            >
              <TrashIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span>
                <span className="block text-sm font-semibold text-red-700">Mark Waste</span>
                <span className="text-xs text-red-500">Remove from active list and report waste.</span>
              </span>
            </button>
          ) : null}
        </div>
      </>,
      document.body,
    );
  };

  const submitReport = async () => {
    if (!currentUser?.id) return;
    if (!stockReportsAvailable) {
      showError("Stock reports table is not ready yet. Run the stock_reports SQL first.");
      return;
    }

    if (selectedReport) {
      const { error } = await supabase
        .from("stock_reports")
        .update({
          report_type: selectedReportType,
          quantity_note: quantityNote.trim() || null,
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedReport.id)
        .eq("status", "pending");

      if (error) {
        showError(`Failed to update report: ${error.message}`);
        return;
      }

      showSuccess("Stock report updated.");
      closeReportModal();
      await loadReports();
      return;
    }

    if (!selectedItem) return;

    const reportPayload = {
      inventory_item_id: selectedItem.id,
      material_name: selectedItem.name,
      report_type: selectedReportType,
      quantity_note: quantityNote.trim() || null,
      description: description.trim() || null,
      station_scope: selectedItem.station_scope || "shared",
      status: "pending",
      reported_by: currentUser.id,
      reported_by_name: currentUser.name,
      reported_by_role: staffType ?? currentUser.role,
    };

    let { error } = await supabase.from("stock_reports").insert(reportPayload);
    if (error && (error.message.toLowerCase().includes("station_scope") || error.message.toLowerCase().includes("schema cache"))) {
      const fallback = await supabase.from("stock_reports").insert(omitStationScope(reportPayload));
      error = fallback.error;
    }

    if (error) {
      showError(`Failed to submit report: ${error.message}`);
      return;
    }

    showSuccess("Stock report submitted.");
    closeReportModal();
    await loadReports();
  };

  const deleteReport = async (report: StockReport) => {
    if (report.status !== "pending") {
      showError("Only pending reports can be deleted.");
      return;
    }

    const confirmed = window.confirm(`Delete report for ${report.material_name}?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("stock_reports")
      .delete()
      .eq("id", report.id)
      .eq("status", "pending");

    if (error) {
      showError(`Failed to delete report: ${error.message}`);
      return;
    }

    showSuccess("Stock report deleted.");
    await loadReports();
  };

  const createTestingStockReport = async ({
    item,
    quantity,
    unit,
    sourceLabel,
    description,
  }: {
    item: InventoryItem;
    quantity: number;
    unit: string;
    sourceLabel: string;
    description: string;
  }) => {
    if (!currentUser?.id || !stockReportsAvailable) return null;

    const reportPayload = {
      inventory_item_id: item.id,
      material_name: item.name,
      report_type: "testing_usage" as ReportType,
      quantity_note: `Testing Usage ${quantity} ${unit}`.trim(),
      description,
      station_scope: item.station_scope || (staffType === "kitchen" ? "kitchen" : staffType === "barista" ? "barista" : "shared"),
      status: "pending" as ReportStatus,
      reported_by: currentUser.id,
      reported_by_name: currentUser.name,
      reported_by_role: staffType ?? currentUser.role,
    };

    let { error } = await supabase.from("stock_reports").insert(reportPayload);
    if (error && (error.message.toLowerCase().includes("station_scope") || error.message.toLowerCase().includes("schema cache"))) {
      const fallback = await supabase.from("stock_reports").insert(omitStationScope(reportPayload));
      error = fallback.error;
    }

    if (error) {
      return new Error(`Testing usage saved, but stock report failed for ${sourceLabel}: ${error.message}`);
    }

    return null;
  };

  const deductMasterTestingUsage = async ({
    item,
    quantity,
    unit,
    usageTransactionId,
    notes,
  }: {
    item: InventoryItem;
    quantity: number;
    unit: string;
    usageTransactionId: string;
    notes: string;
  }) => {
    const beforeItemStock = toNumber(item.current_stock);
    if (quantity > beforeItemStock) {
      throw new Error(`${item.name} stock is only ${beforeItemStock} ${unit}.`);
    }

    const afterItemStock = Math.max(beforeItemStock - quantity, 0);
    const { error: itemError } = await supabase
      .from("inventory_items")
      .update({ current_stock: afterItemStock })
      .eq("id", item.id);

    if (itemError) throw itemError;

    const { error: detailError } = await supabase.from("usage_transaction_details").insert({
      usage_transaction_id: usageTransactionId,
      inventory_item_id: item.id,
      ingredient_name: item.name,
      quantity_used: quantity,
      unit,
      previous_stock: beforeItemStock,
      new_stock: afterItemStock,
    });

    if (detailError) throw detailError;

    let remaining = quantity;
    const batches = getMasterBatchesForDeduction(item.id);

    for (const batch of batches) {
      if (remaining <= 0) break;
      const beforeBatch = toNumber(batch.quantity_remaining);
      const usedFromBatch = Math.min(beforeBatch, remaining);
      if (usedFromBatch <= 0) continue;

      const afterBatch = beforeBatch - usedFromBatch;
      const { error: batchError } = await supabase
        .from("inventory_batches")
        .update({ quantity_remaining: afterBatch })
        .eq("id", batch.id);
      if (batchError) throw batchError;

      const { error: batchMovementError } = await supabase.from("inventory_batch_movements").insert({
        batch_id: batch.id,
        inventory_item_id: item.id,
        usage_transaction_id: usageTransactionId,
        movement_type: "testing_usage",
        quantity: usedFromBatch,
        quantity_before: beforeBatch,
        quantity_after: afterBatch,
        unit,
        notes,
        created_by_name: currentUser ? `${currentUser.name} - ${staffType ?? currentUser.role}` : null,
      });
      if (batchMovementError) throw batchMovementError;

      remaining -= usedFromBatch;
    }
  };

  const deductStationTestingUsage = async ({
    item,
    quantity,
    unit,
    usageTransactionId,
    shiftName,
    notes,
  }: {
    item: InventoryItem;
    quantity: number;
    unit: string;
    usageTransactionId: string;
    shiftName: string;
    notes: string;
  }) => {
    const readyBatches = getReadyStationBatches(item.id);
    const beforeStationStock = readyBatches.reduce((sum, batch) => sum + toNumber(batch.quantity_remaining), 0);

    if (quantity > beforeStationStock) {
      throw new Error(`${item.name} ready kitchen stock is only ${beforeStationStock} ${unit}.`);
    }

    let remaining = quantity;
    const createdBy = currentUser ? `${currentUser.name} - ${staffType ?? currentUser.role}` : null;

    for (const batch of readyBatches) {
      if (remaining <= 0) break;
      const beforeBatch = toNumber(batch.quantity_remaining);
      const usedFromBatch = Math.min(beforeBatch, remaining);
      if (usedFromBatch <= 0) continue;

      const afterBatch = beforeBatch - usedFromBatch;
      const { error: batchError } = await supabase
        .from("kitchen_station_batches")
        .update({
          quantity_remaining: afterBatch,
          station_status: afterBatch <= 0 ? "finished" : batch.station_status,
          finished_at: afterBatch <= 0 ? new Date().toISOString() : null,
        })
        .eq("id", batch.id);
      if (batchError) throw batchError;

      const unitCost = toNumber(batch.unit_cost) || getItemUnitCost(item);
      const { error: movementError } = await supabase.from("kitchen_station_movements").insert({
        station_batch_id: batch.id,
        inventory_item_id: item.id,
        source_batch_id: batch.source_batch_id,
        usage_transaction_id: usageTransactionId,
        movement_type: "testing_usage",
        quantity: usedFromBatch,
        quantity_before: beforeBatch,
        quantity_after: afterBatch,
        unit,
        unit_cost: unitCost || null,
        total_cost: unitCost > 0 ? unitCost * usedFromBatch : null,
        business_date: new Date().toISOString().slice(0, 10),
        shift_name: shiftName,
        notes,
        created_by_name: createdBy,
      });
      if (movementError) throw movementError;

      remaining -= usedFromBatch;
    }
  };

  const submitTestingUsage = async () => {
    if (!currentUser?.id) return;
    setTestingTouched(true);

    const isMenuMode = testingForm.mode === "menu";
    const purposeLabel = getTestingPurposeLabel(testingForm.purpose);
    const shiftName = testingForm.shiftName || initialKitchenShift;
    const baseNotes = [
      `Purpose: ${purposeLabel}`,
      `Station: ${staffType === "barista" ? "Barista" : staffType === "kitchen" ? "Kitchen" : "Staff"}`,
      testingForm.notes.trim(),
    ].filter(Boolean).join(" | ");

    const usageLines = isMenuMode
      ? testingRecipeLines.filter((line) => line.deductionSource !== "none" && line.item && line.requiredQuantity > 0)
      : selectedTestItem
        ? [{
            item: selectedTestItem,
            requiredQuantity: Number(testingForm.quantity),
            stockUnit: selectedTestItem.unit || "",
            deductionSource: getTestingDeductionSource(
              selectedTestItem,
              "deduct_from_pos",
              Number(testingForm.quantity),
            ),
            note: "Manual testing ingredient",
          } as TestingRecipeLine]
        : [];

    if (isMenuMode) {
      if (!selectedTestProduct) {
        showError("Please select a menu to test.");
        return;
      }
      if (!selectedTestRecipe) {
        showError("Selected menu does not have a base recipe.");
        return;
      }
      if (!Number.isFinite(Number(testingForm.portions)) || Number(testingForm.portions) <= 0) {
        showError("Portions must be greater than 0.");
        return;
      }
      if (usageLines.length === 0) {
        showError("This menu recipe has no deductible ingredients.");
        return;
      }
    } else {
      if (!selectedTestItem) {
        showError("Please select an ingredient.");
        return;
      }
      if (!Number.isFinite(Number(testingForm.quantity)) || Number(testingForm.quantity) <= 0) {
        showError("Quantity used must be greater than 0.");
        return;
      }
    }

    const insufficientLine = usageLines.find((line) => {
      if (!line.item || line.deductionSource === "none") return false;
      return line.requiredQuantity > getTestingLineAvailableQuantity(line);
    });

    if (insufficientLine?.item) {
      const available = getTestingLineAvailableQuantity(insufficientLine);
      const unit = insufficientLine.stockUnit || insufficientLine.item.unit || "";
      showError(
        `${insufficientLine.item.name} ${getTestingLineSourceLabel(insufficientLine)} is only ${available} ${unit}.`,
      );
      return;
    }

    try {
      const transactionNotes = [
        isMenuMode && selectedTestProduct
          ? `Testing menu: ${selectedTestProduct.name} x ${testingForm.portions}`
          : selectedTestItem
            ? `Testing ingredient: ${selectedTestItem.name}`
            : "Testing usage",
        baseNotes,
        isMenuMode
          ? testingRecipeLines
              .filter((line) => line.deductionSource === "none")
              .map((line) => `${line.ingredient.ingredient_name || line.item?.name || "Ingredient"}: ${line.note}`)
              .join(" | ")
          : "",
      ].filter(Boolean).join(" | ");

      const { data: transaction, error: transactionError } = await supabase
        .from("usage_transactions")
        .insert({
          transaction_type: "testing_usage",
          type: "testing_usage",
          timestamp: new Date().toISOString(),
          product_id: isMenuMode ? selectedTestProduct?.id ?? null : null,
          product_name: isMenuMode ? selectedTestProduct?.name ?? "Test Menu" : "Ingredient Testing",
          quantity_sold: isMenuMode ? Number(testingForm.portions) : 1,
          notes: transactionNotes,
          performed_by: currentUser.id,
          performed_by_name: currentUser.name,
        })
        .select("id")
        .single();

      if (transactionError) throw transactionError;
      const usageTransactionId = transaction?.id;
      if (!usageTransactionId) throw new Error("Testing usage transaction was not created.");

      for (const line of usageLines) {
        if (!line.item) continue;
        const unit = line.stockUnit || line.item.unit || "";
        const notes = [
          isMenuMode && selectedTestProduct ? `Menu Trial: ${selectedTestProduct.name}` : "Ingredient Test",
          baseNotes,
        ].filter(Boolean).join(" | ");

        if (line.deductionSource === "station") {
          await deductStationTestingUsage({
            item: line.item,
            quantity: line.requiredQuantity,
            unit,
            usageTransactionId,
            shiftName,
            notes,
          });
        } else {
          await deductMasterTestingUsage({
            item: line.item,
            quantity: line.requiredQuantity,
            unit,
            usageTransactionId,
            notes,
          });
        }

        const reportError = await createTestingStockReport({
          item: line.item,
          quantity: line.requiredQuantity,
          unit,
          sourceLabel: isMenuMode ? selectedTestProduct?.name || "Test Menu" : line.item.name,
          description: notes,
        });

        if (reportError) throw reportError;
      }

      showSuccess(isMenuMode ? "Menu testing usage recorded." : "Ingredient testing usage recorded.");
      closeTestingModal();
      await loadPageData();
    } catch (error) {
      showError(getErrorMessage(error, "Testing usage could not be saved."));
    }
  };

  const submitKitchenClosingCount = async () => {
    if (!currentUser?.id) return;
    setClosingTouchedSubmit(true);

    if (!closingItemId) {
      showError("Please select an item.");
      return;
    }

    const isBulkInformalReport = kitchenAuditTarget?.kind === "bulk" && physicalClosingQty.trim() === "";
    const parsedPhysicalClosing = Number(physicalClosingQty);
    const physicalClosing = isBulkInformalReport
      ? Math.max(Number(openingQty || 0) - Number(wasteQty || 0), 0)
      : parsedPhysicalClosing;

    if (!Number.isFinite(physicalClosing) || physicalClosing < 0) {
      showError(kitchenAuditTarget?.kind === "bulk" ? "Estimated remaining must be a valid number when filled." : "Physical count is required.");
      return;
    }

    const item = items.find((row) => row.id === closingItemId);
    if (!item) return;

    const opening = Number(openingQty || 0);
    const transferIn = Number(transferInQty || 0);
    const posUsage = Number(posUsageQty || 0);
    const waste = Number(wasteQty || 0);
    const expected = Math.max(opening + transferIn - posUsage - waste, 0);
    const variance = physicalClosing - expected;
    const submittedBy = `${currentUser.name} - ${staffType ?? currentUser.role}`;

    const { error } = await supabase.from("kitchen_station_shift_counts").upsert({
      inventory_item_id: item.id,
      business_date: closingDate,
      shift_name: closingShift,
      opening_quantity: Number.isFinite(opening) ? opening : 0,
      transfer_in_quantity: Number.isFinite(transferIn) ? transferIn : 0,
      pos_usage_quantity: Number.isFinite(posUsage) ? posUsage : 0,
      waste_quantity: Number.isFinite(waste) ? waste : 0,
      expected_closing_quantity: expected,
      physical_closing_quantity: physicalClosing,
      variance_quantity: variance,
      unit: item.unit,
      status: "submitted",
      submitted_by_name: submittedBy,
      submitted_at: new Date().toISOString(),
      notes: [
        `Reason: ${getKitchenReportConditionLabel(kitchenReportCondition)}`,
        kitchenReportLevel ? `Level: ${getKitchenReportLevelLabel(kitchenReportLevel)}` : "",
        closingNotes.trim(),
      ].filter(Boolean).join(" | ") || null,
    }, { onConflict: "inventory_item_id,business_date,shift_name" });

    if (error) {
      showError(`Failed to submit kitchen closing count: ${error.message}`);
      return;
    }

    const { error: movementError } = await supabase.from("kitchen_station_movements").insert({
      station_batch_id: kitchenAuditTarget?.stationBatchId || null,
      inventory_item_id: item.id,
      source_batch_id: kitchenAuditTarget?.sourceBatchId || null,
      movement_type: "closing_count",
      quantity: physicalClosing,
      quantity_before: expected,
      quantity_after: physicalClosing,
      unit: item.unit,
      business_date: closingDate,
      shift_name: closingShift,
      notes: [
        `Reason: ${getKitchenReportConditionLabel(kitchenReportCondition)}`,
        kitchenReportLevel ? `Level: ${getKitchenReportLevelLabel(kitchenReportLevel)}` : "",
        closingNotes.trim(),
      ].filter(Boolean).join(" | ") || null,
      created_by_name: submittedBy,
    });

    if (movementError) {
      showError(`Closing count saved, but movement log failed: ${movementError.message}`);
      return;
    }

    if (kitchenAuditTarget?.kind === "station" && kitchenAuditTarget.stationBatchId) {
      const { error: batchUpdateError } = await supabase
        .from("kitchen_station_batches")
        .update({ quantity_remaining: physicalClosing })
        .eq("id", kitchenAuditTarget.stationBatchId);

      if (batchUpdateError) {
        showError(`Closing count saved, but station quantity update failed: ${batchUpdateError.message}`);
        return;
      }
    }

    if (kitchenAuditTarget && stockReportsAvailable) {
      const reportType: ReportType =
        kitchenReportCondition === "waste" || waste > 0 || variance < 0
          ? "waste_damaged"
          : "low_stock";
      const reportPayload = {
        inventory_item_id: item.id,
        material_name: item.name,
        report_type: reportType,
        quantity_note: [
          `Reason ${getKitchenReportConditionLabel(kitchenReportCondition)}`,
          kitchenReportLevel ? `Level ${getKitchenReportLevelLabel(kitchenReportLevel)}` : "",
          `Expected ${expected} ${item.unit || ""}`.trim(),
          physicalClosingQty.trim() ? `Physical ${physicalClosing} ${item.unit || ""}`.trim() : "",
          waste > 0 ? `Waste ${waste} ${item.unit || ""}`.trim() : "",
          variance !== 0 ? `Variance ${variance} ${item.unit || ""}`.trim() : "",
        ].filter(Boolean).join(" | "),
        description: [
          kitchenAuditTarget.sourceLabel,
          closingNotes.trim(),
        ].filter(Boolean).join(" | ") || null,
        station_scope: "kitchen",
        status: "pending",
        reported_by: currentUser.id,
        reported_by_name: currentUser.name,
        reported_by_role: staffType ?? currentUser.role,
      };

      let { error: reportError } = await supabase.from("stock_reports").insert(reportPayload);
      if (reportError && (reportError.message.toLowerCase().includes("station_scope") || reportError.message.toLowerCase().includes("schema cache"))) {
        const fallback = await supabase.from("stock_reports").insert(omitStationScope(reportPayload));
        reportError = fallback.error;
      }

      if (reportError) {
        showError(`Kitchen report saved, but manager stock report failed: ${reportError.message}`);
        return;
      }
    }

    showSuccess(kitchenAuditTarget ? "Kitchen report submitted." : "Kitchen closing count submitted.");
    setClosingTouchedSubmit(false);
    setOpeningQty("");
    setTransferInQty("");
    setPosUsageQty("");
    setWasteQty("");
    setPhysicalClosingQty("");
    setClosingNotes("");
    setKitchenAuditTarget(null);
    await Promise.all([loadStationBatches(), loadBulkOpenedMovements()]);
  };

  const createKitchenActionReport = async (
    item: InventoryItem,
    reportType: ReportType,
    quantityNote: string,
    description: string,
  ) => {
    if (!currentUser?.id || !stockReportsAvailable) return null;

    const reportPayload = {
      inventory_item_id: item.id,
      material_name: item.name,
      report_type: reportType,
      quantity_note: quantityNote,
      description,
      station_scope: "kitchen" as StationScope,
      status: "pending" as ReportStatus,
      reported_by: currentUser.id,
      reported_by_name: currentUser.name,
      reported_by_role: staffType ?? currentUser.role,
    };

    let { error } = await supabase.from("stock_reports").insert(reportPayload);
    if (error && (error.message.toLowerCase().includes("station_scope") || error.message.toLowerCase().includes("schema cache"))) {
      const fallback = await supabase.from("stock_reports").insert(omitStationScope(reportPayload));
      error = fallback.error;
    }

    return error;
  };

  const closeKitchenItem = async (target: KitchenActionTarget, finalStatus: "finished" | "waste") => {
    if (!currentUser?.id) return;

    setOpenKitchenActionMenu(null);

    const now = new Date().toISOString();
    const businessDate = now.slice(0, 10);
    const submittedBy = `${currentUser.name} - ${staffType ?? currentUser.role}`;
    const isWaste = finalStatus === "waste";
    const finalLabel = isWaste ? "waste" : "finished";

    if (target.kind === "station") {
      const batch = target.batch;
      const item = itemById.get(batch.inventory_item_id);
      const quantityBefore = toNumber(batch.quantity_remaining);

      const { error } = await supabase
        .from("kitchen_station_batches")
        .update({
          station_status: finalStatus,
          quantity_remaining: 0,
          finished_at: now,
        })
        .eq("id", batch.id);

      if (error) {
        showError(`Failed to close station item: ${error.message}`);
        return;
      }

      const { error: movementError } = await supabase.from("kitchen_station_movements").insert({
        station_batch_id: batch.id,
        inventory_item_id: batch.inventory_item_id,
        source_batch_id: batch.source_batch_id,
        movement_type: isWaste ? "waste" : "adjustment",
        quantity: quantityBefore,
        quantity_before: quantityBefore,
        quantity_after: 0,
        unit: batch.unit,
        business_date: businessDate,
        shift_name: kitchenShiftFilter,
        notes: `Marked ${finalLabel} from kitchen action menu`,
        created_by_name: submittedBy,
      });

      if (movementError) {
        showError(`Station item closed, but movement log failed: ${movementError.message}`);
        await loadStationBatches();
        return;
      }

      if (isWaste && item) {
        const reportError = await createKitchenActionReport(
          item,
          "waste_damaged",
          `Waste ${quantityBefore} ${batch.unit || item.unit || ""}`.trim(),
          `Kitchen station ${batch.batch_number || "batch"} marked waste during ${kitchenShiftFilter}`,
        );

        if (reportError) {
          showError(`Station item closed, but manager waste report failed: ${reportError.message}`);
          await loadStationBatches();
          return;
        }
      }

      showSuccess(isWaste ? "Station item marked as waste." : "Station item marked as finished.");
      await Promise.all([loadStationBatches(), loadReports()]);
      return;
    }

    const movement = target.movement;
    const item = itemById.get(movement.inventory_item_id);
    const quantity = toNumber(movement.quantity);
    const currentNotes = movement.notes?.trim();
    const closedNote = `Marked ${finalLabel} from kitchen action menu`;

    const { error } = await supabase
      .from("kitchen_station_movements")
      .update({
        movement_status: finalStatus,
        closed_at: now,
        notes: [currentNotes, closedNote].filter(Boolean).join(" | "),
      })
      .eq("id", movement.id);

    if (error) {
      if (error.message.toLowerCase().includes("movement_status") || error.message.toLowerCase().includes("schema cache")) {
        showError("Bulk lifecycle columns are not ready yet. Run the kitchen station SQL migration, then try again.");
        return;
      }

      showError(`Failed to close opened ingredient: ${error.message}`);
      return;
    }

    const { error: movementError } = await supabase.from("kitchen_station_movements").insert({
      inventory_item_id: movement.inventory_item_id,
      source_batch_id: movement.source_batch_id,
      movement_type: isWaste ? "waste" : "adjustment",
      quantity,
      quantity_before: quantity,
      quantity_after: 0,
      unit: movement.unit,
      unit_cost: movement.unit_cost,
      total_cost: isWaste ? movement.total_cost : null,
      business_date: businessDate,
      shift_name: movement.shift_name || kitchenShiftFilter,
      notes: `Opened ingredient ${movement.id} marked ${finalLabel}`,
      created_by_name: submittedBy,
    });

    if (movementError) {
      showError(`Opened ingredient closed, but movement log failed: ${movementError.message}`);
      await loadBulkOpenedMovements();
      return;
    }

    if (item) {
      const reportError = await createKitchenActionReport(
        item,
        isWaste ? "waste_damaged" : "out_of_stock",
        `${isWaste ? "Waste" : "Used up"} ${quantity} ${movement.unit || item.unit || ""}`.trim(),
        `Opened ingredient from ${movement.shift_name || kitchenShiftFilter} marked ${isWaste ? "waste" : "used up"}`,
      );

      if (reportError) {
        showError(`Opened ingredient closed, but manager stock report failed: ${reportError.message}`);
        await loadBulkOpenedMovements();
        return;
      }
    }

    showSuccess(isWaste ? "Opened ingredient marked as waste." : "Opened ingredient marked as used up.");
    await Promise.all([loadBulkOpenedMovements(), loadReports()]);
  };

  const updateStationBatchStatus = async (
    batch: StationBatch,
    stationStatus: StationBatch["station_status"],
  ) => {
    const currentUserName = currentUser ? `${currentUser.name} - ${staffType ?? currentUser.role}` : null;
    const quantityBefore = toNumber(batch.quantity_remaining);
    const quantityAfter = quantityBefore;
    const patch: Record<string, string | number | null> = {
      station_status: stationStatus,
    };

    if (stationStatus === "ready") patch.ready_at = new Date().toISOString();
    if (stationStatus === "finished" || stationStatus === "waste") patch.finished_at = new Date().toISOString();

    const { error } = await supabase
      .from("kitchen_station_batches")
      .update(patch)
      .eq("id", batch.id);

    if (error) {
      showError(`Failed to update station status: ${error.message}`);
      return;
    }

    const { error: movementError } = await supabase.from("kitchen_station_movements").insert({
      station_batch_id: batch.id,
      inventory_item_id: batch.inventory_item_id,
      movement_type: "adjustment",
      quantity: Math.abs(quantityAfter - quantityBefore),
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      unit: batch.unit,
      notes: `Kitchen status changed to ${stationStatusLabel(stationStatus)}`,
      created_by_name: currentUserName,
    });

    if (movementError) {
      showError(`Status updated, but movement log failed: ${movementError.message}`);
      await loadStationBatches();
      return;
    }

    showSuccess(`Marked as ${stationStatusLabel(stationStatus)}.`);
    await loadStationBatches();
  };

  const stockColumns: Array<StandardTableColumn<InventoryItem>> = [
    {
      key: "name",
      header: "Item Name",
      render: (item) => (
        <div>
          <p className="font-semibold text-gray-900">{item.name}</p>
          <p className="mt-1 text-xs text-gray-500">{item.category ?? "-"}</p>
        </div>
      ),
      sortValue: (item) => item.name,
    },
    {
      key: "stock",
      header: "Stock",
      render: (item) => {
        const normalizedStatus = normalizeInventoryStatus(item);

        return (
          <span className={`font-semibold ${getStockTextClassName(normalizedStatus)}`}>
            {item.current_stock ?? 0} {item.unit ?? ""}
          </span>
        );
      },
      sortValue: (item) => item.current_stock ?? 0,
    },
    {
      key: "reorder",
      header: "Reorder",
      render: (item) => `${item.reorder_level ?? 0} ${item.unit ?? ""}`,
      sortValue: (item) => item.reorder_level ?? 0,
    },
    {
      key: "scope",
      header: "Scope",
      render: (item) => (
        <span className="inline-flex rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
          {stationScopeLabel(item.station_scope)}
        </span>
      ),
      sortValue: (item) => item.station_scope ?? "shared",
    },
    {
      key: "tracking",
      header: "Tracking",
      render: (item) => (
        <span className="inline-flex rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
          {trackingModeLabel(item.tracking_mode)}
        </span>
      ),
      sortValue: (item) => item.tracking_mode ?? "direct_auto_deduct",
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const statusMeta = getInventoryStatusMeta(normalizeInventoryStatus(item));

        return (
          <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
        );
      },
      sortValue: (item) => normalizeInventoryStatus(item),
    },
    {
      key: "actions",
      header: "Actions",
      isAction: true,
      render: (item) => (
        <button
          type="button"
          onClick={(event) => openStockMenu(item, event)}
          className="rounded-lg p-2 transition hover:bg-gray-100"
          aria-label={`Report ${item.name}`}
        >
          <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
        </button>
      ),
    },
  ];

  const stationBatchColumns: Array<StandardTableColumn<StationBatch>> = [
    {
      key: "item",
      header: "Item",
      render: (batch) => (
        <div>
          <p className="font-semibold text-gray-900">{itemById.get(batch.inventory_item_id)?.name || "Kitchen item"}</p>
          <p className="mt-1 text-xs text-gray-500">Batch {batch.batch_number || "-"}</p>
        </div>
      ),
      sortValue: (batch) => itemById.get(batch.inventory_item_id)?.name || "",
    },
    {
      key: "status",
      header: "Kitchen Status",
      render: (batch) => (
        <span className="inline-flex rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
          {stationStatusLabel(batch.station_status)}
        </span>
      ),
      sortValue: (batch) => batch.station_status,
    },
    {
      key: "remaining",
      header: "Remaining",
      render: (batch) => `${toNumber(batch.quantity_remaining)} ${batch.unit || ""}`,
      sortValue: (batch) => toNumber(batch.quantity_remaining),
    },
    {
      key: "expiry",
      header: "Chiller Consume-by",
      render: (batch) => batch.expiry_date || "-",
      sortValue: (batch) => batch.expiry_date || "9999-12-31",
    },
    {
      key: "actions",
      header: "Actions",
      isAction: true,
      render: (batch) => (
        <button
          type="button"
          onClick={(event) => openKitchenMenuForStationBatch(batch, event)}
          className="rounded-lg p-2 transition hover:bg-gray-100"
          aria-label={`Kitchen actions for ${itemById.get(batch.inventory_item_id)?.name || "item"}`}
        >
          <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
        </button>
      ),
    },
  ];

  const bulkOpenedColumns: Array<StandardTableColumn<BulkOpenedMovement>> = [
    {
      key: "item",
      header: "Item",
      render: (movement) => (
        <div>
          <p className="font-semibold text-gray-900">{itemById.get(movement.inventory_item_id)?.name || "Opened ingredient"}</p>
          <p className="mt-1 text-xs text-gray-500">Kitchen-use ingredient</p>
        </div>
      ),
      sortValue: (movement) => itemById.get(movement.inventory_item_id)?.name || "",
    },
    {
      key: "quantity",
      header: "Opened Qty",
      render: (movement) => `${toNumber(movement.quantity)} ${movement.unit || ""}`,
      sortValue: (movement) => toNumber(movement.quantity),
    },
    {
      key: "cost",
      header: "Expense Value",
      render: (movement) =>
        toNumber(movement.total_cost) > 0
          ? `Rp ${toNumber(movement.total_cost).toLocaleString("id-ID")}`
          : "-",
      sortValue: (movement) => toNumber(movement.total_cost),
    },
    {
      key: "shift",
      header: "Shift",
      render: (movement) => movement.shift_name || "-",
      sortValue: (movement) => movement.shift_name || "",
    },
    {
      key: "opened",
      header: "Opened At",
      render: (movement) => formatDate(movement.created_at || movement.business_date || ""),
      sortValue: (movement) => movement.created_at || movement.business_date || "",
    },
    {
      key: "notes",
      header: "Notes",
      render: (movement) => movement.notes || "-",
      sortValue: (movement) => movement.notes || "",
    },
    {
      key: "actions",
      header: "Actions",
      isAction: true,
      render: (movement) => (
        <button
          type="button"
          onClick={(event) => openKitchenMenuForBulkMovement(movement, event)}
          className="rounded-lg p-2 transition hover:bg-gray-100"
          aria-label={`Kitchen actions for ${itemById.get(movement.inventory_item_id)?.name || "opened ingredient"}`}
        >
          <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
        </button>
      ),
    },
  ];

  const reportColumns: Array<StandardTableColumn<StockReport>> = [
    {
      key: "material",
      header: "Item Name",
      render: (report) => <span className="font-semibold text-gray-900">{report.material_name}</span>,
      sortValue: (report) => report.material_name,
    },
    {
      key: "type",
      header: "Report Type",
      render: (report) => reportTypeLabel(report.report_type),
      sortValue: (report) => report.report_type,
    },
    {
      key: "station",
      header: "Station",
      render: (report) => stationScopeLabel(report.station_scope),
      sortValue: (report) => report.station_scope || "shared",
    },
    {
      key: "details",
      header: "Details",
      render: (report) => (
        <div className="max-w-xs">
          <p className="whitespace-normal wrap-break-word text-sm text-gray-700">{report.quantity_note || "-"}</p>
        </div>
      ),
      sortValue: (report) => report.quantity_note || "",
    },
    {
      key: "notes",
      header: "Notes",
      render: (report) => (
        <div className="max-w-xs">
          <p className="whitespace-normal wrap-break-word text-sm text-gray-700">{report.description || "-"}</p>
        </div>
      ),
      sortValue: (report) => report.description || "",
    },
    {
      key: "status",
      header: "Status",
      render: (report) => (
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassName(report.status)}`}>
          {statusLabel(report.status)}
        </span>
      ),
      sortValue: (report) => report.status,
    },
    {
      key: "createdAt",
      header: "Created",
      render: (report) => formatDate(report.created_at),
      sortValue: (report) => report.created_at,
    },
    {
      key: "actions",
      header: "Actions",
      isAction: true,
      render: (report) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditReportModal(report)}
            disabled={report.status !== "pending"}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Edit report for ${report.material_name}`}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void deleteReport(report)}
            disabled={report.status !== "pending"}
            className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Delete report for ${report.material_name}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <main className="h-[calc(100vh-56px)] overflow-hidden bg-white">
      <div className="flex h-full min-h-0">
        <SidebarTabset
          title="Stock Check"
          description="Report material issues without editing inventory."
          items={stockCheckTabs}
          activeId={activeTab}
          onSelect={setActiveTab}
        />

        <section className="min-w-0 flex-1 overflow-hidden bg-gray-50 p-4 md:p-5">
          {activeTab === "stock-check" ? (
            <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="shrink-0">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-950">Stock Check Table</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      View inventory master items for your station and report stock issues to manager.
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
                    <button
                      type="button"
                      onClick={() => setTestingModalOpen(true)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Test Menu
                    </button>
                    <div className="relative w-full max-w-md lg:w-72">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search materials..."
                        className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-3 text-sm outline-none transition focus:border-gray-900"
                      />
                    </div>
                  </div>
                </div>
                {!stationScopeAvailable ? (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                    Station scope is not available yet. Showing all inventory master items until the inventory station SQL is applied.
                  </div>
                ) : null}
              </div>
              <div className="h-fit max-h-[calc(100vh-184px)] overflow-y-auto">
                <StandardTable
                  columns={stockColumns}
                  data={filteredItems}
                  getRowKey={(item) => item.id}
                  emptyLabel={loading ? "Loading stock data..." : "No materials found."}
                  loading={loading}
                  minWidthClassName="min-w-[880px]"
                  horizontalScroll={false}
                />
              </div>
            </div>
          ) : activeTab === "kitchen-station" ? (
            <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="shrink-0">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-950">Kitchen Station Table</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Move master stock into kitchen, then track station stock or opened ingredients.
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
                    <button
                      type="button"
                      onClick={() => openKitchenMoveModal("transfer")}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Move to Kitchen
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestingModalOpen(true)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Test Menu
                    </button>
                    <div className="relative w-full lg:w-72">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search station batches..."
                        className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-3 text-sm outline-none transition focus:border-gray-900"
                      />
                    </div>
                  </div>
                </div>
                {!kitchenStationAvailable ? (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                    Kitchen station tables are not ready yet. Run the kitchen station SQL before using this workflow.
                  </div>
                ) : null}
                {kitchenStationAvailable && !loading && stationBatches.length === 0 ? (
                  <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    <p className="font-semibold">No kitchen stock has been moved yet.</p>
                    <p className="mt-1">
                      Use Move to Kitchen to pull stock from Inventory Master. Choose Station Stock for POS-deduct items,
                      or Opened Ingredient for kitchen-use ingredients.
                    </p>
                  </div>
                ) : null}
                {kitchenStationAvailable && !loading && stationBatches.length > 0 ? (
                  <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                    Station stock and opened ingredients carry over between shifts until POS usage, waste, or a kitchen action closes them.
                  </div>
                ) : null}
              </div>
              <div className="h-fit max-h-[calc(100vh-184px)] space-y-6 overflow-y-auto">
                <div>
                  <StandardTable
                    columns={stationBatchColumns}
                    data={filteredStationBatches}
                    getRowKey={(batch) => batch.id}
                    emptyLabel={
                      loading
                        ? "Loading kitchen station..."
                        : "No kitchen stock has been moved yet. Use Move to Kitchen first."
                    }
                    loading={loading}
                    minWidthClassName="min-w-[980px]"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-950">Opened Ingredients</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Ingredients opened for kitchen use and still active. The Shift column shows when each item was opened.
                      </p>
                    </div>
                  </div>
                  <StandardTable
                    columns={bulkOpenedColumns}
                    data={filteredBulkOpenedMovements}
                    getRowKey={(movement) => movement.id}
                    emptyLabel={
                      loading
                        ? "Loading opened ingredients..."
                        : "No opened ingredient is active. Use Move to Kitchen when kitchen opens an ingredient."
                    }
                    loading={loading}
                    minWidthClassName="min-w-[980px]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="shrink-0">
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
              </div>
              <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                {!stockReportsAvailable ? (
                  <div className="mb-4 shrink-0 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                    Stock reports table is not ready yet. Run the stock reports SQL before submitting or viewing reports.
                  </div>
                ) : null}
                <div className="h-fit max-h-[calc(100vh-292px)] overflow-y-auto">
                  <StandardTable
                    columns={reportColumns}
                    data={reports}
                    getRowKey={(report) => report.id}
                    emptyLabel={loading ? "Loading reports..." : "No reports in this period."}
                    loading={loading}
                    minWidthClassName="min-w-[920px]"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {renderStockActionMenu()}
      {renderKitchenActionMenu()}

      {testingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {staffType === "barista" ? "Barista" : staffType === "kitchen" ? "Kitchen" : "Staff"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-950">Test Menu</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Record calibration, tasting, training, or menu trial usage without creating a customer order.
                </p>
              </div>
              <button
                type="button"
                onClick={closeTestingModal}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-900 hover:text-gray-900"
                aria-label="Close testing modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_360px]">
              <div className="space-y-5 p-6">
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
                  {([
                    { value: "ingredient" as const, label: "Test Ingredient" },
                    { value: "menu" as const, label: "Test Menu" },
                  ]).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTestingForm((current) => ({ ...current, mode: option.value }))}
                      className={`h-11 rounded-md text-sm font-semibold transition ${
                        testingForm.mode === option.value
                          ? "bg-gray-900 text-white shadow-sm"
                          : "text-gray-600 hover:bg-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Purpose <span className="text-red-500">*</span>
                    <select
                      value={testingForm.purpose}
                      onChange={(event) => setTestingForm((current) => ({
                        ...current,
                        purpose: event.target.value as TestingPurpose,
                      }))}
                      className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                    >
                      {testingPurposeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    Shift <span className="text-red-500">*</span>
                    <select
                      value={testingForm.shiftName}
                      onChange={(event) => setTestingForm((current) => ({ ...current, shiftName: event.target.value }))}
                      className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                    >
                      {kitchenShiftOptions.map((shift) => (
                        <option key={shift} value={shift}>{shift}</option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Menu scope</p>
                    <p className="mt-2 text-lg font-bold text-gray-950">
                      {staffType === "barista" ? "Drinks" : staffType === "kitchen" ? "Food" : "All"}
                    </p>
                  </div>
                </div>

                {testingForm.mode === "ingredient" ? (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="text-base font-bold text-gray-950">Ingredient Usage</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Use this for grinder calibration, tasting a sauce, staff training, or checking one material.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
                      <label className="block text-sm font-semibold text-gray-700">
                        Ingredient <span className="text-red-500">*</span>
                        <select
                          value={testingForm.itemId}
                          onChange={(event) => setTestingForm((current) => ({ ...current, itemId: event.target.value }))}
                          className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                        >
                          <option value="">Select ingredient</option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.unit || "-"})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm font-semibold text-gray-700">
                        Quantity <span className="text-red-500">*</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={testingForm.quantity}
                          onChange={(event) => setTestingForm((current) => ({ ...current, quantity: event.target.value }))}
                          placeholder={selectedTestItem?.unit || "Qty"}
                          className="mt-2 h-12 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-900"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="text-base font-bold text-gray-950">Menu Trial</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select one menu and the system will deduct recipe ingredients from the correct source.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
                      <label className="block text-sm font-semibold text-gray-700">
                        Menu <span className="text-red-500">*</span>
                        <select
                          value={testingForm.productId}
                          onChange={(event) => setTestingForm((current) => ({ ...current, productId: event.target.value }))}
                          className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                        >
                          <option value="">Select menu</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm font-semibold text-gray-700">
                        Portions <span className="text-red-500">*</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={testingForm.portions}
                          onChange={(event) => setTestingForm((current) => ({ ...current, portions: event.target.value }))}
                          className="mt-2 h-12 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-900"
                        />
                      </label>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
                      <div className="grid grid-cols-[1.3fr_0.7fr_1fr] bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                        <span>Ingredient</span>
                        <span>Usage</span>
                        <span>Source</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {testingRecipeLines.length ? testingRecipeLines.map((line, index) => (
                          <div key={`${line.ingredient.inventory_item_id || index}-${index}`} className="grid grid-cols-[1.3fr_0.7fr_1fr] gap-3 px-4 py-3 text-sm">
                            <div>
                              <p className="font-semibold text-gray-900">{line.item?.name || line.ingredient.ingredient_name || "Ingredient"}</p>
                              <p className="mt-1 text-xs text-gray-500">{line.costingMode || "deduct_from_pos"}</p>
                            </div>
                            <p className="font-semibold text-gray-800">
                              {line.requiredQuantity > 0 ? `${line.requiredQuantity} ${line.stockUnit}` : "-"}
                            </p>
                            <p className="text-gray-600">{line.note}</p>
                          </div>
                        )) : (
                          <div className="px-4 py-8 text-center text-sm text-gray-500">
                            {selectedTestProduct ? "No base recipe ingredients found." : "Select a menu to preview recipe usage."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <label className="block text-sm font-semibold text-gray-700">
                  Notes
                  <textarea
                    value={testingForm.notes}
                    onChange={(event) => setTestingForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Calibration, taste test, training, quality check, or menu trial notes..."
                    className="mt-2 h-28 w-full rounded-lg border border-gray-200 p-3 text-sm outline-none transition focus:border-gray-900"
                  />
                </label>
              </div>

              <aside className="border-t border-gray-200 bg-gray-50 p-6 lg:border-l lg:border-t-0">
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Preview</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Mode</p>
                      <p className="mt-2 text-lg font-bold text-gray-950">
                        {testingForm.mode === "menu" ? "Menu Trial" : "Ingredient"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Purpose</p>
                      <p className="mt-2 text-lg font-bold text-gray-950">{getTestingPurposeLabel(testingForm.purpose)}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-gray-900 p-4 text-white">
                    <p className="text-sm text-gray-300">Cost source</p>
                    <p className="mt-2 text-base font-bold">
                      {testingForm.mode === "menu"
                        ? `${testingRecipeLines.filter((line) => line.deductionSource !== "none").length} ingredient deduction(s)`
                        : selectedTestItem
                          ? getTestingLineSourceLabel({
                              item: selectedTestItem,
                              requiredQuantity: Number(testingForm.quantity || 0),
                              stockUnit: selectedTestItem.unit || "",
                              deductionSource: getTestingDeductionSource(
                                selectedTestItem,
                                "deduct_from_pos",
                                Number(testingForm.quantity || 0),
                              ),
                              note: "Manual testing ingredient",
                            } as TestingRecipeLine)
                          : "-"}
                    </p>
                  </div>
                  {testingTouched && testingForm.mode === "menu" && selectedTestProduct && !selectedTestRecipe ? (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                      Selected menu does not have a base recipe.
                    </p>
                  ) : null}
                </div>
              </aside>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closeTestingModal}
                className="h-11 rounded-lg border border-gray-200 px-5 text-sm font-semibold text-gray-700 transition hover:border-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitTestingUsage()}
                className="h-11 rounded-lg bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Save Testing Usage
              </button>
            </div>
          </div>
        </div>
      )}

      {kitchenAuditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Kitchen</p>
                <h2 className="mt-2 text-2xl font-bold text-gray-950">Kitchen Report</h2>
                <p className="mt-2 text-sm text-gray-500">
                  {kitchenAuditTarget.itemName} • {kitchenAuditTarget.sourceLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={closeKitchenAuditModal}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-900 hover:text-gray-900"
                aria-label="Close report modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_340px]">
              <div className="space-y-5 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-950">
                      {kitchenAuditTarget.kind === "bulk" ? "Ingredient Report" : "Station Report"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {kitchenAuditTarget.kind === "bulk" ? "Use kitchen-friendly status instead of weighing everything." : "Adjust the live station count when the physical count is different."}
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                    {closingShift}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Date <span className="text-red-500">*</span>
                    <input
                      type="date"
                      value={closingDate}
                      onChange={(event) => setClosingDate(event.target.value)}
                      className="mt-2 h-12 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-900"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    Report type <span className="text-red-500">*</span>
                    <select
                      value={kitchenReportCondition}
                      onChange={(event) => setKitchenReportCondition(event.target.value as KitchenReportCondition)}
                      className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                    >
                      {kitchenReportConditionOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {kitchenAuditTarget.kind === "bulk" ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <label className="block text-sm font-semibold text-gray-700">
                      Informal level
                      <select
                        value={kitchenReportLevel}
                        onChange={(event) => setKitchenReportLevel(event.target.value as KitchenReportLevel)}
                        className="mt-2 h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-900"
                      >
                        {kitchenReportLevelOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600">
                      {["Full", "Half", "Low"].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setKitchenReportLevel(level === "Full" ? "full" : level === "Half" ? "half" : "low")}
                          className="h-9 rounded-lg border border-gray-200 bg-white transition hover:border-gray-900"
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Waste
                    <input
                      value={wasteQty}
                      onChange={(event) => setWasteQty(event.target.value)}
                      placeholder={`0 ${kitchenAuditTarget.unit}`}
                      className="mt-2 h-12 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-900"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    {kitchenAuditTarget.kind === "bulk" ? "Estimated remaining" : "Actual count"}
                    {kitchenAuditTarget.kind === "station" ? <span className="text-red-500"> *</span> : null}
                    <input
                      value={physicalClosingQty}
                      onChange={(event) => setPhysicalClosingQty(event.target.value)}
                      placeholder={kitchenAuditTarget.kind === "bulk" ? "Optional" : `Remaining ${kitchenAuditTarget.unit}`}
                      className={`mt-2 h-12 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-900 ${
                        closingTouchedSubmit && kitchenAuditTarget.kind === "station" && physicalClosingQty.trim() === "" ? "border-red-400 bg-red-50" : ""
                      }`}
                    />
                  </label>
                </div>

                <label className="block text-sm font-semibold text-gray-700">
                  Notes
                  <textarea
                    value={closingNotes}
                    onChange={(event) => setClosingNotes(event.target.value)}
                    rows={5}
                    placeholder="Handover note, waste reason, or prep context..."
                    className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-gray-900"
                  />
                </label>
              </div>

              <aside className="border-t border-gray-200 bg-gray-50 p-6 lg:border-l lg:border-t-0">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                      <ArchiveBoxIcon className="h-6 w-6 text-gray-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Item</p>
                      <p className="font-bold text-gray-950">{kitchenAuditTarget.itemName}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">System</p>
                      <p className="mt-2 text-lg font-bold text-gray-950">{kitchenAuditTarget.expectedQuantity} {kitchenAuditTarget.unit}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Mode</p>
                      <p className="mt-2 text-lg font-bold text-gray-950">{kitchenAuditTarget.kind === "bulk" ? "Note" : "Count"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-gray-950">Preview</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">{kitchenAuditTarget.kind === "bulk" ? "Estimate after waste" : "Expected after waste"}</span>
                      <span className="font-bold text-gray-950">{closingExpected} {kitchenAuditTarget.unit}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">{kitchenAuditTarget.kind === "bulk" ? "Staff note" : "Physical"}</span>
                      <span className="font-bold text-gray-950">
                        {kitchenAuditTarget.kind === "bulk"
                          ? getKitchenReportLevelLabel(kitchenReportLevel) || getKitchenReportConditionLabel(kitchenReportCondition) || "-"
                          : `${physicalClosingQty || "-"} ${physicalClosingQty ? kitchenAuditTarget.unit : ""}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-900 p-3 text-white">
                      <span>{kitchenAuditTarget.kind === "bulk" ? "Manager signal" : "Variance"}</span>
                      <span className="font-bold">
                        {kitchenAuditTarget.kind === "bulk"
                          ? getKitchenReportSignal(kitchenReportCondition, kitchenReportLevel)
                          : closingVariance === null ? "-" : `${closingVariance} ${kitchenAuditTarget.unit}`}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={closeKitchenAuditModal}
                className="h-12 rounded-lg border border-gray-200 px-5 text-sm font-semibold text-gray-700 transition hover:border-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitKitchenClosingCount()}
                className="h-12 rounded-lg bg-gray-900 px-6 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {kitchenMoveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Kitchen</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">Move to Kitchen</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pull stock from Inventory Master as station stock or as an opened ingredient for kitchen use.
                </p>
              </div>

              <button
                type="button"
                onClick={closeKitchenMoveModal}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
                aria-label="Close move to kitchen modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_340px]">
              <div className="min-h-0 space-y-5 overflow-y-auto p-5">
                <div className="border-b border-gray-100 pb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Kitchen Movement</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Choose how this stock should be tracked once it enters the kitchen.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setKitchenMoveOpen("transfer");
                      setKitchenMoveForm((current) => ({
                        ...current,
                        itemId: "",
                        sourceBatchId: "",
                        quantity: "",
                        expiryDate: getDateAfterDays(3),
                      }));
                    }}
                    className={`rounded-lg border p-4 text-left transition ${
                      kitchenMoveOpen === "transfer"
                        ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold">Station Stock</span>
                    <span className={`mt-1 block text-xs ${kitchenMoveOpen === "transfer" ? "text-gray-200" : "text-gray-500"}`}>
                      For POS-deduct items such as chicken.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKitchenMoveOpen("bulk");
                      setKitchenMoveForm((current) => ({
                        ...current,
                        itemId: "",
                        sourceBatchId: "",
                        quantity: "",
                        expiryDate: "",
                      }));
                    }}
                    className={`rounded-lg border p-4 text-left transition ${
                      kitchenMoveOpen === "bulk"
                        ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold">Opened Ingredient</span>
                    <span className={`mt-1 block text-xs ${kitchenMoveOpen === "bulk" ? "text-gray-200" : "text-gray-500"}`}>
                      For kitchen-use ingredients tracked by notes.
                    </span>
                  </button>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Item <span className="text-red-500">*</span>
                      <select
                        value={kitchenMoveForm.itemId}
                        onChange={(event) => setKitchenMoveForm((current) => ({ ...current, itemId: event.target.value, sourceBatchId: "" }))}
                        className={`mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 ${
                          kitchenMoveTouched && !kitchenMoveForm.itemId ? "border-red-400 bg-red-50" : ""
                        }`}
                      >
                        <option value="">Select item</option>
                        {(kitchenMoveOpen === "transfer" ? kitchenTransferItems : bulkUsageItems).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Source batch
                      <select
                        value={kitchenMoveForm.sourceBatchId}
                        onChange={(event) => setKitchenMoveForm((current) => ({ ...current, sourceBatchId: event.target.value }))}
                        className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      >
                        <option value="">No specific batch</option>
                        {sourceBatchesForItem(kitchenMoveForm.itemId).map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.batch_number || "Batch"} - {toNumber(batch.quantity_remaining)} {batch.unit || ""} - {batch.supplier || "-"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Quantity <span className="text-red-500">*</span>
                      <input
                        value={kitchenMoveForm.quantity}
                        onChange={(event) => setKitchenMoveForm((current) => ({ ...current, quantity: event.target.value }))}
                        className={`mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 ${
                          kitchenMoveTouched && (!Number(kitchenMoveForm.quantity) || Number(kitchenMoveForm.quantity) <= 0)
                            ? "border-red-400 bg-red-50"
                            : ""
                        }`}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-gray-700">
                      Shift <span className="text-red-500">*</span>
                      <select
                        value={kitchenMoveForm.shiftName}
                        onChange={(event) => setKitchenMoveForm((current) => ({ ...current, shiftName: event.target.value }))}
                        className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      >
                        {kitchenShiftOptions.map((shift) => (
                          <option key={shift}>{shift}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {kitchenMoveOpen === "transfer" ? (
                    <label className="mt-4 block text-sm font-semibold text-gray-700">
                      Chiller consume-by <span className="text-red-500">*</span>
                      <input
                        type="date"
                        value={kitchenMoveForm.expiryDate}
                        onChange={(event) => setKitchenMoveForm((current) => ({ ...current, expiryDate: event.target.value }))}
                        className={`mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 ${
                          kitchenMoveTouched && !kitchenMoveForm.expiryDate ? "border-red-400 bg-red-50" : ""
                        }`}
                      />
                      <span className="mt-1 block text-xs font-normal text-gray-500">
                        Separate from source expiry. Default is 3 days after moving to kitchen.
                      </span>
                    </label>
                  ) : null}
                </div>

                <label className="block text-sm font-semibold text-gray-700">
                  Notes
                  <textarea
                    value={kitchenMoveForm.notes}
                    onChange={(event) => setKitchenMoveForm((current) => ({ ...current, notes: event.target.value }))}
                    rows={4}
                    className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                    placeholder="Prep note, handover context, or source detail..."
                  />
                </label>
              </div>

              <aside className="flex min-h-0 flex-col border-t border-gray-200 bg-gray-50 p-5 lg:border-l lg:border-t-0">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
                      <ArchiveBoxIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Mode</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {kitchenMoveOpen === "transfer" ? "Station Stock" : "Opened Ingredient"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-100 p-3">
                      <p className="text-xs text-gray-500">Master</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {selectedKitchenMoveItem ? `${selectedKitchenMoveMasterStock} ${selectedKitchenMoveItem.unit || ""}` : "-"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-100 p-3">
                      <p className="text-xs text-gray-500">Available</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {selectedKitchenMoveItem ? `${selectedKitchenMoveMax} ${selectedKitchenMoveItem.unit || ""}` : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900">Movement Preview</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">Item</span>
                      <span className="font-semibold text-gray-950">{selectedKitchenMoveItem?.name || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">Quantity</span>
                      <span className="font-semibold text-gray-950">
                        {kitchenMoveForm.quantity || "-"} {selectedKitchenMoveItem?.unit || ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">Shift</span>
                      <span className="font-semibold text-gray-950">{kitchenMoveForm.shiftName}</span>
                    </div>
                    {kitchenMoveOpen === "transfer" ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                        <span className="text-gray-500">Consume-by</span>
                        <span className="font-semibold text-gray-950">{kitchenMoveForm.expiryDate || "-"}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {selectedKitchenMoveItem && kitchenMoveOpen === "transfer" ? (
                  <button
                    type="button"
                    onClick={() => setKitchenMoveForm((current) => ({
                      ...current,
                      quantity: String(selectedKitchenMoveSuggestedQty),
                    }))}
                    className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                  >
                    Use suggested {selectedKitchenMoveSuggestedQty} {selectedKitchenMoveItem.unit || ""}
                  </button>
                ) : null}
              </aside>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={closeKitchenMoveModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitKitchenMove()}
                className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                {kitchenMoveOpen === "transfer" ? "Move Stock" : "Open Ingredient"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(selectedItem || selectedReport) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-950">
              {selectedReport ? "Edit Stock Report" : selectedItem?.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Report stock issue for manager review.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Report type
                <select
                  value={selectedReportType}
                  onChange={(event) => setSelectedReportType(event.target.value as ReportType)}
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                >
                  {reportOptions.map((option) => (
                    <option key={option.type} value={option.type}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Quantity note
                <input
                  value={quantityNote}
                  onChange={(event) => setQuantityNote(event.target.value)}
                  placeholder="Example: left around 500 mL"
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="Add short context for manager..."
                  className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeReportModal}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitReport()}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                {selectedReport ? "Update Report" : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
