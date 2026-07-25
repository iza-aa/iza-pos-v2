# Custom Supabase Token Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renew the short-lived JWT used by Supabase RLS when a valid internal session still exists, without exposing server credentials or token values.

**Architecture:** A server-only POST endpoint validates the signed httpOnly internal-session cookie and current database role, then writes a new eight-hour custom Supabase access-token cookie. The shared browser fetch adapter handles only `401/PGRST303`, performs one coalesced refresh, and repeats the original request once.

**Tech Stack:** Next.js 15 route handlers, `@supabase/supabase-js`, TypeScript, browser Fetch API, Node test runner.

## Global Constraints

- Custom JWT and its cookie must expire after exactly 28,800 seconds.
- The refresh route accepts no request body and returns no JWT in JSON.
- Claims, roles, and staff position are derived server-side only.
- Retry only confirmed expired-JWT responses and never loop.
- Never expose service-role credentials, access tokens, or session cookies in browser storage or logging.

---

### Task 1: Test and implement browser retry policy

**Files:**
- Create: `frontend/lib/supabase/customJwtRefresh.js`
- Create: `frontend/tests/customJwtRefresh.test.mjs`

**Interfaces:**
- Produces `SUPABASE_ACCESS_TOKEN_TTL_SECONDS`, `getSupabaseAccessTokenCookieOptions`, `isExpiredCustomSupabaseJwtResponse`, and `createSupabaseTokenRefreshingFetch`.

- [ ] **Step 1: Write failing tests for the policy**

```js
test("identifies only PostgREST expired JWT responses", async () => {
  const expired = new Response(JSON.stringify({ code: "PGRST303" }), { status: 401 });
  const unauthorized = new Response(JSON.stringify({ code: "42501" }), { status: 401 });
  assert.equal(await isExpiredCustomSupabaseJwtResponse(expired), true);
  assert.equal(await isExpiredCustomSupabaseJwtResponse(unauthorized), false);
  assert.equal(SUPABASE_ACCESS_TOKEN_TTL_SECONDS, 8 * 60 * 60);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/customJwtRefresh.test.mjs`

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Implement the policy module**

```js
export const SUPABASE_ACCESS_TOKEN_TTL_SECONDS = 8 * 60 * 60;
export const getSupabaseAccessTokenCookieOptions = () => ({
  httpOnly: false, secure: process.env.NODE_ENV === "production",
  sameSite: "lax", path: "/", maxAge: SUPABASE_ACCESS_TOKEN_TTL_SECONDS,
});
export const isExpiredCustomSupabaseJwtResponse = async (response) => {
  if (response.status !== 401) return false;
  return (await response.clone().json().catch(() => null))?.code === "PGRST303";
};
```

