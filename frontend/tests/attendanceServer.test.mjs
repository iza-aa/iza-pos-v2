import assert from "node:assert/strict";
import test from "node:test";

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
