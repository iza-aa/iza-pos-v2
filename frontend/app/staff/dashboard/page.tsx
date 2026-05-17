"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/config/supabaseClient";
import { getCurrentUser } from "@/lib/utils";
import {
  ArrowPathIcon,
  ArrowUpRightIcon,
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
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
};

const formatDateLabel = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
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

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
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
      label: "Belum Clock In",
      subtitle: "Silakan lakukan absensi sebelum mulai bekerja",
      badge: "Belum",
    };
  }

  if (attendance.clock_in_at && !attendance.clock_out_at) {
    return {
      label: "Sedang Bekerja",
      subtitle: `Clock in ${formatTime(attendance.clock_in_at)}`,
      badge: "Aktif",
    };
  }

  return {
    label: "Absensi Selesai",
    subtitle: `${formatTime(attendance.clock_in_at)} - ${formatTime(attendance.clock_out_at)}`,
    badge: "Selesai",
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
            console.warn("Gagal memuat shift staff:", describeSupabaseError(shiftResult.error));
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
          console.warn("Gagal memuat presensi staff:", describeSupabaseError(attendanceResult.error));
        }

        const ordersResult = await supabase
          .from("orders")
          .select("*")
          .gte("created_at", `${today}T00:00:00`)
          .lt("created_at", `${tomorrow}T00:00:00`)
          .order("created_at", { ascending: false });

        if (ordersResult.error) {
          console.warn("Gagal memuat order staff dashboard:", describeSupabaseError(ordersResult.error));
        }

        setDashboardData({
          staff: staff ? ({ ...staff, shift } as StaffRecord) : null,
          attendance: (attendanceResult.data || null) as AttendanceRecord | null,
          orders: (ordersResult.data || []) as OrderRecord[],
        });
      } catch (fetchError) {
        console.error("Gagal memuat dashboard staff:", describeSupabaseError(fetchError));
        setError("Gagal memuat data dashboard. Periksa koneksi lalu coba lagi.");
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
        console.error("Gagal validasi user staff:", describeSupabaseError(userError));
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
        title: "Shift belum ditentukan",
        description: "Hubungi manager jika kamu belum memiliki shift aktif.",
        toneClass: "border-red-200 bg-red-50",
      });
    }

    if (!dashboardData.attendance?.clock_in_at) {
      alerts.push({
        title: "Belum clock in",
        description: "Lakukan absensi sebelum mulai bekerja.",
        toneClass: "border-amber-200 bg-amber-50",
      });
    }

    if (dashboardData.attendance?.clock_in_at && !dashboardData.attendance.clock_out_at) {
      alerts.push({
        title: "Clock out belum dilakukan",
        description: "Jangan lupa clock out setelah selesai shift.",
        toneClass: "border-blue-200 bg-blue-50",
      });
    }

    if (metrics.newOrderCount > 0) {
      alerts.push({
        title: `${metrics.newOrderCount} order baru menunggu diproses`,
        description: "Buka halaman order untuk membantu proses pesanan.",
        toneClass: "border-amber-200 bg-amber-50",
      });
    }

    if (metrics.partiallyServedOrderCount > 0) {
      alerts.push({
        title: `${metrics.partiallyServedOrderCount} order partially served`,
        description: "Pastikan item yang tersisa segera diselesaikan.",
        toneClass: "border-blue-200 bg-blue-50",
      });
    }

    return alerts;
  }, [dashboardData.attendance, dashboardData.staff?.shift_id, metrics.newOrderCount, metrics.partiallyServedOrderCount]);

  const recentActiveOrders = metrics.activeOrders.slice(0, 8);

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
            {refreshing ? "Memuat..." : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="mx-6 shrink-0 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid shrink-0 grid-cols-2 gap-3 px-6 xl:grid-cols-4">
          <MetricCard
            title="Status Presensi"
            value={attendanceStatus.label}
            subtitle={attendanceStatus.subtitle}
            badge={attendanceStatus.badge}
            icon={ClipboardDocumentCheckIcon}
            iconBg={dashboardData.attendance?.clock_in_at ? "bg-green-100" : "bg-amber-100"}
          />
          <MetricCard
            title="Shift Hari Ini"
            value={shift?.shift_name || "Belum Ada"}
            subtitle={shift ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}` : "Shift belum ditentukan"}
            icon={ClockIcon}
            iconBg={shift ? "bg-blue-100" : "bg-red-100"}
          />
          <MetricCard
            title="Order Aktif"
            value={metrics.activeOrderCount}
            subtitle="New, on process, partially served"
            icon={ShoppingBagIcon}
            iconBg="bg-purple-100"
          />
          <MetricCard
            title="Selesai Hari Ini"
            value={metrics.completedOrderCount}
            subtitle={formatCurrency(metrics.revenue)}
            icon={CheckCircleIcon}
            iconBg="bg-green-100"
          />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-6 pb-2 xl:grid-cols-3">
          <SectionCard
            title="Aktivitas Hari Ini"
            subtitle="Status shift dan presensi kamu."
            action={
              <a href="/staff/attendance" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
                Absensi
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
                <p className="mt-1 text-lg font-bold text-gray-900">{shift?.shift_name || "Belum Ada Shift"}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {shift ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}` : "Hubungi manager untuk pengaturan shift."}
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
            title="Order Aktif"
            subtitle="Daftar order yang perlu dipantau."
            action={
              <a href="/staff/order" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
                Lihat order
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
                  Memuat order...
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
                  Tidak ada order aktif saat ini.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Catatan Kerja"
            subtitle="Hal yang perlu diperhatikan hari ini."
            action={<BellAlertIcon className="h-5 w-5 text-gray-700" />}
          >
            {loading ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500">
                Memuat catatan...
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
                Semua aman. Tidak ada catatan penting untuk saat ini.
              </div>
            )}
          </SectionCard>
        </div>
      </section>
    </main>
  );
}