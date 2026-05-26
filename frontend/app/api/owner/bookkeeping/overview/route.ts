import { NextRequest, NextResponse } from "next/server";
import { loadBookkeepingDashboardDataFromClient } from "@/lib/services/bookkeeping/bookkeepingService";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";
import type { DateRangeValue } from "@/app/components/shared";
import type {
  BookkeepingEntry,
  BookkeepingException,
  BookkeepingExpense,
  BookkeepingReport,
  DailyClosingRow,
  ShiftClosingRow,
} from "@/lib/services/bookkeeping/bookkeepingTypes";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  role: request.headers.get("x-user-role") ?? "",
});

const normalizeDateRange = (request: NextRequest): DateRangeValue | null => {
  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) return null;
  if (startDate > endDate) return null;

  return { startDate, endDate };
};

type BookkeepingEntryRow = {
  id: string;
  business_date: string;
  entry_at: string;
  type: BookkeepingEntry["type"];
  category: string;
  amount: number | string;
  direction: BookkeepingEntry["direction"];
  payment_method?: string | null;
  source_table?: string | null;
  source_id?: string | null;
  source_label?: string | null;
  status: "draft" | "posted" | "estimated" | "needs_review" | "voided";
  note?: string | null;
};

type BookkeepingExceptionRow = {
  id: string;
  business_date: string;
  severity: BookkeepingException["severity"];
  type: string;
  description: string;
  source_table?: string | null;
  source_id?: string | null;
  suggested_fix?: string | null;
  status: BookkeepingException["status"] | "ignored_with_note";
};

type ShiftClosingDatabaseRow = {
  id: string;
  shift_id?: string | null;
  shift_name: string;
  business_date: string;
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
  float_policy?: ShiftClosingRow["floatPolicy"] | null;
  non_cash_sales: number | string;
  cancelled_count: number;
  status: ShiftClosingRow["status"];
};

type BookkeepingReportRow = {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  status: BookkeepingReport["status"] | "failed";
  generated_at: string;
  snapshot_json?: unknown;
};

type BookkeepingExpenseRow = {
  id: string;
  expense_date: string;
  category: string;
  amount: number | string;
  payment_method?: string | null;
  vendor?: string | null;
  receipt_url?: string | null;
  note?: string | null;
};

