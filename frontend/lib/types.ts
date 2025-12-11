/**
 * Centralized TypeScript interfaces for the POS system
 * 
 * This file contains all data structure definitions used throughout
 * the application to ensure type safety and consistency.
 */

// ==================== Staff & Authentication ====================

export type StaffRole = 'owner' | 'manager' | 'kitchen' | 'cashier' | 'barista' | 'waiter'
export type StaffStatus = 'Aktif' | 'Nonaktif'

export interface Staff {
  id: string
  staff_code: string
  name: string
  role: StaffRole
  phone: string
  status: StaffStatus
  login_code?: string
  login_code_expires_at?: string
  created_at?: string
}

export interface StaffInfo {
  id: string
  name: string
  role: StaffRole
  staff_code: string
}

export interface User {
  id: string
  name: string
  role: StaffRole
}

// ==================== Menu & Products ====================

export interface MenuItem {
  id: string
  name: string
  category: string
  categoryId?: string // Alias for UI
  price: number
  description?: string
  image_url?: string
  image?: string // Alias for UI
  is_available: boolean
  available?: boolean // Alias for UI
  hasVariants?: boolean
  variantGroups?: string[] // For UI display
  created_at?: string
  updated_at?: string
}

export interface FoodItem extends MenuItem {
  stock?: number
  category_type?: 'food' | 'beverage'
}

// ==================== Variants ====================

export interface VariantOption {
  id: string
  variant_group_id?: string // Database field
  name: string
  price_adjustment: number
  priceModifier?: number // Alias for UI (same as price_adjustment)
  price_modifier?: number // Another alias
  is_available?: boolean
  created_at?: string
  groupName?: string // For UI display in overrides/modifiers
  groupId?: string // For UI display in overrides/modifiers
}

export interface VariantGroup {
  id: string
  name: string
  description?: string
  type?: 'single' | 'multiple' // UI field
  is_required?: boolean
  required?: boolean // Alias for UI
  max_selections?: number
  created_at?: string
  variant_options?: VariantOption[]
  options?: VariantOption[] // Alias for compatibility
}

export interface SelectedVariant {
  group_id: string
  group_name: string
  option_id: string
  option_name: string
  price_adjustment: number
}

// ==================== Orders ====================

export type OrderStatus = 'new' | 'preparing' | 'partially-served' | 'ready' | 'served' | 'completed' | 'cancelled'
export type PaymentMethod = 'cash' | 'qris' | 'debit' | 'credit'

export interface OrderItem {
  id: string
  order_id?: string
  menu_item_id?: string
  name?: string // For UI display
  quantity: number
  price: number
  subtotal?: number
  notes?: string
  served: boolean
  served_by?: string
  served_at?: string
  servedAt?: string // Alias for compatibility
  created_at?: string
  variants?: any // Can be SelectedVariant[] or Record<string, string>
  kitchenStatus?: string // 'pending' | 'cooking' | 'ready' | 'not_required'
  readyAt?: string
  
  // Relations
  menu_item?: MenuItem
  menu_item_name?: string
}

export interface Order {
  id: string
  order_number?: string
  orderNumber?: string // Alias for compatibility
  table_number?: string
  table?: string // Alias for compatibility
  customerName?: string
  customer_name?: string
  orderType?: string
  order_type?: string
  status: OrderStatus
  total_amount?: number
  total?: number // Alias for compatibility
  date?: string
  time?: string
  payment_method?: PaymentMethod
  payment_amount?: number
  change_amount?: number
  notes?: string
  created_by?: string
  createdByName?: string
  createdByRole?: string
  servedByNames?: string[]
  servedByRoles?: string[]
  created_at?: string
  createdAt?: string // Alias for compatibility
  updated_at?: string
  completed_at?: string
  
  // Relations
  items?: OrderItem[] // Alias for order_items
  order_items?: OrderItem[]
  staff?: Staff
}

// ==================== Inventory ====================

