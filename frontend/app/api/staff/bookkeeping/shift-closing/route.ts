import { NextRequest, NextResponse } from "next/server";
import {
  assertBookkeepingDatesAreOpen,
  createBookkeepingSupabaseClient,
} from "@/lib/services/bookkeeping/bookkeepingServer";
import type { SupabaseClient } from "@supabase/supabase-js";

type StaffRow = {
  id: string;
  name: string;
  staff_code?: string | null;
  role?: string | null;
  status?: string | null;
};

type ShiftRow = {
  id: string;
  shift_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  check_out_grace_until?: string | null;
  is_active?: boolean | null;
};

type OrderRow = {
  id: string;
  order_number?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  subtotal?: number | string | null;
  discount?: number | string | null;
  total?: number | string | null;
  created_by?: string | null;
};

type ClosingRow = {
  id: string;
  business_date: string;
  shift_id?: string | null;
  shift_name: string;
  opened_at?: string | null;
  closed_at?: string | null;
  gross_sales: number | string;
  discount_total: number | string;
  net_sales: number | string;
  opening_cash?: number | string | null;
  opening_cash_actual?: number | string | null;
  opening_variance?: number | string | null;
  opening_variance_note?: string | null;
  previous_shift_id?: string | null;
  cash_expected: number | string;
  expected_drawer_cash?: number | string | null;
  cash_counted?: number | string | null;
  cash_difference?: number | string | null;
  cash_to_deposit?: number | string | null;
  closing_float?: number | string | null;
  actual_closing_float?: number | string | null;
  float_policy?: "carry_float" | "new_float" | "deposit_all" | null;
  non_cash_sales: number | string;
  cancelled_count: number;
  status: "open" | "draft" | "needs_review" | "submitted" | "closed" | "reopened";
  notes?: string | null;
  snapshot_json?: Record<string, unknown>;
};

type SubmitShiftClosingRequest = {
  businessDate?: string;
  cashCounted?: number | string | null;
  notes?: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Staff",
  role: request.headers.get("x-user-role") ?? "",
});

const mapStaffOption = (staff: StaffRow) => ({
  id: staff.id,
  name: staff.name,
  staffCode: staff.staff_code,
  role: staff.role,
});

const loadAssignedShiftId = async ({
  businessDate,
  staffId,
  supabase,
}: {
  businessDate: string;
  staffId: string;
  supabase: ReturnType<typeof createBookkeepingSupabaseClient>;
}) => {
  const { data: weeklyData, error: weeklyError } = await supabase
    .from("staff_shift_weekly_assignments")
    .select("shift_id, status")
    .eq("staff_id", staffId)
    .eq("weekday", getIsoWeekday(businessDate))
    .eq("status", "assigned")
    .maybeSingle();

  const { data, error } = await supabase
    .from("staff_shift_daily_assignments")
    .select("shift_id, status")
    .eq("staff_id", staffId)
    .eq("work_date", businessDate)
    .in("status", ["assigned", "completed"])
    .maybeSingle();

  if (!error && data?.shift_id) return String(data.shift_id);
  if (!weeklyError && weeklyData?.shift_id) return String(weeklyData.shift_id);
  return null;
};

const getJakartaDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const getJakartaTime = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${hour}:${minute}`;
};

const toMinutes = (value?: string | null) => {
  const [hourText, minuteText] = String(value || "").slice(0, 5).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return (hour % 24) * 60 + minute;
};

const addMinutes = (value: number, minutes: number) => (value + minutes) % (24 * 60);
const END_SHIFT_SUBMISSION_BUFFER_MINUTES = 6 * 60;

const getIsoWeekday = (businessDate: string) => {
  const [year, month, day] = businessDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
};

const isTimeInWindow = (time: number, start: number, end: number) => {
  if (start <= end) return time >= start && time <= end;
  return time >= start || time <= end;
};

const getShiftClosingWindow = (shift: ShiftRow) => {
  const start = toMinutes(shift.start_time) ?? 0;
  const end = toMinutes(shift.end_time) ?? (23 * 60 + 59);
  const checkoutGraceEnd = toMinutes(shift.check_out_grace_until) ?? end;
  const graceEnd = addMinutes(checkoutGraceEnd, END_SHIFT_SUBMISSION_BUFFER_MINUTES);

  return { start, end: graceEnd };
};

const getShiftWindowLabel = (shift: ShiftRow) => {
  const startTime = String(shift.start_time || "00:00").slice(0, 5);
  const end = toMinutes(shift.check_out_grace_until || shift.end_time) ?? (23 * 60 + 59);
  const extendedEnd = addMinutes(end, END_SHIFT_SUBMISSION_BUFFER_MINUTES);
  const endTime = `${String(Math.floor(extendedEnd / 60)).padStart(2, "0")}:${String(extendedEnd % 60).padStart(2, "0")}`;

  return `${startTime} - ${endTime}`;
};

const validateShiftClosingWindow = ({
  businessDate,
  shift,
}: {
  businessDate: string;
  shift: ShiftRow;
}) => {
  if (businessDate !== getJakartaDate()) return null;

  const currentTime = toMinutes(getJakartaTime());
  if (currentTime === null) return null;

  const window = getShiftClosingWindow(shift);
  if (isTimeInWindow(currentTime, window.start, window.end)) return null;

  return NextResponse.json(
    {
      error: `${shift.shift_name || "Assigned shift"} is outside its end-shift window (${getShiftWindowLabel(shift)}). Ask the owner or manager to assign the correct active shift before ending the shift.`,
    },
    { status: 409 },
  );
};

const JAKARTA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

const toJakartaDateTime = (date: string, time: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - JAKARTA_UTC_OFFSET_MS).toISOString();
};

const toDateTimeStart = (date: string) => toJakartaDateTime(date, "00:00:00");
const toDateTimeEnd = (date: string) => toJakartaDateTime(date, "23:59:59");

const parseDatabaseTimestamp = (timestamp: string) => {
  const hasTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(timestamp);
  return new Date(hasTimeZone ? timestamp : `${timestamp}Z`);
};

const formatBusinessTime = (timestamp?: string | null) => {
  if (!timestamp) return "";

  const date = parseDatabaseTimestamp(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp.slice(11, 19);

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};

const isValidOrder = (order: OrderRow) => {
  const status = String(order.status || "").toLowerCase();
  const paymentStatus = String(order.payment_status || "").toLowerCase();

  return status !== "cancelled" && (paymentStatus === "paid" || toNumber(order.total) > 0);
};

const isCancelledOrder = (order: OrderRow) => {
  return String(order.status || "").toLowerCase() === "cancelled";
};

const isCashPayment = (order: OrderRow) => {
  return String(order.payment_method || "").toLowerCase() === "cash";
};

const isOrderInShift = (order: OrderRow, shift: ShiftRow) => {
  const orderTime = formatBusinessTime(order.completed_at || order.created_at).slice(0, 5);
  const startTime = String(shift.start_time || "00:00").slice(0, 5);
  const endTime = String(shift.end_time || "23:59").slice(0, 5);

  if (!orderTime) return false;
  if (startTime <= endTime) return orderTime >= startTime && orderTime <= endTime;
  return orderTime >= startTime || orderTime <= endTime;
};

const mapClosing = (closing: ClosingRow | null, revealCashExpected: boolean) => {
  if (!closing) return null;

  const cashCounted = closing.cash_counted === null || closing.cash_counted === undefined
    ? null
    : toNumber(closing.cash_counted);

  const openingCash = toNumber(closing.opening_cash);
  const openingCashActual = toNumber(closing.opening_cash_actual);
  const openingVariance = toNumber(closing.opening_variance);
  const openingVarianceNote = closing.opening_variance_note || null;
  const previousShiftId = closing.previous_shift_id || null;
  const actualClosingFloat = toNumber(closing.actual_closing_float);

  const cashSales = toNumber(closing.cash_expected);
  const expectedDrawerCash = toNumber(closing.expected_drawer_cash ?? (openingCash + cashSales));

  return {
    id: closing.id,
    businessDate: closing.business_date,
    shiftId: closing.shift_id,
    shiftName: closing.shift_name,
    openedAt: closing.opened_at,
    closedAt: closing.closed_at,
    grossSales: toNumber(closing.gross_sales),
    discountTotal: toNumber(closing.discount_total),
    netSales: toNumber(closing.net_sales),
    openingCash,
    openingCashActual,
    openingVariance,
    openingVarianceNote,
    previousShiftId,
    actualClosingFloat,
    cashExpected: revealCashExpected ? cashSales : null,
    expectedDrawerCash: revealCashExpected ? expectedDrawerCash : null,
    cashCounted,
    cashDifference: closing.cash_difference === null || closing.cash_difference === undefined
      ? null
      : toNumber(closing.cash_difference),
    cashToDeposit: toNumber(closing.cash_to_deposit ?? cashSales),
    closingFloat: toNumber(closing.closing_float),
    floatPolicy: closing.float_policy || "carry_float",
    nonCashSales: toNumber(closing.non_cash_sales),
    cancelledCount: closing.cancelled_count,
    status: closing.status,
    notes: closing.notes,
    snapshot_json: closing.snapshot_json,
  };
};

async function loadStaffShiftContext(request: NextRequest, businessDate: string) {
  const requester = getRequester(request);

  if (!requester.id || (requester.role !== "staff" && requester.role !== "owner")) {
    return { error: NextResponse.json({ error: "End shift access required." }, { status: 403 }) };
  }

  const supabase = createBookkeepingSupabaseClient();
  const requestedStaffId = request.nextUrl.searchParams.get("staffId") || "";

  if (requester.role === "owner") {
    const { data: staffOptionsData, error: staffOptionsError } = await supabase
      .from("staff")
      .select("id, name, staff_code, role, status")
      .eq("role", "staff")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (staffOptionsError) throw staffOptionsError;

    const staffOptions = (staffOptionsData || []) as StaffRow[];
    const staffRow = requestedStaffId
      ? staffOptions.find((staff) => staff.id === requestedStaffId) ?? null
      : staffOptions[0] ?? null;

    if (!staffRow) {
      return {
        error: NextResponse.json(
          { error: "No active staff with an assigned shift was found. Assign a staff member to a shift before using End Shift." },
          { status: 400 },
        ),
      };
    }

    const assignedShiftId = await loadAssignedShiftId({
      businessDate,
      staffId: staffRow.id,
      supabase,
    });

    if (!assignedShiftId) {
      return {
        error: NextResponse.json(
          { error: "Selected staff has no shift assignment for this business date. Assign the staff member to the correct shift before using End Shift." },
          { status: 400 },
        ),
      };
    }

    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("id, shift_name, start_time, end_time, check_out_grace_until, is_active")
      .eq("id", assignedShiftId)
      .maybeSingle();

    if (shiftError) throw shiftError;

    const shiftRow = shift as ShiftRow | null;

    if (!shiftRow || shiftRow.is_active === false) {
      return {
        error: NextResponse.json(
          { error: "Selected staff shift is inactive. Activate the shift or assign the staff member to another active shift." },
          { status: 400 },
        ),
      };
    }

    return {
      supabase,
      requester,
      staff: staffRow,
      shift: shiftRow,
      staffOptions: staffOptions.map(mapStaffOption),
    };
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, name, staff_code, role, status")
    .eq("id", requester.id)
    .eq("role", "staff")
    .maybeSingle();

  if (staffError) throw staffError;

  const staffRow = staff as StaffRow | null;

  if (!staffRow || staffRow.status !== "active") {
    return { error: NextResponse.json({ error: "Active staff account was not found." }, { status: 403 }) };
  }

  const assignedShiftId = await loadAssignedShiftId({
    businessDate,
    staffId: staffRow.id,
    supabase,
  });

  if (!assignedShiftId) {
    return {
      error: NextResponse.json(
        { error: "This staff account has no shift assignment for this business date. Ask the owner or manager to assign the correct shift before ending the shift." },
        { status: 400 },
      ),
    };
  }

  const { data: shift, error: shiftError } = await supabase
    .from("shifts")
    .select("id, shift_name, start_time, end_time, check_out_grace_until, is_active")
    .eq("id", assignedShiftId)
    .maybeSingle();

  if (shiftError) throw shiftError;

  const shiftRow = shift as ShiftRow | null;

  if (!shiftRow || shiftRow.is_active === false) {
    return {
      error: NextResponse.json(
        { error: "The assigned shift is inactive. Ask the owner or manager to activate the shift or assign the correct active shift." },
        { status: 400 },
      ),
    };
  }

  return { supabase, requester, staff: staffRow, shift: shiftRow, staffOptions: [] };
}

async function buildShiftSnapshot({
  businessDate,
  shift,
  supabase,
}: {
  businessDate: string;
  shift: ShiftRow;
  supabase: ReturnType<typeof createBookkeepingSupabaseClient>;
}) {
  const [ordersResult, dailyAssignmentsResult, weeklyAssignmentsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, created_at, completed_at, status, payment_status, payment_method, subtotal, discount, total, created_by")
      .gte("created_at", toDateTimeStart(businessDate))
      .lte("created_at", toDateTimeEnd(businessDate))
      .order("created_at", { ascending: true }),
    supabase
      .from("staff_shift_daily_assignments")
      .select("staff_id, shift_id, work_date")
      .eq("work_date", businessDate)
      .in("status", ["assigned", "completed"]),
    supabase
      .from("staff_shift_weekly_assignments")
      .select("staff_id, shift_id, weekday")
      .eq("weekday", getIsoWeekday(businessDate))
      .eq("status", "assigned"),
  ]);

  if (ordersResult.error) throw ordersResult.error;
  if (dailyAssignmentsResult.error) throw dailyAssignmentsResult.error;
  if (weeklyAssignmentsResult.error) throw weeklyAssignmentsResult.error;

  const ordersData = ordersResult.data;
  const dailyAssignments = dailyAssignmentsResult.data || [];
  const weeklyAssignments = weeklyAssignmentsResult.data || [];

  const shiftOrders = ((ordersData || []) as OrderRow[]).filter((order) => {
    // 1. Try to match by staff assignment
    if (order.created_by) {
      // Check daily override assignment first
      const dailyAss = dailyAssignments.find(
        (a) => a.staff_id === order.created_by && a.work_date === businessDate
      );
      if (dailyAss) {
        return dailyAss.shift_id === shift.id;
      }
      
      // Check weekly recurring assignment second
      const weekday = getIsoWeekday(businessDate);
      const weeklyAss = weeklyAssignments.find(
        (a) => a.staff_id === order.created_by && a.weekday === weekday
      );
      if (weeklyAss) {
        return weeklyAss.shift_id === shift.id;
      }
    }

    // 2. Fallback to time-based matching
    return isOrderInShift(order, shift);
  });
  const validOrders = shiftOrders.filter(isValidOrder);
  const cancelledOrders = shiftOrders.filter(isCancelledOrder);
  const grossSales = validOrders.reduce((sum, order) => sum + toNumber(order.subtotal || order.total), 0);
  const discountTotal = validOrders.reduce((sum, order) => sum + toNumber(order.discount), 0);
  const netSales = validOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const cashExpected = validOrders
    .filter(isCashPayment)
    .reduce((sum, order) => sum + toNumber(order.total), 0);

  return {
    businessDate,
    shiftId: `${shift.id}-${businessDate}`,
    shiftName: shift.shift_name || "Shift",
    openedAt: `${businessDate}T${String(shift.start_time || "00:00").slice(0, 5)}:00`,
    closedAt: `${businessDate}T${String(shift.end_time || "23:59").slice(0, 5)}:00`,
    grossSales,
    discountTotal,
    netSales,
    cashExpected,
    openingCash: 0,
    expectedDrawerCash: cashExpected,
    cashToDeposit: cashExpected,
    closingFloat: 0,
    floatPolicy: "carry_float" as const,
    nonCashSales: Math.max(netSales - cashExpected, 0),
    cancelledCount: cancelledOrders.length,
    orderCount: validOrders.length,
    cashOrderCount: validOrders.filter(isCashPayment).length,
    nonCashOrderCount: validOrders.filter((order) => !isCashPayment(order)).length,
  };
}

async function loadExistingClosing({
  businessDate,
  shiftId,
  supabase,
}: {
  businessDate: string;
  shiftId: string;
  supabase: ReturnType<typeof createBookkeepingSupabaseClient>;
}) {
  const { data, error } = await supabase
    .from("bookkeeping_shift_closings")
    .select("*")
    .eq("business_date", businessDate)
    .eq("shift_id", shiftId)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as ClosingRow | null;
}

const getYesterdayDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

const getPreviousShiftClosing = async ({
  supabase,
  businessDate,
}: {
  supabase: SupabaseClient;
  businessDate: string;
}) => {
  const { data, error } = await supabase
    .from("bookkeeping_shift_closings")
    .select("id, shift_id, shift_name, closing_float, actual_closing_float, status")
    .or(`business_date.eq.${businessDate},business_date.eq.${getYesterdayDate(businessDate)}`)
    .not("closed_at", "is", null)
    .order("closed_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Failed to load previous shift closing:", error);
    return null;
  }
  return data?.[0] || null;
};

export async function GET(request: NextRequest) {
  try {
    const businessDate = request.nextUrl.searchParams.get("businessDate") || getJakartaDate();
    if (!DATE_PATTERN.test(businessDate)) {
      return NextResponse.json({ error: "Valid business date is required." }, { status: 400 });
    }

    const context = await loadStaffShiftContext(request, businessDate);
    if ("error" in context) return context.error;

    const snapshot = await buildShiftSnapshot({
      businessDate,
      shift: context.shift,
      supabase: context.supabase,
    });
    const existingClosing = await loadExistingClosing({
      businessDate,
      shiftId: snapshot.shiftId,
      supabase: context.supabase,
    });

    const previousClosing = await getPreviousShiftClosing({
      supabase: context.supabase,
      businessDate,
    });
    const openingCashExpected = previousClosing
      ? (previousClosing.actual_closing_float !== null && previousClosing.actual_closing_float !== undefined
        ? toNumber(previousClosing.actual_closing_float)
        : toNumber(previousClosing.closing_float))
      : 0;

    // Fetch cash movements to display active cash flow
    const { data: movements } = await context.supabase
      .from("bookkeeping_cash_movements")
      .select("type, amount")
      .eq("shift_id", snapshot.shiftId);

    let totalCashIn = 0;
    let totalCashOut = 0;
    let totalCashDrop = 0;
    if (movements) {
      for (const m of movements) {
        if (m.type === "cash_in") totalCashIn += toNumber(m.amount);
        else if (m.type === "cash_out") totalCashOut += toNumber(m.amount);
        else if (m.type === "cash_drop") totalCashDrop += toNumber(m.amount);
      }
    }

    const revealCashExpected = Boolean(existingClosing?.cash_counted);
    const openingCash = existingClosing ? toNumber(existingClosing.opening_cash_actual || existingClosing.opening_cash) : openingCashExpected;
    const closingFloat = toNumber(existingClosing?.closing_float);
    const expectedDrawerCash = openingCash + snapshot.cashExpected + totalCashIn - totalCashOut - totalCashDrop;

    const datePart = businessDate.replace(/-/g, "").slice(2);
    
    let shiftPart = (context.shift.shift_name || "SHF")
      .toUpperCase()
      .replace("SHIFT", "")
      .replace(/\s+/g, "")
      .replace(/[^A-Z0-9]/g, "");
    if (!shiftPart) shiftPart = "SHF";

    const staffPart = (context.staff.name || "STF")
      .split(" ")[0]
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    const stableEnvelopeNumber = `ENV-${datePart}-${shiftPart}-${staffPart}`;
    const envelopeNumber = (existingClosing?.snapshot_json as Record<string, unknown> | undefined)?.envelopeNumber as string | undefined || stableEnvelopeNumber;

    return NextResponse.json({
      data: {
        businessDate,
        envelopeNumber,
        staff: {
          id: context.staff.id,
          name: context.staff.name,
          staffCode: context.staff.staff_code,
        },
        staffOptions: context.staffOptions,
        shift: {
          id: context.shift.id,
          shiftName: context.shift.shift_name || "Shift",
          startTime: context.shift.start_time,
          endTime: context.shift.end_time,
        },
        snapshot: {
          ...snapshot,
          openingCash,
          cashExpected: revealCashExpected ? snapshot.cashExpected : null,
          expectedDrawerCash: revealCashExpected ? expectedDrawerCash : null,
          cashToDeposit: revealCashExpected ? Math.max(expectedDrawerCash - closingFloat, 0) : null,
          closingFloat,
          floatPolicy: existingClosing?.float_policy || snapshot.floatPolicy,
          totalCashIn,
          totalCashOut,
          totalCashDrop,
        },
        closing: mapClosing(existingClosing, revealCashExpected),
      },
    });
  } catch (error) {
    console.error("Failed to load staff shift closing:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Shift closing could not be loaded.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as SubmitShiftClosingRequest & {
      action?: string;
      openingCashActual?: number | string | null;
      actualClosingFloat?: number | string | null;
      envelopeNumber?: string | null;
    };
    const businessDate = body.businessDate || getJakartaDate();
    const action = body.action || "close_shift";
    const notes = String(body.notes || "").trim();

    if (!DATE_PATTERN.test(businessDate)) {
      return NextResponse.json({ error: "Valid business date is required." }, { status: 400 });
    }

    const context = await loadStaffShiftContext(request, businessDate);
    if ("error" in context) return context.error;

    const submitter = context.requester;

    const shiftWindowError = validateShiftClosingWindow({
      businessDate,
      shift: context.shift,
    });
    if (shiftWindowError) return shiftWindowError;

    await assertBookkeepingDatesAreOpen({
      supabase: context.supabase,
      dates: [businessDate],
      action: action === "open_shift" ? "Opening shift" : "Submitting shift closing",
    });

    const snapshot = await buildShiftSnapshot({
      businessDate,
      shift: context.shift,
      supabase: context.supabase,
    });
    const existingClosing = await loadExistingClosing({
      businessDate,
      shiftId: snapshot.shiftId,
      supabase: context.supabase,
    });

    if (existingClosing?.status === "closed") {
      return NextResponse.json({ error: "Closed shift closing cannot be updated." }, { status: 409 });
    }

    if (action === "open_shift") {
      const openingCashActual = body.openingCashActual === null || body.openingCashActual === undefined || body.openingCashActual === ""
        ? null
        : Number(body.openingCashActual);

      if (openingCashActual === null || !Number.isFinite(openingCashActual) || openingCashActual < 0) {
        return NextResponse.json({ error: "Opening cash actual must be a valid positive number." }, { status: 400 });
      }

      const previousClosing = await getPreviousShiftClosing({
        supabase: context.supabase,
        businessDate,
      });
      const openingCashExpected = previousClosing
        ? (previousClosing.actual_closing_float !== null && previousClosing.actual_closing_float !== undefined
          ? toNumber(previousClosing.actual_closing_float)
          : toNumber(previousClosing.closing_float))
        : 0;

      const openingVariance = openingCashActual - openingCashExpected;

      const payload = {
        business_date: businessDate,
        shift_id: snapshot.shiftId,
        shift_name: snapshot.shiftName,
        opened_at: new Date().toISOString(),
        closed_at: null,
        submitted_by: context.staff.id,
        gross_sales: 0,
        discount_total: 0,
        net_sales: 0,
        opening_cash: openingCashExpected,
        opening_cash_actual: openingCashActual,
        opening_variance: openingVariance,
        opening_variance_note: notes || "Opened by staff.",
        previous_shift_id: previousClosing?.shift_id || null,
        cash_expected: 0,
        expected_drawer_cash: openingCashActual,
        cash_counted: null,
        cash_difference: null,
        cash_to_deposit: 0,
        closing_float: 0,
        actual_closing_float: 0,
        float_policy: "carry_float",
        non_cash_sales: 0,
        cancelled_count: 0,
        refund_total: 0,
        status: "open",
        notes: notes || "Opened by staff.",
        snapshot_json: {
          openedBy: context.staff.id,
          openedByName: context.staff.name,
          openedAt: new Date().toISOString(),
          openingCashExpected,
          openingCashActual,
          openingVariance,
        },
        updated_at: new Date().toISOString(),
      };

      let closingId = existingClosing?.id || "";
      if (existingClosing?.id) {
        const { error } = await context.supabase
          .from("bookkeeping_shift_closings")
          .update(payload)
          .eq("id", existingClosing.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await context.supabase
          .from("bookkeeping_shift_closings")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (error) throw error;
        closingId = inserted?.id || "";
      }

      await context.supabase.from("activity_logs").insert({
        user_id: submitter.id,
        user_name: submitter.name,
        user_role: submitter.role,
        action: existingClosing?.id ? "UPDATE" : "CREATE",
        action_category: "FINANCIAL",
        action_description: `Staff ${context.staff.name} opened shift ${snapshot.shiftName} with cash ${openingCashActual}`,
        resource_type: "Bookkeeping Shift Closing",
        resource_id: closingId || snapshot.shiftId,
        resource_name: snapshot.shiftName,
        previous_value: null,
        new_value: { businessDate, shiftId: snapshot.shiftId, openingCashActual, openingVariance },
        changes_summary: ["Staff shift opened"],
        severity: "info",
        tags: ["bookkeeping", "staff-open-shift", "cash-count"],
        notes: notes || null,
        is_reversible: false,
        ip_address: "0.0.0.0",
        device_info: "Server API",
        session_id: `staff-open-shift-${submitter.id}`,
      });

      return NextResponse.json({
        success: true,
        data: {
          status: "open",
          openingCash: openingCashExpected,
          openingCashActual,
          openingVariance,
          closingId,
        },
      });
    }

    // close_shift
    const cashCounted = body.cashCounted === null || body.cashCounted === undefined || body.cashCounted === ""
      ? null
      : Number(body.cashCounted);
    const actualClosingFloat = body.actualClosingFloat === null || body.actualClosingFloat === undefined || body.actualClosingFloat === ""
      ? 0
      : Number(body.actualClosingFloat);

    if (cashCounted === null || !Number.isFinite(cashCounted) || cashCounted < 0) {
      return NextResponse.json({ error: "Cash counted must be a valid positive number." }, { status: 400 });
    }
    if (actualClosingFloat < 0) {
      return NextResponse.json({ error: "Closing float cannot be negative." }, { status: 400 });
    }

    // Auto-generate descriptive envelope number (stable fallback)
    const datePart = businessDate.replace(/-/g, "").slice(2);

    let shiftPart = (context.shift.shift_name || "SHF")
      .toUpperCase()
      .replace("SHIFT", "")
      .replace(/\s+/g, "")
      .replace(/[^A-Z0-9]/g, "");
    if (!shiftPart) shiftPart = "SHF";

    const staffPart = (context.staff.name || "STF")
      .split(" ")[0]
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    const stableEnvelopeNumber = `ENV-${datePart}-${shiftPart}-${staffPart}`;
    const envelopeNumber = String(body.envelopeNumber || "").trim() || stableEnvelopeNumber;

    // Fetch cash movements
    const { data: movements } = await context.supabase
      .from("bookkeeping_cash_movements")
      .select("type, amount")
      .eq("shift_id", snapshot.shiftId);

    let totalCashIn = 0;
    let totalCashOut = 0;
    let totalCashDrop = 0;
    if (movements) {
      for (const m of movements) {
        if (m.type === "cash_in") totalCashIn += toNumber(m.amount);
        else if (m.type === "cash_out") totalCashOut += toNumber(m.amount);
        else if (m.type === "cash_drop") totalCashDrop += toNumber(m.amount);
      }
    }

    const openingCashActual = existingClosing ? toNumber(existingClosing.opening_cash_actual || existingClosing.opening_cash) : 0;
    const expectedDrawerCash = openingCashActual + snapshot.cashExpected + totalCashIn - totalCashOut - totalCashDrop;
    const cashDifference = cashCounted - expectedDrawerCash;
    const cashToDeposit = Math.max(cashCounted - actualClosingFloat, 0);
    const status = cashDifference === 0 ? "submitted" : "needs_review";

    const payload = {
      business_date: businessDate,
      shift_id: snapshot.shiftId,
      shift_name: snapshot.shiftName,
      closed_at: new Date().toISOString(),
      submitted_by: context.staff.id,
      gross_sales: snapshot.grossSales,
      discount_total: snapshot.discountTotal,
      net_sales: snapshot.netSales,
      opening_cash: existingClosing?.opening_cash || 0,
      opening_cash_actual: openingCashActual,
      opening_variance: existingClosing ? toNumber(existingClosing.opening_variance) : 0,
      cash_expected: snapshot.cashExpected,
      expected_drawer_cash: expectedDrawerCash,
      cash_counted: cashCounted,
      cash_difference: cashDifference,
      cash_to_deposit: cashToDeposit,
      closing_float: actualClosingFloat,
      actual_closing_float: actualClosingFloat,
      float_policy: "carry_float",
      non_cash_sales: snapshot.nonCashSales,
      cancelled_count: snapshot.cancelledCount,
      status,
      notes: notes
        ? `${existingClosing?.notes ? `${existingClosing.notes}\n` : ""}Staff closing: ${notes}`
        : (existingClosing?.notes || "Submitted by staff end shift."),
      snapshot_json: {
        ...((existingClosing?.snapshot_json as Record<string, unknown>) || {}),
        submittedBy: context.staff.id,
        submittedByName: context.staff.name,
        submittedByRequester: submitter.id,
        submittedByRequesterRole: submitter.role,
        submittedAt: new Date().toISOString(),
        source: submitter.role === "staff" ? "staff_end_shift" : `${submitter.role}_staff_end_shift`,
        orderCount: snapshot.orderCount,
        cashOrderCount: snapshot.cashOrderCount,
        nonCashOrderCount: snapshot.nonCashOrderCount,
        openingCashActual,
        expectedDrawerCash,
        cashToDeposit,
        closingFloat: actualClosingFloat,
        totalCashIn,
        totalCashOut,
        totalCashDrop,
        envelopeNumber,
      },
      updated_at: new Date().toISOString(),
    };

    let closingId = existingClosing?.id || "";
    if (existingClosing?.id) {
      const { error } = await context.supabase
        .from("bookkeeping_shift_closings")
        .update(payload)
        .eq("id", existingClosing.id);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await context.supabase
        .from("bookkeeping_shift_closings")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      closingId = inserted?.id || "";
    }

    // Upsert to bookkeeping_cash_deposits
    const { data: existingDeposits, error: existingDepositsError } = await context.supabase
      .from("bookkeeping_cash_deposits")
      .select("id")
      .eq("shift_id", snapshot.shiftId)
      .order("created_at", { ascending: false });

    if (existingDepositsError) throw existingDepositsError;

    if (existingDeposits && existingDeposits.length > 0) {
      const primaryDeposit = existingDeposits[0];
      const duplicateIds = existingDeposits.slice(1).map((d) => d.id);

      const { error: depositError } = await context.supabase
        .from("bookkeeping_cash_deposits")
        .update({
          envelope_number: envelopeNumber,
          expected_amount: cashToDeposit,
          submitted_amount: cashToDeposit,
          status: "submitted",
          received_amount: null,
          manager_id: null,
          manager_notes: null,
          verified_at: null,
        })
        .eq("id", primaryDeposit.id);
      if (depositError) throw depositError;

      // Clean up duplicates if any exist
      if (duplicateIds.length > 0) {
        await context.supabase
          .from("bookkeeping_cash_deposits")
          .delete()
          .in("id", duplicateIds);
      }
    } else {
      const { error: depositError } = await context.supabase
        .from("bookkeeping_cash_deposits")
        .insert({
          shift_id: snapshot.shiftId,
          staff_id: context.staff.id,
          envelope_number: envelopeNumber,
          expected_amount: cashToDeposit,
          submitted_amount: cashToDeposit,
          status: "submitted",
        });
      if (depositError) throw depositError;
    }

    await context.supabase.from("activity_logs").insert({
      user_id: submitter.id,
      user_name: submitter.name,
      user_role: submitter.role,
      action: "UPDATE",
      action_category: "FINANCIAL",
      action_description: `Staff ${context.staff.name} closed shift ${snapshot.shiftName} with envelope ${envelopeNumber}`,
      resource_type: "Bookkeeping Shift Closing",
      resource_id: closingId || snapshot.shiftId,
      resource_name: snapshot.shiftName,
      previous_value: null,
      new_value: { businessDate, shiftId: snapshot.shiftId, cashCounted, cashDifference, status, envelopeNumber },
      changes_summary: [`Staff shift closing submitted as ${status}`],
      severity: status === "submitted" ? "info" : "warning",
      tags: ["bookkeeping", "staff-end-shift", "cash-count", "deposit"],
      notes: notes || null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `staff-end-shift-${submitter.id}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        status,
        cashExpected: snapshot.cashExpected,
        openingCash: openingCashActual,
        expectedDrawerCash,
        cashCounted,
        cashDifference,
        cashToDeposit,
        closingFloat: actualClosingFloat,
        closingId,
        envelopeNumber,
      },
    });

  } catch (error) {
    console.error("Failed to submit staff shift closing:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : (error && typeof error === "object" && "message" in error)
        ? String((error as Record<string, unknown>).message)
        : "Shift closing could not be submitted.";
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
