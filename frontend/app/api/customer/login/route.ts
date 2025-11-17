import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { phone, name } = await req.json();

  // Cari customer berdasarkan phone
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existingCustomer) {
    // Customer sudah terdaftar, login
    return NextResponse.json({
      success: true,
      customer_id: existingCustomer.id,
      customer_name: existingCustomer.name,
      customer_phone: existingCustomer.phone,
      is_new: false,
    });
  }

  // Customer baru, buat akun
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Name is required for new customer." },
      { status: 400 }
    );
  }

  const { data: newCustomer, error } = await supabase
    .from("customers")
    .insert([
      {
        phone,
        name,
        status: "active",
        loyalty_points: 0,
      },
    ])
    .select()
    .single();

  if (error || !newCustomer) {
    return NextResponse.json(
      { success: false, error: "Failed to create customer account." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    customer_id: newCustomer.id,
    customer_name: newCustomer.name,
    customer_phone: newCustomer.phone,
    is_new: true,
  });
}
