import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateRandomCode } from "@/lib/authUtils";
import { EXPIRATION_TIMES } from "@/lib/timeConstants";

// Helper kirim WhatsApp via Fonnte
async function sendWhatsAppMessage(phone: string, code: string) {
  const apiKey = process.env.FONNTE_API_KEY!;
  const message = `Kode login Mammi Coffee: ${code}\nBerlaku 5 menit. Jangan bagikan ke siapapun.`;

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: phone,
      message,
    }),
  });

  if (!res.ok) {
    throw new Error("Gagal mengirim WhatsApp");
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Ambil data staff dari Supabase
  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, phone")
    .eq("id", params.id)
    .single();

  if (error || !staff?.phone) {
    return NextResponse.json({ error: "Staff/No WA tidak ditemukan" }, { status: 404 });
  }

  // 2. Generate kode login & expired menggunakan authUtils
  const login_code = generateRandomCode(8, false); // 8 chars, mixed case
  const expires_at = new Date(Date.now() + EXPIRATION_TIMES.TEMP_PASSWORD).toISOString(); // 24 hours

  // 3. Update kode login ke Supabase
  const { error: updateErr } = await supabase
    .from("staff")
    .update({ login_code, login_code_expires_at: expires_at })
    .eq("id", params.id);

  if (updateErr) {
    return NextResponse.json({ error: "Gagal update kode login" }, { status: 500 });
  }

  // 4. Kirim kode ke WhatsApp via Fonnte
  try {
    await sendWhatsAppMessage(staff.phone, login_code);
  } catch (err) {
    return NextResponse.json({ error: "Gagal kirim WhatsApp" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}