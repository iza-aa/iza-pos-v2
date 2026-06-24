import type { StaffType, UserRole } from "./auth";
import {
  normalizeStaffPosition,
  normalizeStaffPositions,
  type StaffPosition,
} from "@/lib/staff/positions";

export type ActiveStaffType = Exclude<StaffType, null>;

const STAFF_HOME_PATH: Record<ActiveStaffType, string> = {
  cashier: "/staff/pos",
  waiter: "/staff/attendance",
  barista: "/staff/stock-check",
  kitchen: "/staff/kitchen",
};

export function normalizeStaffType(value?: string | null): ActiveStaffType | null {
  return normalizeStaffPosition(value);
}

export function resolveStaffPositions({
  positions,
  staffType,
}: {
  positions?: unknown;
  staffType?: string | null;
}) {
  const normalizedPositions = normalizeStaffPositions(positions);
  const legacyPosition = normalizeStaffType(staffType);

  if (legacyPosition && !normalizedPositions.includes(legacyPosition)) {
    normalizedPositions.push(legacyPosition);
  }

  return normalizedPositions;
}

export function hasStaffPosition({
  position,
  positions,
  staffType,
}: {
  position: StaffPosition;
  positions?: unknown;
  staffType?: string | null;
}) {
  return resolveStaffPositions({ positions, staffType }).includes(position);
}

export function getStaffHomePath(
  positions?: unknown,
  staffType?: string | null,
) {
  const legacyStaffType =
    typeof positions === "string" && staffType === undefined
      ? positions
      : staffType;
  const resolvedPositions = resolveStaffPositions({
    positions: Array.isArray(positions) ? positions : undefined,
    staffType: legacyStaffType,
  });
  const priority: StaffPosition[] = ["cashier", "kitchen", "barista", "waiter"];
  const primary = priority.find((position) => resolvedPositions.includes(position));

  return primary ? STAFF_HOME_PATH[primary] : "/staff/attendance";
}

export function canAccessOrder({
  role,
  positions,
  staffType,
}: {
  role?: UserRole | string | null;
  positions?: unknown;
  staffType?: string | null;
}) {
  if (role === "owner") return true;
  return hasStaffPosition({ position: "cashier", positions, staffType });
}

export function canUpdateStaffOrders({
  role,
  positions,
  staffType,
}: {
  role?: UserRole | string | null;
  positions?: unknown;
  staffType?: string | null;
}) {
  return canAccessOrder({ role, positions, staffType });
}

export function canAccessStaffPath({
  path,
  role,
  positions,
  staffType,
}: {
  path: string;
  role?: UserRole | string | null;
  positions?: unknown;
  staffType?: string | null;
}) {
  if (role === "owner") return true;

  const resolvedPositions = resolveStaffPositions({ positions, staffType });
  if (resolvedPositions.length === 0) return false;

  if (path.startsWith("/staff/login")) return true;
  if (path.startsWith("/staff/profile")) return true;
  if (path.startsWith("/staff/attendance")) return true;
  if (path.startsWith("/staff/order")) {
    return resolvedPositions.includes("cashier");
  }
  if (path.startsWith("/staff/pos")) {
    return resolvedPositions.includes("cashier");
  }
  if (path.startsWith("/staff/kitchen")) {
    return resolvedPositions.includes("kitchen");
  }
  if (path.startsWith("/staff/stock-check")) {
    return (
      resolvedPositions.includes("barista") ||
      resolvedPositions.includes("kitchen")
    );
  }

  return false;
}

export function canAccessEndShift({
  role,
  positions,
  staffType,
}: {
  role?: UserRole | string | null;
  positions?: unknown;
  staffType?: string | null;
}) {
  if (role === "owner") return true;
  return hasStaffPosition({ position: "cashier", positions, staffType });
}