`createSupabaseTokenRefreshingFetch` must keep one in-flight POST refresh promise, reset the promise in `finally`, and call `authorizeRequest(options)` independently for the original request and one retry. If refresh is non-OK or fails, return the original expired response unchanged instead of throwing or retrying again.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/customJwtRefresh.test.mjs`

Expected: PASS.

### Task 2: Centralize access-cookie issuance and session validation

**Files:**
- Create: `frontend/lib/auth/supabaseAccessToken.ts`
- Create: `frontend/lib/auth/verifiedInternalSession.ts`
- Modify: `frontend/app/api/internal-session/route.ts`
- Modify: `frontend/app/api/staff/login/route.ts`
- Modify: `frontend/app/api/manager/login/route.ts`
- Modify: `frontend/app/api/owner/login/route.ts`

**Interfaces:**
- `setSupabaseAccessTokenCookie(response, claims)` creates a JWT with `expiresInSeconds: SUPABASE_ACCESS_TOKEN_TTL_SECONDS` then writes it using `getSupabaseAccessTokenCookieOptions()`.
- `clearSupabaseAccessTokenCookie(response)` expires only `sb-access-token`.
- `getVerifiedInternalSessionUser(request)` returns the active, role-matching database user plus `primary_position`, or `null`.

- [ ] **Step 1: Extend the failing policy test**

```js
test("uses an eight-hour readable access-token cookie", () => {
  const options = getSupabaseAccessTokenCookieOptions();
  assert.equal(options.maxAge, SUPABASE_ACCESS_TOKEN_TTL_SECONDS);
  assert.equal(options.httpOnly, false);
  assert.equal(options.sameSite, "lax");
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/customJwtRefresh.test.mjs`

Expected: FAIL until the cookie policy is exported.

- [ ] **Step 3: Implement minimal shared helpers**

Move `getVerifiedUser` from `app/api/internal-session/route.ts` into `verifiedInternalSession.ts`. Retain its service-role query, signed-cookie validation, active-status check, equal-role check, and primary-position calculation. Have the internal-session route call the shared helper.

In `supabaseAccessToken.ts`, set the token cookie through the shared policy and centralize removal as:

```ts
response.cookies.set({
  name: "sb-access-token", value: "",
  ...getSupabaseAccessTokenCookieOptions(), maxAge: 0,
});
```

Replace the direct custom-JWT/cookie blocks in all three login routes with the shared setter. Preserve `rememberMe` only for `iza_internal_session`; do not use it to extend `sb-access-token`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/customJwtRefresh.test.mjs`

Expected: PASS.

### Task 3: Add the secure refresh route

**Files:**
- Create: `frontend/app/api/session/refresh-supabase-token/route.ts`
- Modify: `frontend/tests/customJwtRefresh.test.mjs`

**Interfaces:**
- `POST /api/session/refresh-supabase-token` returns 204 and writes a new token, 401 for an invalid session, 403 for a present cross-origin request, and generic 500 for unexpected failure.

- [ ] **Step 1: Write failing retry tests**

```js
test("does not retry the REST request when refresh fails", async () => {
  // First REST call returns PGRST303; refresh returns 401.
  // Assert the wrapper returns the original 401 and the REST call count remains one.
});

test("shares one refresh between concurrent expired requests", async () => {
  // Start two PGRST303 requests before resolving refresh.
  // Assert exactly one POST refresh call and two successful retries.
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/customJwtRefresh.test.mjs`

Expected: FAIL until coalescing and failure behavior are implemented.

- [ ] **Step 3: Implement endpoint**

```ts
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  try {
    const user = await getVerifiedInternalSessionUser(request);
    if (!user) {
      const response = NextResponse.json({ error: "Authenticated access required." }, { status: 401 });
      clearSupabaseAccessTokenCookie(response);
      return response;
    }
    const response = new NextResponse(null, { status: 204 });
    await setSupabaseAccessTokenCookie(response, {
      app_role: user.role, sub: user.id,
      staff_type: user.primary_position ?? undefined,
    });
    return response;
  } catch (error) {
    console.error("Failed to refresh Supabase access token", error);
    return NextResponse.json({ error: "Unable to refresh session." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/customJwtRefresh.test.mjs`

Expected: PASS.

### Task 4: Connect shared browser clients to token recovery

**Files:**
- Modify: `frontend/lib/config/supabaseClient.ts`
- Modify: `frontend/lib/supabase/client.ts`
- Modify: `frontend/tests/customJwtRefresh.test.mjs`

**Interfaces:**
- Each browser client uses `createSupabaseTokenRefreshingFetch({ fetchImpl: fetch, refreshPath: "/api/session/refresh-supabase-token", authorizeRequest })`.

- [ ] **Step 1: Write a failing fresh-cookie retry test**

```js
test("reauthorizes the retry with the refreshed cookie", async () => {
  // Simulate cookie value "old" for the first request and "new" after refresh.
  // Assert recorded authorization headers are ["Bearer old", "Bearer new"].
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/customJwtRefresh.test.mjs`

Expected: FAIL until authorization is evaluated separately on retry.

- [ ] **Step 3: Implement client integration**

In `supabaseClient.ts`, convert the existing cookie-to-Authorization logic into an `authorizeRequest` function that creates a new `Headers` object. Pass it to the retry wrapper as `global.fetch`.

In `lib/supabase/client.ts`, remove token capture at client construction and replace static `global.headers` with the wrapper. Its authorization function rereads `sb-access-token` per attempt, then uses the existing customer local-storage token only when no staff token exists.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/customJwtRefresh.test.mjs`

Expected: PASS.

### Task 5: Full verification and security review

**Files:**
- Modify: `docs/superpowers/specs/2026-07-25-custom-supabase-token-refresh-design.md` only if implementation differs from the approved design.

- [ ] **Step 1: Run focused and full tests**

Run: `npm test -- tests/customJwtRefresh.test.mjs` then `npm test`

Expected: both commands exit 0.

- [ ] **Step 2: Run static and build checks**

Run: `npm run lint` then `npm run build`

Expected: both commands exit 0.

- [ ] **Step 3: Verify security invariants manually**

Confirm no token is returned in JSON/logged, route has no body parsing, role and position are server-derived, cross-site origins are rejected, service credentials remain server-only, and a request retries only one `PGRST303` response.

- [ ] **Step 4: Commit implementation**

```bash
git add frontend/lib/supabase/customJwtRefresh.js frontend/lib/auth/supabaseAccessToken.ts frontend/lib/auth/verifiedInternalSession.ts frontend/app/api/session/refresh-supabase-token/route.ts frontend/lib/config/supabaseClient.ts frontend/lib/supabase/client.ts frontend/app/api/internal-session/route.ts frontend/app/api/staff/login/route.ts frontend/app/api/manager/login/route.ts frontend/app/api/owner/login/route.ts frontend/tests/customJwtRefresh.test.mjs
git commit -m "fix: refresh expired custom Supabase tokens"
```
