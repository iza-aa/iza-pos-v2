import { NextRequest, NextResponse } from "next/server";
import {
  assertBookkeepingDatesAreOpen,
  createBookkeepingSupabaseClient,
} from "@/lib/services/bookkeeping/bookkeepingServer";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getJakartaDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Staff",
  role: request.headers.get("x-user-role") ?? "",
});

type StaffRow = {
  id: string;
  name: string;
  staff_code?: string | null;
  role?: string | null;
  status?: string | null;
};

const loadAssignedShiftId = async ({
  businessDate,
  staffId,
  supabase,
}: {
  businessDate: string;
  staffId: string;
  supabase: any;
}) => {
  const weekday = new Date(businessDate).getDay();
  const isoWeekday = weekday === 0 ? 7 : weekday;

  const { data: weeklyData } = await supabase
    .from("staff_shift_weekly_assignments")
    .select("shift_id")
    .eq("staff_id", staffId)
    .eq("weekday", isoWeekday)
    .eq("status", "assigned")
    .maybeSingle();

  const { data } = await supabase
    .from("staff_shift_daily_assignments")
    .select("shift_id")
    .eq("staff_id", staffId)
    .eq("work_date", businessDate)
    .in("status", ["assigned", "completed"])
    .maybeSingle();

  if (data?.shift_id) return String(data.shift_id);
  if (weeklyData?.shift_id) return String(weeklyData.shift_id);
  return null;
};

async function loadStaffShiftContext(request: NextRequest, businessDate: string) {
  const requester = getRequester(request);

  if (!requester.id || (requester.role !== "staff" && requester.role !== "owner")) {
    return { error: NextResponse.json({ error: "Access required." }, { status: 403 }) };
  }

  const supabase = createBookkeepingSupabaseClient();

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
        { error: "Staff account has no shift assignment for this date." },
        { status: 400 },
      ),
    };
  }

  return { supabase, requester, staff: staffRow, shiftId: assignedShiftId };
}

export async function GET(request: NextRequest) {
  try {
    const businessDate = request.nextUrl.searchParams.get("businessDate") || getJakartaDate();
    if (!DATE_PATTERN.test(businessDate)) {
      return NextResponse.json({ error: "Valid business date is required." }, { status: 400 });
    }

    const context = await loadStaffShiftContext(request, businessDate);
    if ("error" in context) return context.error;

    const shiftId = `${context.shiftId}-${businessDate}`;

    const { data: movements, error } = await context.supabase
      .from("bookkeeping_cash_movements")
      .select("*")
      .eq("shift_id", shiftId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: movements || [] });
  } catch (error) {
    console.error("Failed to load cash movements:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cash movements could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const businessDate = body.businessDate || getJakartaDate();
    const type = body.type; // 'cash_in' | 'cash_out' | 'cash_drop'
    const amount = toNumber(body.amount);
    const reason = String(body.reason || "").trim();

    if (!DATE_PATTERN.test(businessDate)) {
      return NextResponse.json({ error: "Valid business date is required." }, { status: 400 });
    }

    if (!type || !["cash_in", "cash_out", "cash_drop"].includes(type)) {
      return NextResponse.json({ error: "Valid type (cash_in, cash_out, cash_drop) is required." }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: "Reason is required for cash movement." }, { status: 400 });
    }

    const context = await loadStaffShiftContext(request, businessDate);
    if ("error" in context) return context.error;

    await assertBookkeepingDatesAreOpen({
      supabase: context.supabase,
      dates: [businessDate],
      action: "Recording cash movement",
    });

    const shiftId = `${context.shiftId}-${businessDate}`;

    // Verify shift is open or draft
    const { data: closing } = await context.supabase
      .from("bookkeeping_shift_closings")
      .select("status")
      .eq("shift_id", shiftId)
      .maybeSingle();

    if (closing?.status === "closed" || closing?.status === "submitted") {
      return NextResponse.json({ error: "Cash movements cannot be added to a submitted/closed shift." }, { status: 409 });
    }

    const { data: movement, error } = await context.supabase
      .from("bookkeeping_cash_movements")
      .insert({
        shift_id: shiftId,
        staff_id: context.staff.id,
        type,
        amount,
        reason,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;

    // Log to activity logs
    await context.supabase.from("activity_logs").insert({
      user_id: context.requester.id,
      user_name: context.requester.name,
      user_role: context.requester.role,
      action: "CREATE",
      action_category: "FINANCIAL",
      action_description: `Recorded cash movement ${type} of ${amount} for shift ${shiftId}`,
      resource_type: "Bookkeeping Cash Movement",
      resource_id: movement.id,
      resource_name: type,
      new_value: { type, amount, reason },
      severity: "info",
      tags: ["bookkeeping", "cash-movement", type],
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `cash-movement-${context.staff.id}`,
    });

    return NextResponse.json({ success: true, data: movement });
  } catch (error) {
    console.error("Failed to record cash movement:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cash movement could not be recorded." },
      { status: 500 },
    );
  }
}
