import assert from "node:assert/strict";
import test from "node:test";

test("uses only current staff columns for attendance verification", async () => {
  const { ATTENDANCE_STAFF_SELECT } = await import(
    "../lib/services/attendance/attendanceStaffQuery.js"
  );

  assert.equal(ATTENDANCE_STAFF_SELECT, "id, role, status, staff_code");
  assert.equal(ATTENDANCE_STAFF_SELECT.includes("staff_type"), false);
});

test("allows active staff cashier to open the kiosk", async () => {
  const { canOpenAttendanceKiosk } = await import(
    "../lib/services/attendance/attendanceKioskAccess.js"
  );

  assert.equal(
    canOpenAttendanceKiosk({
      role: "staff",
      status: "active",
      positions: ["cashier"],
    }),
    true,
  );
});

test("rejects owner, inactive staff, and non-cashier kiosk requests", async () => {
  const { canOpenAttendanceKiosk } = await import(
    "../lib/services/attendance/attendanceKioskAccess.js"
  );

  assert.equal(
    canOpenAttendanceKiosk({
      role: "owner",
      status: "active",
      positions: ["cashier"],
    }),
    false,
  );
  assert.equal(
    canOpenAttendanceKiosk({
      role: "staff",
      status: "inactive",
      positions: ["cashier"],
    }),
    false,
  );
  assert.equal(
    canOpenAttendanceKiosk({
      role: "staff",
      status: "active",
      positions: ["barista"],
    }),
    false,
  );
});

test("keeps QR kiosk access restricted to cashier staff", async () => {
  const { canOpenAttendanceKiosk } = await import(
    "../lib/services/attendance/attendanceKioskAccess.js"
  );

  assert.equal(
    canOpenAttendanceKiosk({
      role: "staff",
      status: "active",
      positions: ["waiter"],
    }),
    false,
  );
  assert.equal(
    canOpenAttendanceKiosk({
      role: "staff",
      status: "active",
      positions: ["cashier"],
    }),
    true,
  );
});
