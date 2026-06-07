import {
  formatJakartaDate as formatJakartaDateFromTime,
  formatJakartaDateTime as formatJakartaDateTimeFromTime,
  formatJakartaTime as formatJakartaTimeFromTime,
  parseSupabaseTimestamp as parseSupabaseTimestampFromTime,
} from "../constants/time";

/**
 * Parse Supabase timestamp string to Jakarta timezone Date object
 * Supabase stores timestamps in UTC, we need to parse them correctly
 */
export function parseSupabaseTimestamp(timestamp: string): Date {
  return parseSupabaseTimestampFromTime(timestamp);
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
  return formatJakartaDateFromTime(date);
}
  
/**
 * Format time to Jakarta timezone string
 * Example: "14:30"
 */
export function formatJakartaTime(date: Date): string {
  return formatJakartaTimeFromTime(date);
}

/**
 * Format datetime to Jakarta timezone string
 * Example: "17 Nov 2024, 14:30"
 */
export function formatJakartaDateTime(date: Date): string {
  return formatJakartaDateTimeFromTime(date);
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

export function getJakartaDateValue(timestamp?: string | null): string {
  if (!timestamp) return "";
  const date = parseSupabaseTimestamp(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function getJakartaDateTimeRange(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) {
    return {
      start: new Date().toISOString(),
      end: new Date().toISOString(),
    };
  }

  const start = new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0)).toISOString();
  const end = new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999)).toISOString();

  return { start, end };
}

export function getJakartaDateRangeForQuery(startDate: string, endDate: string) {
  return {
    start: getJakartaDateTimeRange(startDate).start,
    end: getJakartaDateTimeRange(endDate).end,
  };
}
