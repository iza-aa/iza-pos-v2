/**
 * Date utility functions for Jakarta timezone (UTC+7)
 */

/**
 * Parse Supabase timestamp string to Jakarta timezone Date object
 * Supabase stores timestamps in UTC, we need to parse them correctly
 */
export function parseSupabaseTimestamp(timestamp: string): Date {
  // If timestamp doesn't have 'Z', add it to ensure UTC parsing
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  return new Date(utcTimestamp);
}

/**
 * Get current Jakarta time as Date object
 */
export function getJakartaNow(): Date {
  return new Date();
}

/**
 * Format date to Jakarta timezone string
 * Example: "17 Nov 2024"
 */
export function formatJakartaDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(date);
}

/**
 * Format time to Jakarta timezone string
 * Example: "14:30"
 */
export function formatJakartaTime(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).format(date);
}

/**
 * Format datetime to Jakarta timezone string
 * Example: "17 Nov 2024, 14:30"
 */
export function formatJakartaDateTime(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).format(date);
}

/**
 * Calculate minutes difference between two dates
 */
export function getMinutesDifference(laterDate: Date, earlierDate: Date): number {
  return Math.floor((laterDate.getTime() - earlierDate.getTime()) / (1000 * 60));
}

/**
 * Get Jakarta timestamp for database insertion
 * Returns ISO string that Supabase will store as UTC
 */
export function getJakartaTimestampForDB(): string {
  return new Date().toISOString();
}
