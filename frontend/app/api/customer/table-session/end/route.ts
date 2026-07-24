import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

const BLOCKING_ORDER_STATUSES = ["new", "preparing", "partially-served"];

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

function getDurationMinutes(startedAt: string): number {
  const startedAtTime = new Date(startedAt).getTime();

  if (Number.isNaN(startedAtTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - startedAtTime) / 60000));
}

async function tableHasBlockingOrders(
  supabase: ReturnType<typeof createAdminClient>,
  tableId: string,
) {
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("table_id", tableId)
    .in("status", BLOCKING_ORDER_STATUSES)
    .limit(1);

  if (error) {
    throw error;
  }

  const activeOrders = (data ?? []) as ActiveOrderRow[];

  return activeOrders.length > 0;
}

async function releaseTableIfSafe(
  supabase: ReturnType<typeof createAdminClient>,
  tableId: string,
) {
  const hasBlockingOrders = await tableHasBlockingOrders(supabase, tableId);

  if (hasBlockingOrders) {
    return;
  }

  const { data: activeSessions, error: activeSessionError } = await supabase
    .from("table_sessions")
    .select("id")
    .eq("table_id", tableId)
    .is("ended_at", null)
    .limit(1);

  if (activeSessionError) {
    throw activeSessionError;
  }

  if ((activeSessions ?? []).length > 0) {
    return;
  }

  const { error: tableUpdateError } = await supabase
    .from("tables")
    .update({
      status: "free",
      occupied_at: null,
      occupied_by_customer: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tableId);

  if (tableUpdateError) {
    throw tableUpdateError;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EndTableSessionBody;
    const sessionId = normalizeUuid(body.session_id);

    if (!sessionId) {
      return createErrorResponse("Valid session ID is required.", 400);
    }

    const supabase = createAdminClient();

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
      const { error: endError } = await supabase
        .from("table_sessions")
        .update({
          ended_at: new Date().toISOString(),
          duration_minutes: getDurationMinutes(session.started_at),
        })
        .eq("id", session.id)
        .is("ended_at", null);

      if (endError) {
        throw endError;
      }
    }

    await releaseTableIfSafe(supabase, session.table_id);

    const response: EndTableSessionResponse = {
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("End table session error:", error);
    return createErrorResponse("Failed to end table session.", 500);
  }
}
