import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  INTERNAL_SESSION_COOKIE,
  verifyInternalSessionToken,
} from "@/lib/auth/internalSession";
import {
  normalizeStaffPosition,
  normalizeStaffPositions,
} from "@/lib/staff/positions";

type PositionPayload = {
  staffId?: string;
  positions?: unknown[];
  primaryPosition?: unknown;
};

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export async function POST(request: NextRequest) {
  const session = await verifyInternalSessionToken(
    request.cookies.get(INTERNAL_SESSION_COOKIE)?.value,
  ).catch(() => null);

  if (!session || (session.role !== "owner" && session.role !== "manager")) {
    return NextResponse.json(
      { error: "Owner or manager access required." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as PositionPayload;
  const staffId = String(body.staffId ?? "").trim();
  const positions = normalizeStaffPositions(body.positions);
  const primaryPosition = normalizeStaffPosition(body.primaryPosition);

  if (!staffId) {
    return NextResponse.json({ error: "Staff is required." }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: targetStaff, error: staffError } = await supabase
    .from("staff")
    .select("id, role")
    .eq("id", staffId)
    .maybeSingle();

  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 400 });
  }

  if (!targetStaff) {
    return NextResponse.json({ error: "Staff not found." }, { status: 404 });
  }

  if (
    targetStaff.role === "staff" &&
    (positions.length === 0 ||
      !primaryPosition ||
      !positions.includes(primaryPosition))
  ) {
    return NextResponse.json(
      { error: "Select at least one position and one valid primary position." },
      { status: 400 },
    );
  }

  const { error } = await supabase.rpc("set_staff_positions", {
    p_staff_id: staffId,
    p_positions: targetStaff.role === "staff" ? positions : [],
    p_primary_position:
      targetStaff.role === "staff" ? primaryPosition : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
