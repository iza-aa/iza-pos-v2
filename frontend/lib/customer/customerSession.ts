"use client";

export interface CustomerTableSession {
  session_id: string;
  table_id: string;
  table_number: string;
  floor_id: string | null;
  floor_name: string | null;
  capacity: number;
  status: string | null;
  started_at: string;
}

type ValidateTableSessionResponse =
  | {
      success: true;
      data: CustomerTableSession;
    }
  | {
      success: false;
      error: string;
      expired?: boolean;
    };

const TABLE_SESSION_STORAGE_KEY = "customer_table_session";
const LEGACY_TABLE_STORAGE_KEY = "customer_table";
const LEGACY_TABLE_START_KEY = "table_session_start";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function clearCustomerTableSession(): void {
  localStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TABLE_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TABLE_START_KEY);
}

export function getStoredCustomerTableSession(): CustomerTableSession | null {
  const value = localStorage.getItem(TABLE_SESSION_STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!isRecord(parsed)) {
      clearCustomerTableSession();
      return null;
    }

    if (
      typeof parsed.session_id !== "string" ||
      typeof parsed.table_id !== "string" ||
      typeof parsed.table_number !== "string" ||
      typeof parsed.started_at !== "string"
    ) {
      clearCustomerTableSession();
      return null;
    }

    return {
      session_id: parsed.session_id,
      table_id: parsed.table_id,
      table_number: parsed.table_number,
      floor_id: typeof parsed.floor_id === "string" ? parsed.floor_id : null,
      floor_name: typeof parsed.floor_name === "string" ? parsed.floor_name : null,
      capacity: typeof parsed.capacity === "number" ? parsed.capacity : 0,
      status: typeof parsed.status === "string" ? parsed.status : null,
      started_at: parsed.started_at,
    };
  } catch {
    clearCustomerTableSession();
    return null;
  }
}

export function saveCustomerTableSession(session: CustomerTableSession): void {
  localStorage.setItem(TABLE_SESSION_STORAGE_KEY, JSON.stringify(session));

  localStorage.setItem(
    LEGACY_TABLE_STORAGE_KEY,
    JSON.stringify({
      id: session.table_id,
      table_id: session.table_id,
      table_number: session.table_number,
      floor_id: session.floor_id,
      floor_name: session.floor_name,
      capacity: session.capacity,
      status: session.status,
      is_active: true,
    }),
  );

  localStorage.setItem(LEGACY_TABLE_START_KEY, session.started_at);
}

export async function validateStoredCustomerTableSession(): Promise<CustomerTableSession | null> {
  const storedSession = getStoredCustomerTableSession();

  if (!storedSession) {
    return null;
  }

  try {
    const response = await fetch(
      `/api/customer/table-session/validate?session_id=${encodeURIComponent(
        storedSession.session_id,
      )}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const result = (await response.json()) as ValidateTableSessionResponse;

    if (!response.ok || !result.success) {
      clearCustomerTableSession();
      return null;
    }

    saveCustomerTableSession(result.data);
    return result.data;
  } catch (error) {
    console.error("Failed to validate customer table session:", error);
    return storedSession;
  }
}

export async function endCustomerTableSession(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch("/api/customer/table-session/end", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      return false;
    }

    clearCustomerTableSession();
    return true;
  } catch (error) {
    console.error("Failed to end customer table session:", error);
    return false;
  }
}
