import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { setInternalSessionCookie } from "@/lib/auth/internalSession";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const rememberMe = body.remember_me === true;
  if (!email || !password) {
    return NextResponse.json({ success: false, error: "Email dan password wajib diisi." }, { status: 400 });
  }

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
      { success: false, error: "Email atau password tidak valid." },
      { status: 401 }
    );
  }

  // Cek password dengan bcrypt
  const isPasswordValid = Boolean(staff.password_hash) && await bcrypt.compare(password, staff.password_hash);
  if (!isPasswordValid) {
    return NextResponse.json(
      { success: false, error: "Email atau password tidak valid." },
      { status: 401 }
    );
  }

  if (!isPasswordValid) {
    return NextResponse.json(
      { success: false, error: "Email atau password tidak valid." },
      { status: 401 }
    );
  }

  // Login sukses
  const response = NextResponse.json({
    success: true,
    user_id: staff.id,
    user_name: staff.name,
    user_role: staff.role,
    staff_code: staff.staff_code,
  });
  await setInternalSessionCookie(response, {
    id: staff.id,
    name: staff.name,
    role: "manager",
    staffCode: staff.staff_code ?? "",
    staffType: null,
  }, rememberMe);
  return response;
}
