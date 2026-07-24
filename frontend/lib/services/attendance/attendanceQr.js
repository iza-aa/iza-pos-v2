export const ATTENDANCE_QR_PREFIX = "iza-attendance:";

const normalizeCode = (value) => String(value ?? "").trim();

export function buildAttendanceQrPayload(code) {
  const normalizedCode = normalizeCode(code);
  return normalizedCode ? `${ATTENDANCE_QR_PREFIX}${normalizedCode}` : null;
}

export function extractAttendanceQrCode(payload) {
  const normalizedPayload = normalizeCode(payload);

  if (!normalizedPayload.startsWith(ATTENDANCE_QR_PREFIX)) return null;

  const code = normalizeCode(
    normalizedPayload.slice(ATTENDANCE_QR_PREFIX.length),
  );

  return code || null;
}
