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
  opening_cash_actual?: number | string | null;
  opening_variance?: number | string | null;
  opening_variance_note?: string | null;
  cash_expected: number | string;
  expected_drawer_cash?: number | string | null;
  cash_counted?: number | string | null;
  cash_difference?: number | string | null;
  cash_to_deposit?: number | string | null;
  closing_float?: number | string | null;
  actual_closing_float?: number | string | null;
  float_policy?: ShiftClosingRow["floatPolicy"] | null;
  non_cash_sales: number | string;
  cancelled_count: number;
  status: ShiftClosingRow["status"];
  snapshot_json?: Record<string, unknown> | null;
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

type OrderCorrectionRow = {
  id: string;
  order_id: string;
  order_number?: string | null;
  requested_by_name?: string | null;
  requested_by_role?: string | null;
  correction_type: string;
  physical_status: string;
  status: "logged" | "reviewed";
  note?: string | null;
  created_at: string;
  reviewed_by_name?: string | null;
  reviewed_by_role?: string | null;
  reviewed_at?: string | null;
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

const extractOrderIdFromSource = (source: string) => {
  return source.match(/order #([a-f0-9-]{20,})/i)?.[1] ?? null;
};

const getEntryMergeKey = (entry: BookkeepingEntry) => {
  const orderIdFromSource = extractOrderIdFromSource(entry.source);
  if (entry.type === "cogs_estimate" && orderIdFromSource) {
    return `${entry.type}:orders:${orderIdFromSource}`;
  }

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

    if (existing) {
      const cashCounted = row.cashCounted;
      // Trust the database stored expectedDrawerCash, difference, and deposit when the shift closing has been submitted
      const expectedDrawerCash = row.status !== "draft" && row.status !== "open"
        ? row.expectedDrawerCash
        : (row.openingCash + existing.cashExpected);
      const cashDifference = row.status !== "draft" && row.status !== "open"
        ? row.cashDifference
        : (cashCounted === null || cashCounted === undefined ? null : cashCounted - expectedDrawerCash);
      const cashToDeposit = row.status !== "draft" && row.status !== "open"
        ? row.cashToDeposit
        : Math.max((cashCounted ?? expectedDrawerCash) - row.closingFloat, 0);

      const status = row.status === "needs_review" && cashDifference === 0
        ? "submitted"
        : row.status;

      merged.set(key, {
        ...existing,
        openingCash: row.openingCash,
        openingCashActual: row.openingCashActual,
        openingVariance: row.openingVariance,
        openingVarianceNote: row.openingVarianceNote,
        cashIn: row.cashIn,
        cashOut: row.cashOut,
        cashCounted,
        closingFloat: row.closingFloat,
        actualClosingFloat: row.actualClosingFloat,
        floatPolicy: row.floatPolicy,
        expectedDrawerCash,
        cashDifference,
        cashToDeposit,
        status,
        snapshotJson: row.snapshotJson,
        deposit: row.deposit,
      });
      return;
    }

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
  const [entriesResult, exceptionsResult, reportsResult, expensesResult, correctionsResult] = await Promise.all([
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
    supabase
      .from("order_corrections")
      .select("*")
      .gte("created_at", `${dateRange.startDate}T00:00:00+07:00`)
      .lte("created_at", `${dateRange.endDate}T23:59:59+07:00`)
      .order("created_at", { ascending: false }),
  ]);

  if (entriesResult.error) throw entriesResult.error;
  if (exceptionsResult.error) throw exceptionsResult.error;
  if (reportsResult.error) throw reportsResult.error;
  if (expensesResult.error) throw expensesResult.error;
  if (correctionsResult.error) throw correctionsResult.error;

  const shiftClosingsResult = await supabase
    .from("bookkeeping_shift_closings")
    .select("*")
    .gte("business_date", dateRange.startDate)
    .lte("business_date", dateRange.endDate)
    .order("business_date", { ascending: false });

  if (shiftClosingsResult.error) throw shiftClosingsResult.error;

  const shiftIds = (shiftClosingsResult.data || []).map((row) => row.shift_id).filter(Boolean);

  type CashDepositRow = {
    id: string;
    shift_id: string;
    envelope_number: string;
    expected_amount: number | string;
    submitted_amount: number | string;
    received_amount: number | string | null;
    status: string;
    manager_id?: string | null;
    manager_notes?: string | null;
    verified_at?: string | null;
    staff?: { name: string } | null;
    manager?: { name: string } | null;
  };

  type CashMovementRow = {
    shift_id: string;
    type: string;
    amount: number | string;
  };

  let deposits: CashDepositRow[] = [];
  let cashMovements: CashMovementRow[] = [];
  if (shiftIds.length > 0) {
    const [depResult, movResult] = await Promise.all([
      supabase
        .from("bookkeeping_cash_deposits")
        .select("*, staff:staff_id(name), manager:manager_id(name)")
        .in("shift_id", shiftIds),
      supabase
        .from("bookkeeping_cash_movements")
        .select("shift_id, type, amount")
        .in("shift_id", shiftIds),
    ]);
    if (depResult.error) throw depResult.error;
    if (movResult.error) throw movResult.error;
    deposits = depResult.data || [];
    cashMovements = movResult.data || [];
  }

  const dailyClosingResult = await supabase
    .from("bookkeeping_daily_closings")
    .select("*")
    .eq("business_date", dateRange.endDate)
    .maybeSingle();

  if (dailyClosingResult.error) throw dailyClosingResult.error;

  const dailyClosingRow = dailyClosingResult.data as DailyClosingDatabaseRow | null;

  const storedExceptions = (exceptionsResult.data || []) as BookkeepingExceptionRow[];
  const storedCorrectionSourceIds = new Set(
    storedExceptions
      .filter((row) => row.source_table === "order_corrections" && row.source_id)
      .map((row) => row.source_id),
  );

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
    exceptions: [
      ...((correctionsResult.data || []) as OrderCorrectionRow[])
        .filter((row) => !storedCorrectionSourceIds.has(row.id))
        .map((row): BookkeepingException => ({
          id: `order-correction-${row.id}`,
          businessDate: row.created_at.slice(0, 10),
          severity: row.physical_status === "not_processed" ? "medium" : "high",
          type: "Order Correction Request",
          description: `Order ${row.order_number ?? row.order_id} correction: ${row.note || "No note provided."}`,
          source: row.reviewed_by_name
            ? `Reviewed by ${row.reviewed_by_name}`
            : `${row.requested_by_name ?? "Staff"} (${row.requested_by_role ?? "staff"})`,
          suggestedFix:
            row.physical_status === "not_processed"
              ? "Confirm no product was made. If valid, resolve this review item."
              : "Confirm product was made or served. Treat as operational loss unless original data is wrong.",
          status: row.status === "reviewed" ? "acknowledged" : "open",
          reviewStatus: row.status === "reviewed" ? "reviewed" : "waiting_manager_review",
          reviewedByName: row.reviewed_by_name ?? null,
          reviewedByRole: row.reviewed_by_role ?? null,
          reviewedAt: row.reviewed_at ?? null,
        })),
      ...storedExceptions.map((row): BookkeepingException => ({
        id: row.id,
        businessDate: row.business_date,
        severity: row.severity,
        type: row.type,
        description: row.description,
        source: row.source_id || row.source_table || "Bookkeeping source",
        suggestedFix: row.suggested_fix || "Review the source data and update the bookkeeping record.",
        status: row.status === "ignored_with_note" ? "acknowledged" : row.status,
      })),
    ],
    shiftClosings: ((shiftClosingsResult.data || []) as ShiftClosingDatabaseRow[]).map((row): ShiftClosingRow => {
      const deposit = deposits.find((d) => d.shift_id === row.shift_id);
      const shiftMovements = cashMovements.filter((m) => m.shift_id === row.shift_id);
      let cashIn = 0;
      let cashOut = 0;
      for (const m of shiftMovements) {
        if (m.type === "cash_in") cashIn += toNumber(m.amount);
        else if (m.type === "cash_out") cashOut += toNumber(m.amount);
      }
      return {
        id: row.shift_id || row.id,
        shiftName: row.shift_name,
        businessDate: row.business_date,
        openedAt: row.opened_at || null,
        closedAt: row.closed_at || null,
        grossSales: toNumber(row.gross_sales),
        discountTotal: toNumber(row.discount_total),
        netSales: toNumber(row.net_sales),
        openingCash: toNumber(row.opening_cash),
        openingCashActual: row.opening_cash_actual === null || row.opening_cash_actual === undefined ? null : toNumber(row.opening_cash_actual),
        openingVariance: row.opening_variance === null || row.opening_variance === undefined ? null : toNumber(row.opening_variance),
        openingVarianceNote: row.opening_variance_note || null,
        cashIn,
        cashOut,
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
        actualClosingFloat: row.actual_closing_float === null || row.actual_closing_float === undefined ? null : toNumber(row.actual_closing_float),
        floatPolicy: row.float_policy || "carry_float",
        nonCashSales: toNumber(row.non_cash_sales),
        cancelledCount: row.cancelled_count,
        status: row.status,
        snapshotJson: row.snapshot_json || null,
        deposit: deposit ? {
          id: deposit.id,
          envelopeNumber: deposit.envelope_number,
          expectedAmount: toNumber(deposit.expected_amount),
          submittedAmount: toNumber(deposit.submitted_amount),
          receivedAmount: deposit.received_amount !== null && deposit.received_amount !== undefined ? toNumber(deposit.received_amount) : null,
          status: deposit.status as "verified" | "submitted" | "received" | "disputed",
          managerId: deposit.manager_id || null,
          managerName: deposit.manager?.name || null,
          managerNotes: deposit.manager_notes || null,
          verifiedAt: deposit.verified_at || null,
        } : null,
      };
    }),
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
    const summaryOnly = request.nextUrl.searchParams.get("mode") === "summary";

    if (summaryOnly) {
      const data = await loadBookkeepingDashboardDataFromClient(supabase, dateRange);

      return NextResponse.json({
        data: {
          summary: data.summary,
          paymentBreakdown: data.paymentBreakdown,
          menuMargins: data.menuMargins,
        },
      });
    }

    const [data, storedRows] = await Promise.all([
      loadBookkeepingDashboardDataFromClient(supabase, dateRange),
      loadStoredBookkeepingRows({ supabase, dateRange }),
    ]);

    data.entries = mergeEntries(data.entries, storedRows.entries);

    const exceptionMap = new Map(data.exceptions.map((e) => [e.id, e]));
    storedRows.exceptions.forEach((e) => exceptionMap.set(e.id, e));
    data.exceptions = Array.from(exceptionMap.values());
    data.summary.unresolvedExceptions = data.exceptions.filter(
      (exception) => exception.status === "open",
    ).length;

    data.shiftClosings = mergeShiftClosings(data.shiftClosings, storedRows.shiftClosings);
    data.summary.openingCashTotal = data.shiftClosings.reduce((sum, row) => sum + row.openingCash, 0);
    const sortedShifts = [...data.shiftClosings].sort((a, b) =>
      (a.openedAt ?? `${a.businessDate}T00:00:00`).localeCompare(b.openedAt ?? `${b.businessDate}T00:00:00`)
    );
    const firstShiftOpeningCash = sortedShifts.length > 0 ? (sortedShifts[0].openingCashActual ?? sortedShifts[0].openingCash) : 0;
    const totalCashSales = data.shiftClosings.reduce((sum, row) => sum + row.cashExpected, 0);
    const totalCashIn = data.shiftClosings.reduce((sum, row) => sum + row.cashIn, 0);
    const totalCashOut = data.shiftClosings.reduce((sum, row) => sum + row.cashOut, 0);
    data.summary.expectedDrawerCash = firstShiftOpeningCash + totalCashSales + totalCashIn - totalCashOut;
    data.summary.cashToDeposit = data.shiftClosings.reduce((sum, row) => sum + row.cashToDeposit, 0);
    // Closing float retained = the physical cash actually left in the drawer at the
    // end of the day, carried over to the next day. Earlier shifts hand their float to
    // the next shift as opening cash, so only the LAST shift's closing float remains in
    // the drawer. Summing every shift double-counts floats that were already passed on.
    const endDateShifts = data.shiftClosings.filter((row) => row.businessDate === dateRange.endDate);
    const sortedEndDateShifts = [...endDateShifts].sort((a, b) =>
      (a.closedAt ?? a.openedAt ?? `${a.businessDate}T00:00:00`).localeCompare(
        b.closedAt ?? b.openedAt ?? `${b.businessDate}T00:00:00`,
      ),
    );
    const lastShift = sortedEndDateShifts[sortedEndDateShifts.length - 1];
    data.summary.closingFloatTotal = lastShift
      ? Math.max(0, lastShift.actualClosingFloat ?? lastShift.closingFloat)
      : 0;

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
