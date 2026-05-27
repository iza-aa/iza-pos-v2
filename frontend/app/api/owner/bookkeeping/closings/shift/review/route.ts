import { NextRequest, NextResponse } from "next/server";
import {
  assertBookkeepingDatesAreOpen,
  createBookkeepingSupabaseClient,
} from "@/lib/services/bookkeeping/bookkeepingServer";

type ReviewShiftClosingRequest = {
  businessDate?: string;
  shiftId?: string;
  action?: "approve" | "reopen";
  note?: string | null;
};

type ShiftClosingRow = {
  id: string;
  shift_name?: string | null;
  status?: string | null;
  cash_counted?: number | string | null;
  cash_difference?: number | string | null;
  notes?: string | null;
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

  const body = (await request.json().catch(() => ({}))) as ReviewShiftClosingRequest;
  const businessDate = body.businessDate ?? "";
  const shiftId = String(body.shiftId ?? "").trim();
  const action = body.action;
  const note = String(body.note || "").trim();

  if (!DATE_PATTERN.test(businessDate) || !shiftId) {
    return NextResponse.json({ error: "Valid shift closing date and shift are required." }, { status: 400 });
  }

  if (action !== "approve" && action !== "reopen") {
    return NextResponse.json({ error: "Valid review action is required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    await assertBookkeepingDatesAreOpen({
      supabase,
      dates: [businessDate],
      action: "Reviewing shift closing",
    });

    const { data: closing, error: closingError } = await supabase
      .from("bookkeeping_shift_closings")
      .select("id, shift_name, status, cash_counted, cash_difference, notes")
      .eq("business_date", businessDate)
      .eq("shift_id", shiftId)
      .maybeSingle();

    if (closingError) throw closingError;

    const closingRow = closing as ShiftClosingRow | null;

    if (!closingRow?.id) {
      return NextResponse.json({ error: "Shift closing draft was not found." }, { status: 404 });
    }

    if (action === "approve" && (closingRow.cash_counted === null || closingRow.cash_counted === undefined)) {
      return NextResponse.json({ error: "Cash counted must be submitted before approving this shift." }, { status: 409 });
    }

    if (action === "approve" && closingRow.status === "closed") {
      return NextResponse.json({ success: true, status: "closed" });
    }

    const nextStatus = action === "approve"
      ? "closed"
      : closingRow.status === "closed"
        ? "reopened"
        : "needs_review";
    const nextNote = note
      ? `${closingRow.notes ? `${closingRow.notes}\n` : ""}Owner review: ${note}`
      : closingRow.notes;

    const { error: updateError } = await supabase
      .from("bookkeeping_shift_closings")
      .update({
        status: nextStatus,
        notes: nextNote || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", closingRow.id);

    if (updateError) throw updateError;

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: "owner",
      action: "UPDATE",
      action_category: "FINANCIAL",
      action_description: action === "approve"
        ? `Approved shift closing for ${closingRow.shift_name || shiftId}`
        : `Reopened shift closing for ${closingRow.shift_name || shiftId}`,
      resource_type: "Bookkeeping Shift Closing",
      resource_id: closingRow.id,
      resource_name: closingRow.shift_name || shiftId,
      previous_value: {
        status: closingRow.status,
        cashCounted: closingRow.cash_counted,
        cashDifference: closingRow.cash_difference,
      },
      new_value: { businessDate, shiftId, status: nextStatus, note: note || null },
      changes_summary: [`Shift closing status changed to ${nextStatus}`],
      severity: action === "approve" ? "info" : "warning",
      tags: ["bookkeeping", "shift-closing", "owner-review"],
      notes: note || null,
      is_reversible: action === "approve",
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error("Failed to review shift closing:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Shift closing could not be reviewed.",
      },
      { status: 500 },
    );
  }
}
