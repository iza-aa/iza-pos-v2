import { NextRequest, NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";

type ManagerActionRequest =
  | {
      action?: "set_opening_cash";
      businessDate?: string;
      shiftId?: string;
      openingCash?: number | string | null;
      closingFloat?: number | string | null;
      note?: string | null;
    }
  | {
      action?: "create_expense";
      expenseDate?: string;
      category?: string;
      amount?: number | string | null;
      paymentMethod?: string | null;
      vendor?: string | null;
      receiptUrl?: string | null;
      note?: string | null;
    };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Manager",
  role: request.headers.get("x-user-role") ?? "",
});

const requireManager = (request: NextRequest) => {
  const requester = getRequester(request);
  if (!requester.id || (requester.role !== "manager" && requester.role !== "owner")) return null;
  return requester;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getDateParam = (request: NextRequest) => {
  const businessDate = request.nextUrl.searchParams.get("businessDate") ?? "";
  return DATE_PATTERN.test(businessDate) ? businessDate : null;
};

export async function GET(request: NextRequest) {
  const requester = requireManager(request);
  if (!requester) return NextResponse.json({ error: "Manager access required." }, { status: 403 });

  const businessDate = getDateParam(request);
  if (!businessDate) return NextResponse.json({ error: "Valid business date is required." }, { status: 400 });

  try {
    const supabase = createBookkeepingSupabaseClient();
    const [staffResult, shiftsResult, assignmentsResult, weeklyAssignmentsResult, closingsResult, expensesResult] = await Promise.all([
      supabase
        .from("staff")
        .select("id, name, staff_code, role, status, shift_id")
        .eq("role", "staff")
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("shifts")
        .select("id, shift_name, start_time, end_time, is_active")
        .eq("is_active", true)
        .order("start_time", { ascending: true }),
      supabase
        .from("staff_shift_daily_assignments")
        .select("*")
        .eq("work_date", businessDate)
        .order("created_at", { ascending: true }),
      supabase
        .from("staff_shift_weekly_assignments")
        .select("*")
        .eq("status", "assigned")
        .order("weekday", { ascending: true }),
      supabase
        .from("bookkeeping_shift_closings")
        .select("*")
        .eq("business_date", businessDate)
        .order("shift_name", { ascending: true }),
      supabase
        .from("bookkeeping_expenses")
        .select("*")
        .eq("expense_date", businessDate)
        .order("created_at", { ascending: false }),
    ]);

    if (staffResult.error) throw staffResult.error;
    if (shiftsResult.error) throw shiftsResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;
    if (weeklyAssignmentsResult.error) throw weeklyAssignmentsResult.error;
    if (closingsResult.error) throw closingsResult.error;
    if (expensesResult.error) throw expensesResult.error;

    return NextResponse.json({
      data: {
        businessDate,
        staff: staffResult.data || [],
        shifts: shiftsResult.data || [],
        assignments: assignmentsResult.data || [],
        weeklyAssignments: weeklyAssignmentsResult.data || [],
        shiftClosings: closingsResult.data || [],
        expenses: expensesResult.data || [],
      },
    });
  } catch (error) {
    console.error("Failed to load manager bookkeeping operations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Manager bookkeeping operations could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const requester = requireManager(request);
  if (!requester) return NextResponse.json({ error: "Manager access required." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as ManagerActionRequest;
  const action = body.action;

  try {
    const supabase = createBookkeepingSupabaseClient();

    if (action === "set_opening_cash") {
      const businessDate = String(body.businessDate || "").trim();
      const shiftId = String(body.shiftId || "").trim();
      const openingCash = toNumber(body.openingCash);
      const closingFloat = toNumber(body.closingFloat);

      if (!DATE_PATTERN.test(businessDate) || !shiftId) {
        return NextResponse.json({ error: "Business date and shift are required." }, { status: 400 });
      }

      if (openingCash < 0 || closingFloat < 0) {
        return NextResponse.json({ error: "Cash values cannot be negative." }, { status: 400 });
      }

      const { data: shift, error: shiftError } = await supabase
        .from("shifts")
        .select("id, shift_name, start_time, end_time")
        .eq("id", shiftId)
        .maybeSingle();

      if (shiftError) throw shiftError;
      if (!shift) return NextResponse.json({ error: "Shift was not found." }, { status: 404 });

      const closingShiftId = `${shiftId}-${businessDate}`;
      const { data: existing, error: existingError } = await supabase
        .from("bookkeeping_shift_closings")
        .select("id, cash_expected, cash_counted, status")
        .eq("business_date", businessDate)
        .eq("shift_id", closingShiftId)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing?.cash_counted !== null && existing?.cash_counted !== undefined) {
        return NextResponse.json({ error: "Opening cash cannot be changed after staff submits cash count." }, { status: 409 });
      }

      const cashExpected = toNumber(existing?.cash_expected);
      const expectedDrawerCash = openingCash + cashExpected;
      const payload = {
        business_date: businessDate,
        shift_id: closingShiftId,
        shift_name: shift.shift_name || "Shift",
        opened_at: `${businessDate}T${String(shift.start_time || "00:00:00").slice(0, 8)}+07:00`,
        closed_at: `${businessDate}T${String(shift.end_time || "23:59:59").slice(0, 8)}+07:00`,
        opening_cash: openingCash,
        cash_expected: cashExpected,
        expected_drawer_cash: expectedDrawerCash,
        cash_to_deposit: Math.max(expectedDrawerCash - closingFloat, 0),
        closing_float: closingFloat,
        float_policy: "carry_float",
        status: existing?.status || "draft",
        notes: body.note || "Opening cash set by manager.",
        updated_at: new Date().toISOString(),
      };

      const query = existing?.id
        ? supabase.from("bookkeeping_shift_closings").update(payload).eq("id", existing.id).select("*").single()
        : supabase.from("bookkeeping_shift_closings").insert({ ...payload, created_at: new Date().toISOString() }).select("*").single();
      const { data, error } = await query;

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "create_expense") {
      const expenseDate = String(body.expenseDate || "").trim();
      const category = String(body.category || "").trim();
      const amount = toNumber(body.amount);

      if (!DATE_PATTERN.test(expenseDate) || !category || amount <= 0) {
        return NextResponse.json({ error: "Expense date, category, and amount are required." }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("bookkeeping_expenses")
        .insert({
          expense_date: expenseDate,
          category,
          amount,
          payment_method: body.paymentMethod || null,
          vendor: body.vendor || null,
          receipt_url: body.receiptUrl || null,
          note: body.note || null,
          created_by: requester.id,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: "Valid manager action is required." }, { status: 400 });
  } catch (error) {
    console.error("Failed to save manager bookkeeping operation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Manager bookkeeping operation could not be saved." },
      { status: 500 },
    );
  }
}
