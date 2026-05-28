"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import { getCurrentUser } from "@/lib/utils";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ClockIcon,
  ClipboardDocumentCheckIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

type CurrentUser = {
  id?: string;
  name?: string;
  role?: string;
  staff_code?: string;
  staff_type?: string | null;
};

type ShiftRecord = {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  check_in_grace_until?: string | null;
  check_out_grace_until?: string | null;
};

type StaffRecord = {
  id: string;
  name: string;
  staff_code: string;
  role: string;
  status: string;
  staff_type?: string | null;
  shift_id: string | null;
  profile_picture?: string | null;
  shift?: ShiftRecord | ShiftRecord[] | null;
};

type AttendanceRecord = {
  id: string;
  staff_id: string;
  shift_id: string | null;
  attendance_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  check_in_status: string | null;
  check_out_status: string | null;
  clock_in_distance_meters?: number | string | null;
  clock_out_distance_meters?: number | string | null;
};

type OrderRecord = Record<string, unknown> & {
  id?: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  order_number?: string | null;
  orderNumber?: string | null;
  table_number?: string | number | null;
  tableNumber?: string | number | null;
  table_id?: string | null;
  total_amount?: number | string | null;
  totalAmount?: number | string | null;
  grand_total?: number | string | null;
  fulfillment_method?: string | null;
  fulfillmentMethod?: string | null;
  order_source?: string | null;
  orderSource?: string | null;
  pickup_code?: string | null;
  pickupCode?: string | null;
};

type DashboardData = {
  staff: StaffRecord | null;
  attendance: AttendanceRecord | null;
  orders: OrderRecord[];
};

const EMPTY_DASHBOARD_DATA: DashboardData = {
  staff: null,
  attendance: null,
  orders: [],
};

const describeSupabaseError = (error: unknown) => {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = record.message || record.details || record.hint || record.code;
    if (message) return String(message);

    try {
      const serialized = JSON.stringify(error);
      return serialized && serialized !== "{}" ? serialized : "Unknown Supabase error";
    } catch {
      return "Unknown Supabase error";
    }
  }

  return String(error);
};

const ORDER_ACTIVE_STATUSES = new Set(["new", "preparing", "partially-served", "partially served"]);
const ORDER_COMPLETED_STATUSES = new Set(["completed", "served"]);

const getJakartaDate = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
};

const addDays = (dateString: string, days: number) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

