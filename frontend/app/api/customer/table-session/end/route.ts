import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EndTableSessionBody = {
  session_id?: unknown;
};

type SessionRow = {
  id: string;
  table_id: string;
  started_at: string;
  ended_at: string | null;
};

type ActiveOrderRow = {
  id: string;
};

type EndTableSessionResponse =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!UUID_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

function createErrorResponse(error: string, status: number) {
  const response: EndTableSessionResponse = {
    success: false,
    error,
  };

  return NextResponse.json(response, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EndTableSessionBody;
    const sessionId = normalizeUuid(body.session_id);

    if (!sessionId) {
      return createErrorResponse("Valid session ID is required.", 400);
    }

    const supabase = await createClient();

    const { data: sessionData, error: sessionError } = await supabase
      .from("table_sessions")
      .select("id, table_id, started_at, ended_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      throw sessionError;
    }

    if (!sessionData) {
      return createErrorResponse("Table session not found.", 404);
    }

    const session = sessionData as SessionRow;

    if (!session.ended_at) {
      const startedAt = new Date(session.started_at).getTime();
      const durationMinutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));

      const { error: endError } = await supabase
        .from("table_sessions")
        .update({
          ended_at: new Date().toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq("id", session.id)
        .is("ended_at", null);

      if (endError) {
        throw endError;
      }
    }

    const { data: activeOrdersData, error: activeOrdersError } = await supabase
      .from("orders")
      .select("id")
      .eq("table_id", session.table_id)
      .in("status", ["new", "preparing", "partially-served", "served"])
      .limit(1);

    if (activeOrdersError) {
      throw activeOrdersError;
    }

    const activeOrders = (activeOrdersData ?? []) as ActiveOrderRow[];

    if (activeOrders.length === 0) {
      const { error: tableUpdateError } = await supabase
        .from("tables")
        .update({
          status: "free",
          occupied_at: null,
          occupied_by_customer: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.table_id);

      if (tableUpdateError) {
        throw tableUpdateError;
      }
    }

    const response: EndTableSessionResponse = {
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("End table session error:", error);
    return createErrorResponse("Failed to end table session.", 500);
  }
}
