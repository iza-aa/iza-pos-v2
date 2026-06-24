import type { NextResponse } from "next/server";
import type { StaffPosition } from "@/lib/staff/positions";

export const INTERNAL_SESSION_COOKIE = "iza_internal_session";
export const INTERNAL_SESSION_HOURS = 8;
export const REMEMBERED_SESSION_DAYS = 7;

export type InternalUserRole = "owner" | "manager" | "staff";

export type InternalSessionPayload = {
  sub: string;
  name: string;
  role: InternalUserRole;
  staffCode: string;
  staffType: string | null;
  staffPositions: StaffPosition[];
  iat: number;
  exp: number;
  nonce: string;
};

export type InternalSessionUser = {
  id: string;
  name: string;
  role: InternalUserRole;
  staffCode: string;
  staffType: string | null;
  staffPositions?: StaffPosition[];
};

const encoder = new TextEncoder();

const getSigningSecret = () => {
  const secret =
    process.env.INTERNAL_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "INTERNAL_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY is required for internal sessions.",
    );
  }

  return secret;
};

const toBase64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const sign = async (value: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSigningSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
};

const safeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

export async function createInternalSessionToken(
  user: InternalSessionUser,
  rememberMe = false,
) {
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = rememberMe
    ? REMEMBERED_SESSION_DAYS * 24 * 60 * 60
    : INTERNAL_SESSION_HOURS * 60 * 60;
  const payload: InternalSessionPayload = {
    sub: user.id,
    name: user.name,
    role: user.role,
    staffCode: user.staffCode,
    staffType: user.staffType,
    staffPositions: user.staffPositions ?? [],
    iat: now,
    exp: now + ttlSeconds,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${await sign(encodedPayload)}`;
}

export async function verifyInternalSessionToken(token: string | undefined) {
  if (!token) return null;
  const [encodedPayload, providedSignature, extra] = token.split(".");
  if (!encodedPayload || !providedSignature || extra) return null;

  const expectedSignature = await sign(encodedPayload);
  if (!safeEqual(providedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as Partial<InternalSessionPayload>;
    const knownRole =
      payload.role === "owner" || payload.role === "manager" || payload.role === "staff";

    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      !knownRole ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      ...payload,
      staffPositions: Array.isArray(payload.staffPositions)
        ? payload.staffPositions
        : payload.staffType
          ? [payload.staffType as StaffPosition]
          : [],
    } as InternalSessionPayload;
  } catch {
    return null;
  }
}

export async function setInternalSessionCookie(
  response: NextResponse,
  user: InternalSessionUser,
  rememberMe = false,
) {
  const token = await createInternalSessionToken(user, rememberMe);
  response.cookies.set({
    name: INTERNAL_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: REMEMBERED_SESSION_DAYS * 24 * 60 * 60 } : {}),
  });
}

export function clearInternalSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: INTERNAL_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
