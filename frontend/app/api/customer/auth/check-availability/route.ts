import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface CheckAvailabilityBody {
  phone?: unknown;
  email?: unknown;
}

type CheckAvailabilityResponse =
  | {
      success: true;
      available: true;
    }
  | {
      success: true;
      available: false;
      field: "phone" | "email";
      message: string;
    }
  | {
      success: false;
      error: string;
    };

function normalizeString(value: unknown): string | null {
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
  const cleanValue = normalizeString(value);

  if (!cleanValue) {
    return null;
  }

  return cleanValue.toLowerCase();
}

function createErrorResponse(error: string, status: number) {
  const response: CheckAvailabilityResponse = {
    success: false,
    error,
  };

  return NextResponse.json(response, { status });
}

function createUnavailableResponse(
  field: "phone" | "email",
  message: string,
) {
  const response: CheckAvailabilityResponse = {
    success: true,
    available: false,
    field,
    message,
  };

  return NextResponse.json(response, { status: 409 });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckAvailabilityBody;
    const phone = normalizePhone(body.phone);
    const email = normalizeEmail(body.email);

    if (!phone && !email) {
      return createErrorResponse("Phone or email is required.", 400);
    }

    const supabase = await createClient();

    if (phone) {
      const { data: phoneCustomer, error: phoneError } = await supabase
        .from("customers")
        .select("id, phone, email, auth_user_id")
        .eq("phone", phone)
        .maybeSingle();

      if (phoneError) {
        throw phoneError;
      }

      if (phoneCustomer) {
        return createUnavailableResponse(
          "phone",
          "This WhatsApp number is already registered. Please login instead.",
        );
      }
    }

    if (email) {
      const { data: emailCustomer, error: emailError } = await supabase
        .from("customers")
        .select("id, phone, email, auth_user_id")
        .eq("email", email)
        .maybeSingle();

      if (emailError) {
        throw emailError;
      }

      if (emailCustomer) {
        return createUnavailableResponse(
          "email",
          "This email is already registered. Please login instead.",
        );
      }
    }

    const response: CheckAvailabilityResponse = {
      success: true,
      available: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Check customer auth availability error:", error);

    return createErrorResponse(
      error instanceof Error ? error.message : "Failed to check account availability.",
      500,
    );
  }
}
