import { NextRequest, NextResponse } from "next/server";
import {
  clearInternalSessionCookie,
} from "@/lib/auth/internalSession";
import { getVerifiedInternalSessionUser } from "@/lib/auth/verifiedInternalSession";

export async function GET(request: NextRequest) {
  const user = await getVerifiedInternalSessionUser(request);
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
