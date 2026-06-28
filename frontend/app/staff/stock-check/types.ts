export type StockCheckTab = "stock-check" | "kitchen-station" | "my-reports";
export type StationScope = "barista" | "kitchen" | "shared";
export type ReportType = "low_stock" | "out_of_stock" | "waste_damaged" | "restock_request" | "testing_usage";
export type ReportStatus = "pending" | "rejected" | "resolved";
export type TestingMode = "ingredient" | "menu";
export type TestingPurpose = "coffee_calibration" | "taste_test" | "menu_trial" | "staff_training" | "quality_check" | "other";

export type InventoryItem = {
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

export type StockReport = {
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

export type StationBatch = {
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

export type InventoryBatch = {
  id: string;
  inventory_item_id: string;
  batch_number: string | null;
  supplier: string | null;
  quantity_remaining: number | string | null;
  unit: string | null;
  unit_cost: number | string | null;
  expiry_date: string | null;
};

export type ProductItem = {
  id: string;
  name: string;
  type: "food" | "drink" | string | null;
  available?: boolean | null;
};

export type RecipeRow = {
  id: string;
  product_id: string | null;
  product_name?: string | null;
  recipe_type?: string | null;
};

export type RecipeIngredient = {
  recipe_id: string | null;
  inventory_item_id: string | null;
  ingredient_name: string | null;
  quantity_needed: number | string | null;
  unit: string | null;
  costing_mode?: "deduct_from_pos" | "cost_estimate_only" | "kitchen_overhead" | null;
};

export type TestingRecipeLine = {
  ingredient: RecipeIngredient;
  item: InventoryItem | null;
  requiredQuantity: number;
  sourceUnit: string;
  stockUnit: string;
  costingMode: RecipeIngredient["costing_mode"];
  deductionSource: "master" | "station" | "none";
  note: string;
};

export type TestingForm = {
  mode: TestingMode;
  itemId: string;
  productId: string;
  quantity: string;
  portions: string;
  purpose: TestingPurpose;
  shiftName: string;
  notes: string;
};

export type BulkOpenedMovement = {
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

export type KitchenMoveForm = {
  itemId: string;
  sourceBatchId: string;
  quantity: string;
  expiryDate: string;
  shiftName: string;
  notes: string;
};

export type KitchenAuditTarget = {
  kind: "station" | "bulk";
  inventoryItemId: string;
  itemName: string;
  unit: string;
  expectedQuantity: number;
  sourceBatchId?: string | null;
  stationBatchId?: string | null;
  sourceLabel: string;
};

export type KitchenActionTarget =
  | { kind: "station"; batch: StationBatch; anchor: DOMRect }
  | { kind: "bulk"; movement: BulkOpenedMovement; anchor: DOMRect };

export type KitchenReportCondition = "ok" | "waste" | "need_prep" | "adjusted" | "handover";
export type KitchenReportLevel = "" | "full" | "three_quarter" | "half" | "quarter" | "low" | "empty";
