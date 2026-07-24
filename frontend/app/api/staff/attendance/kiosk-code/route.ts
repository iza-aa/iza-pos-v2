import { NextRequest, NextResponse } from "next/server";
import {
  canOpenAttendanceKiosk,
  createAttendanceServiceClient,
  getVerifiedAttendanceStaff,
} from "@/lib/services/attendance/attendanceServer";

type PresenceCode = {
  id: string;
  code: string;
  expires_at: string;
  attendance_date: string;
  is_active: boolean;
  used_count: number | null;
};

const getKioskRequester = async (request: NextRequest) => {
  const staff = await getVerifiedAttendanceStaff(request);

  if (!staff) {
    return {
      error: NextResponse.json(
        { success: false, error: "Staff authentication is required." },
        { status: 401 },
      ),
    };
  }

  if (!canOpenAttendanceKiosk(staff)) {
    return {
      error: NextResponse.json(
        { success: false, error: "Cashier access is required." },
        { status: 403 },
      ),
    };
  }

  return { supabase: createAttendanceServiceClient() };
};

const getPresenceCode = (data: unknown): PresenceCode | null => {
  if (!Array.isArray(data) || !data[0]) return null;

  const code = data[0] as Partial<PresenceCode>;
  return typeof code.code === "string" && code.code.trim() ? (code as PresenceCode) : null;
};

const getCodeResponse = async (
  request: NextRequest,
  rpcName: "get_active_presence_code" | "rotate_presence_code",
) => {
  const requester = await getKioskRequester(request);
  if ("error" in requester) return requester.error;

  try {
    const { data, error } = await requester.supabase.rpc(rpcName);
    if (error) throw error;

    const code = getPresenceCode(data);
    if (!code) {
      return NextResponse.json(
        { success: false, error: "Attendance QR is unavailable." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: code });
  } catch (error) {
    console.error("Failed to load attendance kiosk code:", error);
    return NextResponse.json(
      { success: false, error: "Attendance QR is unavailable." },
      { status: 500 },
    );
  }
};

export async function GET(request: NextRequest) {
  return getCodeResponse(request, "get_active_presence_code");
}

export async function POST(request: NextRequest) {
  return getCodeResponse(request, "rotate_presence_code");
}
