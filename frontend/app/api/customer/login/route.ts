import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface LoginBody {
  phone?: unknown;
}

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number | null;
  member_since: string | null;
  status: string;
}

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.replace(/\s+/g, "").trim();
  return cleanValue || null;
}

function toCustomerSession(customer: CustomerRow) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    loyalty_points: customer.loyalty_points ?? 0,
    member_since: customer.member_since,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const phone = normalizePhone(body.phone);

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: "WhatsApp number is required.",
        },
        { status: 400 },
      );
    }

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, email, loyalty_points, member_since, status")
      .eq("phone", phone)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer account not found. Please create an account first.",
        },
        { status: 404 },
      );
    }

    const customer = data as CustomerRow;

    return NextResponse.json({
      success: true,
      customer: toCustomerSession(customer),
    });
  } catch (error) {
    console.error("Customer login API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to login. Please try again.",
      },
      { status: 500 },
    );
  }
}
