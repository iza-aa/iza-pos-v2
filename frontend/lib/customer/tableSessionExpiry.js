const EMPTY_SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const COMPLETED_ORDER_GRACE_MS = 5 * 60 * 1000;
const FINISHED_ORDER_STATUSES = new Set(["served", "completed", "cancelled"]);

function toTime(value) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function getTableSessionExpiry({ startedAt, orders, now = new Date().toISOString() }) {
  const nowTime = toTime(now);
  const startedAtTime = toTime(startedAt);

  if (nowTime === null || startedAtTime === null) {
    return { expired: false, reason: "invalid_timestamp" };
  }

  if (orders.length === 0) {
    return {
      expired: nowTime >= startedAtTime + EMPTY_SESSION_TIMEOUT_MS,
      reason: "empty_session",
    };
  }

  if (orders.some((order) => !FINISHED_ORDER_STATUSES.has(order.status))) {
    return { expired: false, reason: "active_order" };
  }

  const latestCompletedAt = Math.max(
    ...orders.map((order) => toTime(order.completedAt) ?? startedAtTime),
  );

  return {
    expired: nowTime >= latestCompletedAt + COMPLETED_ORDER_GRACE_MS,
    reason: "completed_orders",
  };
}
