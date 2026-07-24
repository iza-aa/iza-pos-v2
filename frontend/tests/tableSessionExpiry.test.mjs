import assert from "node:assert/strict";
import test from "node:test";

const startedAt = "2026-07-24T09:00:00.000Z";

test("expires an empty table session after ten minutes", async () => {
  const { getTableSessionExpiry } = await import("../lib/customer/tableSessionExpiry.js");

  assert.deepEqual(
    getTableSessionExpiry({ startedAt, orders: [], now: "2026-07-24T09:10:00.000Z" }),
    { expired: true, reason: "empty_session" },
  );
});

test("keeps a session active while any order is not completed", async () => {
  const { getTableSessionExpiry } = await import("../lib/customer/tableSessionExpiry.js");

  assert.deepEqual(
    getTableSessionExpiry({
      startedAt,
      now: "2026-07-24T12:00:00.000Z",
      orders: [{ status: "preparing", completedAt: null }],
    }),
    { expired: false, reason: "active_order" },
  );
});

test("expires five minutes after the last served or completed order", async () => {
  const { getTableSessionExpiry } = await import("../lib/customer/tableSessionExpiry.js");

  assert.deepEqual(
    getTableSessionExpiry({
      startedAt,
      now: "2026-07-24T09:20:00.000Z",
      orders: [
        { status: "served", completedAt: "2026-07-24T09:14:00.000Z" },
        { status: "completed", completedAt: "2026-07-24T09:15:00.000Z" },
      ],
    }),
    { expired: true, reason: "completed_orders" },
  );
});
