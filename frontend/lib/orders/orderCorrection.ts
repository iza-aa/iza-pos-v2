export type OrderCorrectionPhysicalStatus =
  | "not_processed"
  | "processing_or_made"
  | "served";

export type CorrectionEligibilityItem = {
  served?: boolean | null;
  kitchenStatus?: string | null;
  kitchen_status?: string | null;
};

export type CorrectionEligibilityOrder = {
  status?: string | null;
  items?: CorrectionEligibilityItem[];
  order_items?: CorrectionEligibilityItem[];
};

const normalizeStatus = (value?: string | null) =>
  String(value ?? "").trim().toLowerCase().replaceAll("_", "-");

export const getOrderPhysicalStatus = (
  order: CorrectionEligibilityOrder,
): OrderCorrectionPhysicalStatus => {
  const status = normalizeStatus(order.status);
  const items = order.items ?? order.order_items ?? [];
  const hasServedItem = items.some((item) => item.served === true);

  if (
    hasServedItem ||
    status === "served" ||
    status === "completed" ||
    status === "partially-served"
  ) {
    return "served";
  }

  const hasStartedItem = items.some((item) => {
    const kitchenStatus = normalizeStatus(
      item.kitchenStatus ?? item.kitchen_status,
    );
    return kitchenStatus === "cooking" || kitchenStatus === "ready";
  });

  if (
    hasStartedItem ||
    status === "preparing" ||
    status === "ready"
  ) {
    return "processing_or_made";
  }

  return "not_processed";
};

export const isOrderEligibleForCorrectionStatus = (
  order: CorrectionEligibilityOrder,
  physicalStatus: OrderCorrectionPhysicalStatus,
) => getOrderPhysicalStatus(order) === physicalStatus;

