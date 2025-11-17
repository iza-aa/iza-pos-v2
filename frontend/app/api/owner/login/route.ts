import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // Cari staff dengan role owner
  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, name, email, password_hash, role, status")
    .eq("email", email)
    .eq("role", "owner")
    .eq("status", "active")
    .single();

  if (error || !staff) {
    return NextResponse.json(
      { success: false, error: "Email tidak ditemukan atau bukan Owner." },
      { status: 401 }
    );
  }

  // Cek password (plain text untuk development, gunakan bcrypt di production)
  if (staff.password_hash !== password) {
    return NextResponse.json(
      { success: false, error: "Password salah." },
      { status: 401 }
    );
  }

  // Login sukses
  return NextResponse.json({
    success: true,
    user_id: staff.id,
    user_name: staff.name,
    user_role: staff.role,
  });
}