/**
 * Theme Constants
 * Centralized color definitions for the entire application
 * Ensures consistency and makes theme changes easier
 */

export const COLORS = {
  // Brand Colors
  PRIMARY: '#8FCC4A',
  PRIMARY_LIGHT: '#B2FF5E',
  PRIMARY_HOVER: '#7AB839',
  PRIMARY_DARK: '#7FCC2B',
  
  // Status Colors
  SUCCESS: '#B2FF5E',
  DANGER: '#FF6859',
  WARNING: '#FFE52A',
  INFO: '#3B82F6',
  
  // Role Badge Colors
  OWNER_BG: '#000000',
  OWNER_TEXT: '#FFFFFF',
  MANAGER_BG: '#F79A19',
  MANAGER_TEXT: '#000000',
  STAFF_BG: '#FFE52A',
  STAFF_TEXT: '#000000',
  
  // Kitchen Status Colors
  KITCHEN_PREPARING: '#FFE52A',
  KITCHEN_READY: '#B2FF5E',
  KITCHEN_SERVED: '#94A3B8',
  
  // Background Colors
  BG_GRAY_50: '#F9FAFB',
  BG_GRAY_100: '#F3F4F6',
  BG_GRAY_200: '#E5E7EB',
  BG_WHITE: '#FFFFFF',
  
  // Text Colors
  TEXT_GRAY_900: '#111827',
  TEXT_GRAY_800: '#1F2937',
  TEXT_GRAY_700: '#374151',
  TEXT_GRAY_600: '#4B5563',
  TEXT_GRAY_500: '#6B7280',
  TEXT_GRAY_400: '#9CA3AF',
  
  // Border Colors
  BORDER_GRAY_200: '#E5E7EB',
  BORDER_GRAY_300: '#D1D5DB',
  
  // Special Use Cases
  POSITIVE_MODIFIER: '#8FCC4A', // For price increases
  NEGATIVE_MODIFIER: '#FF6859', // For price decreases
  LOW_STOCK_ALERT: '#FF6859',
  MEDIUM_STOCK: '#FFE52A',
  GOOD_STOCK: '#B2FF5E',
} as const;

/**
 * Tailwind CSS class mappings for colors
 * Use these when you need Tailwind classes instead of inline styles
 */
export const TAILWIND_COLORS = {
  PRIMARY: 'bg-[#8FCC4A]',
  PRIMARY_LIGHT: 'bg-[#B2FF5E]',
  DANGER: 'bg-[#FF6859]',
  WARNING: 'bg-[#FFE52A]',
  MANAGER: 'bg-[#F79A19]',
  
  TEXT_PRIMARY: 'text-[#8FCC4A]',
  TEXT_DANGER: 'text-[#FF6859]',
  TEXT_WARNING: 'text-[#FFE52A]',
  TEXT_MANAGER: 'text-[#F79A19]',
} as const;

/**
 * Helper function to get role badge colors
 */
export function getRoleBadgeColors(role: 'owner' | 'manager' | 'staff' | string) {
  switch (role.toLowerCase()) {
    case 'owner':
      return { bg: COLORS.OWNER_BG, text: COLORS.OWNER_TEXT };
    case 'manager':
      return { bg: COLORS.MANAGER_BG, text: COLORS.MANAGER_TEXT };
    case 'staff':
    default:
      return { bg: COLORS.STAFF_BG, text: COLORS.STAFF_TEXT };
  }
}

/**
 * Helper function to get kitchen status colors
 */
export function getKitchenStatusColors(status: string) {
  switch (status) {
    case 'preparing':
      return COLORS.KITCHEN_PREPARING;
    case 'ready':
      return COLORS.KITCHEN_READY;
    case 'served':
      return COLORS.KITCHEN_SERVED;
    default:
      return COLORS.TEXT_GRAY_400;
  }
}

/**
 * Helper function to get stock alert colors
 */
export function getStockAlertColor(currentStock: number, minimumStock: number) {
  const ratio = currentStock / minimumStock;
  if (ratio <= 0.5) return COLORS.LOW_STOCK_ALERT;
  if (ratio <= 1) return COLORS.MEDIUM_STOCK;
  return COLORS.GOOD_STOCK;
}
