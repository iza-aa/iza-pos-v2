/**
 * Number Constants
 * Centralized numeric constants and formatting utilities
 */

// Currency formatting
export const CURRENCY = {
  RUPIAH_STEP: 1000,           // Minimum step for Rupiah input
  THOUSAND: 1000,              // For K notation (e.g., 10k)
  DEFAULT_DECIMAL_PLACES: 0,   // Rupiah doesn't use decimals
} as const;

// Stock levels & thresholds
export const STOCK_LEVELS = {
  CRITICAL: 5,      // Show critical alert
  LOW: 10,          // Show low stock warning
  MEDIUM: 50,       // Moderate stock level
  HIGH: 100,        // Good stock level
} as const;

// Pagination & Display limits
export const DISPLAY_LIMITS = {
  DEFAULT_PAGE_SIZE: 10,
  SMALL_PAGE_SIZE: 5,
  LARGE_PAGE_SIZE: 20,
  MAX_ITEMS_PREVIEW: 3,  // Show "N more items" after this
} as const;

// Animation & UI
export const UI_VALUES = {
  PERSPECTIVE: 1000,         // 3D perspective value for cards
  Z_INDEX_MODAL: 50,         // Modal overlay z-index
  Z_INDEX_DROPDOWN: 40,      // Dropdown z-index
  BORDER_RADIUS: 8,          // Default border radius (px)
} as const;

// Percentage thresholds
export const PERCENTAGE = {
  ZERO: 0,
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  FULL: 100,
} as const;

/**
 * Format number to Rupiah currency
 * @param amount - Amount in Rupiah
 * @param options - Optional formatting options
 * @returns Formatted string (e.g., "Rp 10.000")
 */
export function formatRupiah(
  amount: number,
  options?: {
    showCurrency?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const {
    showCurrency = true,
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options || {};

  const formatted = amount.toLocaleString('id-ID', {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return showCurrency ? `Rp ${formatted}` : formatted;
}

// Alias for backward compatibility
export const formatCurrency = formatRupiah;

/**
 * Format number to K notation (thousands)
 * @param amount - Amount to format
 * @returns Formatted string (e.g., "10k")
 */
export function formatToThousands(amount: number): string {
  return `${(amount / CURRENCY.THOUSAND).toFixed(0)}k`;
}

/**
 * Format number to Rupiah with K notation
 * @param amount - Amount in Rupiah
 * @returns Formatted string (e.g., "Rp10k")
 */
export function formatRupiahShort(amount: number): string {
  return `Rp${formatToThousands(amount)}`;
}

/**
 * Calculate percentage
 * @param value - Current value
 * @param total - Total value
 * @returns Percentage (0-100)
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Check stock status based on current and minimum levels
 * @param current - Current stock
 * @param minimum - Minimum stock threshold
 * @returns Status: 'critical' | 'low' | 'good'
 */
export function getStockStatus(
  current: number,
  minimum: number
): 'critical' | 'low' | 'good' {
  if (current <= 0) return 'critical';
  if (current < minimum) return 'low';
  if (current < minimum * 2) return 'low';
  return 'good';
}

/**
 * Round to nearest step value
 * @param value - Value to round
 * @param step - Step size (default: 1000 for Rupiah)
 * @returns Rounded value
 */
export function roundToStep(value: number, step: number = CURRENCY.RUPIAH_STEP): number {
  return Math.round(value / step) * step;
}
