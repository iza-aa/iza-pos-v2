# Staff Modal QR Attendance Design

## Goal

Move attendance into the authenticated staff experience. A cashier displays a short-lived QR code from the POS tablet, while every staff member, including the cashier, scans it from their own signed-in phone and can clock in or out only from within the configured outlet radius.

## Scope

- Remove `/absensi` as an attendance workflow and remove QR links to that public page.
- Show the attendance kiosk QR only to staff whose assigned position is `cashier` while they use the staff POS on the tablet.
- Let signed-in staff scan the QR in a modal from the Absence tab of `/staff/attendance`.
- Bind the attendance attempt to the signed-in staff identity, not an entered credential.
- Enforce store location, attendance radius, QR validity, attendance state, and shift rules on the server.

## User Flow

1. A cashier signs in to the staff POS on the outlet tablet and selects **QR Absensi**.
2. The POS opens a kiosk modal containing the active QR code. The code automatically rotates every 60 seconds and immediately after successful use.
3. Any staff member signs in to their own phone and opens the Absence tab at `/staff/attendance`.
4. The staff member selects **Scan QR untuk Absensi**. A scanner modal reads the QR token from the tablet.
5. The phone requests precise location permission and submits the token, current coordinates, and accuracy with the authenticated staff session.
6. The server validates the QR token and all attendance policy checks. It returns the result for the modal to display.
7. If the device is outside `attendance_radius_meters`, the server rejects the attempt and the UI clearly shows the actual distance and allowed radius.

## Components and Responsibilities

### POS QR Kiosk Modal

The staff POS page owns the kiosk trigger and modal. It checks the signed-in staff member's normalized position before rendering the **QR Absensi** control. Only `cashier` can open it. The modal retrieves and rotates the existing active presence code and renders its QR image without exposing a public attendance URL; the QR payload is the opaque presence-code token.

### Staff Scan Modal

The Absence tab owns a camera-scanner modal. It is available to authenticated staff and displays scan, location, pending, success, and error states. The staff identity comes from the validated session already used by `/staff/attendance`; no Staff ID or login credential field is rendered.

### Attendance Submission Boundary

The attendance RPC/API accepts the QR token, session-derived staff ID, latitude, longitude, and location accuracy. It validates the token is active and unexpired, resolves the active store settings, applies the configured radius, verifies the staff role/status and shift/clock state, then records the result. Client-side distance feedback improves the experience but is never trusted for authorization.

## Error Handling

- Camera unavailable or permission denied: keep the modal open and explain that camera access is required to scan the outlet QR.
- Location unsupported, denied, timed out, or too inaccurate: reject before submission with an actionable message.
- Invalid, expired, or already-used QR: explain that the staff member must rescan the current QR shown on the tablet.
- Missing or invalid outlet settings: reject the attendance request and tell the staff member to contact an owner or manager.
- Outside configured radius: reject the attendance request and show rounded actual distance and permitted radius.
- Unauthorized non-cashier kiosk attempt: do not render the trigger; the server path that manages kiosk codes must also continue to require authorized access.

## Security and Data Rules

- The public `/absensi` route is removed or redirected away from the attendance system; it must not render a credential-based attendance form.
- QR tokens remain opaque, short-lived, and single-use according to the existing presence-code rules.
- A QR code alone is insufficient to create an attendance record because the request must carry a valid authenticated staff session.
- Location/radius calculation and the final attendance decision remain server-side.
- Cashiers must use a separate signed-in phone session to clock themselves in or out; a tablet POS session cannot be used as their attendance identity.

## Testing

- Unit test the cashier-position gate and QR payload generation without a public URL.
- Unit test scanner submission payload generation and client result/error rendering.
- Integration test the attendance boundary for valid authenticated staff, invalid/expired token, missing session, outside radius, and non-cashier kiosk access.
- Add an end-to-end flow covering cashier QR display on tablet and a staff mobile session scanning, allowing an in-radius attempt and rejecting an out-of-radius attempt with clear feedback.

## Out of Scope

- Changing the owner/manager Attendance Setting fields or their configured store coordinates/radius.
- Adding biometric verification, device registration, or location spoofing detection beyond the browser location accuracy and existing server checks.
