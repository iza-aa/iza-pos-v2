import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TableRow = {
  id: string;
  table_number: string;
  floor_id: string | null;
  capacity: number;
  status: string | null;
  is_active: boolean | null;
  qr_code_url: string | null;
  qr_generated_at: string | null;
};

type ValidateTableData = {
  id: string;
  table_id: string;
  table_number: string;
  floor_id: string | null;
  floor_name: string | null;
  capacity: number;
  status: string | null;
  is_active: boolean;
  qr_code_url: string | null;
  qr_generated_at: string | null;
};

type ValidateTableResponse =
  | {
      success: true;
      data: ValidateTableData;
    }
  | {
      success: false;
      error: string;
    };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function normalizeValue(value: string | null): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function createErrorResponse(error: string, status: number) {
  const body: ValidateTableResponse = {
    success: false,
    error,
  };

  return NextResponse.json(body, { status });
}

function createSuccessResponse(table: TableRow) {
  const body: ValidateTableResponse = {
    success: true,
    data: {
      id: table.id,
      table_id: table.id,
      table_number: table.table_number,
      floor_id: table.floor_id,
      floor_name: null,
      capacity: table.capacity,
      status: table.status,
      is_active: table.is_active === true,
      qr_code_url: table.qr_code_url,
      qr_generated_at: table.qr_generated_at,
    },
  };

  return NextResponse.json(body);
}

async function findTable(identifier: string): Promise<TableRow | null> {
  const supabase = await createClient();

  const selectColumns =
    "id, table_number, floor_id, capacity, status, is_active, qr_code_url, qr_generated_at";

  if (isUuid(identifier)) {
    const { data, error } = await supabase
      .from("tables")
      .select(selectColumns)
      .eq("id", identifier)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as TableRow | null;
  }

  const { data, error } = await supabase
    .from("tables")
    .select(selectColumns)
    .eq("table_number", identifier)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TableRow | null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const token = normalizeValue(searchParams.get("token"));
    const tableId = normalizeValue(searchParams.get("table_id"));
    const tableNumber = normalizeValue(searchParams.get("table_number"));

    const identifier = token ?? tableId ?? tableNumber;

    if (!identifier) {
      return createErrorResponse("Table token is required", 400);
    }

    const table = await findTable(identifier);

    if (!table) {
      return createErrorResponse("Table not found", 404);
    }

    if (table.is_active !== true) {
      return createErrorResponse("This table is currently unavailable", 400);
    }

    return createSuccessResponse(table);
  } catch (error) {
    console.error("Error validating table:", error);
    return createErrorResponse("Failed to validate table", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      token?: unknown;
      table_id?: unknown;
      table_number?: unknown;
    };

    const token = typeof body.token === "string" ? normalizeValue(body.token) : null;
    const tableId =
      typeof body.table_id === "string" ? normalizeValue(body.table_id) : null;
    const tableNumber =
      typeof body.table_number === "string"
        ? normalizeValue(body.table_number)
        : null;

    const identifier = token ?? tableId ?? tableNumber;

    if (!identifier) {
      return createErrorResponse("Table token is required", 400);
    }

    const table = await findTable(identifier);

    if (!table) {
      return createErrorResponse("Table not found", 404);
    }

    if (table.is_active !== true) {
      return createErrorResponse("This table is currently unavailable", 400);
    }

    return createSuccessResponse(table);
  } catch (error) {
    console.error("Error validating table:", error);
    return createErrorResponse("Failed to validate table", 500);
  }
}