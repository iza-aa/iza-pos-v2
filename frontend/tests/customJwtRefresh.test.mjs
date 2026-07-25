import assert from "node:assert/strict";
import test from "node:test";

import {
  SUPABASE_ACCESS_TOKEN_TTL_SECONDS,
  createSupabaseTokenRefreshingFetch,
  getSupabaseAccessTokenCookieOptions,
  isExpiredCustomSupabaseJwtResponse,
} from "../lib/supabase/customJwtRefresh.js";

test("identifies only PostgREST expired-JWT responses", async () => {
  const expired = new Response(JSON.stringify({ code: "PGRST303" }), { status: 401 });
  const forbidden = new Response(JSON.stringify({ code: "42501" }), { status: 401 });
  const success = new Response(JSON.stringify([{ id: "staff-1" }]), { status: 200 });

  assert.equal(await isExpiredCustomSupabaseJwtResponse(expired), true);
  assert.equal(await isExpiredCustomSupabaseJwtResponse(forbidden), false);
  assert.equal(await isExpiredCustomSupabaseJwtResponse(success), false);
  assert.equal(SUPABASE_ACCESS_TOKEN_TTL_SECONDS, 8 * 60 * 60);
});

test("uses an eight-hour readable access-token cookie", () => {
  const options = getSupabaseAccessTokenCookieOptions();

  assert.equal(options.maxAge, SUPABASE_ACCESS_TOKEN_TTL_SECONDS);
  assert.equal(options.httpOnly, false);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
});

test("refreshes once and retries using the current authorization token", async () => {
  let currentToken = "expired-token";
  let refreshes = 0;
  const restAuthorizations = [];

  const fetchWithRefresh = createSupabaseTokenRefreshingFetch({
    refreshPath: "/api/session/refresh-supabase-token",
    authorizeRequest: (options) => ({
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${currentToken}` },
    }),
    fetchImpl: async (url, options = {}) => {
      if (url === "/api/session/refresh-supabase-token") {
        refreshes += 1;
        currentToken = "fresh-token";
        return new Response(null, { status: 204 });
      }

      restAuthorizations.push(options.headers.Authorization);
      return restAuthorizations.length === 1
        ? new Response(JSON.stringify({ code: "PGRST303" }), { status: 401 })
        : new Response(JSON.stringify([{ id: "staff-1" }]), { status: 200 });
    },
  });

  const response = await fetchWithRefresh("https://example.test/rest/v1/staff", { method: "GET" });

  assert.equal(response.status, 200);
  assert.equal(refreshes, 1);
  assert.deepEqual(restAuthorizations, ["Bearer expired-token", "Bearer fresh-token"]);
});

test("returns the original response without retrying when refresh fails", async () => {
  let restRequests = 0;

  const fetchWithRefresh = createSupabaseTokenRefreshingFetch({
    refreshPath: "/api/session/refresh-supabase-token",
    authorizeRequest: (options) => options,
    fetchImpl: async (url) => {
      if (url === "/api/session/refresh-supabase-token") {
        return new Response(null, { status: 401 });
      }

      restRequests += 1;
      return new Response(JSON.stringify({ code: "PGRST303" }), { status: 401 });
    },
  });

  const response = await fetchWithRefresh("https://example.test/rest/v1/staff");

  assert.equal(response.status, 401);
  assert.equal(restRequests, 1);
});

test("coalesces concurrent expired-token refreshes", async () => {
  let refreshes = 0;
  let refreshed = false;
  let resolveRefresh;
  const refreshGate = new Promise((resolve) => {
    resolveRefresh = resolve;
  });

  const fetchWithRefresh = createSupabaseTokenRefreshingFetch({
    refreshPath: "/api/session/refresh-supabase-token",
    authorizeRequest: (options) => options,
    fetchImpl: async (url) => {
      if (url === "/api/session/refresh-supabase-token") {
        refreshes += 1;
        await refreshGate;
        refreshed = true;
        return new Response(null, { status: 204 });
      }

      return refreshed
        ? new Response(JSON.stringify([{ id: "staff-1" }]), { status: 200 })
        : new Response(JSON.stringify({ code: "PGRST303" }), { status: 401 });
    },
  });

  const first = fetchWithRefresh("https://example.test/rest/v1/staff?id=eq.1");
  const second = fetchWithRefresh("https://example.test/rest/v1/staff?id=eq.2");
  await new Promise((resolve) => setImmediate(resolve));
  resolveRefresh();

  const [firstResponse, secondResponse] = await Promise.all([first, second]);

  assert.equal(refreshes, 1);
  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
});