export type InventoryCategory = 'raw_material' | 'packaging' | 'consumable' | 'other'
export type InventoryUnit = 'kg' | 'gram' | 'liter' | 'ml' | 'pcs' | 'pack' | 'box' | 'bottle'
export type TransactionType = 'in' | 'out' | 'adjustment' | 'usage'

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  unit: InventoryUnit
  current_stock: number
  minimum_stock: number
  price_per_unit?: number
  supplier?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface UsageTransactionDetail {
  id: string
  usage_transaction_id: string
  inventory_item_id: string
  quantity_used: number
  unit: InventoryUnit
  notes?: string
  
  // Relations
  inventory_item?: InventoryItem
  inventory_item_name?: string
}

export interface UsageTransaction {
  id: string
  transaction_type: TransactionType
  performed_by: string
  transaction_date: string
  notes?: string
  order_id?: string
  created_at?: string
  
  // Relations
  details: UsageTransactionDetail[]
  staff?: Staff
  staff_name?: string
  order?: Order
}

// ==================== Recipes ====================

export interface RecipeIngredient {
  id: string
  recipe_id: string
  inventory_item_id: string
  quantity_required: number
  unit: InventoryUnit
  notes?: string
  
  // Relations
  inventory_item?: InventoryItem
  inventory_item_name?: string
}

export interface Recipe {
  id: string
  menu_item_id: string
  name: string
  description?: string
  instructions?: string
  created_at?: string
  updated_at?: string
  
  // Relations
  ingredients: RecipeIngredient[]
  menu_item?: MenuItem
}

// ==================== Attendance ====================

export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha'

export interface Attendance {
  id: string
  staff_id: string
  tanggal: string
  waktu_masuk: string
  waktu_keluar?: string | null
  status: AttendanceStatus
  keterangan?: string | null
  created_at?: string
  
  // Relations
  staff?: Staff
  staff_name?: string
}

// ==================== Activity Logs ====================

export type ActivitySeverity = 'info' | 'warning' | 'critical'
export type ActivityCategory = 'authentication' | 'orders' | 'inventory' | 'menu' | 'staff' | 'system'
export type ActivityAction = string // Too many possible values to enumerate

export interface ActivityLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  userRole: StaffRole
  action: ActivityAction
  actionCategory: ActivityCategory
  actionDescription: string
  severity: ActivitySeverity
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  created_at?: string
}

// ==================== Payment ====================

export interface PaymentData {
  method: PaymentMethod
  paymentMethod?: string // Alias for compatibility
  amount: number
  change?: number
  notes?: string
  customerName?: string
  customerPhone?: string
  tableNumber?: string
}

// ==================== Presence Code ====================

export interface PresenceCode {
  id: string
  code: string
  expires_at: string
  created_at: string
}

// ==================== API Responses ====================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface SupabaseError {
  message: string
  details?: string
  hint?: string
  code?: string
}

// ==================== Form Data ====================

export interface NewStaffData {
  name: string
  role: StaffRole
  phone: string
  status?: StaffStatus
}

export interface NewMenuItemData {
  name: string
  category: string
  price: number
  description?: string
  image_url?: string
  is_available?: boolean
}

export interface NewInventoryItemData {
  name: string
  category: InventoryCategory
  unit: InventoryUnit
  current_stock: number
  minimum_stock: number
  price_per_unit?: number
  supplier?: string
  notes?: string
}

export interface StockAdjustmentData {
  inventory_item_id: string
  adjustment_quantity: number
  transaction_type: TransactionType
  notes?: string
  performed_by: string
}

// ==================== UI State ====================

export interface FilterState {
  search?: string
  category?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  role?: StaffRole
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

// ==================== Statistics ====================

export interface OrderStats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  revenue: number
  avgOrderValue: number
}

export interface InventoryStats {
  totalItems: number
  lowStock: number
  outOfStock: number
  totalValue: number
}

export interface StaffStats {
  total: number
  active: number
  inactive: number
  presentToday: number
}

// ==================== Type Guards ====================

export function isStaff(obj: any): obj is Staff {
  return obj && typeof obj.id === 'string' && typeof obj.staff_code === 'string'
}

export function isOrder(obj: any): obj is Order {
  return obj && typeof obj.id === 'string' && typeof obj.order_number === 'string'
}

export function isInventoryItem(obj: any): obj is InventoryItem {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string' && typeof obj.current_stock === 'number'
}
