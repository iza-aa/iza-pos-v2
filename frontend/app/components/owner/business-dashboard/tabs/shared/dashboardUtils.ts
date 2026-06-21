import type { DateRangeValue } from "../DateRangeFilter";
import type { OrderRow } from "./dashboardTypes";
import { isValidPaidOrder } from "@/lib/utils/orderValidation";

export const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value);

export const getDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getLocalDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return getDateInputValue(date);
};

export const getRecentDates = (days: number) =>
  Array.from({ length: days }, (_, index) => getLocalDate(index - days + 1));

export const getDatesBetween = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    dates.push(getDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

export const addDaysToDateValue = (dateValue: string, offsetDays: number) => {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return getDateInputValue(date);
};

export const getRangeLengthDays = (range: DateRangeValue) => {
  const start = new Date(`${range.startDate}T00:00:00`).getTime();
  const end = new Date(`${range.endDate}T00:00:00`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
};

export const getPreviousDateRange = (range: DateRangeValue): DateRangeValue => {
  const length = getRangeLengthDays(range);
  return {
    startDate: addDaysToDateValue(range.startDate, -length),
    endDate: addDaysToDateValue(range.startDate, -1),
  };
};

const jakartaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
});

const jakartaDatePartsCache = new Map<string, { date: string; hour: string } | null>();
const MAX_DATE_CACHE_SIZE = 10_000;

const getJakartaDateParts = (value: string | null | undefined) => {
  if (!value) return null;
  if (jakartaDatePartsCache.has(value)) {
    return jakartaDatePartsCache.get(value) ?? null;
  }

  const normalizedValue = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    jakartaDatePartsCache.set(value, null);
    return null;
  }

  const parts = jakartaDateFormatter.formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");

  if (!year || !month || !day) {
    jakartaDatePartsCache.set(value, null);
    return null;
  }

  const result = {
    date: `${year}-${month}-${day}`,
    hour: hour === "24" ? "00" : hour.padStart(2, "0"),
  };

  if (jakartaDatePartsCache.size >= MAX_DATE_CACHE_SIZE) {
    jakartaDatePartsCache.clear();
  }
  jakartaDatePartsCache.set(value, result);
  return result;
};

export const getBusinessDateFromTimestamp = (value: string | null | undefined) => {
  return getJakartaDateParts(value)?.date ?? "";
};

export const getBusinessHourFromTimestamp = (value: string | null | undefined) => {
  return getJakartaDateParts(value)?.hour ?? "";
};

export const getOrderBusinessDate = (order: OrderRow) => {
  return getBusinessDateFromTimestamp(order.created_at) || order.order_date || "";
};

export const getOrderBusinessHour = (order: OrderRow) => {
  const localHour = getBusinessHourFromTimestamp(order.created_at);
  if (localHour) return localHour;

  return String(order.order_time ?? "00").slice(0, 2).padStart(2, "0");
};

export const isValidSalesOrder = (order: OrderRow) => {
  return isValidPaidOrder(order);
};

export const groupBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const map = new Map<string, T[]>();

  items.forEach((item) => {
    const key = getKey(item) || "Unknown";
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  });

  return map;
};
