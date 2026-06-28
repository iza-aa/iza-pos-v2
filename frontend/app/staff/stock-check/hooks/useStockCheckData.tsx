import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import { getCurrentUser } from "@/lib/utils";
import { getStaffHomePath, hasStaffPosition, normalizeStaffType } from "@/lib/utils/staffAccess";
import { showError, showSuccess, showConfirmation } from "@/lib/services/errorHandling";
import { convertQuantity } from "@/lib/utils/unitConversion";
import type { StandardTableColumn } from "@/app/components/shared/StandardTable";
import type { BulkOpenedMovement, InventoryBatch, InventoryItem, KitchenActionTarget, KitchenAuditTarget, KitchenMoveForm, KitchenReportCondition, KitchenReportLevel, ProductItem, RecipeIngredient, RecipeRow, ReportStatus, ReportType, StationBatch, StationScope, StockCheckTab, StockReport, TestingForm, TestingMode, TestingPurpose, TestingRecipeLine } from "../types";
import { kitchenReportConditionOptions, kitchenReportLevelOptions, kitchenShiftOptions, reportOptions, stockCheckTabs, testingPurposeOptions } from "../constants";
import { formatDate, getDateAfterDays, getDefaultKitchenShiftName, getErrorMessage, getInventoryStatusMeta, getKitchenReportConditionLabel, getKitchenReportLevelLabel, getKitchenReportSignal, getStockTextClassName, getTestingPurposeLabel, normalizeInventoryStatus, omitStationScope, reportTypeLabel, stationScopeLabel, stationStatusLabel, statusClassName, statusLabel, toNumber, trackingModeLabel } from "../utils";
import { getDefaultDateRange, type DateRangeValue } from "@/app/components/shared";
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

