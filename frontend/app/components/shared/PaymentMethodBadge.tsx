"use client";

import { OWNER_SEMANTIC_TONES } from "@/lib/constants/theme";
import {
  getOrderPaymentLabel,
  normalizeOrderPaymentMethod,
} from "@/lib/orders/orderPresentation";

type PaymentMethodBadgeProps = {
  method?: string | null;
  showUnknown?: boolean;
};

export default function PaymentMethodBadge({
  method,
  showUnknown = true,
}: PaymentMethodBadgeProps) {
  const normalizedMethod = normalizeOrderPaymentMethod(method);

  if (normalizedMethod === "unknown" && !showUnknown) {
    return null;
  }

  const badgeClass =
    normalizedMethod === "cash"
      ? OWNER_SEMANTIC_TONES.success.badgeClass
      : normalizedMethod === "qris"
        ? OWNER_SEMANTIC_TONES.info.badgeClass
        : normalizedMethod === "card"
          ? OWNER_SEMANTIC_TONES.progress.badgeClass
          : OWNER_SEMANTIC_TONES.warning.badgeClass;

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
    >
      {getOrderPaymentLabel(method)}
    </span>
  );
}

