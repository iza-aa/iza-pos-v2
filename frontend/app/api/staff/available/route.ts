import { NextRequest, NextResponse } from "next/server";
import {
  INTERNAL_SESSION_COOKIE,
  verifyInternalSessionToken,
} from "@/lib/auth/internalSession";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";
import {
  buildAvailableStaffRows,
  getIsoWeekdayFromDateString,
  getJakartaDateString,
  isValidDateString,
  parseAvailabilityPositions,
  type AvailabilityAttendanceRecord,
  type AvailabilityScheduleRecord,
  type AvailabilityStaffRecord,
} from "@/lib/staff/availability";

const getHeaderRequester = (request: NextRequest) => ({
  id: request.headers.get("x-user-id") ?? "",
  role: request.headers.get("x-user-role") ?? "",
});

const getRequester = async (request: NextRequest) => {
  const session = await verifyInternalSessionToken(
    request.cookies.get(INTERNAL_SESSION_COOKIE)?.value,
  ).catch(() => null);

  if (session?.sub && session.role) {
    return { id: session.sub, role: session.role };
  }

  return getHeaderRequester(request);
};

export async function GET(request: NextRequest) {
  const requester = await getRequester(request);

  if (
    !requester.id ||
    !["owner", "manager", "staff"].includes(requester.role)
  ) {
    return NextResponse.json(
      { error: "Authenticated staff access required." },
      { status: 403 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const dateParam = String(searchParams.get("date") ?? "").trim();
  const date = dateParam || getJakartaDateString();

  if (!isValidDateString(date)) {
    return NextResponse.json(
      { error: "Date must use YYYY-MM-DD format." },
      { status: 400 },
    );
  }

  const requestedPositions = parseAvailabilityPositions([
    ...searchParams.getAll("position"),
    searchParams.get("positions"),
  ]);
  const includeUnavailable =
    searchParams.get("includeUnavailable") === "true";
  const weekday = getIsoWeekdayFromDateString(date);

  try {
    const supabase = createBookkeepingSupabaseClient();
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select(
        `
          id,
          name,
          staff_code,
          role,
          staff_type,
          status,
          profile_picture,
          staff_positions (
            id,
            staff_id,
            position,
            is_primary,
            is_active
          )
        `,
      )
      .eq("role", "staff")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (staffError) throw staffError;

    const staff = (staffData ?? []) as AvailabilityStaffRecord[];
    const staffIds = staff.map((staffMember) => staffMember.id);

    if (staffIds.length === 0) {
      return NextResponse.json({
        data: [],
        available: [],
        unavailable: [],
        meta: {
          date,
          weekday,
          positions: requestedPositions,
          total: 0,
          available: 0,
          unavailable: 0,
        },
      });
    }

    const [attendanceResult, dailyScheduleResult, weeklyScheduleResult] =
      await Promise.all([
        supabase
          .from("attendance")
          .select("staff_id, shift_id, attendance_date, clock_in_at, clock_out_at")
          .in("staff_id", staffIds)
          .eq("attendance_date", date),
        supabase
          .from("staff_shift_daily_assignments")
          .select("staff_id, shift_id, status")
          .in("staff_id", staffIds)
          .eq("work_date", date)
          .in("status", ["assigned", "completed"]),
        supabase
          .from("staff_shift_weekly_assignments")
          .select("staff_id, shift_id, status")
          .in("staff_id", staffIds)
          .eq("weekday", weekday)
          .eq("status", "assigned"),
      ]);

    if (attendanceResult.error) throw attendanceResult.error;
    if (dailyScheduleResult.error) throw dailyScheduleResult.error;
    if (weeklyScheduleResult.error) throw weeklyScheduleResult.error;

    const rows = buildAvailableStaffRows({
      staff,
      attendance:
        (attendanceResult.data ?? []) as AvailabilityAttendanceRecord[],
      dailySchedules:
        (dailyScheduleResult.data ?? []) as AvailabilityScheduleRecord[],
      weeklySchedules:
        (weeklyScheduleResult.data ?? []) as AvailabilityScheduleRecord[],
      requestedPositions,
    });
    const available = rows.filter((staffMember) => staffMember.isAvailable);
    const unavailable = rows.filter((staffMember) => !staffMember.isAvailable);

    return NextResponse.json({
      data: includeUnavailable ? rows : available,
      available,
      unavailable,
      meta: {
        date,
        weekday,
        positions: requestedPositions,
        total: rows.length,
        available: available.length,
        unavailable: unavailable.length,
      },
    });
  } catch (error) {
    console.error("Failed to load available staff:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Available staff could not be loaded.",
      },
      { status: 500 },
    );
  }
}
