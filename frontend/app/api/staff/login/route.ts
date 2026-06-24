import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { setInternalSessionCookie } from "@/lib/auth/internalSession";
import {
  getPrimaryStaffPosition,
  getStaffPositions,
  type StaffPositionAssignment,
} from "@/lib/staff/positions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const LOGIN_CODE_TTL_MINUTES = 15;
const PIN_LENGTH = 6;
const HASH_ITERATIONS = 120_000;
const HASH_KEY_LENGTH = 32;
const HASH_DIGEST = "sha256";

type StaffRecord = {
  id: string;
  staff_code: string;
  name: string;
  role: string;
  staff_type: string | null;
  staff_positions?: StaffPositionAssignment[] | null;
  status: string;
  login_code: string | null;
  login_code_expires_at: string | null;
  pin_hash: string | null;
  password_hash?: string | null;
  must_change_pin?: boolean | null;
};

const jsonError = (message: string, status = 400) => {
  return NextResponse.json({ success: false, error: message }, { status });
};

const normalizeStaffCode = (value: unknown) => String(value ?? "").trim().toUpperCase();
const normalizeCredential = (value: unknown) => String(value ?? "").trim();

const parseDbTimestampAsUtc = (value: string | null) => {
  if (!value) return null;

  const normalizedValue = String(value).trim();
  if (!normalizedValue) return null;

  const hasTimezoneSuffix = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalizedValue);
  const isoLikeValue = normalizedValue.includes("T")
    ? normalizedValue
    : normalizedValue.replace(" ", "T");
  const date = new Date(hasTimezoneSuffix ? isoLikeValue : `${isoLikeValue}Z`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const isExpired = (expiresAt: string | null) => {
  const expiresDate = parseDbTimestampAsUtc(expiresAt);
  return !expiresDate || expiresDate.getTime() <= Date.now();
};

const generateLoginCode = () => crypto.randomInt(100000, 1000000).toString();
const addMinutes = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000).toISOString();

const isWeakPin = (pin: string) => {
  const pinPattern = new RegExp(`^\\d{${PIN_LENGTH}}$`);
  if (!pinPattern.test(pin)) return true;

  const weakPins = new Set([
    "000000",
    "111111",
    "222222",
    "333333",
    "444444",
    "555555",
    "666666",
    "777777",
    "888888",
    "999999",
    "123456",
    "654321",
    "112233",
    "121212",
  ]);

  if (weakPins.has(pin)) return true;

  const digits = pin.split("").map((value) => Number(value));
  const ascending = digits.every((digit, index) => index === 0 || digit === digits[index - 1] + 1);
  const descending = digits.every((digit, index) => index === 0 || digit === digits[index - 1] - 1);

  return ascending || descending;
};

const hashPin = (pin: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(pin, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST)
    .toString("hex");

  return `pbkdf2_${HASH_DIGEST}$${HASH_ITERATIONS}$${salt}$${hash}`;
};

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyPin = (pin: string, storedHash: string | null | undefined) => {
  if (!storedHash) return false;

  const parts = storedHash.split("$");

  if (parts.length !== 4) return false;

  const [algorithm, iterationText, salt, expectedHash] = parts;

  if (algorithm !== `pbkdf2_${HASH_DIGEST}`) return false;

  const iterations = Number(iterationText);

  if (!Number.isFinite(iterations) || iterations <= 0 || !salt || !expectedHash) {
    return false;
  }

  const calculatedHash = crypto
    .pbkdf2Sync(pin, salt, iterations, HASH_KEY_LENGTH, HASH_DIGEST)
    .toString("hex");

  return safeEqual(calculatedHash, expectedHash);
};

const selectStaffFields =
  "id, staff_code, name, role, staff_type, status, login_code, login_code_expires_at, pin_hash, password_hash, must_change_pin, staff_positions(id, staff_id, position, is_primary, is_active)";

const getStaffLoginByCode = async (staffCode: string) => {
  const { data, error } = await supabase
    .from("staff")
    .select(selectStaffFields)
    .eq("staff_code", staffCode)
    .eq("status", "active")
    .eq("role", "staff")
    .maybeSingle();

  if (error) throw error;

  return data as StaffRecord | null;
};

