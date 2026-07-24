import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import {
  INTERNAL_SESSION_COOKIE,
  verifyInternalSessionToken,
} from "@/lib/auth/internalSession";
import { normalizeStaffPosition, type StaffPosition } from "@/lib/staff/positions";

type StaffPositionRow = {
  position?: unknown;
  is_active?: unknown;
};

type StaffRow = {
  id: string;
  role: string;
  status: string;
  staff_code: string | null;
  staff_type: string | null;
  staff_positions?: StaffPositionRow[] | null;
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

const getActivePositions = (staff: StaffRow): StaffPosition[] => {
  const positionRows = Array.isArray(staff.staff_positions)
    ? staff.staff_positions
    : [];
  const activePositions = positionRows
    .filter((position) => position.is_active !== false)
    .map((position) => normalizeStaffPosition(position.position))
    .filter((position): position is StaffPosition => Boolean(position));

  if (positionRows.length > 0) return Array.from(new Set(activePositions));

  const legacyPosition = normalizeStaffPosition(staff.staff_type);
  return legacyPosition ? [legacyPosition] : [];
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
    .select(
      "id, role, status, staff_code, staff_type, staff_positions(position, is_active)",
    )
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

  return {
    id: staff.id,
    role: "staff",
    status: "active",
    staffCode,
    positions: getActivePositions(staff),
  };
};

export const canOpenAttendanceKiosk = (staff: VerifiedAttendanceStaff) =>
  staff.positions.includes("cashier");
