# Secure Table QR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore customer QR table sessions and secure manager QR regeneration without public table reads.

**Architecture:** Store an opaque QR token in the existing QR URL, resolve it only in a server-only customer route, and preserve manager authorization with an HTTP-only internal session plus Supabase RLS.

**Tech Stack:** Next.js route handlers, Supabase JS/SSR clients, Node test runner.

## Global Constraints

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.
- Do not add an anonymous `tables` SELECT policy.
- Preserve existing printed UUID QR codes until each table is regenerated.

---

### Task 1: Generate opaque table QR tokens

**Files:**
- Create: `frontend/lib/services/table/qrToken.js`
- Test: `frontend/tests/tableQrToken.test.mjs`

**Interfaces:**
- Produces: `createTableQrToken(): string` and `isTableQrToken(value: unknown): boolean`.

- [x] **Step 1: Write the failing test**

```js
assert.equal(isTableQrToken(createTableQrToken()), true);
assert.equal(isTableQrToken(tableId), false);
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/tableQrToken.test.mjs`

Expected: module-not-found failure before the helper exists.

- [x] **Step 3: Write minimal implementation**

```js
export function createTableQrToken() {
  return `qr_${crypto.randomUUID().replaceAll("-", "")}`;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/tableQrToken.test.mjs`

Expected: 2 passing tests.

### Task 2: Restrict QR session resolution to a server boundary

**Files:**
- Create: `frontend/lib/supabase/admin.ts`
- Modify: `frontend/app/api/customer/table-session/start/route.ts`
- Modify: `frontend/app/customer/table/[token]/page.tsx`

**Interfaces:**
- Consumes: `isTableQrToken(value)`.
- Produces: customer table session response for a valid persisted QR URL.

- [x] **Step 1: Validate the submitted QR value**

```ts
if (!tableQrValue || !isTableQrValue(tableQrValue)) {
  return createErrorResponse("Invalid table QR code.", 400);
}
```

- [x] **Step 2: Resolve only an exact persisted QR suffix with a server-only admin client**

```ts
const supabase = createAdminClient();
const result = await supabase
  .from("tables")
  .select("id, table_number, floor_id, capacity, status, is_active")
  .like("qr_code_url", `%/customer/table/${tableQrValue}`)
  .maybeSingle();
```

### Task 3: Require manager authorization for QR rotation

**Files:**
- Modify: `frontend/lib/services/table/qrCodeService.ts`
- Modify: `frontend/app/api/manager/qr/generate/route.ts`
- Modify: `frontend/app/api/manager/qr/regenerate/route.ts`
- Modify: `frontend/app/components/manager/tablemanager/TableEditor.tsx`

**Interfaces:**
- Consumes: `iza_internal_session` and Supabase RLS session cookie.
- Produces: a regenerated QR URL containing a new opaque token.

- [x] **Step 1: Rotate the token when persisting a QR**

```ts
const qrToken = createTableQrToken();
const customerUrl = generateCustomerUrl(qrToken);
```

- [x] **Step 2: Reject unauthenticated or non-manager requests**

```ts
if (!session || (session.role !== "manager" && session.role !== "owner")) {
  return createErrorResponse("Unauthorized.", 401);
}
```

- [x] **Step 3: Verify affected files with lint**

Run: `npx eslint app/api/customer/table-session/start/route.ts app/api/manager/qr/generate/route.ts app/api/manager/qr/regenerate/route.ts app/customer/table/[token]/page.tsx app/components/manager/tablemanager/TableEditor.tsx lib/services/table/qrCodeService.ts lib/supabase/admin.ts`

Expected: no ESLint errors.
