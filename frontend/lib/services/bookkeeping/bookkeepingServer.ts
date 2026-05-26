import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  BookkeepingDashboardData,
  BookkeepingEntry,
  BookkeepingException,
  ShiftClosingRow,
} from "./bookkeepingTypes";

export function createBookkeepingSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Bookkeeping API requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type BookkeepingRequester = {
  id: string;
  name: string;
  role: string;
};

type ClosedDailyClosingRow = {
  business_date: string;
};

const formatLockedDates = (dates: string[]) => {
  return dates.length === 1 ? dates[0] : dates.join(", ");
};

export async function assertBookkeepingDatesAreOpen({
  supabase,
  dates,
  action,
}: {
  supabase: SupabaseClient;
  dates: string[];
  action: string;
}) {
  const uniqueDates = Array.from(new Set(dates.filter(Boolean)));
  if (uniqueDates.length === 0) return;

  const { data, error } = await supabase
    .from("bookkeeping_daily_closings")
    .select("business_date")
    .in("business_date", uniqueDates)
    .eq("status", "closed");

  if (error) throw error;

  const lockedDates = ((data || []) as ClosedDailyClosingRow[]).map((row) => row.business_date);
  if (lockedDates.length > 0) {
    throw new Error(`${action} is locked because daily closing is closed for ${formatLockedDates(lockedDates)}. Reopen daily closing first.`);
  }
}

export async function assertBookkeepingDateRangeIsOpen({
  supabase,
  startDate,
  endDate,
  action,
}: {
  supabase: SupabaseClient;
  startDate: string;
  endDate: string;
  action: string;
}) {
  const { data, error } = await supabase
    .from("bookkeeping_daily_closings")
    .select("business_date")
    .gte("business_date", startDate)
    .lte("business_date", endDate)
    .eq("status", "closed");

  if (error) throw error;

  const lockedDates = ((data || []) as ClosedDailyClosingRow[]).map((row) => row.business_date);
  if (lockedDates.length > 0) {
    throw new Error(`${action} is locked because daily closing is closed for ${formatLockedDates(lockedDates)}. Reopen daily closing first.`);
  }
}

export const mapEntryStatusForDatabase = (status: BookkeepingEntry["status"]) => {
  if (status === "cost_data_needed") return "needs_review";
  return status;
};

