import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ForgotBody {
  email?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as ForgotBody;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if the email exists and is active in the customers table
    const { data: customer, error } = await supabase
      .from("customers")
      .select("id, email, status")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Email is not registered." },
        { status: 404 }
      );
    }

    if (customer.status !== "active") {
      return NextResponse.json(
        { success: false, error: "This customer account is inactive." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email is valid and registered.",
    });
  } catch (error) {
    console.error("Customer forgot-password API error:", error);
    return NextResponse.json(
      { success: false, error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
