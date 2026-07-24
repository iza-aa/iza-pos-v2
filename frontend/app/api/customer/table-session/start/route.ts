import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTableQrToken } from "@/lib/services/table/qrToken.js";

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

const LEGACY_TABLE_QR_VALUE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isTableQrValue(value: string): boolean {
  return isTableQrToken(value) || LEGACY_TABLE_QR_VALUE_PATTERN.test(value);
}

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

async function closePreviousSession(
  supabase: ReturnType<typeof createAdminClient>,
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
}

async function closeStaleEmptySession(
  supabase: ReturnType<typeof createAdminClient>,
  session: TableSessionRow,
) {
  const startedAt = new Date(session.started_at).getTime();
  const ageMinutes = Math.floor((Date.now() - startedAt) / 60000);

  const orderIds = session.order_ids ?? [];
  const totalOrders = session.total_orders ?? 0;

  const isEmptySession = orderIds.length === 0 && totalOrders === 0;
  const isStale = ageMinutes >= 240;

  if (!isEmptySession || !isStale) {
    return false;
  }

  const { error } = await supabase
    .from("table_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_minutes: Math.max(0, ageMinutes),
      notes: "Closed automatically because empty table session was stale.",
    })
    .eq("id", session.id)
    .is("ended_at", null);

  if (error) {
    throw error;
  }

  return true;
}

async function findActiveSessionForTable(
  supabase: ReturnType<typeof createAdminClient>,
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

async function createTableSession(
  supabase: ReturnType<typeof createAdminClient>,
  tableId: string,
): Promise<TableSessionRow> {
  const { data, error } = await supabase
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

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Table session was not created.");
  }

  return data as TableSessionRow;
}

async function getOrCreateActiveSession(
  supabase: ReturnType<typeof createAdminClient>,
  tableId: string,
): Promise<TableSessionRow> {
  const activeSession = await findActiveSessionForTable(supabase, tableId);

  if (activeSession) {
    const wasClosed = await closeStaleEmptySession(supabase, activeSession);

    if (!wasClosed) {
      return activeSession;
    }
  }

  try {
    return await createTableSession(supabase, tableId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("table_sessions_one_active_per_table_idx") ||
      message.includes("duplicate key value")
    ) {
      const existingSession = await findActiveSessionForTable(supabase, tableId);

      if (existingSession) {
        return existingSession;
      }
    }

    throw error;
  }
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

export async function POST(request: NextRequest) {
  try {
    const body = await readRequestBody(request);

    const tableQrValue = getStringFromRequest(request, body, [
      "table_token",
      "tableToken",
      "token",
    ]);

    const previousSessionId = getStringFromRequest(request, body, [
      "previous_session_id",
      "previousSessionId",
      "session_id",
      "sessionId",
    ]);

    if (!tableQrValue || !isTableQrValue(tableQrValue)) {
      return createErrorResponse("Invalid table QR code.", 400);
    }

    const supabase = createAdminClient();

    const { data: tableData, error: tableError } = await supabase
      .from("tables")
      .select("id, table_number, floor_id, capacity, status, is_active")
      .like("qr_code_url", `%/customer/table/${tableQrValue}`)
      .maybeSingle();

    if (tableError) {
      console.error("Failed to read QR table:", tableError);
      return createErrorResponse("Failed to read table.", 500);
    }

    if (!tableData) {
      return createErrorResponse("Table not found.", 404);
    }

    const table = tableData as TableRow;

    if (table.is_active !== true) {
      return createErrorResponse("This table is currently unavailable.", 400);
    }

    const tableId = table.id;

    if (previousSessionId) {
      await closePreviousSession(supabase, previousSessionId, tableId);
    }

    const session = await getOrCreateActiveSession(supabase, tableId);
    const floorName = await getFloorName(supabase, table.floor_id);

    return createSuccessResponse(table, session, floorName);
  } catch (error) {
    console.error("Start table session error:", error);

    return createErrorResponse("Failed to start table session.", 500);
  }
}
