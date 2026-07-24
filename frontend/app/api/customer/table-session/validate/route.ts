import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type TableSessionRow = {
  id: string;
  table_id: string;
  started_at: string;
  ended_at: string | null;
};

type TableRow = {
  id: string;
  table_number: string;
  floor_id: string | null;
  capacity: number;
  status: string | null;
  is_active: boolean | null;
};

type FloorRow = {
  id: string;
  name: string | null;
};

type TableSessionData = {
  session_id: string;
  table_id: string;
  table_number: string;
  floor_id: string | null;
  floor_name: string | null;
  capacity: number;
  status: string | null;
  started_at: string;
};

type ValidateTableSessionResponse =
  | {
      success: true;
      data: TableSessionData;
    }
  | {
      success: false;
      error: string;
      expired?: boolean;
      details?: Record<string, unknown>;
    };

const SESSION_TTL_MINUTES = 240;
const BLOCKING_ORDER_STATUSES = ["new", "preparing", "partially-served"];
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = decodeURIComponent(value).trim();
  return cleanValue && SESSION_ID_PATTERN.test(cleanValue) ? cleanValue : null;
}

function createErrorResponse(
  error: string,
  status: number,
  expired = false,
  details?: Record<string, unknown>,
) {
  const response: ValidateTableSessionResponse = {
    success: false,
    error,
    expired,
    ...(details ? { details } : {}),
  };

  return NextResponse.json(response, { status });
}

function createSuccessResponse(
  session: TableSessionRow,
  table: TableRow,
  floorName: string | null,
) {
  const response: ValidateTableSessionResponse = {
    success: true,
    data: {
      session_id: session.id,
      table_id: table.id,
      table_number: table.table_number,
      floor_id: table.floor_id,
      floor_name: floorName,
      capacity: table.capacity,
      status: table.status,
      started_at: session.started_at,
    },
  };

  return NextResponse.json(response);
}

function getDurationMinutes(startedAt: string): number {
  const startedAtTime = new Date(startedAt).getTime();

  if (Number.isNaN(startedAtTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - startedAtTime) / 60000));
}

function isSessionStale(session: Pick<TableSessionRow, "started_at">): boolean {
  return getDurationMinutes(session.started_at) >= SESSION_TTL_MINUTES;
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

  return (data ?? []).length > 0;
}

async function closeSession(
  supabase: ReturnType<typeof createAdminClient>,
  session: Pick<TableSessionRow, "id" | "started_at">,
  notes: string,
) {
  const { error } = await supabase
    .from("table_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_minutes: getDurationMinutes(session.started_at),
      notes,
    })
    .eq("id", session.id)
    .is("ended_at", null);

  if (error) {
    throw error;
  }
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

async function expireSessionIfStale(
  supabase: ReturnType<typeof createAdminClient>,
  session: TableSessionRow,
) {
  if (!isSessionStale(session)) {
    return false;
  }

  const hasBlockingOrders = await tableHasBlockingOrders(supabase, session.table_id);

  if (hasBlockingOrders) {
    return false;
  }

  await closeSession(
    supabase,
    session,
    `Closed automatically after ${SESSION_TTL_MINUTES} minutes of inactivity.`,
  );

  await releaseTableIfSafe(supabase, session.table_id);

  return true;
}

async function getFloorName(
  supabase: ReturnType<typeof createAdminClient>,
  floorId: string | null,
): Promise<string | null> {
  if (!floorId) {
    return null;
  }

  const { data, error } = await supabase
    .from("floors")
    .select("id, name")
    .eq("id", floorId)
    .maybeSingle();

  if (error) {
    return null;
  }

  const floor = data as FloorRow | null;

  return floor?.name ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = normalizeString(request.nextUrl.searchParams.get("session_id"));

    if (!sessionId) {
      return createErrorResponse("Session ID is required.", 400, false, {
        received_search_params: Object.fromEntries(request.nextUrl.searchParams.entries()),
      });
    }

    const supabase = createAdminClient();

    const { data: sessionData, error: sessionError } = await supabase
      .from("table_sessions")
      .select("id, table_id, started_at, ended_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      return createErrorResponse("Failed to read table session.", 500, false, {
        session_id: sessionId,
        supabase_error: sessionError.message,
      });
    }

    if (!sessionData) {
      return createErrorResponse("Table session not found.", 404, true, {
        session_id: sessionId,
      });
    }

    const session = sessionData as TableSessionRow;

    if (session.ended_at) {
      return createErrorResponse("Table session has ended.", 410, true, {
        session_id: sessionId,
        ended_at: session.ended_at,
      });
    }

    const expiredByTtl = await expireSessionIfStale(supabase, session);

    if (expiredByTtl) {
      return createErrorResponse("Table session has expired.", 410, true, {
        session_id: sessionId,
        ttl_minutes: SESSION_TTL_MINUTES,
      });
    }

    const { data: tableData, error: tableError } = await supabase
      .from("tables")
      .select("id, table_number, floor_id, capacity, status, is_active")
      .eq("id", session.table_id)
      .maybeSingle();

    if (tableError) {
      return createErrorResponse("Failed to read table.", 500, false, {
        session_id: sessionId,
        table_id: session.table_id,
        supabase_error: tableError.message,
      });
    }

    if (!tableData) {
      return createErrorResponse("Table not found.", 404, true, {
        session_id: sessionId,
        table_id: session.table_id,
      });
    }

    const table = tableData as TableRow;

    if (table.is_active !== true) {
      return createErrorResponse("This table is unavailable.", 400, true, {
        session_id: sessionId,
        table_id: table.id,
        table_number: table.table_number,
        is_active: table.is_active,
      });
    }

    const floorName = await getFloorName(supabase, table.floor_id);

    return createSuccessResponse(session, table, floorName);
  } catch (error) {
    console.error("Validate table session error:", error);

    return createErrorResponse("Failed to validate table session.", 500, false, {
      error_message: error instanceof Error ? error.message : String(error),
    });
  }
}
