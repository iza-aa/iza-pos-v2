import type { NextResponse } from "next/server";
import { type AppRole, createSupabaseJwt } from "@/lib/auth/supabaseJwt";
import {
  getSupabaseAccessTokenCookieOptions,
  SUPABASE_ACCESS_TOKEN_TTL_SECONDS,
} from "@/lib/supabase/customJwtRefresh";

type SupabaseAccessTokenClaims = {
  app_role: AppRole;
  sub: string;
  staff_type?: string;
};

export async function setSupabaseAccessTokenCookie(
  response: NextResponse,
  claims: SupabaseAccessTokenClaims,
) {
  const token = await createSupabaseJwt({
    role: "authenticated",
    ...claims,
    expiresInSeconds: SUPABASE_ACCESS_TOKEN_TTL_SECONDS,
  });

  response.cookies.set({
    name: "sb-access-token",
    value: token,
    ...getSupabaseAccessTokenCookieOptions(),
  });
}

export function clearSupabaseAccessTokenCookie(response: NextResponse) {
  response.cookies.set({
    name: "sb-access-token",
    value: "",
    ...getSupabaseAccessTokenCookieOptions(),
    maxAge: 0,
  });
}
