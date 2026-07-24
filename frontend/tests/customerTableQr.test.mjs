import assert from "node:assert/strict";
import test from "node:test";

test("extracts an opaque token from a table QR URL", async () => {
  const { extractTableQrValue } = await import("../lib/customer/tableQr.js");

  assert.equal(
    extractTableQrValue(
      "https://iza-pos-v2.vercel.app/customer/table/qr_9c4b6f2af7424cae8ce44c6a3554c81d",
    ),
    "qr_9c4b6f2af7424cae8ce44c6a3554c81d",
  );
});

test("accepts a legacy table QR URL but rejects unrelated or malformed values", async () => {
  const { extractTableQrValue } = await import("../lib/customer/tableQr.js");

  assert.equal(
    extractTableQrValue(
      "https://iza-pos-v2.vercel.app/customer/table/5832bdd7-0cdd-4bd2-8f99-b1dd59869320",
    ),
    "5832bdd7-0cdd-4bd2-8f99-b1dd59869320",
  );
  assert.equal(extractTableQrValue("https://iza-pos-v2.vercel.app/customer/menu"), null);
  assert.equal(extractTableQrValue("not-a-table-qr"), null);
});
