export type InsightOrderCorrectionRow = {
  id: string;
  order_id?: string | null;
  status?: string | null;
  physical_status?: string | null;
  note?: string | null;
};

export function applyInsightOrderCorrections<T extends { id: string; status?: string | null }>(
  orders: T[],
  corrections: InsightOrderCorrectionRow[],
) {
  const correctionByOrderId = new Map(
    corrections
      .filter((correction) => correction.order_id)
      .map((correction) => [correction.order_id as string, correction]),
  );

  return orders.map((order) => {
    const correction = correctionByOrderId.get(order.id);
    if (!correction) return order;

    return {
      ...order,
      original_status: order.status,
      status: "cancelled",
      correction_id: correction.id,
      correction_status: correction.status ?? null,
      correction_physical_status: correction.physical_status ?? null,
      correction_note: correction.note ?? null,
    };
  });
}
