import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface RegisterBody {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
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

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();
  return cleanValue || null;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.replace(/\s+/g, "").trim();
  return cleanValue || null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim().toLowerCase();
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
    const body = (await request.json()) as RegisterBody;

    const name = normalizeRequiredString(body.name);
    const phone = normalizePhone(body.phone);
    const email = normalizeEmail(body.email);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Name is required.",
        },
        { status: 400 },
      );
    }

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

    const { data: existingCustomer, error: existingError } = await supabase
      .from("customers")
      .select("id, name, phone, email, loyalty_points, member_since, status")
      .eq("phone", phone)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingCustomer) {
      const customer = existingCustomer as CustomerRow;

      if (customer.status !== "active") {
        return NextResponse.json(
          {
            success: false,
            error: "This account is not active. Please ask staff for assistance.",
          },
          { status: 403 },
        );
      }

      return NextResponse.json({
        success: true,
        customer: toCustomerSession(customer),
      });
    }

    const { data: createdCustomer, error: createError } = await supabase
      .from("customers")
      .insert([
        {
          name,
          phone,
          email,
          loyalty_points: 0,
          total_spent: 0,
          visit_count: 0,
          status: "active",
        },
      ])
      .select("id, name, phone, email, loyalty_points, member_since, status")
      .single();

    if (createError) {
      throw createError;
    }

    if (!createdCustomer) {
      throw new Error("Customer account was not created.");
    }

    const customer = createdCustomer as CustomerRow;

    return NextResponse.json({
      success: true,
      customer: toCustomerSession(customer),
    });
  } catch (error) {
    console.error("Customer register API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create account. Please try again.",
      },
      { status: 500 },
    );
  }
}
