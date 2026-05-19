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
    };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function normalizeUuid(value: string | null): string | null {
  const normalized = value?.trim();

  if (!normalized || !UUID_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

function createErrorResponse(error: string, status: number, expired = false) {
  const response: ValidateTableSessionResponse = {
    success: false,
    error,
    expired,
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
    const sessionId = normalizeUuid(request.nextUrl.searchParams.get("session_id"));

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
      return createErrorResponse("Table session not found.", 404, true);
    }

    const session = sessionData as TableSessionRow;

    if (session.ended_at) {
      return createErrorResponse("Table session has ended.", 410, true);
    }

    const { data: tableData, error: tableError } = await supabase
      .from("tables")
      .select("id, table_number, floor_id, capacity, status, is_active")
      .eq("id", session.table_id)
      .maybeSingle();

    if (tableError) {
      throw tableError;
    }

    if (!tableData) {
      return createErrorResponse("Table not found.", 404, true);
    }

    const table = tableData as TableRow;

    if (table.is_active !== true) {
      return createErrorResponse("This table is unavailable.", 400, true);
    }

    const floorName = await getFloorName(supabase, table.floor_id);

    return createSuccessResponse(session, table, floorName);
  } catch (error) {
    console.error("Validate table session error:", error);
    return createErrorResponse("Failed to validate table session.", 500);
  }
}
