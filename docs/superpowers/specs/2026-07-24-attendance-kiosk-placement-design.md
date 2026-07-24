# Attendance Kiosk Placement Design

## Goal

Place the cashier QR kiosk within the staff Absence workflow instead of the POS screen.

## Approved Layout

- Remove the QR kiosk trigger and modal mount from `/staff/pos`.
- In the Absence tab of `/staff/attendance`, render a two-button row below the attendance summary.
- Keep **Attendance History** on the left.
- Render **QR Absensi** on the right only when the signed-in staff member has the `cashier` position.
- The QR button opens the existing `AttendanceKioskModal`; its API authorization remains cashier-only.

## Non-Goals

- Do not change QR token format, expiration, rotation, backend session validation, or geolocation/radius rules.
- Do not expose the kiosk button to owner, manager, or non-cashier staff accounts.

## Verification

- The POS page contains no attendance kiosk trigger or modal.
- The Absence tab shows only Attendance History for non-cashier staff and two side-by-side controls for cashiers.
- The QR modal still loads from the cashier-protected kiosk API.
