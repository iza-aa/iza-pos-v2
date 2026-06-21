import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  clearInternalSessionCookie,
  INTERNAL_SESSION_COOKIE,
  verifyInternalSessionToken,
} from "@/lib/auth/internalSession";

const getVerifiedUser = async (request: NextRequest) => {
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
    .select("id,name,role,status,staff_code,staff_type,profile_picture")
    .eq("id", payload.sub)
    .maybeSingle();

  if (error || !data || data.status !== "active" || data.role !== payload.role) {
    return null;
  }
  return data;
};

export async function GET(request: NextRequest) {
  const user = await getVerifiedUser(request);
  if (!user) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearInternalSessionCookie(response);
    return response;
  }
  return NextResponse.json({ authenticated: true, user });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearInternalSessionCookie(response);
  return response;
}
