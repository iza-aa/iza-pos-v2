import { NextRequest, NextResponse } from "next/server";
import type { DateRangeValue } from "@/app/components/shared";
import { loadBookkeepingDashboardDataFromClient } from "@/lib/services/bookkeeping/bookkeepingService";
import {
  assertBookkeepingDateRangeIsOpen,
  createBookkeepingSupabaseClient,
  saveGeneratedBookkeepingEntries,
  saveGeneratedBookkeepingExceptions,
} from "@/lib/services/bookkeeping/bookkeepingServer";

type GenerateLedgerRequest = {
  dateRange?: Partial<DateRangeValue>;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

const normalizeDateRange = (value: GenerateLedgerRequest["dateRange"]): DateRangeValue | null => {
  const startDate = value?.startDate ?? "";
  const endDate = value?.endDate ?? "";

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) return null;
  if (startDate > endDate) return null;

  return { startDate, endDate };
};

const extractOrderIdFromSource = (source: string) => {
  return source.match(/order #([a-f0-9-]{20,})/i)?.[1] ?? null;
};

const getLedgerGroupKey = (entry: { sourceTable?: string; sourceId?: string; id: string; source: string }) => {
  if (entry.sourceTable === "orders" && entry.sourceId) return `order:${entry.sourceId}`;
  const orderIdFromSource = extractOrderIdFromSource(entry.source);
  if (orderIdFromSource) return `order:${orderIdFromSource}`;
  if (entry.sourceTable && entry.sourceId) return `${entry.sourceTable}:${entry.sourceId}`;
  return entry.id;
};

async function logBookkeepingActivity({
  ownerId,
  ownerName,
  dateRange,
  entryCount,
  exceptionCount,
}: {
  ownerId: string;
  ownerName: string;
  dateRange: DateRangeValue;
  entryCount: number;
  exceptionCount: number;
}) {
  try {
    const supabase = createBookkeepingSupabaseClient();
    await supabase.from("activity_logs").insert({
      user_id: ownerId,
      user_name: ownerName,
      user_role: "owner",
      action: "CREATE",
      action_category: "REPORT",
      action_description: `Generated bookkeeping ledger for ${dateRange.startDate} to ${dateRange.endDate}`,
      resource_type: "Bookkeeping Ledger",
      resource_id: `${dateRange.startDate}_${dateRange.endDate}`,
      resource_name: "Auto Ledger",
      previous_value: null,
      new_value: { dateRange, entryCount, exceptionCount },
      changes_summary: [
        `Generated ${entryCount} ledger entries`,
        `Generated ${exceptionCount} bookkeeping exceptions`,
      ],
      severity: exceptionCount > 0 ? "warning" : "info",
      tags: ["bookkeeping", "ledger", "generate"],
      notes: null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${ownerId}`,
    });
  } catch (error) {
    console.warn("Failed to log bookkeeping generation activity:", error);
  }
}

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as GenerateLedgerRequest;
  const dateRange = normalizeDateRange(body.dateRange);

  if (!dateRange) {
    return NextResponse.json({ error: "Valid date range is required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    await assertBookkeepingDateRangeIsOpen({
      supabase,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      action: "Generating ledger",
    });

    const data = await loadBookkeepingDashboardDataFromClient(supabase, dateRange);
    const entryResult = await saveGeneratedBookkeepingEntries({
      supabase,
      entries: data.entries,
      requester,
    });
    const exceptionResult = await saveGeneratedBookkeepingExceptions({
      supabase,
      exceptions: data.exceptions,
    });

    await logBookkeepingActivity({
      ownerId: requester.id,
      ownerName: requester.name,
      dateRange,
      entryCount: data.entries.length,
      exceptionCount: data.exceptions.length,
    });

    return NextResponse.json({
      success: true,
      entries: {
        total: data.entries.length,
        ...entryResult,
      },
      groups: {
        total: new Set(data.entries.map(getLedgerGroupKey)).size,
      },
      exceptions: {
        total: data.exceptions.length,
        ...exceptionResult,
      },
    });
  } catch (error) {
    console.error("Failed to generate bookkeeping ledger:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Bookkeeping ledger could not be generated.",
      },
      { status: 500 },
    );
  }
}
