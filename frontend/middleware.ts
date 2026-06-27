import { NextRequest, NextResponse } from "next/server";
import {
  clearInternalSessionCookie,
  INTERNAL_SESSION_COOKIE,
  verifyInternalSessionToken,
} from "@/lib/auth/internalSession";

type StaffRow = {
  id: string;
  name: string | null;
  role: string | null;
  status: string | null;
  staff_code: string | null;
};

const fetchActiveUser = async (id: string): Promise<StaffRow | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const response = await fetch(
    `${url}/rest/v1/staff?id=eq.${encodeURIComponent(id)}&select=id,name,role,status,staff_code&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    },
  );
  if (!response.ok) return null;
  const rows = (await response.json()) as StaffRow[];
  return rows[0] ?? null;
};

const unauthorizedApi = () =>
  NextResponse.json({ error: "Authenticated access required." }, { status: 401 });

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  const isOwnerArea = pathname.startsWith("/owner") || pathname.startsWith("/api/owner");
  const isManagerArea = pathname.startsWith("/manager") || pathname.startsWith("/api/manager");
  
  // Exclude login endpoints and forgot/reset password pages from being blocked
  if (
    pathname === "/api/owner/login" || 
    pathname === "/api/manager/login" ||
    pathname === "/api/owner/forgot-password" ||
    pathname === "/api/manager/forgot-password" ||
    pathname === "/api/owner/reset-password" ||
    pathname === "/api/manager/reset-password"
  ) {
    return NextResponse.next();
  }

  const isOwnerLoginPage = pathname === "/owner/login" || pathname === "/owner/forgot-password" || pathname === "/owner/reset-password";
  const isManagerLoginPage = pathname === "/manager/login" || pathname === "/manager/forgot-password" || pathname === "/manager/reset-password";

  const token = request.cookies.get(INTERNAL_SESSION_COOKIE)?.value;
  const session = await verifyInternalSessionToken(token).catch(() => null);

  // Redirect if already logged in and trying to access login pages
  if (isOwnerLoginPage) {
    if (session?.role === "owner") {
      return NextResponse.redirect(new URL("/owner/dashboard", request.url));
    }
    const response = NextResponse.next();
    if (token) clearInternalSessionCookie(response);
    return response;
  }
  
  if (isManagerLoginPage) {
    if (session?.role === "manager" || session?.role === "owner") {
      return NextResponse.redirect(new URL("/manager/menu", request.url));
    }
    const response = NextResponse.next();
    if (token) clearInternalSessionCookie(response);
    return response;
  }

  // Not authenticated at all
  if (!session) {
    if (pathname.startsWith("/api/")) return unauthorizedApi();
    const loginUrl = isOwnerArea ? "/owner/login" : "/manager/login";
    const response = NextResponse.redirect(new URL(loginUrl, request.url));
    if (token) clearInternalSessionCookie(response);
    return response;
  }

  // Role verification checks
  const isOwner = session.role === "owner";
  const isManager = session.role === "manager";
  
  if (isOwnerArea && !isOwner) {
    if (pathname.startsWith("/api/")) return unauthorizedApi();
    return NextResponse.redirect(new URL("/owner/login", request.url));
  }
  
  if (isManagerArea && !(isOwner || isManager)) {
    if (pathname.startsWith("/api/")) return unauthorizedApi();
    return NextResponse.redirect(new URL("/manager/login", request.url));
  }

  if (
    pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
    }
  }

  // Verify against database for active status
  const user = await fetchActiveUser(session.sub).catch(() => null);
  if (!user || user.status !== "active" || user.role !== session.role) {
    if (pathname.startsWith("/api/")) {
      const response = unauthorizedApi();
      clearInternalSessionCookie(response);
      return response;
    }
    const loginUrl = isOwnerArea ? "/owner/login" : "/manager/login";
    const response = NextResponse.redirect(new URL(loginUrl, request.url));
    clearInternalSessionCookie(response);
    return response;
  }

  const headers = new Headers(request.headers);
  headers.set("x-user-id", user.id);
  headers.set("x-user-name", user.name ?? "User");
  headers.set("x-user-role", user.role ?? "");
  headers.set("x-staff-code", user.staff_code ?? "");
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/owner/:path*", "/api/owner/:path*", "/manager/:path*", "/api/manager/:path*"],
};
