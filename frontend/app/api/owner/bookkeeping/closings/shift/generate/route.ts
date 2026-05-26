import { NextRequest, NextResponse } from "next/server";
import type { DateRangeValue } from "@/app/components/shared";
import { loadBookkeepingDashboardDataFromClient } from "@/lib/services/bookkeeping/bookkeepingService";
import {
  assertBookkeepingDateRangeIsOpen,
  createBookkeepingSupabaseClient,
  saveGeneratedShiftClosings,
} from "@/lib/services/bookkeeping/bookkeepingServer";

type GenerateShiftClosingRequest = {
  dateRange?: Partial<DateRangeValue>;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

const normalizeDateRange = (
  value: GenerateShiftClosingRequest["dateRange"],
): DateRangeValue | null => {
  const startDate = value?.startDate ?? "";
  const endDate = value?.endDate ?? "";

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) return null;
  if (startDate > endDate) return null;

  return { startDate, endDate };
};

async function logShiftClosingActivity({
  ownerId,
  ownerName,
  dateRange,
  closingCount,
}: {
  ownerId: string;
  ownerName: string;
  dateRange: DateRangeValue;
  closingCount: number;
}) {
  try {
    const supabase = createBookkeepingSupabaseClient();
    await supabase.from("activity_logs").insert({
      user_id: ownerId,
      user_name: ownerName,
      user_role: "owner",
      action: "CREATE",
      action_category: "REPORT",
      action_description: `Generated shift closing draft for ${dateRange.startDate} to ${dateRange.endDate}`,
      resource_type: "Bookkeeping Shift Closing",
      resource_id: `${dateRange.startDate}_${dateRange.endDate}`,
      resource_name: "Shift Closing Draft",
      previous_value: null,
      new_value: { dateRange, closingCount },
      changes_summary: [`Generated ${closingCount} shift closing draft(s)`],
      severity: "info",
      tags: ["bookkeeping", "shift-closing", "generate"],
      notes: null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${ownerId}`,
    });
  } catch (error) {
    console.warn("Failed to log shift closing generation activity:", error);
  }
}

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as GenerateShiftClosingRequest;
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
      action: "Generating shift closing",
    });

    const data = await loadBookkeepingDashboardDataFromClient(supabase, dateRange);
    const result = await saveGeneratedShiftClosings({
      supabase,
      shiftClosings: data.shiftClosings,
      requester,
    });

    await logShiftClosingActivity({
      ownerId: requester.id,
      ownerName: requester.name,
      dateRange,
      closingCount: data.shiftClosings.length,
    });

    return NextResponse.json({
      success: true,
      shiftClosings: {
        total: data.shiftClosings.length,
        ...result,
      },
    });
  } catch (error) {
    console.error("Failed to generate shift closing draft:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Shift closing draft could not be generated.",
      },
      { status: 500 },
    );
  }
}
