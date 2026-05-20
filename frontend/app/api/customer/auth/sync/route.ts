import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number | null;
  member_since: string | null;
  total_spent: number | string | null;
  visit_count: number | null;
  status: string;
  auth_user_id: string | null;
  auth_provider: string | null;
}

interface SyncBody {
  name?: unknown;
  phone?: unknown;
  auth_provider?: unknown;
}

interface CustomerSession {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
  member_since: string | null;
}

type SyncResponse =
  | {
      success: true;
      customer: CustomerSession;
    }
  | {
      success: false;
      error: string;
      needs_profile?: boolean;
      profile?: {
        name: string;
        email: string;
      };
      details?: Record<string, unknown>;
    };

const CUSTOMER_SELECT =
  "id, name, phone, email, loyalty_points, member_since, total_spent, visit_count, status, auth_user_id, auth_provider";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleanValue = value.trim();
  return cleanValue || null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleanValue = value.replace(/\s+/g, "").trim();
  return cleanValue || null;
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token.trim();
}

function toCustomerSession(customer: CustomerRow): CustomerSession {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    loyalty_points: customer.loyalty_points ?? 0,
    member_since: customer.member_since,
  };
}

function createErrorResponse(
  error: string,
  status: number,
  options?: {
    needsProfile?: boolean;
    profile?: { name: string; email: string };
    details?: Record<string, unknown>;
  },
) {
  const response: SyncResponse = {
    success: false,
    error,
    ...(options?.needsProfile ? { needs_profile: true } : {}),
    ...(options?.profile ? { profile: options.profile } : {}),
    ...(options?.details ? { details: options.details } : {}),
  };

  return NextResponse.json(response, { status });
}

async function getCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  column: "auth_user_id" | "email" | "phone",
  value: string,
): Promise<CustomerRow | null> {
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq(column, value)
    .maybeSingle();

  if (error) throw error;

  return data as CustomerRow | null;
}

async function updateCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  payload: Record<string, unknown>,
): Promise<CustomerRow> {
  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", customerId)
    .select(CUSTOMER_SELECT)
    .single();

  if (error) throw error;

  return data as CustomerRow;
}

async function ensurePhoneAvailable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  phone: string,
  ownerCustomerId: string,
) {
  const phoneOwner = await getCustomer(supabase, "phone", phone);

  if (phoneOwner && phoneOwner.id !== ownerCustomerId) {
    return createErrorResponse(
      "This WhatsApp number is already used by another customer account.",
      409,
      { details: { phone } },
    );
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return createErrorResponse("Authentication token is required.", 401);
    }

    const body = (await request.json()) as SyncBody;
    const bodyName = normalizeOptionalString(body.name);
    const bodyPhone = normalizePhone(body.phone);
    const authProvider = normalizeOptionalString(body.auth_provider) ?? "email";

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return createErrorResponse("Invalid authentication session.", 401, {
        details: { auth_error: userError?.message ?? null },
      });
    }

    const authUser = userData.user;
    const email = authUser.email ? normalizeEmail(authUser.email) : null;

    if (!email) {
      return createErrorResponse("Email is required for customer login.", 400);
    }

    const metadata = authUser.user_metadata as Record<string, unknown>;
    const metadataName =
      normalizeOptionalString(metadata.full_name) ||
      normalizeOptionalString(metadata.name) ||
      normalizeOptionalString(metadata.display_name);
    const metadataPhone = normalizePhone(metadata.phone);

    const inputName = bodyName || metadataName;
    const inputPhone = bodyPhone || metadataPhone;

    const fallbackName = email.split("@")[0] || "Customer";
    const resolvedName = inputName || fallbackName;
    const now = new Date().toISOString();

    const existingByAuthId = await getCustomer(supabase, "auth_user_id", authUser.id);

    if (existingByAuthId) {
      const updatePayload: Record<string, unknown> = {
        auth_provider: authProvider,
        last_login_at: now,
        updated_at: now,
      };

      if (inputName) updatePayload.name = inputName;
      if (!existingByAuthId.email) updatePayload.email = email;

      if (inputPhone && inputPhone !== existingByAuthId.phone) {
        const phoneError = await ensurePhoneAvailable(supabase, inputPhone, existingByAuthId.id);
        if (phoneError) return phoneError;
        updatePayload.phone = inputPhone;
      }

      const updatedCustomer = await updateCustomer(supabase, existingByAuthId.id, updatePayload);

      return NextResponse.json({
        success: true,
        customer: toCustomerSession(updatedCustomer),
      } satisfies SyncResponse);
    }

    const existingByEmail = await getCustomer(supabase, "email", email);

    if (existingByEmail) {
      const updatePayload: Record<string, unknown> = {
        auth_user_id: authUser.id,
        auth_provider: authProvider,
        last_login_at: now,
        updated_at: now,
      };

      if (inputName) updatePayload.name = inputName;

      if (inputPhone && inputPhone !== existingByEmail.phone) {
        const phoneError = await ensurePhoneAvailable(supabase, inputPhone, existingByEmail.id);
        if (phoneError) return phoneError;
        updatePayload.phone = inputPhone;
      }

      const updatedCustomer = await updateCustomer(supabase, existingByEmail.id, updatePayload);

      return NextResponse.json({
        success: true,
        customer: toCustomerSession(updatedCustomer),
      } satisfies SyncResponse);
    }

    if (inputPhone) {
      const existingByPhone = await getCustomer(supabase, "phone", inputPhone);

      if (existingByPhone) {
        if (existingByPhone.auth_user_id && existingByPhone.auth_user_id !== authUser.id) {
          return createErrorResponse(
            "This WhatsApp number is already linked to another login account.",
            409,
            { details: { phone: inputPhone } },
          );
        }

        const updatePayload: Record<string, unknown> = {
          auth_user_id: authUser.id,
          auth_provider: authProvider,
          last_login_at: now,
          updated_at: now,
        };

        if (!existingByPhone.email) updatePayload.email = email;
        if (inputName) updatePayload.name = inputName;

        const updatedCustomer = await updateCustomer(supabase, existingByPhone.id, updatePayload);

        return NextResponse.json({
          success: true,
          customer: toCustomerSession(updatedCustomer),
        } satisfies SyncResponse);
      }
    }

    if (!inputPhone) {
      return createErrorResponse("WhatsApp number is required to complete your profile.", 200, {
        needsProfile: true,
        profile: { name: resolvedName, email },
      });
    }

    const { data: createdCustomer, error: createError } = await supabase
      .from("customers")
      .insert([
        {
          auth_user_id: authUser.id,
          auth_provider: authProvider,
          name: resolvedName,
          phone: inputPhone,
          email,
          loyalty_points: 0,
          total_spent: 0,
          visit_count: 0,
          status: "active",
          last_login_at: now,
        },
      ])
      .select(CUSTOMER_SELECT)
      .single();

    if (createError) {
      return createErrorResponse("Failed to create customer profile.", 500, {
        details: {
          supabase_error: createError.message,
          code: createError.code,
          hint: createError.hint,
          details: createError.details,
        },
      });
    }

    return NextResponse.json({
      success: true,
      customer: toCustomerSession(createdCustomer as CustomerRow),
    } satisfies SyncResponse);
  } catch (error) {
    console.error("Customer auth sync error:", error);

    return createErrorResponse("Failed to sync customer account.", 500, {
      details: {
        error_message: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
