export type QrOrderRecord = {
  id: string;
  order_number: string;
  pickup_code: string | null;
};

export type ExistingQrOrderRecord = QrOrderRecord & {
  itemCount: number;
};

export type QrOrderSubmissionDependencies<TOrder, TItem> = {
  findByOrderNumber: (orderNumber: string) => Promise<ExistingQrOrderRecord | null>;
  createOrder: (order: TOrder) => Promise<QrOrderRecord>;
  insertItems: (orderId: string, items: TItem[]) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
};

export type QrOrderSubmissionInput<TOrder, TItem> = {
  orderNumber: string;
  pickupCode: string | null;
  order: TOrder;
  items: TItem[];
};

export class QrOrderSubmissionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "QrOrderSubmissionError";
  }
}

export async function createQrOrderWithItems<TOrder, TItem>(
  dependencies: QrOrderSubmissionDependencies<TOrder, TItem>,
  input: QrOrderSubmissionInput<TOrder, TItem>,
): Promise<QrOrderRecord> {
  const existingOrder = await dependencies.findByOrderNumber(input.orderNumber);

  if (existingOrder && existingOrder.itemCount >= input.items.length) {
    return existingOrder;
  }

  if (existingOrder) {
    await dependencies.deleteOrder(existingOrder.id);
  }

  const createdOrder = await dependencies.createOrder(input.order);

  try {
    await dependencies.insertItems(createdOrder.id, input.items);
  } catch (error) {
    try {
      await dependencies.deleteOrder(createdOrder.id);
    } catch (cleanupError) {
      throw new QrOrderSubmissionError(
        "The QR order could not be completed and its partial data could not be removed.",
        { cause: cleanupError },
      );
    }

    throw new QrOrderSubmissionError(
      "The QR order could not be completed. No order was created.",
      { cause: error },
    );
  }

  return createdOrder;
}
