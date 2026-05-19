"use client";

export interface CustomerAccountSession {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
  member_since: string | null;
}

const CUSTOMER_SESSION_KEY = "customer_session";
const CUSTOMER_ID_KEY = "customer_id";
const CUSTOMER_NAME_KEY = "customer_name";
const CUSTOMER_PHONE_KEY = "customer_phone";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePoints(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function getStoredCustomerAccount(): CustomerAccountSession | null {
  const value = localStorage.getItem(CUSTOMER_SESSION_KEY);

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!isRecord(parsed)) {
      clearCustomerAccount();
      return null;
    }

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.phone !== "string"
    ) {
      clearCustomerAccount();
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      phone: parsed.phone,
      email: typeof parsed.email === "string" ? parsed.email : null,
      loyalty_points: normalizePoints(parsed.loyalty_points),
      member_since:
        typeof parsed.member_since === "string" ? parsed.member_since : null,
    };
  } catch {
    clearCustomerAccount();
    return null;
  }
}

export function saveCustomerAccount(session: CustomerAccountSession): void {
  localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(CUSTOMER_ID_KEY, session.id);
  localStorage.setItem(CUSTOMER_NAME_KEY, session.name);
  localStorage.setItem(CUSTOMER_PHONE_KEY, session.phone);
}

export function clearCustomerAccount(): void {
  localStorage.removeItem(CUSTOMER_SESSION_KEY);
  localStorage.removeItem(CUSTOMER_ID_KEY);
  localStorage.removeItem(CUSTOMER_NAME_KEY);
  localStorage.removeItem(CUSTOMER_PHONE_KEY);
}

export function isCustomerLoggedIn(): boolean {
  return getStoredCustomerAccount() !== null;
}

export function formatMemberSince(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
}
