import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = decodeURIComponent(value).trim();
  return cleanValue || null;
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

async function getFloorName(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

    const supabase = await createClient();

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
