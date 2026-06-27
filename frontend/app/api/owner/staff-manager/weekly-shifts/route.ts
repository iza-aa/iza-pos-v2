import { NextRequest, NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";
import {
  INTERNAL_SESSION_COOKIE,
  verifyInternalSessionToken,
} from "@/lib/auth/internalSession";

type WeeklyShiftPayload = {
  staffId?: string;
  overrides?: Array<{
    weekday?: number;
    shiftId?: string;
  }>;
};

const getAuthorizedRequester = async (request: NextRequest) => {
  const session = await verifyInternalSessionToken(
    request.cookies.get(INTERNAL_SESSION_COOKIE)?.value,
  ).catch(() => null);

  if (!session || (session.role !== "owner" && session.role !== "manager")) {
    return null;
  }

  const supabase = createBookkeepingSupabaseClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, role, status")
    .eq("id", session.sub)
    .maybeSingle();

  if (
    error ||
    !data ||
    data.status !== "active" ||
    data.role !== session.role
  ) {
    return null;
  }

  return {
    requester: {
      id: data.id,
      name: data.name ?? session.name,
      role: data.role,
    },
    supabase,
  };
};

export async function POST(request: NextRequest) {
  const authorized = await getAuthorizedRequester(request);

  if (!authorized) {
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
    const { requester, supabase } = authorized;

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
  const authorized = await getAuthorizedRequester(request);

  if (!authorized) {
    return NextResponse.json({ error: "Owner or manager access required." }, { status: 403 });
  }

  const staffId = String(request.nextUrl.searchParams.get("staffId") || "").trim();

  try {
    const { supabase } = authorized;

    if (!staffId) {
      const [assignmentsResult, staffResult, shiftsResult] = await Promise.all([
        supabase
          .from("staff_shift_weekly_assignments")
          .select("staff_id, weekday, shift_id")
          .eq("status", "assigned")
          .order("weekday", { ascending: true }),
        supabase
          .from("staff")
          .select("id, name, staff_code, role, status, profile_picture")
          .in("role", ["staff", "manager"])
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
    }

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
