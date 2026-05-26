import { NextRequest, NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";

type ReopenDailyRequest = {
  businessDate?: string;
  reason?: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || requester.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as ReopenDailyRequest;
  const businessDate = body.businessDate ?? "";
  const reason = String(body.reason ?? "").trim();

  if (!DATE_PATTERN.test(businessDate)) {
    return NextResponse.json({ error: "Valid business date is required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    const { data: closing, error: closingError } = await supabase
      .from("bookkeeping_daily_closings")
      .select("id, status, notes")
      .eq("business_date", businessDate)
      .maybeSingle();

    if (closingError) throw closingError;

    if (!closing?.id) {
      return NextResponse.json({ error: "Daily closing was not found." }, { status: 404 });
    }

    const reopenedNote = [
      closing.notes,
      `Reopened by ${requester.name}${reason ? `: ${reason}` : ""}`,
    ].filter(Boolean).join("\n");

    const { error: updateError } = await supabase
      .from("bookkeeping_daily_closings")
      .update({
        status: "reopened",
        approved_by: null,
        approved_at: null,
        notes: reopenedNote || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", closing.id);

    if (updateError) throw updateError;

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: "owner",
      action: "UPDATE",
      action_category: "FINANCIAL",
      action_description: `Reopened daily bookkeeping for ${businessDate}`,
      resource_type: "Bookkeeping Daily Closing",
      resource_id: closing.id,
      resource_name: "Daily Closing",
      previous_value: { status: closing.status },
      new_value: { businessDate, status: "reopened", reason },
      changes_summary: ["Daily closing reopened"],
      severity: "warning",
      tags: ["bookkeeping", "daily-closing", "reopen"],
      notes: reason || null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({ success: true, status: "reopened" });
  } catch (error) {
    console.error("Failed to reopen daily bookkeeping:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Daily closing could not be reopened.",
      },
      { status: 500 },
    );
  }
}
