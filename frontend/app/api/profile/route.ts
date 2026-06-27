import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyInternalSessionToken, INTERNAL_SESSION_COOKIE } from "@/lib/auth/internalSession";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function PUT(req: NextRequest) {
  try {
    // 1. Verify custom session
    const token = req.cookies.get(INTERNAL_SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyInternalSessionToken(token).catch(() => null);
    if (!session || !session.sub) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }

    // 2. Parse body
    const body = await req.json().catch(() => ({}));
    const { name, email, phone, profile_picture } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
    }

    // 3. Update staff table using service role key (bypasses RLS)
    const { error: updateError } = await supabase
      .from("staff")
      .update({
        name,
        email: email || null,
        phone: phone || null,
        profile_picture: profile_picture || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.sub);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      if (updateError.code === "23505") {
        return NextResponse.json({ success: false, error: "This email address is already in use by another staff member." }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: `Failed to save profile: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Profile updated successfully." });
  } catch (error) {
    console.error("Profile update error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: `Internal server error: ${message}` }, { status: 500 });
  }
}
