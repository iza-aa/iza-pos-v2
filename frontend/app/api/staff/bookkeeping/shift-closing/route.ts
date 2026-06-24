import { NextRequest, NextResponse } from "next/server";
import {
  assertBookkeepingDatesAreOpen,
  createBookkeepingSupabaseClient,
} from "@/lib/services/bookkeeping/bookkeepingServer";

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
  cash_expected: number | string;
  expected_drawer_cash?: number | string | null;
  cash_counted?: number | string | null;
  cash_difference?: number | string | null;
  cash_to_deposit?: number | string | null;
  closing_float?: number | string | null;
  float_policy?: "carry_float" | "new_float" | "deposit_all" | null;
  non_cash_sales: number | string;
  cancelled_count: number;
  status: "open" | "draft" | "needs_review" | "submitted" | "closed" | "reopened";
  notes?: string | null;
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
  const { data: ordersData, error: ordersError } = await supabase
    .from("orders")
    .select("id, order_number, created_at, completed_at, status, payment_status, payment_method, subtotal, discount, total")
    .gte("created_at", toDateTimeStart(businessDate))
    .lte("created_at", toDateTimeEnd(businessDate))
    .order("created_at", { ascending: true });

  if (ordersError) throw ordersError;

  const shiftOrders = ((ordersData || []) as OrderRow[]).filter((order) => isOrderInShift(order, shift));
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

export async function GET(request: NextRequest) {
  try {
    const businessDate = request.nextUrl.searchParams.get("businessDate") || getJakartaDate();
    if (!DATE_PATTERN.test(businessDate)) {
      return NextResponse.json({ error: "Valid business date is required." }, { status: 400 });
    }

    const context = await loadStaffShiftContext(request, businessDate);
    if ("error" in context) return context.error;

    const shiftWindowError = validateShiftClosingWindow({
      businessDate,
      shift: context.shift,
    });
    if (shiftWindowError) return shiftWindowError;

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
    const revealCashExpected = Boolean(existingClosing?.cash_counted);
    const openingCash = toNumber(existingClosing?.opening_cash);
    const closingFloat = toNumber(existingClosing?.closing_float);
    const expectedDrawerCash = openingCash + snapshot.cashExpected;

    return NextResponse.json({
      data: {
        businessDate,
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
    const body = (await request.json().catch(() => ({}))) as SubmitShiftClosingRequest;
    const businessDate = body.businessDate || getJakartaDate();
    const cashCounted = body.cashCounted === null || body.cashCounted === undefined || body.cashCounted === ""
      ? null
      : Number(body.cashCounted);
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

    if (cashCounted === null || !Number.isFinite(cashCounted) || cashCounted < 0) {
      return NextResponse.json({ error: "Cash counted must be a valid positive number." }, { status: 400 });
    }

    await assertBookkeepingDatesAreOpen({
      supabase: context.supabase,
      dates: [businessDate],
      action: "Submitting shift closing",
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

    const openingCash = toNumber(existingClosing?.opening_cash);
    const closingFloat = toNumber(existingClosing?.closing_float);
    const floatPolicy = existingClosing?.float_policy || snapshot.floatPolicy;
    const expectedDrawerCash = openingCash + snapshot.cashExpected;
    const cashDifference = cashCounted - expectedDrawerCash;
    const cashToDeposit = Math.max(cashCounted - closingFloat, 0);
    const status = cashDifference === 0 ? "submitted" : "needs_review";
    const payload = {
      business_date: businessDate,
      shift_id: snapshot.shiftId,
      shift_name: snapshot.shiftName,
      opened_at: snapshot.openedAt,
      closed_at: snapshot.closedAt,
      submitted_by: context.staff.id,
      gross_sales: snapshot.grossSales,
      discount_total: snapshot.discountTotal,
      net_sales: snapshot.netSales,
      opening_cash: openingCash,
      cash_expected: snapshot.cashExpected,
      expected_drawer_cash: expectedDrawerCash,
      cash_counted: cashCounted,
      cash_difference: cashDifference,
      cash_to_deposit: cashToDeposit,
      closing_float: closingFloat,
      float_policy: floatPolicy,
      non_cash_sales: snapshot.nonCashSales,
      cancelled_count: snapshot.cancelledCount,
      refund_total: 0,
      status,
      notes: notes || "Submitted by staff end shift.",
      snapshot_json: {
        submittedBy: context.staff.id,
        submittedByName: context.staff.name,
        submittedByRequester: submitter.id,
        submittedByRequesterRole: submitter.role,
        submittedAt: new Date().toISOString(),
        source: submitter.role === "staff" ? "staff_end_shift" : `${submitter.role}_staff_end_shift`,
        orderCount: snapshot.orderCount,
        cashOrderCount: snapshot.cashOrderCount,
        nonCashOrderCount: snapshot.nonCashOrderCount,
        openingCash,
        expectedDrawerCash,
        cashToDeposit,
        closingFloat,
        floatPolicy,
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
      action_description: submitter.role !== "staff"
        ? `${submitter.role} submitted shift cash count for ${context.staff.name}`
        : `Submitted shift cash count for ${snapshot.shiftName}`,
      resource_type: "Bookkeeping Shift Closing",
      resource_id: closingId || snapshot.shiftId,
      resource_name: snapshot.shiftName,
      previous_value: null,
      new_value: { businessDate, shiftId: snapshot.shiftId, cashCounted, cashDifference, status },
      changes_summary: [`Staff shift closing submitted as ${status}`],
      severity: status === "submitted" ? "info" : "warning",
      tags: ["bookkeeping", "staff-end-shift", "cash-count"],
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
        openingCash,
        expectedDrawerCash,
        cashCounted,
        cashDifference,
        cashToDeposit,
        closingFloat,
        closingId,
      },
    });
  } catch (error) {
    console.error("Failed to submit staff shift closing:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Shift closing could not be submitted.",
      },
      { status: 500 },
    );
  }
}
