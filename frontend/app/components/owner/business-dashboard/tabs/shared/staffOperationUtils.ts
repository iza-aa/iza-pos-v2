import type { OrderRow } from "./dashboardTypes";
import {
  getBusinessDateFromTimestamp,
  getOrderBusinessDate,
} from "./dashboardUtils";

export const getMinutesBetween = (
  start: string | null | undefined,
  end: string | null | undefined,
) => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  const minutes = (endDate.getTime() - startDate.getTime()) / 60_000;
  return minutes >= 0 ? minutes : null;
};

export const clampScore = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export const getOrderDateCandidates = (order: OrderRow) => {
  return Array.from(
    new Set(
      [
        getOrderBusinessDate(order),
        order.order_date ?? "",
        getBusinessDateFromTimestamp(order.created_at),
      ].filter(Boolean),
    ),
  );
};
