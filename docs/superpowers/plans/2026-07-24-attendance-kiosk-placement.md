# Attendance Kiosk Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Move cashier QR kiosk access from POS to the Absence tab beside Attendance History.

**Architecture:** Reuse the existing AttendanceKioskModal and cashier-protected API unchanged. The Attendance page conditionally mounts the modal and renders the trigger only when canUseEndShift confirms cashier capability; POS loses its trigger and modal import.

**Tech Stack:** Next.js, React, TypeScript, Node built-in test runner.

## Global Constraints

- QR kiosk button appears only for cashier staff.
- No kiosk UI remains in /staff/pos.
- Existing QR, session, and geolocation logic is unchanged.

---

### Task 1: Move the kiosk trigger

**Files:**
- Modify: frontend/app/staff/attendance/page.tsx
- Modify: frontend/app/staff/pos/page.tsx
- Test: frontend/tests/attendanceServer.test.mjs

**Interfaces:**
- Consumes: canUseEndShift and AttendanceKioskModal.
- Produces: QR Absensi beside Attendance History for cashier only.

- [ ] **Step 1: Write location-gate regression**

~~~js
test("keeps QR kiosk access restricted to cashier staff", async () => {
  const { canOpenAttendanceKiosk } = await import("../lib/services/attendance/attendanceKioskAccess.js");
  assert.equal(canOpenAttendanceKiosk({ role: "staff", status: "active", positions: ["waiter"] }), false);
  assert.equal(canOpenAttendanceKiosk({ role: "staff", status: "active", positions: ["cashier"] }), true);
});
~~~

- [ ] **Step 2: Run RED/GREEN regression**

Run: node --test tests/attendanceServer.test.mjs

Expected: PASS after the existing access helper proves that only cashier is eligible.

- [ ] **Step 3: Implement page relocation**

In frontend/app/staff/attendance/page.tsx add AttendanceKioskModal import and kiosk-open state. Replace the full-width Attendance History wrapper with:

~~~tsx
<div className={canUseEndShift ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : ""}>
  <button type="button" onClick={() => setHistoryModalOpen(true)}>Attendance History</button>
  {canUseEndShift ? (
    <button type="button" onClick={() => setAttendanceKioskOpen(true)}>QR Absensi</button>
  ) : null}
</div>
~~~

Mount AttendanceKioskModal at the page root with its close callback. In frontend/app/staff/pos/page.tsx remove AttendanceKioskModal import, kiosk state, QR header callback, and modal mount.

- [ ] **Step 4: Verify**

Run: npm test && npm run build

Expected: tests pass, build exits 0, /staff/attendance remains available, and /staff/pos has no QR kiosk control.

- [ ] **Step 5: Commit**

~~~bash
git add frontend/app/staff/attendance/page.tsx frontend/app/staff/pos/page.tsx frontend/tests/attendanceServer.test.mjs
git commit -m "refactor: move attendance kiosk to staff attendance"
~~~