export async function saveGeneratedBookkeepingEntries({
  supabase,
  entries,
  requester,
}: {
  supabase: SupabaseClient;
  entries: BookkeepingEntry[];
  requester: BookkeepingRequester;
}) {
  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    const sourceTable = entry.sourceTable || null;
    const sourceId = entry.sourceId || null;
    const basePayload = {
      business_date: entry.businessDate || new Date().toISOString().slice(0, 10),
      entry_at: entry.entryAt || new Date().toISOString(),
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      direction: entry.direction,
      payment_method: entry.paymentMethod || null,
      source_table: sourceTable,
      source_id: sourceId,
      source_label: entry.source,
      status: mapEntryStatusForDatabase(entry.status),
      note: entry.note || null,
      updated_at: new Date().toISOString(),
    };

    const existingQuery = supabase
      .from("bookkeeping_entries")
      .select("id")
      .eq("type", entry.type)
      .eq("source_table", sourceTable)
      .eq("source_id", sourceId)
      .maybeSingle();

    const { data: existing, error: existingError } = await existingQuery;
    if (existingError) throw existingError;

    if (existing?.id) {
      const { error } = await supabase
        .from("bookkeeping_entries")
        .update(basePayload)
        .eq("id", existing.id);

      if (error) throw error;
      updated += 1;
      continue;
    }

    const { error } = await supabase.from("bookkeeping_entries").insert({
      ...basePayload,
      created_by: requester.id,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    created += 1;
  }

  return { created, updated };
}

export async function saveGeneratedBookkeepingExceptions({
  supabase,
  exceptions,
}: {
  supabase: SupabaseClient;
  exceptions: BookkeepingException[];
}) {
  let created = 0;
  let updated = 0;

  for (const exception of exceptions) {
    const businessDate = exception.businessDate || new Date().toISOString().slice(0, 10);
    const payload = {
      business_date: businessDate,
      severity: exception.severity,
      type: exception.type,
      description: exception.description,
      source_table: null,
      source_id: exception.id,
      suggested_fix: exception.suggestedFix,
      status: exception.status,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabase
      .from("bookkeeping_exceptions")
      .select("id")
      .eq("source_id", exception.id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.id) {
      const { error } = await supabase
        .from("bookkeeping_exceptions")
        .update(payload)
        .eq("id", existing.id);

      if (error) throw error;
      updated += 1;
      continue;
    }

    const { error } = await supabase.from("bookkeeping_exceptions").insert({
      ...payload,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    created += 1;
  }

  return { created, updated };
}

export async function saveGeneratedShiftClosings({
  supabase,
  shiftClosings,
  requester,
}: {
  supabase: SupabaseClient;
  shiftClosings: ShiftClosingRow[];
  requester: BookkeepingRequester;
}) {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const hasRealShiftRows = shiftClosings.some((closing) => !closing.id.startsWith("auto-"));
  const businessDates = Array.from(new Set(shiftClosings.map((closing) => closing.businessDate)));

  if (hasRealShiftRows && businessDates.length > 0) {
    const { error } = await supabase
      .from("bookkeeping_shift_closings")
      .delete()
      .in("business_date", businessDates)
      .like("shift_id", "auto-%");

    if (error) throw error;
  }

  for (const closing of shiftClosings) {
    const shiftId = closing.id;
    const payload = {
      business_date: closing.businessDate,
      shift_id: shiftId,
      shift_name: closing.shiftName,
      opened_at: closing.openedAt || null,
      closed_at: closing.closedAt || null,
      submitted_by: requester.id,
      gross_sales: closing.grossSales,
      discount_total: closing.discountTotal,
      net_sales: closing.netSales,
      opening_cash: closing.openingCash,
      cash_expected: closing.cashExpected,
      expected_drawer_cash: closing.expectedDrawerCash,
      cash_counted: closing.cashCounted ?? null,
      cash_difference: closing.cashDifference ?? null,
      cash_to_deposit: closing.cashToDeposit,
      closing_float: closing.closingFloat,
      float_policy: closing.floatPolicy,
      non_cash_sales: closing.nonCashSales,
      cancelled_count: closing.cancelledCount,
      refund_total: 0,
      status: closing.status,
      notes: "Auto-generated from selected operational data.",
      snapshot_json: {
        generatedBy: requester.id,
        generatedByName: requester.name,
        generatedAt: new Date().toISOString(),
        source: "owner_bookkeeping_shift_generate",
      },
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabase
      .from("bookkeeping_shift_closings")
      .select("id, status")
      .eq("business_date", closing.businessDate)
      .eq("shift_id", shiftId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.id) {
      if (existing.status === "submitted" || existing.status === "closed") {
        skipped += 1;
        continue;
      }

      const { error } = await supabase
        .from("bookkeeping_shift_closings")
        .update(payload)
        .eq("id", existing.id);

      if (error) throw error;
      updated += 1;
      continue;
    }

    const { error } = await supabase.from("bookkeeping_shift_closings").insert({
      ...payload,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    created += 1;
  }

  return { created, updated, skipped };
}

export async function saveGeneratedBookkeepingReport({
  supabase,
  data,
  requester,
}: {
  supabase: SupabaseClient;
  data: BookkeepingDashboardData;
  requester: BookkeepingRequester;
}) {
  const reportType = "bookkeeping_summary";
  const periodStart = data.dateRange.startDate;
  const periodEnd = data.dateRange.endDate;

  const { error } = await supabase.from("bookkeeping_reports").insert({
    report_type: reportType,
    period_start: periodStart,
    period_end: periodEnd,
    status: "generated",
    snapshot_json: {
      dateRange: data.dateRange,
      summary: data.summary,
      paymentBreakdown: data.paymentBreakdown,
      entries: data.entries,
      expenses: data.expenses,
      menuMargins: data.menuMargins,
      shiftClosings: data.shiftClosings,
      dailyClosing: data.dailyClosing,
      exceptions: data.exceptions,
      generatedAt: new Date().toISOString(),
      generatedByName: requester.name,
    },
    generated_by: requester.id,
  });

  if (error) throw error;

  return { created: 1 };
}