const getGreeting = () => {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  if (hour < 11) return "Good morning";
  if (hour < 15) return "Good afternoon";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const formatDateLabel = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

const formatTime = (value?: string | null) => {
  if (!value) return "-";

  if (/^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }

  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const normalizeStatus = (status?: string | null) => {
  return (status || "unknown").toLowerCase().replace(/_/g, "-").trim();
};

const getStatusLabel = (status?: string | null) => {
  const normalized = normalizeStatus(status);

  if (normalized === "new") return "New Order";
  if (normalized === "preparing") return "On Process";
  if (normalized === "partially-served" || normalized === "partially served") return "Partially Served";
  if (normalized === "served") return "Served";
  if (normalized === "completed") return "Completed";

  return "Unknown";
};

const getOrderNumber = (order: OrderRecord, index: number) => {
  return String(order.order_number || order.orderNumber || `Order #${index + 1}`);
};

const getOrderTotal = (order: OrderRecord) => {
  const rawValue = order.total_amount ?? order.totalAmount ?? order.grand_total ?? 0;
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getOrderLocation = (order: OrderRecord) => {
  const method = String(
    order.fulfillment_method || order.fulfillmentMethod || order.order_source || order.orderSource || "",
  ).toLowerCase();
  const pickupCode = order.pickup_code || order.pickupCode;
  const tableNumber = order.table_number || order.tableNumber;

  if (method.includes("pickup") || pickupCode) {
    return pickupCode ? `Pickup ${pickupCode}` : "Pickup";
  }

  if (tableNumber) return `Table ${tableNumber}`;
  return "Dine In";
};

const getSingleShift = (shift?: ShiftRecord | ShiftRecord[] | null) => {
  if (Array.isArray(shift)) return shift[0] || null;
  return shift || null;
};

const getStaffTypeLabel = (value?: string | null) => {
  if (!value) return "Staff";
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getAttendanceStatus = (attendance: AttendanceRecord | null) => {
  if (!attendance?.clock_in_at) {
    return {
      label: "Not Clocked In",
      subtitle: "Please clock in before starting work",
      badge: "Pending",
    };
  }

  if (attendance.clock_in_at && !attendance.clock_out_at) {
    return {
      label: "Currently Working",
      subtitle: `Clock in ${formatTime(attendance.clock_in_at)}`,
      badge: "Active",
    };
  }

  return {
    label: "Attendance Completed",
    subtitle: `${formatTime(attendance.clock_in_at)} - ${formatTime(attendance.clock_out_at)}`,
    badge: "Completed",
  };
};

const MetricCard = ({
  title,
  value,
  subtitle,
  badge,
  icon: Icon,
  iconBg = "bg-gray-100",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  badge?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconBg?: string;
}) => {
  return (
    <div className="w-full rounded-2xl border border-gray-300 bg-gray-100 p-0.75 transition-shadow hover:shadow-lg">
      <div className="mb-3 rounded-xl border border-gray-300 bg-white p-3 md:p-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className={`${iconBg} rounded-xl p-2 md:p-3`}>
            <Icon className="h-5 w-5 text-gray-800 md:h-6 md:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <p className="text-xs text-gray-500 md:text-sm">{title}</p>
              {badge ? (
                <span className="rounded-md bg-[#B2FF5E] px-1.5 py-0.5 text-[10px] font-semibold text-[#166534] md:text-xs">
                  {badge}
                </span>
              ) : null}
            </div>
            <span className="block truncate text-lg font-bold text-gray-900 md:text-xl">{value}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-2 pb-2">
        <span className="truncate text-xs text-gray-600 md:text-sm">{subtitle}</span>
        <ArrowUpRightIcon className="h-3 w-3 shrink-0 text-gray-400 md:h-4 md:w-4" />
      </div>
    </div>
  );
};

const SectionCard = ({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => {
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-500 md:text-sm">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
    </div>
  );
};

export default function StaffDashboardPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const today = useMemo(() => getJakartaDate(), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);

  const fetchDashboardData = useCallback(
    async (staffId: string, showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      setError("");

      try {
        const staffResult = await supabase
          .from("staff")
          .select("id, name, staff_code, role, status, staff_type, shift_id, profile_picture")
          .eq("id", staffId)
          .maybeSingle();

        if (staffResult.error) {
          throw new Error(describeSupabaseError(staffResult.error));
        }

        const staff = (staffResult.data || null) as StaffRecord | null;

        let shift: ShiftRecord | null = null;
        if (staff?.shift_id) {
          const shiftResult = await supabase
            .from("shifts")
            .select("id, shift_name, start_time, end_time, check_in_grace_until, check_out_grace_until")
            .eq("id", staff.shift_id)
            .maybeSingle();

          if (shiftResult.error) {
            console.warn("Failed to load staff shift:", describeSupabaseError(shiftResult.error));
          } else {
            shift = (shiftResult.data || null) as ShiftRecord | null;
          }
        }

        const attendanceResult = await supabase
          .from("attendance")
          .select(
            "id, staff_id, shift_id, attendance_date, clock_in_at, clock_out_at, check_in_status, check_out_status, clock_in_distance_meters, clock_out_distance_meters",
          )
          .eq("staff_id", staffId)
          .eq("attendance_date", today)
          .maybeSingle();

        if (attendanceResult.error) {
          console.warn("Failed to load staff attendance:", describeSupabaseError(attendanceResult.error));
        }

        const ordersResult = await supabase
          .from("orders")
          .select("*")
          .gte("created_at", `${today}T00:00:00`)
          .lt("created_at", `${tomorrow}T00:00:00`)
          .order("created_at", { ascending: false });

        if (ordersResult.error) {
          console.warn("Failed to load staff dashboard orders:", describeSupabaseError(ordersResult.error));
        }

        setDashboardData({
          staff: staff ? ({ ...staff, shift } as StaffRecord) : null,
          attendance: (attendanceResult.data || null) as AttendanceRecord | null,
          orders: (ordersResult.data || []) as OrderRecord[],
        });
      } catch (fetchError) {
        console.error("Failed to load staff dashboard:", describeSupabaseError(fetchError));
        setError("Failed to load dashboard data. Check the connection and try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [today, tomorrow],
  );

  useEffect(() => {
    const initializePage = async () => {
      const user = getCurrentUser() as CurrentUser | null;

      if (!user) {
        window.location.href = "/staff/login";
        return;
      }

      if (user.role === "manager") {
        window.location.href = "/manager/dashboard";
        return;
      }

      if (user.role === "owner") {
        window.location.href = "/owner/dashboard";
        return;
      }

      if (user.role !== "staff") {
        localStorage.clear();
        window.location.href = "/staff/login";
        return;
      }

      if (!user.id) {
        localStorage.clear();
        window.location.href = "/staff/login";
        return;
      }

      const { data, error: userError } = await supabase
        .from("staff")
        .select("id, name, status, role, staff_code, staff_type, profile_picture")
        .eq("id", user.id)
        .eq("role", "staff")
        .maybeSingle();

      if (userError) {
        console.error("Failed to validate staff user:", describeSupabaseError(userError));
        localStorage.clear();
        window.location.href = "/staff/login";
        return;
      }

      if (!data || data.status !== "active") {
        localStorage.clear();
        window.location.href = "/staff/login";
        return;
      }

      localStorage.setItem("user_name", data.name || user.name || "Staff");
      localStorage.setItem("staff_code", data.staff_code || user.staff_code || "");
      localStorage.setItem("staff_type", data.staff_type || user.staff_type || "");
      localStorage.setItem("profile_picture", data.profile_picture || "");

      setCurrentUser({
        id: data.id,
        name: data.name || user.name,
        role: data.role || user.role,
        staff_code: data.staff_code || user.staff_code,
        staff_type: data.staff_type || user.staff_type || null,
      });

      await fetchDashboardData(data.id, false);
    };

    void initializePage();
  }, [fetchDashboardData]);

  const metrics = useMemo(() => {
    const activeOrders = dashboardData.orders.filter((order) => ORDER_ACTIVE_STATUSES.has(normalizeStatus(order.status)));
    const completedOrders = dashboardData.orders.filter((order) => ORDER_COMPLETED_STATUSES.has(normalizeStatus(order.status)));
    const newOrders = dashboardData.orders.filter((order) => normalizeStatus(order.status) === "new");
    const preparingOrders = dashboardData.orders.filter((order) => normalizeStatus(order.status) === "preparing");
    const partiallyServedOrders = dashboardData.orders.filter((order) => {
      const status = normalizeStatus(order.status);
      return status === "partially-served" || status === "partially served";
    });
    const revenue = dashboardData.orders
      .filter((order) => ORDER_COMPLETED_STATUSES.has(normalizeStatus(order.status)))
      .reduce((total, order) => total + getOrderTotal(order), 0);

    return {
      activeOrders,
      activeOrderCount: activeOrders.length,
      completedOrderCount: completedOrders.length,
      newOrderCount: newOrders.length,
      preparingOrderCount: preparingOrders.length,
      partiallyServedOrderCount: partiallyServedOrders.length,
      revenue,
    };
  }, [dashboardData.orders]);

  const attendanceStatus = useMemo(
    () => getAttendanceStatus(dashboardData.attendance),
    [dashboardData.attendance],
  );

  const shift = useMemo(() => getSingleShift(dashboardData.staff?.shift), [dashboardData.staff?.shift]);

  const alertItems = useMemo(() => {
    const alerts: Array<{ title: string; description: string; toneClass: string }> = [];

    if (!dashboardData.staff?.shift_id) {
      alerts.push({
        title: "Shift is not assigned",
        description: "Contact the manager if you do not have an active shift.",
        toneClass: "border-red-200 bg-red-50",
      });
    }

    if (!dashboardData.attendance?.clock_in_at) {
      alerts.push({
        title: "Not clocked in",
        description: "Clock in before starting work.",
        toneClass: "border-amber-200 bg-amber-50",
      });
    }

    if (dashboardData.attendance?.clock_in_at && !dashboardData.attendance.clock_out_at) {
      alerts.push({
        title: "Clock out is not done yet",
        description: "Remember to clock out after finishing your shift.",
        toneClass: "border-blue-200 bg-blue-50",
      });
    }

    if (metrics.newOrderCount > 0) {
      alerts.push({
        title: `${metrics.newOrderCount} new orders are waiting to be processed`,
        description: "Open the order page to help process orders.",
        toneClass: "border-amber-200 bg-amber-50",
      });
    }

    if (metrics.partiallyServedOrderCount > 0) {
      alerts.push({
        title: `${metrics.partiallyServedOrderCount} partially served orders`,
        description: "Make sure the remaining items are completed soon.",
        toneClass: "border-blue-200 bg-blue-50",
      });
    }

    return alerts;
  }, [dashboardData.attendance, dashboardData.staff?.shift_id, metrics.newOrderCount, metrics.partiallyServedOrderCount]);

  const recentActiveOrders = metrics.activeOrders.slice(0, 8);
  const isCashier = String(currentUser?.staff_type || dashboardData.staff?.staff_type || "").toLowerCase() === "cashier";

  return (
    <main className="h-[calc(100vh-64px)] overflow-hidden bg-gray-100">
      <section className="flex h-full w-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-col gap-3 bg-white p-7 border-b border-gray-200 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              {getGreeting()}, {currentUser?.name || "Staff"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {formatDateLabel(today)} • {getStaffTypeLabel(currentUser?.staff_type)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => currentUser?.id && fetchDashboardData(currentUser.id, true)}
            disabled={refreshing || loading || !currentUser?.id}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 text-gray-700 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="mx-6 shrink-0 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid shrink-0 grid-cols-2 gap-3 px-6 xl:grid-cols-4">
          <MetricCard
            title="Attendance Status"
            value={attendanceStatus.label}
            subtitle={attendanceStatus.subtitle}
            badge={attendanceStatus.badge}
            icon={ClipboardDocumentCheckIcon}
            iconBg={dashboardData.attendance?.clock_in_at ? "bg-green-100" : "bg-amber-100"}
          />
          <MetricCard
            title="Today's Shift"
            value={shift?.shift_name || "Pending"}
            subtitle={shift ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}` : "Shift is not assigned"}
            icon={ClockIcon}
            iconBg={shift ? "bg-blue-100" : "bg-red-100"}
          />
          <MetricCard
            title="Order Active"
            value={metrics.activeOrderCount}
            subtitle="New, on process, partially served"
            icon={ShoppingBagIcon}
            iconBg="bg-purple-100"
          />
          <MetricCard
            title="Completed Hari Ini"
            value={metrics.completedOrderCount}
            subtitle={formatCurrency(metrics.revenue)}
            icon={CheckCircleIcon}
            iconBg="bg-green-100"
          />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-6 pb-2 xl:grid-cols-3">
          <SectionCard
            title="Today's Activity"
            subtitle="Your shift and attendance status."
            action={
              <a href="/staff/attendance" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
                Attendance
              </a>
            }
          >
            <div className="space-y-2">
              <div className="rounded-lg bg-gray-100 p-3">
                <p className="text-xs text-gray-500">Staff ID</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{currentUser?.staff_code || "-"}</p>
              </div>
              <div className="rounded-lg bg-gray-100 p-3">
                <p className="text-xs text-gray-500">Shift</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{shift?.shift_name || "No Shift Assigned"}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {shift ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}` : "Contact the manager to set up your shift."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-gray-100 p-3">
                  <p className="text-xs text-gray-500">Clock In</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{formatTime(dashboardData.attendance?.clock_in_at)}</p>
                </div>
                <div className="rounded-lg bg-gray-100 p-3">
                  <p className="text-xs text-gray-500">Clock Out</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{formatTime(dashboardData.attendance?.clock_out_at)}</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-100 p-3">
                <p className="text-xs text-gray-500">Status</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{attendanceStatus.label}</p>
                <p className="mt-1 text-xs text-gray-500">{attendanceStatus.subtitle}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Order Active"
            subtitle="Orders that need monitoring."
            action={
              <a href="/staff/order" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
                View orders
              </a>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-gray-100 p-3">
                <p className="text-xs text-gray-500">New Order</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{metrics.newOrderCount}</p>
              </div>
              <div className="rounded-lg bg-gray-100 p-3">
                <p className="text-xs text-gray-500">On Process</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{metrics.preparingOrderCount}</p>
              </div>
              <div className="rounded-lg bg-gray-100 p-3">
                <p className="text-xs text-gray-500">Partially Served</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{metrics.partiallyServedOrderCount}</p>
              </div>
              <div className="rounded-lg bg-gray-100 p-3">
                <p className="text-xs text-gray-500">Completed</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{metrics.completedOrderCount}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {loading ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500">
                  Loading orders...
                </div>
              ) : recentActiveOrders.length > 0 ? (
                recentActiveOrders.map((order, index) => (
                  <div key={String(order.id || index)} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{getOrderNumber(order, index)}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {getOrderLocation(order)} • {formatTime(order.created_at)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500">
                  No active orders right now.
                </div>
              )}
            </div>
          </SectionCard>

          {isCashier ? (
            <SectionCard
              title="End Shift"
              subtitle="Count physical cash before owner closing."
              action={<BanknotesIcon className="h-5 w-5 text-gray-700" />}
            >
              <div className="flex h-full flex-col">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white p-2 shadow-sm">
                      <BanknotesIcon className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-950">Blind Cash Count</p>
                      <p className="mt-1 text-xs leading-5 text-blue-800">
                        Enter the total physical cash in the drawer. Expected cash is hidden until submit.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-gray-100 p-3">
                    <p className="text-xs text-gray-500">Shift</p>
                    <p className="mt-1 truncate text-base font-bold text-gray-900">{shift?.shift_name || "Pending"}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {shift ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}` : "Contact manager"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-100 p-3">
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="mt-1 text-base font-bold text-gray-900">{today}</p>
                    <p className="mt-1 text-xs text-gray-500">Business date</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {dashboardData.attendance?.clock_out_at ? "Ready to submit cash closing" : "Submit after the shift ends"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    Make sure cash has not been mixed with the next shift drawer.
                  </p>
                </div>

                <a
                  href="/staff/attendance"
                  className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white transition hover:bg-gray-800"
                >
                  Open Attendance
                  <ArrowRightIcon className="h-4 w-4" />
                </a>
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              title="Work Notes"
              subtitle="Items to watch today."
              action={<BellAlertIcon className="h-5 w-5 text-gray-700" />}
            >
              {loading ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500">
                  Loading notes...
                </div>
              ) : alertItems.length > 0 ? (
                <div className="space-y-2">
                  {alertItems.map((item, index) => (
                    <div key={index} className={`rounded-lg border p-3 ${item.toneClass}`}>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-600">{item.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-gray-700">
                  All clear. There are no important notes right now.
                </div>
              )}
            </SectionCard>
          )}
        </div>
      </section>
    </main>
  );
}
