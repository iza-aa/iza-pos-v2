import { NextRequest, NextResponse } from "next/server";
import {
  assertBookkeepingDatesAreOpen,
  createBookkeepingSupabaseClient,
} from "@/lib/services/bookkeeping/bookkeepingServer";

type SaveShiftCashRequest = {
  businessDate?: string;
  shiftId?: string;
  cashCounted?: number | string | null;
  openingCash?: number | string | null;
  closingFloat?: number | string | null;
  floatPolicy?: "carry_float" | "new_float" | "deposit_all" | null;
  shift?: {
    shiftName?: string;
    openedAt?: string | null;
    closedAt?: string | null;
    grossSales?: number | string | null;
    discountTotal?: number | string | null;
    netSales?: number | string | null;
    openingCash?: number | string | null;
    cashExpected?: number | string | null;
    expectedDrawerCash?: number | string | null;
    cashToDeposit?: number | string | null;
    closingFloat?: number | string | null;
    floatPolicy?: "carry_float" | "new_float" | "deposit_all" | null;
    nonCashSales?: number | string | null;
    cancelledCount?: number | string | null;
    status?: string | null;
  };
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as SaveShiftCashRequest;
  const businessDate = body.businessDate ?? "";
  const shiftId = String(body.shiftId ?? "").trim();
  const cashCounted = body.cashCounted === null || body.cashCounted === undefined || body.cashCounted === ""
    ? null
    : Number(body.cashCounted);
  const openingCash = toNumber(body.openingCash);
  const closingFloat = toNumber(body.closingFloat);
  const floatPolicy = body.floatPolicy || "carry_float";

  if (!DATE_PATTERN.test(businessDate) || !shiftId) {
    return NextResponse.json({ error: "Valid shift closing date and shift are required." }, { status: 400 });
  }

  if (cashCounted === null || !Number.isFinite(cashCounted) || cashCounted < 0) {
    return NextResponse.json({ error: "Cash counted must be a valid positive number." }, { status: 400 });
  }

  if (openingCash < 0 || closingFloat < 0) {
    return NextResponse.json({ error: "Opening cash and closing float cannot be negative." }, { status: 400 });
  }

  if (!["carry_float", "new_float", "deposit_all"].includes(floatPolicy)) {
    return NextResponse.json({ error: "Valid float policy is required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    await assertBookkeepingDatesAreOpen({
      supabase,
      dates: [businessDate],
      action: "Saving shift cash count",
    });

    const { data: closing, error: closingError } = await supabase
      .from("bookkeeping_shift_closings")
      .select("id, shift_name, cash_expected, status")
      .eq("business_date", businessDate)
      .eq("shift_id", shiftId)
      .maybeSingle();

    if (closingError) throw closingError;

    let targetClosing = closing;

    if (!targetClosing?.id) {
      const shift = body.shift;

      if (!shift?.shiftName) {
        return NextResponse.json({ error: "Shift closing draft was not found. Generate shift closing first." }, { status: 404 });
      }

      const cashSales = toNumber(shift.cashExpected);
      const expectedDrawerCash = openingCash + cashSales;
      const { data: inserted, error: insertError } = await supabase
        .from("bookkeeping_shift_closings")
        .insert({
          business_date: businessDate,
          shift_id: shiftId,
          shift_name: shift.shiftName,
          opened_at: shift.openedAt || null,
          closed_at: shift.closedAt || null,
          submitted_by: requester.id,
          gross_sales: toNumber(shift.grossSales),
          discount_total: toNumber(shift.discountTotal),
          net_sales: toNumber(shift.netSales),
          opening_cash: openingCash,
          cash_expected: cashSales,
          expected_drawer_cash: expectedDrawerCash,
          cash_counted: null,
          cash_difference: null,
          cash_to_deposit: Math.max(expectedDrawerCash - closingFloat, 0),
          closing_float: closingFloat,
          float_policy: floatPolicy,
          non_cash_sales: toNumber(shift.nonCashSales),
          cancelled_count: Math.trunc(toNumber(shift.cancelledCount)),
          refund_total: 0,
          status: shift.status === "submitted" || shift.status === "closed" ? "needs_review" : (shift.status || "needs_review"),
          notes: "Created from cash count save.",
          snapshot_json: {
            generatedBy: requester.id,
            generatedByName: requester.name,
            generatedAt: new Date().toISOString(),
            source: "owner_bookkeeping_shift_cash_save",
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id, shift_name, cash_expected, status")
        .single();

      if (insertError) throw insertError;
      targetClosing = inserted;
    }

    if (targetClosing.status === "closed") {
      return NextResponse.json({ error: "Closed shift closing cannot be updated." }, { status: 409 });
    }

    const cashExpected = Number(targetClosing.cash_expected ?? 0);
    const cashSales = Number.isFinite(cashExpected) ? cashExpected : 0;
    const expectedDrawerCash = openingCash + cashSales;
    const cashDifference = cashCounted - expectedDrawerCash;
    const cashToDeposit = Math.max(cashCounted - closingFloat, 0);
    const status = cashDifference === 0 ? "submitted" : "needs_review";

    const { error: updateError } = await supabase
      .from("bookkeeping_shift_closings")
      .update({
        opening_cash: openingCash,
        expected_drawer_cash: expectedDrawerCash,
        cash_counted: cashCounted,
        cash_difference: cashDifference,
        cash_to_deposit: cashToDeposit,
        closing_float: closingFloat,
        float_policy: floatPolicy,
        status,
        submitted_by: requester.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetClosing.id);

    if (updateError) throw updateError;

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: "owner",
      action: "UPDATE",
      action_category: "FINANCIAL",
      action_description: `Saved shift cash count for ${targetClosing.shift_name || shiftId}`,
      resource_type: "Bookkeeping Shift Closing",
      resource_id: targetClosing.id,
      resource_name: targetClosing.shift_name || shiftId,
      previous_value: null,
      new_value: { businessDate, shiftId, openingCash, cashCounted, cashDifference, status },
      changes_summary: [`Shift cash count saved as ${status}`],
      severity: status === "submitted" ? "info" : "warning",
      tags: ["bookkeeping", "shift-closing", "cash-count"],
      notes: null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({ success: true, status, cashDifference, expectedDrawerCash, cashToDeposit });
  } catch (error) {
    console.error("Failed to save shift closing cash:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Shift cash count could not be saved.",
      },
      { status: 500 },
    );
  }
}
