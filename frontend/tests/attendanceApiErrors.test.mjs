import assert from "node:assert/strict";
import test from "node:test";

test("maps attendance API error codes to localized translation keys", async () => {
  const { getAttendanceErrorTranslationKey } = await import(
    "../lib/services/attendance/attendanceApiErrors.js"
  );

  assert.equal(
    getAttendanceErrorTranslationKey("AUTH_REQUIRED"),
    "staffAttendance.sessionExpired",
  );
  assert.equal(
    getAttendanceErrorTranslationKey("INVALID_LOCATION"),
    "staffAttendance.invalidLocation",
  );
  assert.equal(
    getAttendanceErrorTranslationKey("UNEXPECTED"),
    "staffAttendance.submitFailed",
  );
});
