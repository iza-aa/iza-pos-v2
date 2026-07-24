import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import {
  INTERNAL_SESSION_COOKIE,
  verifyInternalSessionToken,
} from "@/lib/auth/internalSession";
import { normalizeStaffPosition, type StaffPosition } from "@/lib/staff/positions";
import { ATTENDANCE_STAFF_SELECT } from "./attendanceStaffQuery";

type StaffPositionRow = {
  position?: unknown;
  is_active?: unknown;
};

type StaffRow = {
  id: string;
  role: string;
  status: string;
  staff_code: string | null;
};

export type VerifiedAttendanceStaff = {
  id: string;
  role: "staff";
  status: "active";
  staffCode: string;
  positions: StaffPosition[];
};

export const createAttendanceServiceClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Attendance service configuration is unavailable.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const getActivePositions = (
  positionRows: StaffPositionRow[] | null,
): StaffPosition[] => {
  const rows = Array.isArray(positionRows) ? positionRows : [];
  const activePositions = rows
    .filter((position) => position.is_active !== false)
    .map((position) => normalizeStaffPosition(position.position))
    .filter((position): position is StaffPosition => Boolean(position));

  return Array.from(new Set(activePositions));
};

export const getVerifiedAttendanceStaff = async (
  request: NextRequest,
): Promise<VerifiedAttendanceStaff | null> => {
  const session = await verifyInternalSessionToken(
    request.cookies.get(INTERNAL_SESSION_COOKIE)?.value,
  ).catch(() => null);

  if (!session || session.role !== "staff") return null;

  const supabase = createAttendanceServiceClient();
  const { data, error } = await supabase
    .from("staff")
    .select(ATTENDANCE_STAFF_SELECT)
    .eq("id", session.sub)
    .maybeSingle();

  if (error || !data) return null;

  const staff = data as StaffRow;
  const staffCode = String(staff.staff_code ?? "").trim();

  if (
    staff.id !== session.sub ||
    staff.role !== "staff" ||
    staff.status !== "active" ||
    !staffCode
  ) {
    return null;
  }

  const { data: positions, error: positionsError } = await supabase
    .from("staff_positions")
    .select("position, is_active")
    .eq("staff_id", staff.id);

  if (positionsError) {
    console.warn("Attendance position lookup failed.", positionsError);
  }

  return {
    id: staff.id,
    role: "staff",
    status: "active",
    staffCode,
    positions: getActivePositions(
      positionsError ? null : (positions as StaffPositionRow[] | null),
    ),
  };
};

export const canOpenAttendanceKiosk = (staff: VerifiedAttendanceStaff) =>
  staff.positions.includes("cashier");
