export type ValidatableOrder = {
  status?: string | null;
  payment_status?: string | null;
};

const INVALID_ORDER_STATUSES = new Set([
  "cancelled",
  "canceled",
  "void",
  "refunded",
]);

const INVALID_PAYMENT_STATUSES = new Set([
  "cancelled",
  "canceled",
  "failed",
  "refunded",
  "void",
  "unpaid",
  "pending",
]);

export const isValidPaidOrder = (order: ValidatableOrder) => {
  const status = String(order.status ?? "").toLowerCase();
  const paymentStatus = String(order.payment_status ?? "").toLowerCase();

  return (
    !INVALID_ORDER_STATUSES.has(status) &&
    !INVALID_PAYMENT_STATUSES.has(paymentStatus)
  );
};

export const isCancelledOrderStatus = (status: string | null | undefined) =>
  INVALID_ORDER_STATUSES.has(String(status ?? "").toLowerCase());
