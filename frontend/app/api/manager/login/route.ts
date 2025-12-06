import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // Cari staff dengan role manager
  const { data: staff, error } = await supabase
    .from("staff")
    .select("*")
    .eq("email", email)
    .eq("role", "manager")
    .eq("status", "active")
    .single();

  if (error || !staff) {
    return NextResponse.json(
      { success: false, error: "Email tidak ditemukan atau bukan Manager." },
      { status: 401 }
    );
  }

  // Cek password menggunakan password_hash
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
    staff_code: staff.staff_code,
    staff_type: staff.staff_type || "",
  });
}
