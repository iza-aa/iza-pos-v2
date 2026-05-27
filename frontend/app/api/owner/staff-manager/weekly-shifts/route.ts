import { NextRequest, NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";

type WeeklyShiftPayload = {
  staffId?: string;
  overrides?: Array<{
    weekday?: number;
    shiftId?: string;
  }>;
};

const getRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  name: request.headers.get("x-user-name") ?? "Owner",
  role: request.headers.get("x-user-role") ?? "",
});

const getIsoWeekday = (businessDate: string) => {
  const [year, month, day] = businessDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
};

export async function POST(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || (requester.role !== "owner" && requester.role !== "manager")) {
    return NextResponse.json({ error: "Owner or manager access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as WeeklyShiftPayload;
  const staffId = String(body.staffId || "").trim();
  const overrides = Array.isArray(body.overrides) ? body.overrides : [];

  if (!staffId) {
    return NextResponse.json({ error: "Staff is required." }, { status: 400 });
  }

  const normalizedOverrides = overrides
    .map((override) => ({
      weekday: Number(override.weekday),
      shiftId: String(override.shiftId || "").trim(),
    }))
    .filter((override) => (
      Number.isInteger(override.weekday) &&
      override.weekday >= 1 &&
      override.weekday <= 7 &&
      Boolean(override.shiftId)
    ));

  const uniqueWeekdays = new Set(normalizedOverrides.map((override) => override.weekday));
  if (uniqueWeekdays.size !== normalizedOverrides.length) {
    return NextResponse.json({ error: "Each weekday can only have one shift override." }, { status: 400 });
  }

  try {
    const supabase = createBookkeepingSupabaseClient();

    const { error: deleteError } = await supabase
      .from("staff_shift_weekly_assignments")
      .delete()
      .eq("staff_id", staffId);

    if (deleteError) throw deleteError;

    if (normalizedOverrides.length > 0) {
      const { error: insertError } = await supabase
        .from("staff_shift_weekly_assignments")
        .insert(
          normalizedOverrides.map((override) => ({
            staff_id: staffId,
            weekday: override.weekday,
            shift_id: override.shiftId,
            status: "assigned",
            assigned_by: requester.id,
            updated_at: new Date().toISOString(),
          })),
        );

      if (insertError) throw insertError;

      const { data: dailyAssignments, error: dailyAssignmentsError } = await supabase
        .from("staff_shift_daily_assignments")
        .select("id, work_date")
        .eq("staff_id", staffId)
        .eq("status", "assigned");

      if (dailyAssignmentsError) throw dailyAssignmentsError;

      const overrideWeekdays = new Set(normalizedOverrides.map((override) => override.weekday));
      const conflictingDailyIds = (dailyAssignments || [])
        .filter((assignment) => overrideWeekdays.has(getIsoWeekday(String(assignment.work_date))))
        .map((assignment) => assignment.id)
        .filter(Boolean);

      if (conflictingDailyIds.length > 0) {
        const { error: deleteDailyError } = await supabase
          .from("staff_shift_daily_assignments")
          .delete()
          .in("id", conflictingDailyIds);

        if (deleteDailyError) throw deleteDailyError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update weekly shift schedule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Weekly shift schedule could not be updated." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const requester = getRequester(request);

  if (!requester.id || (requester.role !== "owner" && requester.role !== "manager")) {
    return NextResponse.json({ error: "Owner or manager access required." }, { status: 403 });
  }

  const staffId = String(request.nextUrl.searchParams.get("staffId") || "").trim();
  if (!staffId) return NextResponse.json({ error: "Staff is required." }, { status: 400 });

  try {
    const supabase = createBookkeepingSupabaseClient();
    const { data, error } = await supabase
      .from("staff_shift_weekly_assignments")
      .select("weekday, shift_id")
      .eq("staff_id", staffId)
      .eq("status", "assigned")
      .order("weekday", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("Failed to load weekly shift schedule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Weekly shift schedule could not be loaded." },
      { status: 500 },
    );
  }
}
