import { NextRequest, NextResponse } from "next/server";
import {
  clearSupabaseAccessTokenCookie,
  setSupabaseAccessTokenCookie,
} from "@/lib/auth/supabaseAccessToken";
import { getVerifiedInternalSessionUser } from "@/lib/auth/verifiedInternalSession";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  try {
    const user = await getVerifiedInternalSessionUser(request);
    if (!user) {
      const response = NextResponse.json(
        { error: "Authenticated access required." },
        { status: 401 },
      );
      clearSupabaseAccessTokenCookie(response);
      return response;
    }

    const response = new NextResponse(null, { status: 204 });
    await setSupabaseAccessTokenCookie(response, {
      app_role: user.role,
      sub: user.id,
      staff_type: user.role === "staff" ? user.primary_position ?? undefined : undefined,
    });
    return response;
  } catch (error) {
    console.error("Failed to refresh Supabase access token", error);
    return NextResponse.json({ error: "Unable to refresh session." }, { status: 500 });
  }
}
