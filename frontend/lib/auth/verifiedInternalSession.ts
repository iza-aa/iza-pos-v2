import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import {
  INTERNAL_SESSION_COOKIE,
  verifyInternalSessionToken,
} from "@/lib/auth/internalSession";
import {
  getPrimaryStaffPosition,
  getStaffPositions,
} from "@/lib/staff/positions";

export async function getVerifiedInternalSessionUser(request: NextRequest) {
  const payload = await verifyInternalSessionToken(
    request.cookies.get(INTERNAL_SESSION_COOKIE)?.value,
  ).catch(() => null);
  if (!payload) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("staff")
    .select(
      "id,name,role,status,staff_code,profile_picture,staff_positions(id,staff_id,position,is_primary,is_active)",
    )
    .eq("id", payload.sub)
    .maybeSingle();

  if (error || !data || data.status !== "active" || data.role !== payload.role) {
    return null;
  }

  const staffPositions = getStaffPositions(data);
  const primaryPosition = getPrimaryStaffPosition(data);

  return {
    ...data,
    role: payload.role,
    staff_type: primaryPosition,
    staff_positions: staffPositions,
    primary_position: primaryPosition,
  };
}
