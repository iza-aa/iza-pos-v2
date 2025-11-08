import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // Cari owner berdasarkan email
  const { data: owner, error } = await supabase
    .from("owner")
    .select("id, name, email, password")
    .eq("email", email)
    .single();

  if (error || !owner) {
    return NextResponse.json({ success: false, error: "Email tidak ditemukan." }, { status: 401 });
  }

  // Cek password (plain text, sebaiknya hash di produksi)
  if (owner.password !== password) {
    return NextResponse.json({ success: false, error: "Password salah." }, { status: 401 });
  }

  // Login sukses
  return NextResponse.json({
    success: true,
    owner_id: owner.id,
    owner_name: owner.name,
  });
}