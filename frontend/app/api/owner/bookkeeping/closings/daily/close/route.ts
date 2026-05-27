import { NextRequest, NextResponse } from "next/server";
import type { DateRangeValue } from "@/app/components/shared";
import { loadBookkeepingDashboardDataFromClient } from "@/lib/services/bookkeeping/bookkeepingService";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";

type CloseDailyRequest = {
  dateRange?: Partial<DateRangeValue>;
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
        .select("id, business_date, shift_id, status, opening_cash, cash_expected, expected_drawer_cash, cash_counted, cash_difference, cash_to_deposit, closing_float")
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
      business_date?: string | null;
      shift_id?: string | null;
      status?: string | null;
      opening_cash?: number | string | null;
      cash_expected?: number | string | null;
      expected_drawer_cash?: number | string | null;
      cash_counted?: number | string | null;
      cash_difference?: number | string | null;
      cash_to_deposit?: number | string | null;
      closing_float?: number | string | null;
    }>;
    const toNumber = (value: unknown) => {
      const parsed = Number(value ?? 0);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const liveShiftByKey = new Map(data.shiftClosings.map((row) => [`${row.businessDate}:${row.id}`, row]));
    const mergedShiftClosings = storedShiftClosings.map((row) => {
      const businessDate = row.business_date || "";
      const shiftId = row.shift_id || "";
      const liveShift = liveShiftByKey.get(`${businessDate}:${shiftId}`);
      const openingCash = toNumber(row.opening_cash);
      const cashExpected = liveShift?.cashExpected ?? toNumber(row.cash_expected);
      const expectedDrawerCash = openingCash + cashExpected;
      const cashCounted = row.cash_counted === null || row.cash_counted === undefined
        ? null
        : toNumber(row.cash_counted);
      const cashDifference = cashCounted === null ? null : cashCounted - expectedDrawerCash;
      const closingFloat = toNumber(row.closing_float);
      const status = row.status === "needs_review" && cashDifference === 0
        ? "submitted"
        : row.status;

      return {
        ...row,
        status,
        openingCash,
        cashExpected,
        expectedDrawerCash,
        cashCounted,
        cashDifference,
        cashToDeposit: Math.max((cashCounted ?? expectedDrawerCash) - closingFloat, 0),
        closingFloat,
      };
    });

    const shiftOpeningCashTotal = mergedShiftClosings.reduce((sum, row) => sum + row.openingCash, 0);
    const shiftCashSalesTotal = mergedShiftClosings.reduce((sum, row) => sum + row.cashExpected, 0);
    const shiftExpectedDrawerCash = mergedShiftClosings.reduce((sum, row) => {
      const drawer = row.expectedDrawerCash;

      return sum + drawer;
    }, 0);
    const shiftCashToDeposit = mergedShiftClosings.reduce((sum, row) => sum + row.cashToDeposit, 0);
    const shiftClosingFloatTotal = mergedShiftClosings.reduce((sum, row) => sum + row.closingFloat, 0);
    const shiftCashCountedTotal = mergedShiftClosings.reduce((sum, row) => sum + (row.cashCounted ?? 0), 0);
    const cashSalesTotal = mergedShiftClosings.length > 0 ? shiftCashSalesTotal : data.summary.cashExpected;
    const expectedDrawerCash = mergedShiftClosings.length > 0 ? shiftExpectedDrawerCash : data.summary.expectedDrawerCash;
    const cashCounted = mergedShiftClosings.length > 0 ? shiftCashCountedTotal : null;
    const cashDifference = cashCounted === null ? null : cashCounted - expectedDrawerCash;
    const hasShiftClosingRows = mergedShiftClosings.length > 0;
    const allShiftClosingsSubmitted = hasShiftClosingRows && mergedShiftClosings.every((row) => (
      (row.status === "submitted" || row.status === "closed") &&
      row.cashCounted !== null &&
      row.cashCounted !== undefined
    ));
    const hasShiftReviewItems = mergedShiftClosings.some((row) => (
      row.status === "needs_review" ||
      row.status === "reopened" ||
      (row.cashDifference ?? 0) !== 0
    ));

    if (!hasShiftClosingRows) {
      return NextResponse.json(
        { error: "No shift closing has been submitted for this period." },
        { status: 409 },
      );
    }

    if (!allShiftClosingsSubmitted) {
      return NextResponse.json(
        { error: "All shifts must submit counted cash before owner approval." },
        { status: 409 },
      );
    }

    if (hasShiftReviewItems || cashDifference !== 0 || unresolvedExceptionCount > 0) {
      return NextResponse.json(
        { error: "This closing still needs manager review before owner approval." },
        { status: 409 },
      );
    }

    const status = "closed";

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
      approved_at: new Date().toISOString(),
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
          hasShiftReviewItems,
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
      severity: "info",
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
