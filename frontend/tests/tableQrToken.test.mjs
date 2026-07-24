import assert from "node:assert/strict";
import test from "node:test";

test("creates an opaque QR token that is different from the table id", async () => {
  const { createTableQrToken, isTableQrToken } = await import(
    "../lib/services/table/qrToken.js"
  );

  const tableId = "5832bdd7-0cdd-4bd2-8f99-b1dd59869320";
  const token = createTableQrToken();

  assert.equal(isTableQrToken(token), true);
  assert.notEqual(token, tableId);
});

test("rejects a table id or malformed value as a QR token", async () => {
  const { isTableQrToken } = await import(
    "../lib/services/table/qrToken.js"
  );

  assert.equal(
    isTableQrToken("5832bdd7-0cdd-4bd2-8f99-b1dd59869320"),
    false,
  );
  assert.equal(isTableQrToken("not-a-qr-token"), false);
});
