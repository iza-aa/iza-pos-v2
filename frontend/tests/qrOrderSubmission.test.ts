import assert from "node:assert/strict";
import test from "node:test";

test("removes the order header when inserting its items fails", async () => {
  const { createQrOrderWithItems } = await loadQrOrderSubmission();
  const deletedOrderIds: string[] = [];

  await assert.rejects(
    createQrOrderWithItems(
      {
        findByOrderNumber: async () => null,
        createOrder: async () => ({
          id: "order-1",
          order_number: "TA-1",
          pickup_code: "TA-123",
        }),
        insertItems: async () => {
          throw new Error("order_items insert rejected");
        },
        deleteOrder: async (orderId: string) => {
          deletedOrderIds.push(orderId);
        },
      },
      {
        orderNumber: "TA-1",
        pickupCode: "TA-123",
        order: { total: 25000 },
        items: [{ product_id: "product-1", quantity: 1 }],
      },
    ),
    /could not be completed/i,
  );

  assert.deepEqual(deletedOrderIds, ["order-1"]);
});

test("returns an already-complete order when the same payment confirmation is retried", async () => {
  const { createQrOrderWithItems } = await loadQrOrderSubmission();
  let createOrderCalls = 0;

  const result = await createQrOrderWithItems(
    {
      findByOrderNumber: async () => ({
        id: "order-1",
        order_number: "TA-1",
        pickup_code: "TA-123",
        itemCount: 1,
      }),
      createOrder: async () => {
        createOrderCalls += 1;
        throw new Error("must not create a duplicate");
      },
      insertItems: async () => undefined,
      deleteOrder: async () => undefined,
    },
    {
      orderNumber: "TA-1",
      pickupCode: "TA-123",
      order: { total: 25000 },
      items: [{ product_id: "product-1", quantity: 1 }],
    },
  );

  assert.equal(result.id, "order-1");
  assert.equal(createOrderCalls, 0);
});

function loadQrOrderSubmission(): Promise<{
  createQrOrderWithItems: (...args: unknown[]) => Promise<{ id: string }>;
}> {
  return Function("return import('../lib/orders/qrOrderSubmission.js')")();
}
