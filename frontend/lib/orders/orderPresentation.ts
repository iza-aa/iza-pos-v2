import type { OrderStatus } from "@/lib/types";
import {
  formatJakartaDate,
  formatJakartaTime,
  parseSupabaseTimestamp,
} from "@/lib/utils/date";

export type OrderPaymentMethod = "cash" | "qris" | "card" | "unknown";

type OperationalTimestampInput = {
  status: OrderStatus | string;
  createdAt: string;
  updatedAt?: string | null;
  completedAt?: string | null;
  readyAtValues?: Array<string | null | undefined>;
  servedAtValues?: Array<string | null | undefined>;
};

const getLatestTimestamp = (
  values: Array<string | null | undefined>,
): string | null => {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
};

export const normalizeOrderPaymentMethod = (
  value?: string | null,
): OrderPaymentMethod => {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "cash") return "cash";
  if (normalized === "qris" || normalized === "scan") return "qris";
  if (
    normalized === "card" ||
    normalized === "credit" ||
    normalized === "debit"
  ) {
    return "card";
  }

  return "unknown";
};

export const getOrderPaymentLabel = (value?: string | null): string => {
  const method = normalizeOrderPaymentMethod(value);
  if (method === "cash") return "Cash";
  if (method === "qris") return "QRIS";
  if (method === "card") return "Card";
  return "Not recorded";
};

export const getOrderOperationalTimestamp = ({
  status,
  createdAt,
  updatedAt,
  completedAt,
  readyAtValues = [],
  servedAtValues = [],
}: OperationalTimestampInput) => {
  const latestReadyAt = getLatestTimestamp(readyAtValues);
  const latestServedAt = getLatestTimestamp(servedAtValues);

  let timestamp = createdAt;
  let label = "Ordered";

  if (status === "completed") {
    timestamp = completedAt || latestServedAt || updatedAt || createdAt;
    label = "Completed";
  } else if (status === "served" || status === "partially-served") {
    timestamp = latestServedAt || updatedAt || createdAt;
    label = status === "served" ? "Served" : "Last served";
  } else if (status === "ready") {
    timestamp = latestReadyAt || updatedAt || createdAt;
    label = "Ready";
  } else if (status === "preparing") {
    timestamp = updatedAt || createdAt;
    label = "Processing";
  }

  const parsedTimestamp = parseSupabaseTimestamp(timestamp);

  return {
    timestamp,
    label,
    date: formatJakartaDate(parsedTimestamp),
    time: formatJakartaTime(parsedTimestamp),
  };
};

