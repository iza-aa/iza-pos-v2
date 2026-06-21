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
  staff_type: string | null;
};

const fetchActiveUser = async (id: string): Promise<StaffRow | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const response = await fetch(
    `${url}/rest/v1/staff?id=eq.${encodeURIComponent(id)}&select=id,name,role,status,staff_code,staff_type&limit=1`,
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
  NextResponse.json({ error: "Authenticated owner access required." }, { status: 401 });

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isOwnerLoginApi = pathname === "/api/owner/login";
  const isOwnerLoginPage = pathname === "/owner/login";

  if (isOwnerLoginApi) return NextResponse.next();

  const token = request.cookies.get(INTERNAL_SESSION_COOKIE)?.value;
  const session = await verifyInternalSessionToken(token).catch(() => null);

  if (isOwnerLoginPage) {
    if (session?.role === "owner") {
      return NextResponse.redirect(new URL("/owner/dashboard", request.url));
    }
    const response = NextResponse.next();
    if (token) clearInternalSessionCookie(response);
    return response;
  }

  if (!session || session.role !== "owner") {
    if (pathname.startsWith("/api/owner/")) return unauthorizedApi();
    const response = NextResponse.redirect(new URL("/owner/login", request.url));
    if (token) clearInternalSessionCookie(response);
    return response;
  }

  if (
    pathname.startsWith("/api/owner/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
    }
  }

  const user = await fetchActiveUser(session.sub).catch(() => null);
  if (!user || user.status !== "active" || user.role !== "owner") {
    if (pathname.startsWith("/api/owner/")) {
      const response = unauthorizedApi();
      clearInternalSessionCookie(response);
      return response;
    }
    const response = NextResponse.redirect(new URL("/owner/login", request.url));
    clearInternalSessionCookie(response);
    return response;
  }

  const headers = new Headers(request.headers);
  headers.set("x-user-id", user.id);
  headers.set("x-user-name", user.name ?? "Owner");
  headers.set("x-user-role", "owner");
  headers.set("x-staff-code", user.staff_code ?? "");
  headers.set("x-staff-type", user.staff_type ?? "");
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/owner/:path*", "/api/owner/:path*"],
};
