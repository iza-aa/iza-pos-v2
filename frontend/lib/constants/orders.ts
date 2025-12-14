/**
 * Order Constants & Utilities
 * Centralized order status, kitchen status, and related configurations
 */

// ============================================
// ORDER STATUS
// ============================================

export type OrderStatus = 'new' | 'preparing' | 'partially-served' | 'served' | 'completed';

export const ORDER_STATUS = {
  NEW: 'new' as const,
  PREPARING: 'preparing' as const,
  PARTIALLY_SERVED: 'partially-served' as const,
  SERVED: 'served' as const,
  COMPLETED: 'completed' as const,
} as const;

export interface OrderStatusConfig {
  label: string;
  bg: string;
  text: string;
}

/**
 * Get order status configuration for styling and display
 * @param status - The order status
 * @returns Configuration object with label, bg color, and text color
 */
export function getOrderStatusConfig(status: string): OrderStatusConfig {
  switch (status) {
    case ORDER_STATUS.NEW:
      return { label: 'NEW ORDER', bg: 'bg-gray-100', text: 'text-gray-900' };
    case ORDER_STATUS.PREPARING:
      return { label: 'PREPARING', bg: 'bg-gray-100', text: 'text-gray-900' };
    case ORDER_STATUS.PARTIALLY_SERVED:
      return { label: 'PARTIALLY SERVED', bg: 'bg-gray-100', text: 'text-gray-900' };
    case ORDER_STATUS.SERVED:
      return { label: 'SERVED', bg: 'bg-[#B2FF5E]', text: 'text-gray-900' };
    case ORDER_STATUS.COMPLETED:
      return { label: 'COMPLETED', bg: 'bg-black', text: 'text-white' };
    default:
      return { label: 'UNKNOWN', bg: 'bg-gray-100', text: 'text-gray-900' };
  }
}

// ============================================
// KITCHEN STATUS
// ============================================

export type KitchenStatus = 'pending' | 'cooking' | 'ready' | 'not_required';

export const KITCHEN_STATUS = {
  PENDING: 'pending' as const,
  COOKING: 'cooking' as const,
  READY: 'ready' as const,
  NOT_REQUIRED: 'not_required' as const,
} as const;

export interface KitchenStatusBadge {
  icon: string;
  label: string;
  bgColor: string;
  textColor: string;
}

/**
 * Get kitchen status badge configuration
 * @param kitchenStatus - The kitchen status
 * @returns Badge configuration or null if not applicable
 */
export function getKitchenStatusBadge(kitchenStatus?: string): KitchenStatusBadge | null {
  if (!kitchenStatus || kitchenStatus === KITCHEN_STATUS.NOT_REQUIRED) {
    return null;
  }

  switch (kitchenStatus) {
    case KITCHEN_STATUS.PENDING:
      return {
        icon: '⏳',
        label: 'Pending',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-900',
      };
    case KITCHEN_STATUS.COOKING:
      return {
        icon: '🍳',
        label: 'In Cook',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-900',
      };
    case KITCHEN_STATUS.READY:
      return {
        icon: '✓',
        label: 'Ready',
        bgColor: 'bg-[#B2FF5E]',
        textColor: 'text-gray-900',
      };
    default:
      return null;
  }
}

// ============================================
// ORDER TYPE
// ============================================

export type OrderType = 'dine-in' | 'takeaway';

export const ORDER_TYPE = {
  DINE_IN: 'dine-in' as const,
  TAKEAWAY: 'takeaway' as const,
} as const;

// ============================================
// ORDER FILTERS
// ============================================

export const ORDER_FILTERS = {
  ALL: 'all' as const,
  DINE_IN: 'dine-in' as const,
  TAKEAWAY: 'takeaway' as const,
  NEW_PREPARING: 'new-preparing' as const,
  PARTIALLY_SERVED: 'partially-served' as const,
  SERVED: 'served' as const,
} as const;

export type OrderFilter = typeof ORDER_FILTERS[keyof typeof ORDER_FILTERS];

// ============================================
// ORDER TIMINGS
// ============================================

/**
 * Timing constants for order lifecycle and auto-updates
 */
export const ORDER_TIMINGS = {
  /**
   * Auto-refresh interval for order lists (milliseconds)
   * Default: 60 seconds (60000 ms)
   */
  AUTO_REFRESH_INTERVAL: 60 * 1000,
  
  /**
   * Minutes after which 'new' order auto-updates to 'preparing'
   * Default: 5 minutes
   */
  NEW_TO_PREPARING_MINUTES: 5,
  
  /**
   * Minutes after which 'served' order can auto-update to 'completed'
   * Default: 5 minutes
   */
  SERVED_TO_COMPLETED_MINUTES: 5,
  
  /**
   * Polling interval for real-time updates (milliseconds)
   * Default: 5 seconds (5000 ms)
   */
  REALTIME_POLL_INTERVAL: 5 * 1000,
} as const;

// ============================================
// DATABASE TABLE NAMES
// ============================================

/**
 * Database table name constants
 * Use these instead of hardcoded strings for type safety
 */
export const TABLES = {
  ORDERS: 'orders' as const,
  ORDER_ITEMS: 'order_items' as const,
  PRODUCTS: 'products' as const,
  CATEGORIES: 'categories' as const,
  STAFF: 'staff' as const,
  INVENTORY_ITEMS: 'inventory_items' as const,
  USAGE_TRANSACTIONS: 'usage_transactions' as const,
  USAGE_TRANSACTION_DETAILS: 'usage_transaction_details' as const,
  ACTIVITY_LOGS: 'activity_logs' as const,
  VARIANT_GROUPS: 'variant_groups' as const,
  VARIANT_OPTIONS: 'variant_options' as const,
  PRODUCT_RECIPES: 'product_recipes' as const,
  RECIPE_INGREDIENTS: 'recipe_ingredients' as const,
} as const;

export type TableName = typeof TABLES[keyof typeof TABLES];
