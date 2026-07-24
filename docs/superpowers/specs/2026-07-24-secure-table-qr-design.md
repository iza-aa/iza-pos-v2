# Secure Table QR Design

## Goal

Make customer table QR scans work without granting anonymous clients direct access to the `tables` table, and require an authenticated manager or owner to rotate a QR code.

## Design

Each newly generated QR URL contains an opaque `qr_` token rather than the table primary key. The token is stored only as part of the existing `tables.qr_code_url`, so no database migration is required. The customer session route validates the token format and uses a server-only Supabase admin client to resolve the matching QR URL, verify that the table is active, and create or reuse the session. It returns only the existing customer session payload.

Existing QR codes keep working during transition: their UUID value is accepted only when it exactly matches a persisted QR URL. Regenerating a QR replaces that URL with a fresh opaque token, invalidating the previous code.

The manager QR endpoint first verifies the HTTP-only internal session and accepts only `manager` or `owner`. It then uses the request-scoped Supabase server client, so the existing RLS policy remains the database authorization layer. The browser receives only a safe generic server failure message while the server log retains the underlying cause.

## Constraints

- `SUPABASE_SERVICE_ROLE_KEY` is used only by server route code and is never returned to the browser.
- No anonymous RLS select policy is added to `tables`.
- Customer input is limited to strict `qr_` tokens, with a temporary strict UUID compatibility path for already printed QR codes.
- Regeneration must rotate the QR URL and invalidate the previously generated QR code.