const getActiveStaffByCode = async (staffCode: string) => {
  const { data, error } = await supabase
    .from("staff")
    .select(selectStaffFields)
    .eq("staff_code", staffCode)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;

  return data as StaffRecord | null;
};

const buildLoginResponse = async (staff: StaffRecord, rememberMe = false) => {
  const staffPositions = getStaffPositions(staff);
  const primaryPosition = getPrimaryStaffPosition(staff);
  const response = NextResponse.json({
    success: true,
    user_id: staff.id,
    user_name: staff.name,
    user_role: staff.role,
    staff_type: primaryPosition ?? staff.staff_type,
    staff_positions: staffPositions,
    primary_position: primaryPosition,
    staff_code: staff.staff_code,
  });
  await setInternalSessionCookie(response, {
    id: staff.id,
    name: staff.name,
    role: staff.role as "staff" | "manager" | "owner",
    staffCode: staff.staff_code,
    staffType: primaryPosition ?? staff.staff_type,
    staffPositions,
  }, rememberMe);
  return response;
};

const handleLogin = async (body: Record<string, unknown>) => {
  const staffCode = normalizeStaffCode(body.staff_code);
  const credential = normalizeCredential(body.credential ?? body.login_code ?? body.pin);
  const rememberMe = body.remember_me === true;

  if (!staffCode || !credential) {
    return jsonError("Staff ID dan PIN / kode login wajib diisi.", 400);
  }

  const staff = await getStaffLoginByCode(staffCode);

  if (!staff) {
    return jsonError("Staff ID atau PIN / kode login salah.", 401);
  }

  const storedPinHash = staff.pin_hash || staff.password_hash || null;
  const pinIsValid = verifyPin(credential, storedPinHash);

  if (pinIsValid && !staff.must_change_pin) {
    return buildLoginResponse(staff, rememberMe);
  }

  const loginCodeIsValid =
    Boolean(staff.login_code) &&
    !isExpired(staff.login_code_expires_at) &&
    safeEqual(credential, staff.login_code!);

  if (loginCodeIsValid) {
    const staffPositions = getStaffPositions(staff);
    const primaryPosition = getPrimaryStaffPosition(staff);
    return NextResponse.json({
      success: true,
      must_set_pin: true,
      user_id: staff.id,
      user_name: staff.name,
      user_role: staff.role,
      staff_type: primaryPosition ?? staff.staff_type,
      staff_positions: staffPositions,
      primary_position: primaryPosition,
      staff_code: staff.staff_code,
      message: "Kode login valid. Silakan buat PIN baru.",
    });
  }

  if (staff.login_code && isExpired(staff.login_code_expires_at)) {
    return jsonError("Kode login sudah expired. Minta kode baru ke manager.", 401);
  }

  if (!storedPinHash) {
    return jsonError("Akun belum aktif. Login menggunakan kode sementara dari manager.", 401);
  }

  if (staff.must_change_pin) {
    return jsonError("PIN perlu direset. Login menggunakan kode sementara dari manager.", 401);
  }

  return jsonError("Staff ID atau PIN / kode login salah.", 401);
};

const handleSetPin = async (body: Record<string, unknown>) => {
  const staffCode = normalizeStaffCode(body.staff_code);
  const loginCode = normalizeCredential(body.login_code ?? body.credential);
  const newPin = normalizeCredential(body.new_pin);
  const confirmPin = normalizeCredential(body.confirm_pin);

  if (!staffCode || !loginCode || !newPin || !confirmPin) {
    return jsonError("Staff ID, kode login, PIN baru, dan konfirmasi PIN wajib diisi.", 400);
  }

  if (newPin !== confirmPin) {
    return jsonError("Konfirmasi PIN tidak sama.", 400);
  }

  if (isWeakPin(newPin)) {
    return jsonError(`PIN harus ${PIN_LENGTH} digit dan tidak boleh terlalu mudah ditebak.`, 400);
  }

  const staff = await getStaffLoginByCode(staffCode);

  if (!staff) {
    return jsonError("Staff tidak ditemukan atau tidak aktif.", 404);
  }

  const loginCodeIsValid =
    Boolean(staff.login_code) &&
    !isExpired(staff.login_code_expires_at) &&
    safeEqual(loginCode, staff.login_code!);

  if (!loginCodeIsValid) {
    return jsonError("Kode login tidak valid atau sudah expired.", 401);
  }

  const pinHash = hashPin(newPin);

  const { error } = await supabase
    .from("staff")
    .update({
      pin_hash: pinHash,
      password_hash: pinHash,
      must_change_pin: false,
      pin_updated_at: new Date().toISOString(),
      login_code: null,
      login_code_expires_at: null,
      login_code_created_at: null,
    })
    .eq("id", staff.id);

  if (error) throw error;

  return buildLoginResponse({ ...staff, pin_hash: pinHash, must_change_pin: false });
};

