export type OrderRow = {
  id: string;
  order_number?: string | null;
  original_status?: string | null;
  correction_id?: string | null;
  correction_status?: string | null;
  correction_physical_status?: string | null;
  correction_note?: string | null;
  total: number | string | null;
  discount?: number | string | null;
  status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  order_date: string | null;
  order_time: string | null;
  created_at: string | null;
  completed_at?: string | null;
  ready_at?: string | null;
  served_at?: string | null;
  created_by?: string | null;
  fulfillment_method: string | null;
  customer_id?: string | null;
  reward_redemption_id?: string | null;
};

export type OrderItemRow = {
  order_id: string | null;
  product_id?: string | null;
  product_name: string | null;
  quantity: number | string | null;
  total_price: number | string | null;
  ready_at?: string | null;
  served_at?: string | null;
  served_by?: string | null;
};

export type ProductCategoryRelation = {
  name?: string | null;
};

export type CategoryRow = {
  id: string;
  name: string | null;
};

export type ProductRow = {
  id: string;
  name: string | null;
  category_id?: string | null;
  category?: ProductCategoryRelation | ProductCategoryRelation[] | null;
  price?: number | string | null;
  stock: number | string | null;
  available: boolean | null;
  type: string | null;
};

export type RecipeRow = {
  id: string;
  product_id: string | null;
  product_name?: string | null;
  recipe_type?: string | null;
};

export type RecipeIngredientRow = {
  recipe_id: string | null;
  inventory_item_id: string | null;
  ingredient_name?: string | null;
  quantity_needed: number | string | null;
  unit?: string | null;
  costing_mode?: "deduct_from_pos" | "cost_estimate_only" | "kitchen_overhead" | null;
};

export type InventoryItemRow = {
  id: string;
  name: string | null;
  current_stock: number | string | null;
  reorder_level: number | string | null;
  unit: string | null;
  category: string | null;
  price_per_unit?: number | string | null;
  cost_per_unit?: number | string | null;
};

export type InventoryBatchRow = {
  id: string;
  inventory_item_id: string | null;
  batch_number: string | null;
  supplier: string | null;
  received_at: string | null;
  expiry_date: string | null;
  quantity_received: number | string | null;
  quantity_remaining: number | string | null;
  unit: string | null;
  unit_cost: number | string | null;
  invoice_reference?: string | null;
  receipt_url?: string | null;
};

export type StaffRow = {
  id: string;
  name: string | null;
  role: string | null;
  status: string | null;
};

export type RewardRow = {
  id: string;
  name: string | null;
  description: string | null;
  discount_type: string | null;
  discount_value: number | string | null;
  max_discount_amount: number | string | null;
  points_required: number | string | null;
  minimum_order_amount: number | string | null;
  valid_days: number | string | null;
  usage_limit: number | string | null;
  used_count: number | string | null;
  is_active: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
};

export type AttendanceRow = {
  id: string;
  staff_id: string | null;
  attendance_date: string | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
  check_in_status: string | null;
  check_out_status: string | null;
};

export type UsageTransactionRow = {
  id: string;
  transaction_type: string | null;
  type?: string | null;
  created_at: string | null;
  timestamp?: string | null;
  order_id?: string | null;
  product_name?: string | null;
  quantity_sold?: number | string | null;
  notes?: string | null;
  performed_by_name?: string | null;
};

export type UsageTransactionDetailRow = {
  usage_transaction_id: string | null;
  inventory_item_id: string | null;
  ingredient_name: string | null;
  quantity_used: number | string | null;
  unit: string | null;
  previous_stock?: number | string | null;
  new_stock?: number | string | null;
};

export type StockReportRow = {
  id: string;
  material_name: string | null;
  report_type: string | null;
  status: string | null;
  reported_by_role?: string | null;
  created_at: string | null;
};

export type DashboardData = {
  orders: OrderRow[];
  orderItems: OrderItemRow[];
  products: ProductRow[];
  inventoryItems: InventoryItemRow[];
  inventoryBatches: InventoryBatchRow[];
  staff: StaffRow[];
  attendance: AttendanceRow[];
  usageTransactions: UsageTransactionRow[];
  usageTransactionDetails: UsageTransactionDetailRow[];
  stockReports: StockReportRow[];
  loading: boolean;
  error: string;
};

export type OverviewData = {
  orders: OrderRow[];
  loading: boolean;
  error: string;
};
