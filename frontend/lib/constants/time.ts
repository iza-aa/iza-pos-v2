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

export const APP_TIME_ZONE = "Asia/Jakarta";

export function parseSupabaseTimestamp(timestamp: string): Date {
  const trimmed = String(timestamp || "").trim();
  if (!trimmed) return new Date(NaN);

  const hasTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  return new Date(hasTimeZone ? trimmed : `${trimmed}Z`);
}

export function formatJakartaDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatJakartaTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${getPart("hour")}:${getPart("minute")}`;
}

export function formatJakartaDateTime(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatJakartaDateTimeParts(timestamp: string) {
  const date = parseSupabaseTimestamp(timestamp);
  return {
    date: Number.isNaN(date.getTime()) ? "-" : formatJakartaDate(date),
    time: Number.isNaN(date.getTime()) ? "-" : formatJakartaTime(date),
  };
}

export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = parseSupabaseTimestamp(timestamp);
  if (Number.isNaN(past.getTime())) return "-";

  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / TIME_UNITS.MINUTE);
  const diffHours = Math.floor(diffMs / TIME_UNITS.HOUR);
  const diffDays = Math.floor(diffMs / TIME_UNITS.DAY);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return formatJakartaDate(past);
}

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