const handleChangePin = async (body: Record<string, unknown>) => {
  const staffCode = normalizeStaffCode(body.staff_code);
  const currentPin = normalizeCredential(body.current_pin ?? body.old_pin);
  const newPin = normalizeCredential(body.new_pin);
  const confirmPin = normalizeCredential(body.confirm_pin);

  if (!staffCode || !currentPin || !newPin || !confirmPin) {
    return jsonError("Staff ID, PIN lama, PIN baru, dan konfirmasi PIN wajib diisi.", 400);
  }

  if (newPin !== confirmPin) {
    return jsonError("Konfirmasi PIN tidak sama.", 400);
  }

  if (currentPin === newPin) {
    return jsonError("PIN baru tidak boleh sama dengan PIN lama.", 400);
  }

  if (isWeakPin(newPin)) {
    return jsonError(`PIN baru harus ${PIN_LENGTH} digit dan tidak boleh terlalu mudah ditebak.`, 400);
  }

  const staff = await getActiveStaffByCode(staffCode);

  if (!staff) {
    return jsonError("User tidak ditemukan atau tidak aktif.", 404);
  }

  if (staff.role !== "staff") {
    return jsonError("Ubah PIN mandiri saat ini hanya tersedia untuk role staff.", 403);
  }

  const storedPinHash = staff.pin_hash || staff.password_hash || null;

  if (!verifyPin(currentPin, storedPinHash)) {
    return jsonError("PIN lama salah.", 401);
  }

  const pinHash = hashPin(newPin);

  const { error } = await supabase
    .from("staff")
    .update({
      pin_hash: pinHash,
      password_hash: pinHash,
      must_change_pin: false,
      pin_updated_at: new Date().toISOString(),
      login_code: null,
      login_code_expires_at: null,
      login_code_created_at: null,
    })
    .eq("id", staff.id);

  if (error) throw error;

  return NextResponse.json({ success: true, message: "PIN berhasil diperbarui." });
};

const handleGenerateLoginCode = async (body: Record<string, unknown>) => {
  const staffId = normalizeCredential(body.staff_id);

  if (!staffId) {
    return jsonError("ID staff wajib dikirim.", 400);
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, staff_code, name, role, status")
    .eq("id", staffId)
    .neq("role", "owner")
    .maybeSingle();

  if (staffError) throw staffError;

  if (!staff) {
    return jsonError("Staff tidak ditemukan.", 404);
  }

  if (staff.status !== "active") {
    return jsonError("Hanya staff aktif yang bisa dibuatkan kode login.", 400);
  }

  if (staff.role !== "staff") {
    return jsonError("Kode login PIN hanya digunakan untuk role staff.", 400);
  }

  const loginCode = generateLoginCode();
  const expiresAt = addMinutes(LOGIN_CODE_TTL_MINUTES);
  const nowIso = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("staff")
    .update({
      login_code: loginCode,
      login_code_expires_at: expiresAt,
      login_code_created_at: nowIso,
      must_change_pin: true,
      pin_reset_at: nowIso,
    })
    .eq("id", staffId);

  if (updateError) throw updateError;

  return NextResponse.json({
    success: true,
    staff_id: staff.id,
    staff_code: staff.staff_code,
    staff_name: staff.name,
    login_code: loginCode,
    expires_at: expiresAt,
    expires_in_minutes: LOGIN_CODE_TTL_MINUTES,
  });
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = normalizeCredential(body.action || "login").toLowerCase();

    if (action === "login") return await handleLogin(body);
    if (action === "set_pin") return await handleSetPin(body);
    if (action === "change_pin") return await handleChangePin(body);
    if (action === "generate_login_code" || action === "reset_pin") {
      return await handleGenerateLoginCode(body);
    }

    return jsonError("Action tidak dikenal.", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server.";

    return NextResponse.json(
      { success: false, error: message || "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
