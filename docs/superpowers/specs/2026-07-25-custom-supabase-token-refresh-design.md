# Custom Supabase Token Refresh Design

## Goal

Keep an authenticated staff, manager, or owner session active for its chosen duration while renewing the short-lived custom JWT used for Supabase RLS. An expired JWT must not leave the application making REST requests with a stale `Authorization` header.

## Context

The application authenticates staff, managers, and owners with the signed, httpOnly `iza_internal_session` cookie. It separately creates a custom Supabase JWT (`sb-access-token`) for RLS. The custom JWT lasts eight hours, but a remembered internal session can last seven days. Since this JWT is not a Supabase Auth session, `autoRefreshToken` cannot renew it. The browser client also explicitly uses `sb-access-token` as the authorization header, so an expired cookie produces PostgREST error `PGRST303`.

## Chosen Architecture

### Server refresh endpoint

Add a same-origin `POST /api/session/refresh-supabase-token` route. It has no request body and never returns the JWT in JSON.

The route will:

1. Read and verify `iza_internal_session` with the existing signature and expiry validation.
2. Look up the session subject with the service-role client and require an active staff row whose persisted role matches the role in the session. It will also obtain the current primary position for staff users.
3. Create a new custom Supabase JWT with the current subject, role, and staff position. Its expiry is eight hours.
4. Set `sb-access-token` using the same expiry, `path=/`, `sameSite=lax`, and `secure` only in production. The JWT remains non-httpOnly because Supabase browser requests must send it; it must never be copied into localStorage or an API response.
5. Return `204 No Content`. Invalid, expired, deactivated, or role-mismatched sessions return `401` and clear the stale access-token cookie. Unexpected server failures return a generic `500` response and never disclose token or secret information.

The route derives all claims server-side. It accepts no user ID, role, or duration from the caller. The service-role key stays server-only.

### Browser recovery

The shared Supabase browser fetch adapter will recognize only a Supabase REST response with status `401` and JSON error code `PGRST303`. It will then call the refresh endpoint with credentials included, and repeat the original Supabase request once.

Refresh requests are coalesced into one in-flight promise per browser tab, avoiding parallel refresh calls when several queries fail together. The retry guard permits one retry only, so an invalid session cannot create a loop. Other `401` responses, network failures, or refresh failures are returned unchanged to the caller; existing UI/session handling determines the appropriate logout or error state.

### Request flow

```text
Supabase request -> 401/PGRST303 -> POST refresh endpoint
                                   -> validate internal session + active role
                                   -> set fresh sb-access-token cookie
                    -> retry original request once -> normal Supabase response
```

## Non-goals

- Do not use the Supabase service-role key in the browser.
- Do not extend custom access JWT validity to seven days.
- Do not create a Supabase Auth user/session solely for this refresh behavior.
- Do not retry errors other than confirmed expired custom JWT responses.

## Testing

Use the repository's Node test runner. Cover the pure refresh/retry decision logic and server-side token-issuance helpers with tests that demonstrate:

- an `401/PGRST303` response is eligible for exactly one retry;
- a second expired response, another 401 error, or a non-401 response is not retried;
- concurrent eligible failures share one refresh operation;
- refresh claims are derived from the validated server-side session and current active staff data;
- invalid, expired, inactive, or role-mismatched sessions cannot receive a new JWT.

Run the focused tests, the full `npm test` suite, ESLint, and a production build before release. Confirm in a browser by expiring a test access token while retaining a valid internal session, then observing a single refresh call followed by a successful staff request.

## Security Properties

- The long-lived authority is an httpOnly signed internal-session cookie.
- The short-lived Supabase JWT is renewed only after server validation and is never returned in a response body.
- Authorization claims cannot be controlled by browser input.
- The endpoint changes only a same-site cookie, is POST-only, and checks the request origin when present.
- Retry behavior is bounded, specific to an authenticated expiry response, and does not mask authorization failures.
