import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ResolveBody {
  identifier?: unknown;
}

type ResolveResponse =
  | {
      success: true;
      email: string;
    }
  | {
      success: false;
      error: string;
    };

function normalizeIdentifier(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();
  return cleanValue || null;
}

function createErrorResponse(error: string, status: number) {
  const response: ResolveResponse = {
    success: false,
    error,
  };

  return NextResponse.json(response, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResolveBody;
    const identifier = normalizeIdentifier(body.identifier);

    if (!identifier) {
      return createErrorResponse("Email or WhatsApp number is required.", 400);
    }

    if (identifier.includes("@")) {
      return NextResponse.json({
        success: true,
        email: identifier.toLowerCase(),
      } satisfies ResolveResponse);
    }

    const phone = identifier.replace(/\s+/g, "");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("customers")
      .select("email, status")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return createErrorResponse("No account found with this WhatsApp number.", 404);
    }

    const customer = data as {
      email: string | null;
      status: string;
    };

    if (customer.status !== "active") {
      return createErrorResponse("This account is not active.", 403);
    }

    if (!customer.email) {
      return createErrorResponse(
        "This WhatsApp number is not linked to an email login yet.",
        400,
      );
    }

    return NextResponse.json({
      success: true,
      email: customer.email.toLowerCase(),
    } satisfies ResolveResponse);
  } catch (error) {
    console.error("Resolve customer login identifier error:", error);
    return createErrorResponse("Failed to resolve account. Please try again.", 500);
  }
}
