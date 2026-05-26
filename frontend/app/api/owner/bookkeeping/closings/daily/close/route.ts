import { NextRequest, NextResponse } from "next/server";
import type { DateRangeValue } from "@/app/components/shared";
import { loadBookkeepingDashboardDataFromClient } from "@/lib/services/bookkeeping/bookkeepingService";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";

type CloseDailyRequest = {
  dateRange?: Partial<DateRangeValue>;
  cashCounted?: number | string | null;
  notes?: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

const normalizeDateRange = (value: CloseDailyRequest["dateRange"]): DateRangeValue | null => {
  const startDate = value?.startDate ?? "";
  const endDate = value?.endDate ?? "";

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) return null;
  if (startDate > endDate) return null;

  return { startDate, endDate };
};

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as CloseDailyRequest;
  const dateRange = normalizeDateRange(body.dateRange);

  if (!dateRange) {
    return NextResponse.json({ error: "Valid date range is required." }, { status: 400 });
  }

  const cashCounted = body.cashCounted === null || body.cashCounted === undefined || body.cashCounted === ""
    ? null
    : Number(body.cashCounted);

  if (cashCounted !== null && (!Number.isFinite(cashCounted) || cashCounted < 0)) {
    return NextResponse.json({ error: "Cash counted must be a valid positive number." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    const data = await loadBookkeepingDashboardDataFromClient(supabase, dateRange);
    const [storedExceptionsResult, storedShiftClosingsResult] = await Promise.all([
      supabase
        .from("bookkeeping_exceptions")
        .select("id")
        .gte("business_date", dateRange.startDate)
        .lte("business_date", dateRange.endDate)
        .eq("status", "open"),
      supabase
        .from("bookkeeping_shift_closings")
        .select("id, status, opening_cash, cash_expected, expected_drawer_cash, cash_counted, cash_to_deposit, closing_float")
        .gte("business_date", dateRange.startDate)
        .lte("business_date", dateRange.endDate),
    ]);

    if (storedExceptionsResult.error) throw storedExceptionsResult.error;
    if (storedShiftClosingsResult.error) throw storedShiftClosingsResult.error;

    const liveExceptionCount = data.exceptions.filter(
      (exception) => exception.status === "open",
    ).length;
    const storedExceptionCount = (storedExceptionsResult.data || []).length;
    const unresolvedExceptionCount = Math.max(liveExceptionCount, storedExceptionCount);
    const storedShiftClosings = (storedShiftClosingsResult.data || []) as Array<{
      id: string;
      status?: string | null;
      opening_cash?: number | string | null;
      cash_expected?: number | string | null;
      expected_drawer_cash?: number | string | null;
      cash_counted?: number | string | null;
      cash_to_deposit?: number | string | null;
      closing_float?: number | string | null;
    }>;
    const toNumber = (value: unknown) => {
      const parsed = Number(value ?? 0);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const shiftOpeningCashTotal = storedShiftClosings.reduce((sum, row) => sum + toNumber(row.opening_cash), 0);
    const shiftCashSalesTotal = storedShiftClosings.reduce((sum, row) => sum + toNumber(row.cash_expected), 0);
    const shiftExpectedDrawerCash = storedShiftClosings.reduce((sum, row) => {
      const drawer = row.expected_drawer_cash === null || row.expected_drawer_cash === undefined
        ? toNumber(row.opening_cash) + toNumber(row.cash_expected)
        : toNumber(row.expected_drawer_cash);

      return sum + drawer;
    }, 0);
    const shiftCashToDeposit = storedShiftClosings.reduce((sum, row) => sum + toNumber(row.cash_to_deposit), 0);
    const shiftClosingFloatTotal = storedShiftClosings.reduce((sum, row) => sum + toNumber(row.closing_float), 0);
    const cashSalesTotal = storedShiftClosings.length > 0 ? shiftCashSalesTotal : data.summary.cashExpected;
    const expectedDrawerCash = storedShiftClosings.length > 0 ? shiftExpectedDrawerCash : data.summary.expectedDrawerCash;
    const cashDifference = cashCounted === null ? null : cashCounted - expectedDrawerCash;
    const hasShiftClosingRows = storedShiftClosings.length > 0;
    const allShiftClosingsSubmitted = hasShiftClosingRows && storedShiftClosings.every((row) => (
      (row.status === "submitted" || row.status === "closed") &&
      row.cash_counted !== null &&
      row.cash_counted !== undefined
    ));
    const canClose =
      cashCounted !== null &&
      cashDifference === 0 &&
      unresolvedExceptionCount === 0 &&
      allShiftClosingsSubmitted;
    const status = canClose ? "closed" : "needs_review";

    const payload = {
      business_date: dateRange.endDate,
      gross_sales: data.summary.grossSales,
      discount_total: data.summary.discounts,
      net_sales: data.summary.netSales,
      cogs_estimate: data.summary.estimatedCogs ?? 0,
      expense_total: data.summary.operatingExpenses,
      gross_profit_estimate: data.summary.grossProfit ?? 0,
      net_profit_estimate: data.summary.netProfitEstimate ?? 0,
      opening_cash_total: shiftOpeningCashTotal,
      cash_expected: cashSalesTotal,
      expected_drawer_cash: expectedDrawerCash,
      cash_counted: cashCounted,
      cash_difference: cashDifference,
      cash_to_deposit: shiftCashToDeposit,
      closing_float_total: shiftClosingFloatTotal,
      unresolved_exception_count: unresolvedExceptionCount,
      status,
      approved_by: requester.id,
      approved_at: canClose ? new Date().toISOString() : null,
      notes: body.notes || null,
      snapshot_json: {
        dateRange,
        summary: data.summary,
        paymentBreakdown: data.paymentBreakdown,
        menuMargins: data.menuMargins,
        exceptionCount: data.exceptions.length,
        storedOpenExceptionCount: storedExceptionCount,
        shiftClosingCheck: {
          hasShiftClosingRows,
          allShiftClosingsSubmitted,
        },
      },
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabase
      .from("bookkeeping_daily_closings")
      .select("id, status")
      .eq("business_date", dateRange.endDate)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.status === "closed") {
      return NextResponse.json(
        { error: "This daily closing is already closed." },
        { status: 409 },
      );
    }

    if (existing?.id) {
      const { error } = await supabase
        .from("bookkeeping_daily_closings")
        .update(payload)
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("bookkeeping_daily_closings").insert({
        ...payload,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    }

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: "owner",
      action: "UPDATE",
      action_category: "FINANCIAL",
      action_description: `Closed daily bookkeeping for ${dateRange.endDate}`,
      resource_type: "Bookkeeping Daily Closing",
      resource_id: dateRange.endDate,
      resource_name: "Daily Closing",
      previous_value: null,
      new_value: { dateRange, cashCounted, cashDifference, status },
      changes_summary: [`Daily closing status: ${status}`],
      severity: canClose ? "info" : "warning",
      tags: ["bookkeeping", "daily-closing"],
      notes: body.notes || null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({ success: true, status, cashDifference });
  } catch (error) {
    console.error("Failed to close daily bookkeeping:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Daily closing could not be completed.",
      },
      { status: 500 },
    );
  }
}
