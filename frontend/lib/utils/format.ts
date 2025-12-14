/**
 * Format Utilities
 * Centralized formatting functions for currency, numbers, dates, etc.
 */

import { formatCurrency } from '../constants'

/**
 * Format number with thousand separator
 * @param num - The number to format
 * @returns Formatted number string (e.g., "1.000.000")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('id-ID');
}

/**
 * Parse currency string to number
 * @param currencyString - String like "Rp 25.000" or "25000"
 * @returns Parsed number
 */
export function parseCurrency(currencyString: string): number {
  const cleanNumber = currencyString.replace(/[^0-9]/g, '');
  return Number(cleanNumber);
}

/**
 * Format price with optional modifier indicator
 * @param price - The price amount
 * @param modifier - Optional price modifier (e.g., for variants)
 * @returns Formatted price with +/- indicator if modifier
 */
export function formatPriceModifier(price: number): string {
  const prefix = price > 0 ? '+' : price < 0 ? '-' : '';
  const absolutePrice = Math.abs(price);
  return `${prefix}${formatCurrency(absolutePrice)}`;
}

/**
 * Format percentage
 * @param value - The percentage value (0-100)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string (e.g., "25.5%")
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
