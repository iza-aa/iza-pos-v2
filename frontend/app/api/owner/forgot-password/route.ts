import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { sendEmail } from "@/lib/services/emailService";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json(
      { success: false, error: "Email wajib diisi." },
      { status: 400 }
    );
  }

  // Validasi email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { success: false, error: "Format email tidak valid." },
      { status: 400 }
    );
  }

  // Cek apakah email terdaftar sebagai owner
  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, email, role, status, phone")
    .eq("email", email)
    .eq("role", "owner")
    .eq("status", "active")
    .single();

  if (error || !staff) {
    return NextResponse.json(
      { success: false, error: "Email tidak terdaftar." },
      { status: 404 }
    );
  }

  // Generate secure token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

  const { error: updateError } = await supabase
    .from('staff')
    .update({ 
      reset_token: resetToken, 
      reset_token_expires_at: expiresAt 
    })
    .eq('id', staff.id);

  if (updateError) {
    console.error("Error saving reset token:", updateError);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }

  const origin = req.headers.get("origin") || req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetLink = `${origin}/owner/reset-password?token=${resetToken}`;
  
  // Send Email via SMTP
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #333; text-align: center;">Reset Password</h2>
      <p>Halo,</p>
      <p>Kami menerima permintaan untuk mereset password akun Owner Anda di IZA POS.</p>
      <p>Silakan klik tombol di bawah ini untuk mengatur password baru:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #666; font-size: 14px;">Link ini berlaku selama 1 jam. Jika Anda tidak merasa meminta reset password, silakan abaikan email ini.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">IZA POS System</p>
    </div>
  `;

  const emailSent = await sendEmail({
    to: email,
    subject: "Reset Password Owner - IZA POS",
    html: emailHtml,
  });

  if (!emailSent) {
    return NextResponse.json(
      { success: false, error: "Gagal mengirim email reset password." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Link reset password telah dikirim ke email Anda. Silakan periksa kotak masuk Anda.",
  });
}
