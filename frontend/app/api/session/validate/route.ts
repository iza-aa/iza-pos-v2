import { NextRequest, NextResponse } from "next/server";

type StaffRow = {
  id: string;
  status: string | null;
  role: string | null;
};

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";

  if (!id) {
    return NextResponse.json({ valid: false, error: "id is required." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ valid: false, error: "Server misconfigured." }, { status: 500 });
  }

  const response = await fetch(
    `${url}/rest/v1/staff?id=eq.${encodeURIComponent(id)}&select=id,status,role&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ valid: false, error: "Failed to verify session." }, { status: 502 });
  }

  const rows = (await response.json()) as StaffRow[];
  const staff = rows[0] ?? null;

  return NextResponse.json({
    valid: Boolean(staff && staff.status === "active"),
    role: staff?.role ?? null,
  });
}
