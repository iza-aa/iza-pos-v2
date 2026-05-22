/**
 * Theme Constants
 * Centralized color definitions for the entire application
 * Ensures consistency and makes theme changes easier
 */

export const COLORS = {
  // Brand Colors
  PRIMARY: '#000000',
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

export const OWNER_CHART_COLORS = {
  SOFT_SKY_BLUE: '#A0D7FD',
  INDIGO_BLUE: '#4C46DA',
  SOFT_YELLOW: '#FCD34D',
  SOFT_GREEN: '#86EFAC',
  SOFT_ROSE: '#FDA4AF',
} as const;

export const OWNER_CHART_SERIES = [
  OWNER_CHART_COLORS.INDIGO_BLUE,
  OWNER_CHART_COLORS.SOFT_SKY_BLUE,
  OWNER_CHART_COLORS.SOFT_GREEN,
  OWNER_CHART_COLORS.SOFT_YELLOW,
  OWNER_CHART_COLORS.SOFT_ROSE,
] as const;

export const OWNER_SEMANTIC_TONES = {
  neutral: {
    background: '#F7F7F5',
    text: '#525252',
    border: '#E5E5E0',
    cardClass: 'border-[#E5E5E0] bg-[#F7F7F5]',
    badgeClass: 'border-[#E5E5E0] bg-[#F7F7F5] text-[#525252]',
  },
  dark: {
    background: '#18181B',
    text: '#FFFFFF',
    border: '#18181B',
    cardClass: 'border-[#18181B] bg-[#18181B]',
    badgeClass: 'border-[#18181B] bg-[#18181B] text-white',
  },
  info: {
    background: '#EEF6FF',
    text: '#2563EB',
    border: '#CFE4FF',
    cardClass: 'border-[#CFE4FF] bg-[#EEF6FF]',
    badgeClass: 'border-[#CFE4FF] bg-[#EEF6FF] text-[#2563EB]',
  },
  progress: {
    background: '#F1F0FF',
    text: '#5B5BD6',
    border: '#DCD7FF',
    cardClass: 'border-[#DCD7FF] bg-[#F1F0FF]',
    badgeClass: 'border-[#DCD7FF] bg-[#F1F0FF] text-[#5B5BD6]',
  },
  waiting: {
    background: '#FFF7E6',
    text: '#A16207',
    border: '#F2D49B',
    cardClass: 'border-[#F2D49B] bg-[#FFF7E6]',
    badgeClass: 'border-[#F2D49B] bg-[#FFF7E6] text-[#A16207]',
  },
  success: {
    background: '#EAF7EF',
    text: '#2F7D50',
    border: '#BFE5CC',
    cardClass: 'border-[#BFE5CC] bg-[#EAF7EF]',
    badgeClass: 'border-[#BFE5CC] bg-[#EAF7EF] text-[#2F7D50]',
  },
  warning: {
    background: '#FFF1E6',
    text: '#B45309',
    border: '#F6C99F',
    cardClass: 'border-[#F6C99F] bg-[#FFF1E6]',
    badgeClass: 'border-[#F6C99F] bg-[#FFF1E6] text-[#B45309]',
  },
  danger: {
    background: '#FFF1F2',
    text: '#BE123C',
    border: '#F7B8C3',
    cardClass: 'border-[#F7B8C3] bg-[#FFF1F2]',
    badgeClass: 'border-[#F7B8C3] bg-[#FFF1F2] text-[#BE123C]',
  },
  premium: {
    background: '#F7F0FF',
    text: '#7E3AF2',
    border: '#DFC7FF',
    cardClass: 'border-[#DFC7FF] bg-[#F7F0FF]',
    badgeClass: 'border-[#DFC7FF] bg-[#F7F0FF] text-[#7E3AF2]',
  },
  coffee: {
    background: '#F8EFE3',
    text: '#8B5E34',
    border: '#E8D5BE',
    cardClass: 'border-[#E8D5BE] bg-[#F8EFE3]',
    badgeClass: 'border-[#E8D5BE] bg-[#F8EFE3] text-[#8B5E34]',
  },
  cashier: {
    background: '#EAF8F6',
    text: '#168A7A',
    border: '#BFE5DF',
    cardClass: 'border-[#BFE5DF] bg-[#EAF8F6]',
    badgeClass: 'border-[#BFE5DF] bg-[#EAF8F6] text-[#168A7A]',
  },
} as const;

export type OwnerSemanticTone = keyof typeof OWNER_SEMANTIC_TONES;

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
