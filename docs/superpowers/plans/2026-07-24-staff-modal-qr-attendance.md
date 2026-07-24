# Staff Modal QR Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Replace public /absensi with a cashier-only QR kiosk modal in POS and an authenticated staff scan modal that enforces the configured outlet radius.

**Architecture:** A cashier opens a short-lived QR modal in POS. Signed-in staff scan it from /staff/attendance, provide phone GPS, and submit through Next server routes. The server reloads the staff account from Supabase using the signed internal-session cookie, derives the staff code itself, and then calls the existing attendance RPC.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase, internal-session HMAC cookie, html5-qrcode, qrcode.react, Node built-in test runner.

## Global Constraints

- Only active staff with active cashier position may display the kiosk; owner access to POS does not grant kiosk access.
- QR values use the opaque protocol iza-attendance:<presence-code>, never a public URL or Staff ID.
- The client never submits a Staff ID or staff credential.
- Existing store coordinate/radius, QR expiry/single-use, shift, and attendance checks stay enforced.
- Location accuracy above MAX_LOCATION_ACCURACY_METERS (100 m) fails before submit.
- Verify with node --test tests/*.test.mjs, npm run lint, and npm run build.

---

## File Structure

- frontend/lib/services/attendance/attendanceQr.js: browser and Node-testable QR serialization/parser.
- frontend/lib/services/attendance/attendanceServer.js and attendanceServer.ts: pure kiosk predicate and server-only session/staff helpers.
- frontend/app/api/staff/attendance/kiosk-code/route.ts: cashier-authorized read/rotate API.
- frontend/app/api/staff/attendance/submit/route.ts: session-bound attendance submission API.
- frontend/app/components/staff/attendance/AttendanceKioskModal.tsx: tablet QR modal.
- frontend/app/staff/pos/page.tsx and app/components/staff/pos/FoodiesMenuHeader.tsx: cashier trigger.
- frontend/app/staff/attendance/utils.ts, hooks/useAttendanceData.tsx, and page.tsx: scan, GPS, submission, and scan result.
- frontend/docs/staff-modal-qr-attendance-migration.sql: SQL privilege migration.
- frontend/tests/attendanceQr.test.mjs and attendanceServer.test.mjs: regressions.
- frontend/app/absensi/page.tsx: delete.

### Task 1: Create strict attendance QR payload helpers and tests

**Files:**
- Create: frontend/lib/services/attendance/attendanceQr.js
- Create: frontend/tests/attendanceQr.test.mjs
- Modify: frontend/package.json

**Interfaces:**
- Produces: buildAttendanceQrPayload(code: unknown): string | null
- Produces: extractAttendanceQrCode(payload: unknown): string | null

- [ ] **Step 1: Write failing QR tests**

~~~js
import assert from "node:assert/strict";
import test from "node:test";

test("serializes active presence code without public URL", async () => {
  const { buildAttendanceQrPayload } = await import("../lib/services/attendance/attendanceQr.js");
  assert.equal(buildAttendanceQrPayload("presence_123"), "iza-attendance:presence_123");
  assert.equal(buildAttendanceQrPayload(""), null);
});

test("accepts only attendance QR protocol", async () => {
  const { extractAttendanceQrCode } = await import("../lib/services/attendance/attendanceQr.js");
  assert.equal(extractAttendanceQrCode("iza-attendance:presence_123"), "presence_123");
  assert.equal(extractAttendanceQrCode("https://iza-pos-v2.vercel.app/absensi?code=presence_123"), null);
  assert.equal(extractAttendanceQrCode("presence_123"), null);
});
~~~

- [ ] **Step 2: Run test to prove RED**

Run: node --test tests/attendanceQr.test.mjs

Expected: FAIL because attendanceQr.js does not exist.

- [ ] **Step 3: Implement minimum helper**

~~~js
export const ATTENDANCE_QR_PREFIX = "iza-attendance:";

const normalizeCode = (value) => String(value ?? "").trim();

export function buildAttendanceQrPayload(code) {
  const normalizedCode = normalizeCode(code);
  return normalizedCode ? ATTENDANCE_QR_PREFIX + normalizedCode : null;
}

export function extractAttendanceQrCode(payload) {
  const normalizedPayload = normalizeCode(payload);
  if (!normalizedPayload.startsWith(ATTENDANCE_QR_PREFIX)) return null;
  const code = normalizeCode(normalizedPayload.slice(ATTENDANCE_QR_PREFIX.length));
  return code || null;
}
~~~

Add this npm script without a new dependency:

~~~json
"test": "node --test tests/*.test.mjs"
~~~

- [ ] **Step 4: Run full Node tests**

Run: npm test

Expected: PASS for every .test.mjs test.

- [ ] **Step 5: Commit**

~~~bash
git add frontend/package.json frontend/lib/services/attendance/attendanceQr.js frontend/tests/attendanceQr.test.mjs
git commit -m "test: cover staff attendance QR payloads"
~~~

### Task 2: Secure kiosk and attendance server APIs

**Files:**
- Create: frontend/lib/services/attendance/attendanceServer.js
- Create: frontend/lib/services/attendance/attendanceServer.ts
- Create: frontend/app/api/staff/attendance/kiosk-code/route.ts
- Create: frontend/app/api/staff/attendance/submit/route.ts
- Create: frontend/tests/attendanceServer.test.mjs
- Create: frontend/docs/staff-modal-qr-attendance-migration.sql

**Interfaces:**
- Produces: canOpenAttendanceKiosk(staff): boolean
- Produces: getVerifiedAttendanceStaff(request: NextRequest): Promise<VerifiedAttendanceStaff | null>
- Produces: GET/POST /api/staff/attendance/kiosk-code
- Produces: POST /api/staff/attendance/submit with body { code, latitude, longitude, accuracy }

- [ ] **Step 1: Write failing kiosk authorization tests**

~~~js
import assert from "node:assert/strict";
import test from "node:test";

test("allows active staff cashier to open kiosk", async () => {
  const { canOpenAttendanceKiosk } = await import("../lib/services/attendance/attendanceServer.js");
  assert.equal(canOpenAttendanceKiosk({ role: "staff", status: "active", positions: ["cashier"] }), true);
});

test("rejects owner, inactive, and non-cashier requests", async () => {
  const { canOpenAttendanceKiosk } = await import("../lib/services/attendance/attendanceServer.js");
  assert.equal(canOpenAttendanceKiosk({ role: "owner", status: "active", positions: ["cashier"] }), false);
  assert.equal(canOpenAttendanceKiosk({ role: "staff", status: "inactive", positions: ["cashier"] }), false);
  assert.equal(canOpenAttendanceKiosk({ role: "staff", status: "active", positions: ["barista"] }), false);
});
~~~

- [ ] **Step 2: Run test to prove RED**

Run: node --test tests/attendanceServer.test.mjs

Expected: FAIL because attendanceServer.js does not exist.

- [ ] **Step 3: Implement pure and server-only identity helpers**

Implement the testable JavaScript predicate:

~~~js
export function canOpenAttendanceKiosk(staff) {
  return staff?.role === "staff" &&
    staff?.status === "active" &&
    Array.isArray(staff?.positions) &&
    staff.positions.includes("cashier");
}
~~~

In attendanceServer.ts, verify INTERNAL_SESSION_COOKIE, create a non-persistent service-role client, then reload id, role, status, staff_code, and staff_positions(position,is_active) by session.sub. Return only active normalized positions. Do not use localStorage, request headers, or only session payload for authorization.

- [ ] **Step 4: Implement the kiosk-code API**

GET and POST must reject missing session with 401 and a verified non-cashier with 403. GET invokes get_active_presence_code and POST invokes rotate_presence_code. Both return this success contract:

~~~ts
return NextResponse.json({ success: true, data: code });
~~~

Use service role only after reloaded active-cashier authorization. Return generic 500 responses for database/RPC errors and never expose service credentials.

- [ ] **Step 5: Implement session-bound submission API**

Accept only finite latitude from -90 to 90, longitude from -180 to 180, non-negative accuracy, and non-empty code. Return 401 for invalid session, 403 for non-staff/inactive database record, and 400 for malformed input. Derive staff code from reloaded staff data:

~~~ts
const { data, error } = await supabase.rpc("submit_qr_attendance", {
  p_code: code,
  p_credential: verifiedStaff.staff_code,
  p_latitude: latitude,
  p_longitude: longitude,
  p_accuracy: accuracy,
});
~~~

Return success as { success: true, data }, and failed RPC result as { success: false, error }. Request body contains no staff ID or staff code.

- [ ] **Step 6: Add deployable RPC privilege migration**

Create frontend/docs/staff-modal-qr-attendance-migration.sql:

~~~sql
revoke execute on function public.get_active_presence_code() from anon, authenticated;
revoke execute on function public.rotate_presence_code() from anon, authenticated;
revoke execute on function public.submit_qr_attendance(text, text, double precision, double precision, double precision) from anon, authenticated;

grant execute on function public.get_active_presence_code() to service_role;
grant execute on function public.rotate_presence_code() to service_role;
grant execute on function public.submit_qr_attendance(text, text, double precision, double precision, double precision) to service_role;
~~~

Before running it in Supabase SQL Editor, run select pg_get_function_identity_arguments('public.submit_qr_attendance'::regproc); and adjust listed signature only if it differs.

- [ ] **Step 7: Verify**

Run: npm test && npm run lint && npm run build

Expected: all commands exit 0.

- [ ] **Step 8: Commit**

~~~bash
git add frontend/lib/services/attendance frontend/app/api/staff/attendance frontend/tests/attendanceServer.test.mjs frontend/docs/staff-modal-qr-attendance-migration.sql
git commit -m "feat: secure staff attendance QR APIs"
~~~

### Task 3: Convert Staff Attendance to scan-and-submit modal

**Files:**
- Modify: frontend/app/staff/attendance/utils.ts
- Modify: frontend/app/staff/attendance/hooks/useAttendanceData.tsx
- Modify: frontend/app/staff/attendance/page.tsx

**Interfaces:**
- Consumes: extractAttendanceQrCode and POST /api/staff/attendance/submit.
- Produces: camera scan, location read, session-bound submit, and result UI with no manual code or duplicate submit control.

- [ ] **Step 1: Extend QR regression test**

~~~js
test("rejects table QR and obsolete absensi URL", async () => {
  const { extractAttendanceQrCode } = await import("../lib/services/attendance/attendanceQr.js");
  assert.equal(extractAttendanceQrCode("https://iza-pos-v2.vercel.app/customer/table/token"), null);
  assert.equal(extractAttendanceQrCode("https://iza-pos-v2.vercel.app/absensi?code=token"), null);
});
~~~

- [ ] **Step 2: Run regression**

Run: node --test tests/attendanceQr.test.mjs

Expected: PASS with Task 1 parser.

- [ ] **Step 3: Route scanner data through authenticated API**

Change extractPresenceCodeFromQrText to delegate to extractAttendanceQrCode. Retain current active-account, shift, store settings, coordinate, and 100 m accuracy checks. Replace direct client RPC call with:

~~~ts
const response = await fetch("/api/staff/attendance/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: normalizedCode, latitude, longitude, accuracy }),
});
const payload = await response.json().catch(() => ({}));
if (!response.ok || !payload.success) {
  throw new Error(String(payload.error ?? "Attendance could not be processed. Scan the latest QR again."));
}
const result = payload.data;
~~~

Do not send staff.staff_code, userId, or any credential.

- [ ] **Step 4: Submit automatically after a valid scan**

Change handleAttendanceSubmit to accept codeOverride?: string. The decoder callback parses only the attendance protocol, stops camera, leaves modal open, sets Checking your location, and calls handleAttendanceSubmit(scannedCode). On success refresh attendance state, clear token, show title/message/distance and Selesai. On failure retain modal and show Scan ulang.

- [ ] **Step 5: Remove duplicate UI**

Delete handleVerifyManualCode, manual-code input, and Absence-panel Submit Now action. Keep Scan QR untuk Absensi action and modal controls for camera, progress, error/result, Scan ulang, and Tutup.

- [ ] **Step 6: Verify**

Run: npm test && npm run lint && npm run build

Expected: all commands exit 0; rg "submit_qr_attendance" app/staff/attendance finds no client RPC call.

- [ ] **Step 7: Commit**

~~~bash
git add frontend/app/staff/attendance/utils.ts frontend/app/staff/attendance/hooks/useAttendanceData.tsx frontend/app/staff/attendance/page.tsx frontend/tests/attendanceQr.test.mjs
git commit -m "feat: submit staff attendance from scan modal"
~~~

### Task 4: Add cashier QR kiosk modal to POS

**Files:**
- Create: frontend/app/components/staff/attendance/AttendanceKioskModal.tsx
- Modify: frontend/app/components/staff/pos/FoodiesMenuHeader.tsx
- Modify: frontend/app/staff/pos/page.tsx

**Interfaces:**
- Consumes: kiosk-code API, buildAttendanceQrPayload, and QRCodeSVG.
- Produces: AttendanceKioskModal and optional onOpenAttendanceKiosk header action.

- [ ] **Step 1: Add QR empty-code regression**

~~~js
test("does not create a QR payload for whitespace-only code", async () => {
  const { buildAttendanceQrPayload } = await import("../lib/services/attendance/attendanceQr.js");
  assert.equal(buildAttendanceQrPayload("   "), null);
});
~~~

- [ ] **Step 2: Run test**

Run: node --test tests/attendanceQr.test.mjs

Expected: PASS.

- [ ] **Step 3: Implement AttendanceKioskModal**

Use QRCodeSVG from qrcode.react with value from buildAttendanceQrPayload(activeCode.code) only when code exists. On opening, GET active code. Track expires_at for a remaining-seconds label. At expiry POST to rotate. Poll GET each five seconds while open to refresh after one-time use. Clear timers on close/unmount. Render QR Absensi Staff, remaining time, outlet instruction, and Tutup. Never display a URL, raw token, Staff ID, or login code.

- [ ] **Step 4: Wire cashier-only trigger**

Extend FoodiesMenuHeaderProps with optional onOpenAttendanceKiosk. Render QR Absensi only when callback exists. In pos/page.tsx compute:

~~~ts
const isCashier = hasStaffPosition({
  position: "cashier",
  positions: currentUser?.positions,
  staffType: currentUser?.staffType,
});
~~~

Add attendanceKioskOpen state, pass callback only if isCashier, and mount modal. Do not pass callback for owner sessions.

- [ ] **Step 5: Verify**

Run: npm run lint && npm run build

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

~~~bash
git add frontend/app/components/staff/attendance/AttendanceKioskModal.tsx frontend/app/components/staff/pos/FoodiesMenuHeader.tsx frontend/app/staff/pos/page.tsx frontend/tests/attendanceQr.test.mjs
git commit -m "feat: add cashier attendance QR kiosk"
~~~

### Task 5: Remove public page and acceptance-test two devices

**Files:**
- Delete: frontend/app/absensi/page.tsx
- Modify: frontend/tests/attendanceQr.test.mjs
- Modify: frontend/README.md

**Interfaces:**
- Removes public attendance form and direct browser RPC path.
- Documents cashier tablet QR to signed-in staff phone scan to GPS/radius decision.

- [ ] **Step 1: Add final regression**

~~~js
test("attendance QR never points to removed public route", async () => {
  const { buildAttendanceQrPayload } = await import("../lib/services/attendance/attendanceQr.js");
  assert.equal(buildAttendanceQrPayload("presence_123").includes("/absensi"), false);
});
~~~

- [ ] **Step 2: Run regression before deletion**

Run: node --test tests/attendanceQr.test.mjs

Expected: PASS.

- [ ] **Step 3: Delete public route and document operations**

Delete frontend/app/absensi/page.tsx. Add Staff attendance section to frontend/README.md: cashier opens QR Absensi at /staff/pos; each staff member uses own signed-in phone at /staff/attendance; configured radius is server-enforced.

- [ ] **Step 4: Deploy privilege migration**

Run frontend/docs/staff-modal-qr-attendance-migration.sql in Supabase SQL Editor after validating the real RPC signature. Record successful SQL execution in deployment notes. Do not deploy frontend first; it would leave direct browser RPC access enabled.

- [ ] **Step 5: Execute manual two-device acceptance**

1. Sign in as cashier on tablet and verify QR Absensi opens rotating QR from /staff/pos.
2. Sign in as non-cashier on separate phone, use /staff/attendance, and verify scanner camera request.
3. Scan within radius; verify attendance success, distance, and refreshed state.
4. Scan outside radius; verify server rejection with actual distance and allowed radius.
5. Request kiosk API with non-cashier and owner sessions; verify 403 and no trigger.
6. Visit /absensi; verify 404 with no attendance form or QR.

- [ ] **Step 6: Run final verification**

Run: npm test && npm run lint && npm run build

Expected: tests, lint, and production build all exit 0.

- [ ] **Step 7: Commit**

~~~bash
git add frontend/README.md frontend/tests/attendanceQr.test.mjs
git rm frontend/app/absensi/page.tsx
git commit -m "refactor: remove public attendance page"
~~~

