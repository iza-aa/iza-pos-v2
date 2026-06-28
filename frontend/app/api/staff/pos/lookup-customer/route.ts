import { NextRequest, NextResponse } from "next/server";
import { createBookkeepingSupabaseClient } from "@/lib/services/bookkeeping/bookkeepingServer";
import { INTERNAL_SESSION_COOKIE, verifyInternalSessionToken } from "@/lib/auth/internalSession";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ found: false, error: "Phone number is required" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\s+/g, "").trim();

    // Check staff session to ensure only authorized staff can look up
    const sessionToken = request.cookies.get(INTERNAL_SESSION_COOKIE)?.value;
    const session = await verifyInternalSessionToken(sessionToken).catch(() => null);
    
    if (!session || !session.sub || !["owner", "manager", "staff"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createBookkeepingSupabaseClient();

    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, loyalty_points")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (error) {
      console.error("Error looking up customer:", error);
      return NextResponse.json({ found: false, error: "Database error" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      customer: {
        id: data.id,
        name: data.name,
        phone: data.phone,
        loyalty_points: data.loyalty_points || 0,
      },
    });
  } catch (error) {
    console.error("Lookup customer handler error:", error);
    return NextResponse.json({ found: false, error: "Internal server error" }, { status: 500 });
  }
}
