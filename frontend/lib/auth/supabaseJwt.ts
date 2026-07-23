const encoder = new TextEncoder();

const toBase64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
};

const getSupabaseJwtSecret = () => {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET is required to sign JWTs for Supabase RLS.");
  }
  return secret;
};

export type AppRole = "owner" | "manager" | "staff" | "customer";

export interface SupabaseJwtPayload {
  role: "authenticated";
  app_role: AppRole;
  user_role?: AppRole;
  sub: string;
  staff_type?: string;
  exp: number;
}

export async function createSupabaseJwt(payload: Omit<SupabaseJwtPayload, 'exp'> & { expiresInSeconds?: number }) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const ttl = payload.expiresInSeconds || (8 * 60 * 60); // Default 8 hours
  
  const fullPayload: SupabaseJwtPayload = {
    role: payload.role,
    app_role: payload.app_role,
    user_role: payload.app_role,
    sub: payload.sub,
    staff_type: payload.staff_type,
    exp: now + ttl,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSupabaseJwtSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(dataToSign));
  const encodedSignature = toBase64Url(new Uint8Array(signature));

  return `${dataToSign}.${encodedSignature}`;
}
