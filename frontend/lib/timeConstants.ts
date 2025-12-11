/**
 * Time Constants
 * Centralized time-related constants for consistent timing across the application
 */

// Time units in milliseconds
export const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000, // Approximate
} as const;

// Polling intervals (auto-refresh)
export const POLLING_INTERVALS = {
  FAST: 10 * TIME_UNITS.SECOND,      // 10 seconds - For critical real-time data
  NORMAL: 30 * TIME_UNITS.SECOND,    // 30 seconds - For moderately important data
  SLOW: TIME_UNITS.MINUTE,           // 1 minute - For less critical data
  VERY_SLOW: 5 * TIME_UNITS.MINUTE,  // 5 minutes - For background updates
} as const;

// Timeout durations
export const TIMEOUT_DURATIONS = {
  SHORT: 1500,    // 1.5 seconds - Quick feedback messages
  MEDIUM: 3000,   // 3 seconds - Standard notifications
  LONG: 5000,     // 5 seconds - Important messages
} as const;

// QR Code & Login expiration
export const EXPIRATION_TIMES = {
  QR_CODE: 5 * TIME_UNITS.MINUTE,        // 5 minutes - QR code validity
  STAFF_LOGIN: 8 * TIME_UNITS.HOUR,      // 8 hours - Staff login session
  TEMP_PASSWORD: 24 * TIME_UNITS.HOUR,   // 24 hours - Temporary password
} as const;

// Helper function to calculate time difference in minutes
export function getMinutesDifference(startTime: Date, endTime: Date): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / TIME_UNITS.MINUTE);
}

// Helper function to calculate time difference in hours
export function getHoursDifference(startTime: Date, endTime: Date): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / TIME_UNITS.HOUR);
}

// Helper function to format duration in HH:MM format
export function formatDuration(milliseconds: number): string {
  const hours = Math.floor(milliseconds / TIME_UNITS.HOUR);
  const minutes = Math.floor((milliseconds % TIME_UNITS.HOUR) / TIME_UNITS.MINUTE);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Helper function to get date X days ago
export function getDaysAgo(days: number): Date {
  return new Date(Date.now() - days * TIME_UNITS.DAY);
}

// Helper function to get date X weeks ago
export function getWeeksAgo(weeks: number): Date {
  return new Date(Date.now() - weeks * TIME_UNITS.WEEK);
}

// Helper function to get date X months ago
export function getMonthsAgo(months: number): Date {
  return new Date(Date.now() - months * TIME_UNITS.MONTH);
}
