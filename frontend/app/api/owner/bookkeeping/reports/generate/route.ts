import { NextRequest, NextResponse } from "next/server";
import type { DateRangeValue } from "@/app/components/shared";
import { loadBookkeepingDashboardDataFromClient } from "@/lib/services/bookkeeping/bookkeepingService";
import {
  createBookkeepingSupabaseClient,
  saveGeneratedBookkeepingReport,
} from "@/lib/services/bookkeeping/bookkeepingServer";

type GenerateReportRequest = {
  dateRange?: Partial<DateRangeValue>;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

const normalizeDateRange = (
  value: GenerateReportRequest["dateRange"],
): DateRangeValue | null => {
  const startDate = value?.startDate ?? "";
  const endDate = value?.endDate ?? "";

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) return null;
  if (startDate > endDate) return null;

  return { startDate, endDate };
};

async function logReportActivity({
  ownerId,
  ownerName,
  dateRange,
}: {
  ownerId: string;
  ownerName: string;
  dateRange: DateRangeValue;
}) {
  try {
    const supabase = createBookkeepingSupabaseClient();
    await supabase.from("activity_logs").insert({
      user_id: ownerId,
      user_name: ownerName,
      user_role: "owner",
      action: "CREATE",
      action_category: "REPORT",
      action_description: `Generated bookkeeping report for ${dateRange.startDate} to ${dateRange.endDate}`,
      resource_type: "Bookkeeping Report",
      resource_id: `${dateRange.startDate}_${dateRange.endDate}`,
      resource_name: "Bookkeeping Summary Report",
      previous_value: null,
      new_value: { dateRange },
      changes_summary: ["Generated bookkeeping report snapshot"],
      severity: "info",
      tags: ["bookkeeping", "report", "generate"],
      notes: null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${ownerId}`,
    });
  } catch (error) {
    console.warn("Failed to log bookkeeping report activity:", error);
  }
}

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as GenerateReportRequest;
  const dateRange = normalizeDateRange(body.dateRange);

  if (!dateRange) {
    return NextResponse.json({ error: "Valid date range is required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    const data = await loadBookkeepingDashboardDataFromClient(supabase, dateRange);
    const result = await saveGeneratedBookkeepingReport({
      supabase,
      data,
      requester,
    });

    await logReportActivity({
      ownerId: requester.id,
      ownerName: requester.name,
      dateRange,
    });

    return NextResponse.json({
      success: true,
      reports: result,
    });
  } catch (error) {
    console.error("Failed to generate bookkeeping report:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Bookkeeping report could not be generated.",
      },
      { status: 500 },
    );
  }
}
