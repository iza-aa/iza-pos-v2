import type { StaffType, UserRole } from "./auth";

export type ActiveStaffType = Exclude<StaffType, null>;

const STAFF_HOME_PATH: Record<ActiveStaffType, string> = {
  cashier: "/staff/pos",
  waiter: "/staff/order",
  barista: "/staff/order",
  kitchen: "/staff/kitchen",
};

const ORDER_UPDATE_STAFF_TYPES = new Set<ActiveStaffType>(["cashier", "waiter"]);

export function normalizeStaffType(value?: string | null): ActiveStaffType | null {
  if (value === "cashier") return "cashier";
  if (value === "waiter" || value === "server") return "waiter";
  if (value === "barista") return "barista";
  if (value === "kitchen") return "kitchen";
  return null;
}

export function getStaffHomePath(staffType?: string | null) {
  const normalizedStaffType = normalizeStaffType(staffType);
  return normalizedStaffType
    ? STAFF_HOME_PATH[normalizedStaffType]
    : "/staff/attendance";
}

export function canUpdateStaffOrders({
  role,
  staffType,
}: {
  role?: UserRole | string | null;
  staffType?: string | null;
}) {
  if (role === "owner") return true;

  const normalizedStaffType = normalizeStaffType(staffType);
  return normalizedStaffType
    ? ORDER_UPDATE_STAFF_TYPES.has(normalizedStaffType)
    : false;
}

export function canAccessStaffPath({
  path,
  role,
  staffType,
}: {
  path: string;
  role?: UserRole | string | null;
  staffType?: string | null;
}) {
  if (role === "owner") return true;

  const normalizedStaffType = normalizeStaffType(staffType);
  if (!normalizedStaffType) return false;

  if (path.startsWith("/staff/login")) return true;
  if (path.startsWith("/staff/profile")) return true;
  if (path.startsWith("/staff/attendance")) return true;
  if (path.startsWith("/staff/order")) return true;
  if (path.startsWith("/staff/pos")) return normalizedStaffType === "cashier";
  if (path.startsWith("/staff/kitchen")) return normalizedStaffType === "kitchen";
  if (path.startsWith("/staff/stock-check")) {
    return normalizedStaffType === "barista" || normalizedStaffType === "kitchen";
  }

  return false;
}

export function canAccessEndShift({
  role,
  staffType,
}: {
  role?: UserRole | string | null;
  staffType?: string | null;
}) {
  if (role === "owner") return true;
  return normalizeStaffType(staffType) === "cashier";
}
