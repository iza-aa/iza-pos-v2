import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const token = String(body.token ?? "").trim();
  const newPassword = String(body.password ?? "");

  if (!token || !newPassword) {
    return NextResponse.json(
      { success: false, error: "Token dan password baru wajib diisi." },
      { status: 400 }
    );
  }

  // Validasi password minimal 8 karakter
  if (newPassword.length < 8) {
    return NextResponse.json(
      { success: false, error: "Password minimal 8 karakter." },
      { status: 400 }
    );
  }

  // Cari user dengan reset token tersebut dan role manager
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, role, status, reset_token_expires_at")
    .eq("reset_token", token)
    .eq("role", "manager")
    .eq("status", "active")
    .single();

  if (staffError || !staff) {
    return NextResponse.json(
      { success: false, error: "Token tidak valid atau user tidak memiliki akses." },
      { status: 403 }
    );
  }

  // Verifikasi expired token
  if (new Date(staff.reset_token_expires_at) < new Date()) {
    return NextResponse.json(
      { success: false, error: "Token sudah kadaluarsa. Silakan request ulang reset password." },
      { status: 401 }
    );
  }

  // Hash password baru
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Update password di database dan bersihkan token
  const { error: updateError } = await supabase
    .from("staff")
    .update({ 
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expires_at: null
    })
    .eq("id", staff.id);

  if (updateError) {
    console.error("Error updating password:", updateError);
    return NextResponse.json(
      { success: false, error: "Gagal mengupdate password." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Password berhasil diubah. Silakan login dengan password baru.",
  });
}
