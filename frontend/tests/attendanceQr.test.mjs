import assert from "node:assert/strict";
import test from "node:test";

test("serializes an active presence code without a public URL", async () => {
  const { buildAttendanceQrPayload } = await import(
    "../lib/services/attendance/attendanceQr.js"
  );

  assert.equal(
    buildAttendanceQrPayload("presence_123"),
    "iza-attendance:presence_123",
  );
  assert.equal(buildAttendanceQrPayload(""), null);
  assert.equal(buildAttendanceQrPayload("   "), null);
});

test("accepts only the attendance QR payload protocol", async () => {
  const { extractAttendanceQrCode } = await import(
    "../lib/services/attendance/attendanceQr.js"
  );

  assert.equal(
    extractAttendanceQrCode("iza-attendance:presence_123"),
    "presence_123",
  );
  assert.equal(
    extractAttendanceQrCode(
      "https://iza-pos-v2.vercel.app/absensi?code=presence_123",
    ),
    null,
  );
  assert.equal(extractAttendanceQrCode("presence_123"), null);
});
