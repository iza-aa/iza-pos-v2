import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UnknownRecord = Record<string, unknown>;

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

type TableSessionRow = {
  id: string;
  table_id: string;
  customer_count: number | null;
  customer_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  order_ids: string[] | null;
  total_orders: number | null;
  total_revenue: number | null;
  notes: string | null;
  created_at: string | null;
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

type StartTableSessionResponse =
  | {
      success: true;
      data: TableSessionData;
    }
  | {
      success: false;
      error: string;
      details?: Record<string, unknown>;
    };

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createErrorResponse(
  error: string,
  status: number,
  details?: Record<string, unknown>,
) {
  const response: StartTableSessionResponse = {
    success: false,
    error,
    ...(details ? { details } : {}),
  };

  return NextResponse.json(response, { status });
}

function createSuccessResponse(
  table: TableRow,
  session: TableSessionRow,
  floorName: string | null,
) {
  const response: StartTableSessionResponse = {
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

async function readRequestBody(request: NextRequest): Promise<unknown> {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = decodeURIComponent(value).trim();

  return cleanValue || null;
}

function getValueFromBody(body: unknown, keys: string[]): unknown {
  if (!isRecord(body)) {
    return null;
  }

  for (const key of keys) {
    const value = body[key];

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return null;
}

function getStringFromRequest(
  request: NextRequest,
  body: unknown,
  keys: string[],
): string | null {
  const bodyValue = normalizeString(getValueFromBody(body, keys));

  if (bodyValue) {
    return bodyValue;
  }

  if (typeof body === "string") {
    const stringValue = normalizeString(body);

    if (stringValue) {
      return stringValue;
    }
  }

  for (const key of keys) {
    const queryValue = normalizeString(request.nextUrl.searchParams.get(key));

    if (queryValue) {
      return queryValue;
    }
  }

  return null;
}

function getReceivedKeys(body: unknown): string[] {
  if (!isRecord(body)) {
    return [];
  }

  return Object.keys(body);
}

async function closePreviousSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  previousSessionId: string,
  nextTableId: string,
) {
  const { data: previousSession, error: previousSessionError } = await supabase
    .from("table_sessions")
    .select("id, table_id, started_at, ended_at")
    .eq("id", previousSessionId)
    .maybeSingle();

  if (previousSessionError) {
    throw previousSessionError;
  }

  if (!previousSession) {
    return;
  }

  const session = previousSession as {
    id: string;
    table_id: string;
    started_at: string;
    ended_at: string | null;
  };

  if (session.ended_at || session.table_id === nextTableId) {
    return;
  }

  const startedAt = new Date(session.started_at).getTime();
  const durationMinutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));

  const { error: closeError } = await supabase
    .from("table_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
      notes: "Closed automatically because customer switched table.",
    })
    .eq("id", session.id)
    .is("ended_at", null);

  if (closeError) {
    throw closeError;
  }

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

async function findActiveSessionForTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tableId: string,
): Promise<TableSessionRow | null> {
  const { data, error } = await supabase
    .from("table_sessions")
    .select(
      "id, table_id, customer_count, customer_name, started_at, ended_at, duration_minutes, order_ids, total_orders, total_revenue, notes, created_at",
    )
    .eq("table_id", tableId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TableSessionRow | null;
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

export async function POST(request: NextRequest) {
  try {
    const body = await readRequestBody(request);

    const tableId = getStringFromRequest(request, body, [
      "table_id",
      "tableId",
      "id",
      "token",
    ]);

    const previousSessionId = getStringFromRequest(request, body, [
      "previous_session_id",
      "previousSessionId",
      "session_id",
      "sessionId",
    ]);

    if (!tableId) {
      return createErrorResponse("Table ID is required.", 400, {
        received_keys: getReceivedKeys(body),
      });
    }

    const supabase = await createClient();

    const { data: tableData, error: tableError } = await supabase
      .from("tables")
      .select("id, table_number, floor_id, capacity, status, is_active")
      .eq("id", tableId)
      .maybeSingle();

    if (tableError) {
      return createErrorResponse("Failed to read table.", 500, {
        table_id: tableId,
        supabase_error: tableError.message,
      });
    }

    if (!tableData) {
      return createErrorResponse("Table not found.", 404, {
        table_id: tableId,
      });
    }

    const table = tableData as TableRow;

    if (table.is_active !== true) {
      return createErrorResponse("This table is currently unavailable.", 400, {
        table_id: tableId,
        table_number: table.table_number,
        is_active: table.is_active,
      });
    }

    if (previousSessionId) {
      await closePreviousSession(supabase, previousSessionId, tableId);
    }

    const activeSession = await findActiveSessionForTable(supabase, tableId);

    let session: TableSessionRow;

    if (activeSession) {
      session = activeSession;
    } else {
      const { data: createdSessionData, error: createSessionError } = await supabase
        .from("table_sessions")
        .insert([
          {
            table_id: tableId,
            customer_count: null,
            customer_name: null,
            total_orders: 0,
            total_revenue: 0,
            order_ids: [],
          },
        ])
        .select(
          "id, table_id, customer_count, customer_name, started_at, ended_at, duration_minutes, order_ids, total_orders, total_revenue, notes, created_at",
        )
        .single();

      if (createSessionError) {
        return createErrorResponse("Failed to create table session.", 500, {
          table_id: tableId,
          supabase_error: createSessionError.message,
        });
      }

      if (!createdSessionData) {
        return createErrorResponse("Failed to create table session.", 500, {
          table_id: tableId,
        });
      }

      session = createdSessionData as TableSessionRow;
    }

    const { error: updateTableError } = await supabase
      .from("tables")
      .update({
        status: "occupied",
        occupied_at: session.started_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tableId);

    if (updateTableError) {
      return createErrorResponse("Failed to update table status.", 500, {
        table_id: tableId,
        supabase_error: updateTableError.message,
      });
    }

    const floorName = await getFloorName(supabase, table.floor_id);

    return createSuccessResponse(table, session, floorName);
  } catch (error) {
    console.error("Start table session error:", error);

    return createErrorResponse("Failed to start table session.", 500, {
      error_message: error instanceof Error ? error.message : String(error),
    });
  }
}
