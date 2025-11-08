import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { staff_code, login_code } = await req.json();

  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("staff_code", staff_code)
    .eq("login_code", login_code)
    .maybeSingle();

  if (!staff) {
    return NextResponse.json({ error: "ID Staff atau Password salah." }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    staff_id: staff.id,
    staff_name: staff.name, // pastikan ada ini!
  });
}