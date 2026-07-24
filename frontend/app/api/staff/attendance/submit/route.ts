import { NextRequest, NextResponse } from "next/server";
import {
  createAttendanceServiceClient,
  getVerifiedAttendanceStaff,
} from "@/lib/services/attendance/attendanceServer";

type SubmitAttendanceBody = {
  code?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  accuracy?: unknown;
};

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function POST(request: NextRequest) {
  const staff = await getVerifiedAttendanceStaff(request);

  if (!staff) {
    return NextResponse.json(
      { success: false, error: "Staff authentication is required." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as SubmitAttendanceBody;
  const code = String(body.code ?? "").trim();
  const latitude = toFiniteNumber(body.latitude);
  const longitude = toFiniteNumber(body.longitude);
  const accuracy = toFiniteNumber(body.accuracy);

  if (
    !code ||
    latitude === null ||
    longitude === null ||
    accuracy === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    accuracy < 0
  ) {
    return NextResponse.json(
      { success: false, error: "Attendance location data is invalid." },
      { status: 400 },
    );
  }

  try {
    const supabase = createAttendanceServiceClient();
    const { data, error } = await supabase.rpc("submit_qr_attendance", {
      p_code: code,
      p_credential: staff.staffCode,
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy: accuracy,
    });

    if (error) {
      console.error("Attendance submission RPC rejected:", error);
      return NextResponse.json(
        { success: false, error: "Attendance could not be processed. Scan the latest QR again." },
        { status: 422 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Attendance submission failed:", error);
    return NextResponse.json(
      { success: false, error: "Attendance could not be processed. Please try again." },
      { status: 500 },
    );
  }
}
