import { NextRequest, NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";

type SaveShiftAssignmentRequest = {
  staffId?: string;
  shiftId?: string;
  workDate?: string;
  status?: "assigned" | "completed" | "cancelled";
  note?: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

const requireOwner = (request: NextRequest) => {
  const requester = getRequester(request);
  if (!requester.id || requester.role !== "owner") return null;
  return requester;
};

export async function GET(request: NextRequest) {
  const requester = requireOwner(request);
  if (!requester) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const workDate = request.nextUrl.searchParams.get("workDate") ?? "";
  if (!DATE_PATTERN.test(workDate)) {
    return NextResponse.json({ error: "Valid work date is required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    const [assignmentsResult, staffResult, shiftsResult] = await Promise.all([
      supabase
        .from("staff_shift_daily_assignments")
        .select("*")
        .eq("work_date", workDate)
        .order("created_at", { ascending: true }),
      supabase
        .from("staff")
        .select("id, name, staff_code, role, status, shift_id")
        .eq("role", "staff")
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("shifts")
        .select("id, shift_name, start_time, end_time, is_active")
        .eq("is_active", true)
        .order("start_time", { ascending: true }),
    ]);

    if (assignmentsResult.error) throw assignmentsResult.error;
    if (staffResult.error) throw staffResult.error;
    if (shiftsResult.error) throw shiftsResult.error;

    return NextResponse.json({
      data: {
        assignments: assignmentsResult.data || [],
        staff: staffResult.data || [],
        shifts: shiftsResult.data || [],
      },
    });
  } catch (error) {
    console.error("Failed to load shift assignments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Shift assignments could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const requester = requireOwner(request);
  if (!requester) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as SaveShiftAssignmentRequest;
  const staffId = String(body.staffId || "").trim();
  const shiftId = String(body.shiftId || "").trim();
  const workDate = String(body.workDate || "").trim();
  const status = body.status || "assigned";

  if (!staffId || !shiftId || !DATE_PATTERN.test(workDate)) {
    return NextResponse.json({ error: "Staff, shift, and work date are required." }, { status: 400 });
  }

  if (!["assigned", "completed", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Valid assignment status is required." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();
    const payload = {
      staff_id: staffId,
      shift_id: shiftId,
      work_date: workDate,
      status,
      assigned_by: requester.id,
      note: body.note || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("staff_shift_daily_assignments")
      .upsert(payload, { onConflict: "staff_id,work_date" })
      .select("*")
      .single();

    if (error) throw error;

    await supabase.from("activity_logs").insert({
      user_id: requester.id,
      user_name: requester.name,
      user_role: "owner",
      action: "UPDATE",
      action_category: "STAFF_MANAGEMENT",
      action_description: `Saved daily shift assignment for ${workDate}`,
      resource_type: "Staff Shift Daily Assignment",
      resource_id: data?.id || `${staffId}-${workDate}`,
      resource_name: workDate,
      previous_value: null,
      new_value: payload,
      changes_summary: [`Assigned staff ${staffId} to shift ${shiftId} for ${workDate}`],
      severity: "info",
      tags: ["bookkeeping", "shift-assignment"],
      notes: body.note || null,
      is_reversible: false,
      ip_address: "0.0.0.0",
      device_info: "Server API",
      session_id: `bookkeeping-${requester.id}`,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to save shift assignment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Shift assignment could not be saved." },
      { status: 500 },
    );
  }
}