export function useStockCheckData() {
const currentUser = getCurrentUser();
  const staffType = normalizeStaffType(currentUser?.staffType);
  const hasBaristaPosition = hasStaffPosition({
    position: "barista",
    positions: currentUser?.positions,
    staffType,
  });
  const hasKitchenPosition = hasStaffPosition({
    position: "kitchen",
    positions: currentUser?.positions,
    staffType,
  });
  const isOwner = currentUser?.role === "owner";
  const canUseStockCheck = isOwner || hasBaristaPosition || hasKitchenPosition;
  const canUseKitchenStation = isOwner || hasKitchenPosition;
  const effectiveStationScope: StationScope | null = isOwner
    ? null
    : staffType === "barista" && hasBaristaPosition
      ? "barista"
      : staffType === "kitchen" && hasKitchenPosition
        ? "kitchen"
        : hasBaristaPosition
          ? "barista"
          : hasKitchenPosition
            ? "kitchen"
            : null;
  const visibleStockCheckTabs = canUseKitchenStation
    ? stockCheckTabs
    : stockCheckTabs.filter((tab) => tab.id !== "kitchen-station");
  const visibleInventoryScopes = useMemo<StationScope[]>(
    () =>
      isOwner
        ? ["barista", "kitchen", "shared"]
        : [
            ...(hasBaristaPosition ? (["barista"] as StationScope[]) : []),
            ...(hasKitchenPosition ? (["kitchen"] as StationScope[]) : []),
            "shared",
          ],
    [hasBaristaPosition, hasKitchenPosition, isOwner],
  );
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
    purpose: effectiveStationScope === "barista" ? "coffee_calibration" : "taste_test",
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

  useEffect(() => {
    if (isOwner) return;
    if (!currentUser || currentUser.role !== "staff" || !canUseStockCheck) {
      window.location.replace(
        getStaffHomePath(currentUser?.positions, currentUser?.staffType),
      );
    }
  }, [canUseStockCheck, currentUser, isOwner]);

  useEffect(() => {
    if (activeTab === "kitchen-station" && !canUseKitchenStation) {
      setActiveTab("stock-check");
    }
  }, [activeTab, canUseKitchenStation]);

  const loadItems = useCallback(async () => {
    if (!canUseStockCheck) return;

    const initialResult = await supabase
      .from("inventory_items")
      .select("id,name,category,station_scope,tracking_mode,par_level,current_stock,reorder_level,unit,supplier,cost_per_unit")
      .in("station_scope", visibleInventoryScopes)
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
  }, [canUseStockCheck, visibleInventoryScopes]);

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
    if (!canUseKitchenStation) {
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
  }, [canUseKitchenStation]);

  const loadMasterBatches = useCallback(async () => {
    if (!canUseKitchenStation) {
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
  }, [canUseKitchenStation]);

  const loadBulkOpenedMovements = useCallback(async () => {
    if (!canUseKitchenStation) {
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
  }, [canUseKitchenStation]);

  const loadTestingReferenceData = useCallback(async () => {
    const productType =
      effectiveStationScope === "barista"
        ? "drink"
        : effectiveStationScope === "kitchen"
          ? "food"
          : null;
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
  }, [effectiveStationScope]);

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
      canUseKitchenStation
    ) {
      return "station";
    }
    return "master";
  }, [canUseKitchenStation]);

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
      purpose: effectiveStationScope === "barista" ? "coffee_calibration" : "taste_test",
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
      station_scope: item.station_scope || effectiveStationScope || "shared",
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
      `Station: ${effectiveStationScope === "barista" ? "Barista" : effectiveStationScope === "kitchen" ? "Kitchen" : "Staff"}`,
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

  return {
    currentUser,
    staffType,
    hasBaristaPosition,
    hasKitchenPosition,
    isOwner,
    canUseStockCheck,
    canUseKitchenStation,
    effectiveStationScope,
    visibleStockCheckTabs,
    visibleInventoryScopes,
    initialKitchenShift,
    activeTab,
    setActiveTab,
    items,
    setItems,
    reports,
    setReports,
    stationBatches,
    setStationBatches,
    bulkOpenedMovements,
    setBulkOpenedMovements,
    masterBatches,
    setMasterBatches,
    products,
    setProducts,
    recipes,
    setRecipes,
    recipeIngredients,
    setRecipeIngredients,
    loading,
    setLoading,
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    selectedItem,
    setSelectedItem,
    selectedReport,
    setSelectedReport,
    selectedReportType,
    setSelectedReportType,
    quantityNote,
    setQuantityNote,
    description,
    setDescription,
    closingDate,
    setClosingDate,
    closingItemId,
    setClosingItemId,
    closingShift,
    setClosingShift,
    openingQty,
    setOpeningQty,
    transferInQty,
    setTransferInQty,
    posUsageQty,
    setPosUsageQty,
    wasteQty,
    setWasteQty,
    physicalClosingQty,
    setPhysicalClosingQty,
    closingNotes,
    setClosingNotes,
    kitchenReportCondition,
    setKitchenReportCondition,
    kitchenReportLevel,
    setKitchenReportLevel,
    closingTouchedSubmit,
    setClosingTouchedSubmit,
    kitchenAuditTarget,
    setKitchenAuditTarget,
    kitchenShiftFilter,
    kitchenMoveOpen,
    setKitchenMoveOpen,
    kitchenMoveTouched,
    setKitchenMoveTouched,
    kitchenMoveForm,
    setKitchenMoveForm,
    testingModalOpen,
    setTestingModalOpen,
    testingTouched,
    setTestingTouched,
    testingForm,
    setTestingForm,
    stockReportsAvailable,
    setStockReportsAvailable,
    stationScopeAvailable,
    setStationScopeAvailable,
    kitchenStationAvailable,
    setKitchenStationAvailable,
    openStockActionMenu,
    setOpenStockActionMenu,
    openKitchenActionMenu,
    setOpenKitchenActionMenu,
    createPortal,
    loadItems,
    loadReports,
    loadStationBatches,

    loadMasterBatches,


    submitReport,
    submitTestingUsage,
    openKitchenMoveModal,
    closeKitchenMoveModal,
    submitKitchenMove,
    closeTestingModal,
    renderStockActionMenu,
    renderKitchenActionMenu,
    filteredItems,
    filteredStationBatches,
    filteredBulkOpenedMovements,
    stockColumns,
    stationBatchColumns,
    bulkOpenedColumns,
    reportColumns,
    closeReportModal,
    selectedKitchenMoveItem,
    selectedKitchenMoveMasterStock,
    selectedKitchenMoveMax,
    selectedKitchenMoveSuggestedQty,
    kitchenTransferItems,
    bulkUsageItems,
    selectedTestProduct,
    selectedTestRecipe,
    testingRecipeLines
,
    selectedTestItem,
    getTestingLineSourceLabel,
    getTestingDeductionSource,
    closeKitchenAuditModal,
    closingExpected,
    closingVariance,
    submitKitchenClosingCount,
    sourceBatchesForItem  };
}