type DailyClosingDatabaseRow = {
  id: string;
  business_date: string;
  gross_sales: number | string;
  discount_total: number | string;
  net_sales: number | string;
  cogs_estimate: number | string;
  expense_total: number | string;
  gross_profit_estimate: number | string;
  net_profit_estimate: number | string;
  opening_cash_total?: number | string | null;
  cash_expected: number | string;
  expected_drawer_cash?: number | string | null;
  cash_counted?: number | string | null;
  cash_difference?: number | string | null;
  cash_to_deposit?: number | string | null;
  closing_float_total?: number | string | null;
  unresolved_exception_count: number;
  status: DailyClosingRow["status"];
  approved_at?: string | null;
  notes?: string | null;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapEntryStatus = (status: BookkeepingEntryRow["status"]): BookkeepingEntry["status"] => {
  if (status === "needs_review") return "needs_review";
  if (status === "estimated") return "estimated";
  return "posted";
};

const getEntryMergeKey = (entry: BookkeepingEntry) => {
  return `${entry.type}:${entry.sourceTable || ""}:${entry.sourceId || entry.id}`;
};

const mergeEntries = (
  generatedEntries: BookkeepingEntry[],
  storedEntries: BookkeepingEntry[],
) => {
  const merged = new Map<string, BookkeepingEntry>();

  generatedEntries.forEach((entry) => {
    merged.set(getEntryMergeKey(entry), entry);
  });

  storedEntries.forEach((entry) => {
    merged.set(getEntryMergeKey(entry), entry);
  });

  return Array.from(merged.values()).sort((left, right) => right.entryAt.localeCompare(left.entryAt));
};

const getShiftMergeKey = (row: ShiftClosingRow) => `${row.businessDate}:${row.id}`;

const mergeShiftClosings = (
  generatedRows: ShiftClosingRow[],
  storedRows: ShiftClosingRow[],
) => {
  const merged = new Map<string, ShiftClosingRow>();

  generatedRows.forEach((row) => {
    merged.set(getShiftMergeKey(row), row);
  });

  storedRows.forEach((row) => {
    const key = getShiftMergeKey(row);
    const existing = merged.get(key);

    if (
      row.status === "submitted" ||
      row.status === "closed" ||
      row.cashCounted !== null ||
      row.openingCash > 0 ||
      row.closingFloat > 0
    ) {
      merged.set(key, row);
      return;
    }

    if (!existing) {
      merged.set(key, row);
    }
  });

  return Array.from(merged.values()).sort((left, right) => {
    const dateSort = right.businessDate.localeCompare(left.businessDate);
    if (dateSort !== 0) return dateSort;
    return left.shiftName.localeCompare(right.shiftName);
  });
};

async function loadStoredBookkeepingRows({
  dateRange,
  supabase,
}: {
  dateRange: DateRangeValue;
  supabase: ReturnType<typeof createBookkeepingSupabaseClient>;
}) {
  const [entriesResult, exceptionsResult, reportsResult, expensesResult] = await Promise.all([
    supabase
      .from("bookkeeping_entries")
      .select("*")
      .gte("business_date", dateRange.startDate)
      .lte("business_date", dateRange.endDate)
      .order("entry_at", { ascending: false }),
    supabase
      .from("bookkeeping_exceptions")
      .select("*")
      .gte("business_date", dateRange.startDate)
      .lte("business_date", dateRange.endDate)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookkeeping_reports")
      .select("id, report_type, period_start, period_end, status, generated_at, snapshot_json")
      .lte("period_start", dateRange.endDate)
      .gte("period_end", dateRange.startDate)
      .order("generated_at", { ascending: false }),
    supabase
      .from("bookkeeping_expenses")
      .select("id, expense_date, category, amount, payment_method, vendor, receipt_url, note")
      .gte("expense_date", dateRange.startDate)
      .lte("expense_date", dateRange.endDate)
      .order("expense_date", { ascending: false }),
  ]);

  if (entriesResult.error) throw entriesResult.error;
  if (exceptionsResult.error) throw exceptionsResult.error;
  if (reportsResult.error) throw reportsResult.error;
  if (expensesResult.error) throw expensesResult.error;

  const shiftClosingsResult = await supabase
    .from("bookkeeping_shift_closings")
    .select("*")
    .gte("business_date", dateRange.startDate)
    .lte("business_date", dateRange.endDate)
    .order("business_date", { ascending: false });

  if (shiftClosingsResult.error) throw shiftClosingsResult.error;

  const dailyClosingResult = await supabase
    .from("bookkeeping_daily_closings")
    .select("*")
    .eq("business_date", dateRange.endDate)
    .maybeSingle();

  if (dailyClosingResult.error) throw dailyClosingResult.error;

  const dailyClosingRow = dailyClosingResult.data as DailyClosingDatabaseRow | null;

  return {
    entries: ((entriesResult.data || []) as BookkeepingEntryRow[]).map((row): BookkeepingEntry => ({
      id: row.id,
      entryAt: row.entry_at,
      businessDate: row.business_date,
      type: row.type,
      category: row.category,
      source: row.source_label || row.source_id || "Bookkeeping source",
      sourceTable: row.source_table || undefined,
      sourceId: row.source_id || undefined,
      paymentMethod: row.payment_method || undefined,
      direction: row.direction,
      amount: toNumber(row.amount),
      status: mapEntryStatus(row.status),
      note: row.note || undefined,
    })),
    exceptions: ((exceptionsResult.data || []) as BookkeepingExceptionRow[]).map((row): BookkeepingException => ({
      id: row.id,
      businessDate: row.business_date,
      severity: row.severity,
      type: row.type,
      description: row.description,
      source: row.source_id || row.source_table || "Bookkeeping source",
      suggestedFix: row.suggested_fix || "Review the source data and update the bookkeeping record.",
      status: row.status === "ignored_with_note" ? "acknowledged" : row.status,
    })),
    shiftClosings: ((shiftClosingsResult.data || []) as ShiftClosingDatabaseRow[]).map((row): ShiftClosingRow => ({
      id: row.shift_id || row.id,
      shiftName: row.shift_name,
      businessDate: row.business_date,
      openedAt: row.opened_at || null,
      closedAt: row.closed_at || null,
      grossSales: toNumber(row.gross_sales),
      discountTotal: toNumber(row.discount_total),
      netSales: toNumber(row.net_sales),
      openingCash: toNumber(row.opening_cash),
      cashExpected: toNumber(row.cash_expected),
      expectedDrawerCash: toNumber(row.expected_drawer_cash ?? row.cash_expected),
      cashCounted: row.cash_counted === null || row.cash_counted === undefined
        ? null
        : toNumber(row.cash_counted),
      cashDifference: row.cash_difference === null || row.cash_difference === undefined
        ? null
        : toNumber(row.cash_difference),
      cashToDeposit: toNumber(row.cash_to_deposit ?? row.cash_expected),
      closingFloat: toNumber(row.closing_float),
      floatPolicy: row.float_policy || "carry_float",
      nonCashSales: toNumber(row.non_cash_sales),
      cancelledCount: row.cancelled_count,
      status: row.status,
    })),
    reports: ((reportsResult.data || []) as BookkeepingReportRow[]).map((row): BookkeepingReport => ({
      id: row.id,
      name: "Bookkeeping Summary Report",
      type: row.report_type.replaceAll("_", " "),
      period: `${row.period_start} to ${row.period_end}`,
      generatedAt: row.generated_at,
      status: row.status === "draft" ? "draft" : "generated",
      snapshotJson: row.snapshot_json,
    })),
    expenses: ((expensesResult.data || []) as BookkeepingExpenseRow[]).map((row): BookkeepingExpense => ({
      id: row.id,
      expenseDate: row.expense_date,
      category: row.category,
      amount: toNumber(row.amount),
      paymentMethod: row.payment_method,
      vendor: row.vendor,
      receiptUrl: row.receipt_url,
      note: row.note,
    })),
    dailyClosing: dailyClosingRow
      ? {
          id: dailyClosingRow.id,
          businessDate: dailyClosingRow.business_date,
          grossSales: toNumber(dailyClosingRow.gross_sales),
          discountTotal: toNumber(dailyClosingRow.discount_total),
          netSales: toNumber(dailyClosingRow.net_sales),
          cogsEstimate: toNumber(dailyClosingRow.cogs_estimate),
          expenseTotal: toNumber(dailyClosingRow.expense_total),
          grossProfitEstimate: toNumber(dailyClosingRow.gross_profit_estimate),
          netProfitEstimate: toNumber(dailyClosingRow.net_profit_estimate),
          openingCashTotal: toNumber(dailyClosingRow.opening_cash_total),
          cashExpected: toNumber(dailyClosingRow.cash_expected),
          expectedDrawerCash: toNumber(dailyClosingRow.expected_drawer_cash ?? dailyClosingRow.cash_expected),
          cashCounted: dailyClosingRow.cash_counted === null || dailyClosingRow.cash_counted === undefined
            ? null
            : toNumber(dailyClosingRow.cash_counted),
          cashDifference: dailyClosingRow.cash_difference === null || dailyClosingRow.cash_difference === undefined
            ? null
            : toNumber(dailyClosingRow.cash_difference),
          cashToDeposit: toNumber(dailyClosingRow.cash_to_deposit ?? dailyClosingRow.cash_expected),
          closingFloatTotal: toNumber(dailyClosingRow.closing_float_total),
          unresolvedExceptionCount: dailyClosingRow.unresolved_exception_count,
          status: dailyClosingRow.status,
          approvedAt: dailyClosingRow.approved_at,
          notes: dailyClosingRow.notes,
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const dateRange = normalizeDateRange(request);
  if (!dateRange) {
    return NextResponse.json({ error: "Valid startDate and endDate are required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    const data = await loadBookkeepingDashboardDataFromClient(supabase, dateRange);
    const storedRows = await loadStoredBookkeepingRows({ supabase, dateRange });

    data.entries = mergeEntries(data.entries, storedRows.entries);

    if (storedRows.exceptions.length > 0) {
      data.exceptions = storedRows.exceptions;
      data.summary.unresolvedExceptions = storedRows.exceptions.filter(
        (exception) => exception.status === "open",
      ).length;
    }

    data.shiftClosings = mergeShiftClosings(data.shiftClosings, storedRows.shiftClosings);
    data.summary.openingCashTotal = data.shiftClosings.reduce((sum, row) => sum + row.openingCash, 0);
    data.summary.expectedDrawerCash = data.shiftClosings.reduce((sum, row) => sum + row.expectedDrawerCash, 0);
    data.summary.cashToDeposit = data.shiftClosings.reduce((sum, row) => sum + row.cashToDeposit, 0);
    data.summary.closingFloatTotal = data.shiftClosings.reduce((sum, row) => sum + row.closingFloat, 0);

    if (storedRows.reports.length > 0) {
      data.reports = storedRows.reports;
    }

    data.expenses = storedRows.expenses;
    data.summary.operatingExpenses = storedRows.expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );
    data.summary.netProfitEstimate = data.summary.grossProfit === null
      ? null
      : data.summary.grossProfit - data.summary.operatingExpenses;
    data.dailyClosing = storedRows.dailyClosing;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to load owner bookkeeping overview:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Bookkeeping overview could not be loaded.",
      },
      { status: 500 },
    );
  }
}
