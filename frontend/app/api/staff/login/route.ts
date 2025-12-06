import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { staff_code, login_code } = await req.json();

  // Cari staff berdasarkan staff_code (hanya role staff)
  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("staff_code", staff_code)
    .eq("login_code", login_code)
    .eq("role", "staff")
    .eq("status", "active")
    .maybeSingle();

  if (!staff) {
    return NextResponse.json(
      { success: false, error: "ID Staff atau Login Code salah." },
      { status: 401 }
    );
  }

  // Cek apakah login_code masih valid (hanya untuk staff, manager biasanya permanent)
  if (staff.role === "staff" && staff.login_code_expires_at) {
    const expiresAt = new Date(staff.login_code_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Login code sudah expired. Minta code baru ke Manager." },
        { status: 401 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    user_id: staff.id,
    user_name: staff.name,
    user_role: staff.role, // 'staff' atau 'manager'
    staff_type: staff.staff_type, // barista, kitchen, waiter, cashier
    staff_code: staff.staff_code,
  });
}